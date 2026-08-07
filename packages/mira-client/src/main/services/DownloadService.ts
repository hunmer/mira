/**
 * DownloadService
 *
 * 主进程内部的通用下载服务，封装「带 HTTP 代理 + 流式进度 + 可取消 + sha256 校验」
 * 的文件下载能力。供 PluginHandler 的插件市场下载链路使用，未来其它主进程下载
 * 场景也可复用。
 *
 * 代理策略：调用 setProxy() 时通过 undici 的 setGlobalDispatcher 全局注入
 * ProxyAgent，从而使本进程内所有的 Node fetch（含本服务的 downloadFile）自动走
 * 代理；关闭时恢复为默认 Agent。同时同步写入/清除 HTTP_PROXY / HTTPS_PROXY 环境
 * 变量，让 electron-updater、npm 子进程等读 env 的组件也能受益。
 *
 * 注意：本服务对全局 dispatcher 做了进程级修改——目前 mira-client 主进程内
 * 所有 fetch 都期望走同一代理，这是预期行为。
 */
import { createHash } from 'crypto'
import { logger } from '../utils/Logger'

// undici 随 Node 18+/Electron 内置，无需新增依赖。这里用 require 避免
// 主进程 TS 项目的类型解析问题（undici 没有作为直接依赖安装）。
const { ProxyAgent, Agent, setGlobalDispatcher, getGlobalDispatcher } = require('undici')

export interface ProxyConfig {
  /** 是否启用代理 */
  enabled: boolean
  /** 代理地址，例如 http://127.0.0.1:7890 */
  url: string
}

export interface DownloadOptions {
  /** 期望的 sha256（支持 'sha256:xxx' 前缀），提供则下载完成后校验，不一致抛错 */
  checksum?: string
  /** 取消信号 */
  signal?: AbortSignal
  /** 每读到一块数据时的回调，参数为本块字节数，用于上报进度 */
  onChunk?: (byteLen: number) => void
}

export interface ProxyTestResult {
  success: boolean
  /** HTTP 状态码（请求未发出/超时时为 undefined） */
  statusCode?: number
  /** 本次探测耗时（毫秒） */
  elapsedMs?: number
  message: string
}

export class DownloadService {
  private static instance: DownloadService | null = null

  /** 当前生效的代理配置（缓存，便于 testProxy 时复用/恢复） */
  private currentProxy: ProxyConfig = { enabled: false, url: '' }
  /** 默认 dispatcher（恢复代理关闭时使用） */
  private defaultDispatcher: unknown = null

  private constructor() {
    try {
      // 记录进程启动时的默认 dispatcher，关闭代理时恢复它
      this.defaultDispatcher = getGlobalDispatcher()
    } catch {
      this.defaultDispatcher = null
    }
  }

