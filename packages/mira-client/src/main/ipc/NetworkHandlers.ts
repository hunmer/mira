import { ipcMain } from 'electron'
import { DownloadService, type ProxyConfig, type ProxyTestResult } from '../services/DownloadService'
import { logger } from '../utils/Logger'

/**
 * 网络相关 IPC 处理器
 * - network:set-proxy  : 设置/更新进程级 HTTP 代理（立即生效）
 * - network:get-proxy  : 读取当前生效的代理配置
 * - network:test-proxy : 测试代理连通性（临时切换 dispatcher 探测，结束后恢复）
 */
const CHANNEL_SET_PROXY = 'network:set-proxy'
const CHANNEL_GET_PROXY = 'network:get-proxy'
const CHANNEL_TEST_PROXY = 'network:test-proxy'

export class NetworkHandlers {
  private downloader = DownloadService.getInstance()

  registerHandlers(): void {
    ipcMain.handle(CHANNEL_SET_PROXY, async (_event, config: ProxyConfig) => {
      try {
        this.downloader.setProxy(config || { enabled: false, url: '' })
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

    logger.info('NetworkHandlers', 'IPC 处理器已注册')
  }

  cleanup(): void {
    ipcMain.removeHandler(CHANNEL_SET_PROXY)
    ipcMain.removeHandler(CHANNEL_GET_PROXY)
    ipcMain.removeHandler(CHANNEL_TEST_PROXY)
  }
}
