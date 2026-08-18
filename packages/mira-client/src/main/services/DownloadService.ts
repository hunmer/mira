/**
 * DownloadService
 *
 * 主进程内部的通用下载服务，封装「带 HTTP 代理 + 流式进度 + 可取消 + sha256 校验」
 * 的文件下载能力。供 PluginHandler 的插件市场下载链路使用，未来其它主进程下载
 * 场景也可复用。
 *
 * 代理策略：本服务自身不再管理 dispatcher。HTTP 代理由调用方通过
 * Electron session.defaultSession.setProxy 统一配置（见 NetworkHandlers /
 * MiraApplication.applyPersistedProxy）。这里所有请求均使用 Electron 的
 * net.request，它会自动跟随当前 session 的代理规则。
 *
 * 注意：为兼容子进程 / electron-updater 等读 env 的组件，setProxy 仅负责
 * 写入/清除 HTTP_PROXY / HTTPS_PROXY 环境变量。
 */
import { createHash } from 'crypto'
import { net } from 'electron'
import { Readable } from 'stream'

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

/**
 * 用 Electron net.request 发起一次请求，返回 { statusCode, headers, body }。
 * - 自动跟随当前 session 代理规则（session.defaultSession.setProxy 设置）。
 * - 支持 AbortSignal 取消。
 */
function requestWithElectron(
  url: string,
  options: { method?: 'GET' | 'HEAD'; signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<{ statusCode: number; headers: Record<string, string[]>; stream: Readable }> {
  const { method = 'GET', signal, timeoutMs = 0 } = options
  return new Promise((resolve, reject) => {
    const req = net.request(url)
    req.setHeader('User-Agent', 'Mira-Desktop')
    if (method === 'HEAD') req.method = 'HEAD'

    let settled = false
    const cleanup = () => {
      if (timeoutMs > 0) clearTimeout(timer as any)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      if (settled) return
      settled = true
      cleanup()
      try { req.abort() } catch { /* ignore */ }
      reject(new DOMException('The user aborted a request.', 'AbortError'))
    }
    const timer = timeoutMs > 0 ? setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      try { req.abort() } catch { /* ignore */ }
      reject(new Error(`请求超时（${timeoutMs}ms）：${url}`))
    }, timeoutMs) : null

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort)

    req.on('response', (response) => {
      if (settled) return
      settled = true
      cleanup()
      const headers: Record<string, string[]> = {}
      // Electron IncomingMessage headers 是 Record<string, string[]>
      const rawHeaders = (response as any).headers || {}
      for (const [k, v] of Object.entries(rawHeaders)) {
        headers[k] = Array.isArray(v) ? (v as string[]) : [String(v)]
      }
      resolve({ statusCode: response.statusCode, headers, stream: Readable.fromWeb(response as any) })
    })
    req.on('error', (err) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    })
    req.on('abort', () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new DOMException('The user aborted a request.', 'AbortError'))
    })

    req.end()
  })
}

export class DownloadService {
  private static instance: DownloadService | null = null

  /** 当前生效的代理配置（缓存，便于 testProxy 时复用/恢复） */
  private currentProxy: ProxyConfig = { enabled: false, url: '' }

  private constructor() {}

  static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService()
    }
    return DownloadService.instance
  }

  /**
   * 同步 HTTP_PROXY / HTTPS_PROXY 环境变量，便于 electron-updater、npm 子进程
   * 等读 env 的组件受益。实际网络请求的代理由 Electron session.setProxy 统一控制。
   */
  setProxy(config: ProxyConfig): void {
    const url = (config?.url || '').trim()
    const enabled = !!config?.enabled && !!url

    this.currentProxy = { enabled, url }

    if (enabled) {
      process.env.HTTP_PROXY = url
      process.env.HTTPS_PROXY = url
      process.env.http_proxy = url
      process.env.https_proxy = url
    } else {
      delete process.env.HTTP_PROXY
      delete process.env.HTTPS_PROXY
      delete process.env.http_proxy
      delete process.env.https_proxy
    }
  }

  /** 当前生效的代理配置 */
  getProxy(): ProxyConfig {
    return { ...this.currentProxy }
  }

  /**
   * 下载单个文件并以 Buffer 返回。
   * 使用 Electron net.request（自动跟随 session 代理），流式逐块上报进度；
   * 可通过 signal 取消。
   */
  async downloadFile(fileUrl: string, opts: DownloadOptions = {}): Promise<Buffer> {
    const { checksum, signal, onChunk } = opts

    const { statusCode, stream } = await requestWithElectron(fileUrl, { signal })
    if (statusCode >= 400 || statusCode < 200) {
      throw new Error(`下载失败 (${statusCode}): ${fileUrl}`)
    }

    const chunks: Buffer[] = []
    let total = 0
    const onAbort = () => stream.destroy(new DOMException('The user aborted a request.', 'AbortError'))
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      if (signal?.aborted) onAbort()
      for await (const chunk of stream as any) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
        chunks.push(buf)
        total += buf.length
        if (onChunk) onChunk(buf.length)
      }
    } finally {
      signal?.removeEventListener('abort', onAbort)
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
   * 测试代理连通性。临时把 session 切换到指定代理后发起探测请求，探测结束后
   * 恢复原 session 代理配置。这样无论用户是否已「保存」，都能先「测试」当前输入。
   *
   * @param config   待测试的代理配置
   * @param testUrl  探测目标 URL，默认使用一个轻量的 204 探测点
   */
  async testProxy(
    config: ProxyConfig,
    testUrl = 'https://www.google.com/generate_204'
  ): Promise<ProxyTestResult> {
    const { session } = await import('electron')
    const url = (config?.url || '').trim()
    if (!config?.enabled || !url) {
      return { success: false, message: '未启用代理或代理地址为空' }
    }

    const previous = this.currentProxy
    const start = Date.now()
    try {
      // 临时切换 session 代理到待测配置
      await session.defaultSession.setProxy({ proxyRules: url })
      const { statusCode } = await requestWithElectron(testUrl, { timeoutMs: 8000 })
      const elapsedMs = Date.now() - start
      const ok = statusCode >= 200 && statusCode < 400
      return {
        success: ok,
        statusCode,
        elapsedMs,
        message: ok
          ? `连接成功（${statusCode}，${elapsedMs}ms）`
          : `代理可达但返回异常状态码（${statusCode}）`,
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
      // 恢复到测试前的 session 代理状态
      try {
        if (previous.enabled && previous.url) {
          await session.defaultSession.setProxy({ proxyRules: previous.url })
        } else {
          await session.defaultSession.setProxy({ proxyRules: 'direct://' })
        }
        await session.defaultSession.closeAllConnections()
      } catch {
        /* ignore restore failure */
      }
    }
  }
}

export const downloadService = DownloadService.getInstance()
export default DownloadService
