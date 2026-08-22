import { app, net } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { logger } from '../utils/Logger'

/**
 * 网站图标（favicon）本地缓存服务。
 *
 * 参考 sessionBox 的 electron/services/favicon-cache.ts 移植：
 *   - 缓存目录：userData/site-icons，按「域名 + 图片扩展名」存文件
 *   - 下载用主进程 net.fetch（带浏览器 UA），落盘前用魔术字节校验真实图片格式
 *   - 获取策略：本地缓存 → https://domain/favicon.ico → https://www.domain/favicon.ico
 *     → icon.horse 在线兜底 → 全部失败返回 null（渲染端回退 material icon）
 *
 * 由 ProtocolService 的 site-icon:// 协议处理器调用；同域名并发请求做 in-flight 去重。
 */

/** 支持的图标扩展名（按优先级探测） */
const ICON_EXTENSIONS = ['.png', '.ico', '.svg', '.jpg', '.jpeg', '.gif', '.webp']

/** 已知图片格式的魔术字节签名 */
const IMAGE_SIGNATURES: Array<{ check: (buf: Buffer) => boolean; ext: string }> = [
  { check: (buf) => buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47, ext: '.png' },
  { check: (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff, ext: '.jpg' },
  { check: (buf) => buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46, ext: '.gif' },
  { check: (buf) => buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50, ext: '.webp' },
  { check: (buf) => buf[0] === 0x00 && buf[1] === 0x00 && (buf[2] === 0x01 || buf[2] === 0x02) && buf[3] === 0x00, ext: '.ico' },
]

export class FaviconCacheService {
  private static instance: FaviconCacheService | null = null

  private iconDir = ''
  /** domain → 进行中的获取请求（并发去重） */
  private inflight = new Map<string, Promise<{ data: Buffer; contentType: string } | null>>()

  private constructor() {}

  public static getInstance(): FaviconCacheService {
    if (!FaviconCacheService.instance) {
      FaviconCacheService.instance = new FaviconCacheService()
    }
    return FaviconCacheService.instance
  }

  private ensureIconDir(): string {
    if (!this.iconDir) this.iconDir = path.join(app.getPath('userData'), 'site-icons')
    return this.iconDir
  }

  /** 域名合法性收口：仅允许 dns 名（含 localhost 等单段名），防止路径穿越 */
  private sanitizeDomain(domain: string): string | null {
    const trimmed = domain.trim().toLowerCase()
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(trimmed) ? trimmed : null
  }

  /** 逐扩展名探测本地缓存文件 */
  private async findCachedIcon(domain: string): Promise<{ data: Buffer; contentType: string } | null> {
    for (const ext of ICON_EXTENSIONS) {
      try {
        const data = await fs.readFile(path.join(this.ensureIconDir(), domain + ext))
        return { data, contentType: this.contentTypeFor(ext) }
      } catch { /* 未命中，继续 */ }
    }
    return null
  }

  private contentTypeFor(ext: string): string {
    const types: Record<string, string> = {
      '.png': 'image/png',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    return types[ext] || 'application/octet-stream'
  }

  /** 魔术字节检测真实图片格式；SVG（文本）按内容前缀判断 */
  private detectImageType(buf: Buffer): string | null {
    for (const sig of IMAGE_SIGNATURES) {
      if (buf.length >= 12 && sig.check(buf)) return sig.ext
    }
    const head = buf.toString('utf8', 0, Math.min(buf.length, 256)).trimStart()
    if (head.startsWith('<?xml') || head.startsWith('<svg')) return '.svg'
    return null
  }

  /** 从远程 URL 下载图标，校验后写入缓存；失败返回 null */
  private async downloadAndSave(iconUrl: string, domain: string): Promise<{ data: Buffer; contentType: string } | null> {
    try {
      const response = await net.fetch(iconUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/133.0.0.0' },
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) return null

      const contentType = response.headers.get('content-type') || ''
      // 拦截 HTML 响应（icon.horse 404 等场景返回 text/html）
      if (contentType.includes('text/html')) return null

      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length < 16) return null

      const ext = this.detectImageType(buffer)
      if (!ext) return null

      // 换扩展名时清掉旧缓存文件
      await fs.mkdir(this.ensureIconDir(), { recursive: true })
      for (const old of ICON_EXTENSIONS) {
        if (old === ext) continue
        await fs.rm(path.join(this.iconDir, domain + old), { force: true })
      }
      await fs.writeFile(path.join(this.iconDir, domain + ext), buffer)
      return { data: buffer, contentType: this.contentTypeFor(ext) }
    } catch {
      return null
    }
  }

  /**
   * 按策略获取网站图标：本地缓存 → /favicon.ico → www 变体 → icon.horse 兜底。
   * 并发同域名请求合并为一次。
   */
  public getFavicon(domain: string): Promise<{ data: Buffer; contentType: string } | null> {
    const safe = this.sanitizeDomain(domain)
    if (!safe) return Promise.resolve(null)

    const existing = this.inflight.get(safe)
    if (existing) return existing

    const task = (async () => {
      try {
        const cached = await this.findCachedIcon(safe)
        if (cached) return cached

        const candidates = [
          `https://${safe}/favicon.ico`,
          `https://www.${safe}/favicon.ico`,
          `https://icon.horse/icon/${safe}`,
        ]
        for (const url of candidates) {
          const result = await this.downloadAndSave(url, safe)
          if (result) return result
        }
        return null
      } finally {
        this.inflight.delete(safe)
      }
    })()

    this.inflight.set(safe, task)
    return task
  }

  /** 清空全部图标缓存 */
  public async clearCache(): Promise<void> {
    await fs.rm(this.ensureIconDir(), { recursive: true, force: true })
    logger.info('FaviconCacheService', 'Icon cache cleared')
  }
}
