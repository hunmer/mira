import { ipcMain, session } from 'electron'
import { DownloadService, type ProxyConfig, type ProxyTestResult } from '../services/DownloadService'
import { logger } from '../utils/Logger'

/**
 * 网络相关 IPC 处理器
 * - network:set-proxy   : 设置/更新进程级 HTTP 代理（立即生效）
 * - network:get-proxy   : 读取当前生效的代理配置
 * - network:test-proxy  : 测试代理连通性（临时切换 session 代理探测，结束后恢复）
 * - network:detect-proxy: 检测当前生效的代理地址（应用配置 → 环境变量 → 系统代理）
 */
const CHANNEL_SET_PROXY = 'network:set-proxy'
const CHANNEL_GET_PROXY = 'network:get-proxy'
const CHANNEL_TEST_PROXY = 'network:test-proxy'
const CHANNEL_DETECT_PROXY = 'network:detect-proxy'

export class NetworkHandlers {
  private downloader = DownloadService.getInstance()

  registerHandlers(): void {
    ipcMain.handle(CHANNEL_SET_PROXY, async (_event, config: ProxyConfig) => {
      try {
        const next = config || { enabled: false, url: '' }
        this.downloader.setProxy(next)
        await session.defaultSession.setProxy({
          proxyRules: next.enabled && next.url.trim() ? next.url.trim() : 'direct://'
        })
        await session.defaultSession.closeAllConnections()
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error('NetworkHandlers', `setProxy failed: ${message}`)
        return { success: false, message }
      }
    })

    ipcMain.handle(CHANNEL_GET_PROXY, async () => {
      return { success: true, data: this.downloader.getProxy() }
    })

    ipcMain.handle(CHANNEL_TEST_PROXY, async (_event, config: ProxyConfig): Promise<ProxyTestResult> => {
      try {
        return await this.downloader.testProxy(config || { enabled: false, url: '' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error('NetworkHandlers', `testProxy failed: ${message}`)
        return { success: false, message }
      }
    })

    ipcMain.handle(CHANNEL_DETECT_PROXY, async (): Promise<{
      success: boolean
      data?: { url: string; source: 'app' | 'env' | 'system' | 'none' }
      message?: string
    }> => {
      try {
        // 1. 应用内已启用的代理配置（网络设置里保存过的）
        const current = this.downloader.getProxy()
        if (current.enabled && current.url.trim()) {
          return { success: true, data: { url: current.url.trim(), source: 'app' } }
        }
        // 2. 进程环境变量（启动前由外部注入的代理）
        const envUrl = (
          process.env.HTTPS_PROXY || process.env.https_proxy
          || process.env.HTTP_PROXY || process.env.http_proxy
        )?.trim()
        if (envUrl) {
          return { success: true, data: { url: envUrl, source: 'env' } }
        }
        // 3. 系统代理（Chromium 解析，跟随系统/PAC 设置）
        const resolved = await session.defaultSession.resolveProxy('https://registry.npmjs.org/')
        const entry = resolved
          .split(';')
          .map(part => part.trim())
          // PROXY/HTTPS 均为 HTTP 代理；SOCKS 系 npm 不支持，跳过
          .find(part => part.startsWith('PROXY ') || part.startsWith('HTTPS '))
        if (entry) {
          return { success: true, data: { url: `http://${entry.split(/\s+/)[1]}`, source: 'system' } }
        }
        return { success: true, data: { url: '', source: 'none' } }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error('NetworkHandlers', `detectProxy failed: ${message}`)
        return { success: false, message }
      }
    })

    logger.info('NetworkHandlers', 'IPC 处理器已注册')
  }

  cleanup(): void {
    ipcMain.removeHandler(CHANNEL_SET_PROXY)
    ipcMain.removeHandler(CHANNEL_GET_PROXY)
    ipcMain.removeHandler(CHANNEL_TEST_PROXY)
    ipcMain.removeHandler(CHANNEL_DETECT_PROXY)
  }
}