  static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService()
    }
    return DownloadService.instance
  }

  /**
   * 设置进程级代理。会立即生效于此后所有的 fetch 调用。
   */
  setProxy(config: ProxyConfig): void {
    const url = (config?.url || '').trim()
    const enabled = !!config?.enabled && !!url

    this.currentProxy = { enabled, url }

    if (enabled) {
      try {
        const agent = new ProxyAgent(url)
        setGlobalDispatcher(agent)
        // 同步环境变量，便于子进程 / electron-updater 等读取
        process.env.HTTP_PROXY = url
        process.env.HTTPS_PROXY = url
        process.env.http_proxy = url
        process.env.https_proxy = url
        logger.info('DownloadService', `Proxy enabled: ${url}`)
      } catch (err) {
        logger.error('DownloadService', `Failed to set proxy ${url}: ${err instanceof Error ? err.message : String(err)}`)
      }
    } else {
      // 恢复默认 dispatcher
      try {
        if (this.defaultDispatcher) {
          setGlobalDispatcher(this.defaultDispatcher as any)
        } else {
          setGlobalDispatcher(new Agent())
        }
      } catch {
        /* ignore */
      }
      delete process.env.HTTP_PROXY
      delete process.env.HTTPS_PROXY
      delete process.env.http_proxy
      delete process.env.https_proxy
      logger.info('DownloadService', 'Proxy disabled (direct connection)')
    }
  }

  /** 当前生效的代理配置 */
  getProxy(): ProxyConfig {
    return { ...this.currentProxy }
  }

  /**
   * 下载单个文件并以 Buffer 返回。
   * 流式读取 response.body 以便逐块上报进度；可通过 signal 取消。
   * 全局 dispatcher 已是 ProxyAgent 时，自动走代理，无需在此显式传 dispatcher。
   */
  async downloadFile(fileUrl: string, opts: DownloadOptions = {}): Promise<Buffer> {
    const { checksum, signal, onChunk } = opts

    const response = await fetch(fileUrl, { signal })
    if (!response.ok) {
      throw new Error(`下载失败 (${response.status}): ${fileUrl}`)
    }

    // 流式读取，逐块累加并上报进度
    const reader = response.body?.getReader()
    if (!reader) {
      // 无法获取 reader（理论上不会发生），退化为全量读取
      const buf = Buffer.from(await response.arrayBuffer())
      if (onChunk) onChunk(buf.length)
      return this.verifyChecksum(buf, checksum, fileUrl)
    }

    const chunks: Buffer[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
        chunks.push(chunk)
        total += chunk.length
        if (onChunk) onChunk(chunk.length)
      }
    }
    const buf = Buffer.concat(chunks, total)
    return this.verifyChecksum(buf, checksum, fileUrl)
  }

  /**
   * 校验 buffer 的 sha256（当提供 checksum 时），不一致则抛错
   */
  private verifyChecksum(buf: Buffer, expectedChecksum: string | undefined, fileUrl: string): Buffer {
    if (!expectedChecksum) return buf
    const expected = expectedChecksum.startsWith('sha256:')
      ? expectedChecksum.slice(7)
      : expectedChecksum
    const actual = createHash('sha256').update(buf).digest('hex')
    if (actual !== expected) {
      throw new Error(`校验失败: ${fileUrl}\n期望 sha256=${expected}\n实际 sha256=${actual}`)
    }
    return buf
  }

  /**
   * 测试代理连通性。在临时切换到指定代理后发起一次探测请求，探测结束后
   * 恢复原代理配置。这样无论用户是否已「保存」，都能先「测试」当前输入。
   *
   * @param config   待测试的代理配置
   * @param testUrl  探测目标 URL，默认使用一个轻量的 204 探测点
   */
  async testProxy(config: ProxyConfig, testUrl = 'https://www.google.com/generate_204'): Promise<ProxyTestResult> {
    const url = (config?.url || '').trim()
    if (!config?.enabled || !url) {
      return { success: false, message: '未启用代理或代理地址为空' }
    }

    const previous = this.currentProxy
    const start = Date.now()
    try {
      // 临时切换到待测代理
      const agent = new ProxyAgent(url)
      setGlobalDispatcher(agent)

      const response = await fetch(testUrl, { signal: AbortSignal.timeout(8000) })
      const elapsedMs = Date.now() - start
      const ok = response.ok
      return {
        success: ok,
        statusCode: response.status,
        elapsedMs,
        message: ok
          ? `连接成功（${response.status}，${elapsedMs}ms）`
          : `代理可达但返回异常状态码（${response.status}）`,
      }
    } catch (err) {
      const elapsedMs = Date.now() - start
      const message = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        elapsedMs,
        message: `代理测试失败（${elapsedMs}ms）：${message}`,
      }
    } finally {
      // 恢复到测试前的代理状态
      try {
        if (previous.enabled && previous.url) {
          setGlobalDispatcher(new ProxyAgent(previous.url))
        } else if (this.defaultDispatcher) {
          setGlobalDispatcher(this.defaultDispatcher as any)
        } else {
          setGlobalDispatcher(new Agent())
        }
      } catch {
        /* ignore restore failure */
      }
    }
  }
}

export const downloadService = DownloadService.getInstance()
export default DownloadService
