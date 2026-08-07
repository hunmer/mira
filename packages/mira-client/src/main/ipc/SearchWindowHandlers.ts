import { BrowserWindow } from 'electron'
import {
  FloatingWindowHandler,
  type FloatingWindowOptions,
} from './FloatingWindowHandler'

/**
 * 搜索窗口管理 IPC 处理器
 *
 * 基于 FloatingWindowHandler 通用模板，仅承载搜索窗口特有的业务逻辑：
 *   - search-request / open-item / get-connection-info 转发给主渲染进程
 *   - drag-file 启动原生拖拽
 *
 * 对外 API 与旧实现完全一致（getSearchWindow / createSearchWindow /
 * showSearchWindow / hideSearchWindow / toggleSearchWindow /
 * forwardResultToSearchWindow / sendMessageToSearchWindow），
 * 确保 handlers.ts / SearchHandlers.ts 无需改动。
 *
 * 🔄 消息流：
 *   搜索窗口 → MessagePort → 本处理器 → IPC → SearchHandlers(renderer)
 */
export class SearchWindowHandlers {
  private handler: FloatingWindowHandler

  constructor() {
    const options: FloatingWindowOptions = {
      name: 'search',
      title: 'Mira 全局搜索',
      width: 800,
      height: 600,
      position: 'center',
      minWidth: 600,
      minHeight: 400,
      maxWidth: 1200,
      maxHeight: 800,
      resizable: true,
      movable: true,
      alwaysOnTop: true,
      htmlFileName: 'search-window.html',
      htmlDirName: 'search-window',
      preloadFileName: 'search-preload.js',
      ipcChannelPrefix: 'search-window',
      role: 'search',
      messageHandlers: {
        // 旧 ready 消息（search-window.js 仍发此 type），交给内置 ready 处理即可，
        // 但为兼容保留一个 no-op，避免被默认转发逻辑误处理。
        'search-window-ready': () => {
          /* 基类已记录就绪日志 */
        },
        'drag-file': (data) => {
          this.handleDragFile(data.filePath, data.fileName)
        },
        // 搜索业务消息统一转发主渲染进程（此处由基类 default 完成，
        // 但显式声明更清晰，便于后续扩展）
        'open-item': (data) => {
          this.forwardToMainRenderer(data)
        },
        'search-request': (data) => {
          this.forwardToMainRenderer(data)
        },
        'get-connection-info': (data) => {
          this.forwardToMainRenderer(data)
        },
      },
    }

    this.handler = new FloatingWindowHandler(options)
  }

  // ============ 对外 API（保持不变） ============

  public getSearchWindow(): BrowserWindow | null {
    return this.handler.getWindow()
  }

  public setSearchWindow(window: BrowserWindow | null): void {
    this.handler.setWindow(window)
  }

  public createSearchWindow(): BrowserWindow {
    return this.handler.createWindow()
  }

  public async showSearchWindow(): Promise<void> {
    return this.handler.show()
  }

  public async hideSearchWindow(): Promise<void> {
    return this.handler.hide()
  }

  public async toggleSearchWindow(): Promise<void> {
    return this.handler.toggle()
  }

  /**
   * 从主渲染进程接收搜索结果并转发给搜索窗口
   */
  public forwardResultToSearchWindow(result: any): void {
    console.log('📡 [SearchWindowHandlers] 转发搜索结果到搜索窗口:', result)
    this.handler.sendMessage(result)
  }

  public sendMessageToSearchWindow(message: any): void {
    this.handler.sendMessage(message)
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.handler.cleanup()
  }

  // ============ 业务方法 ============

  /**
   * 转发消息给主渲染进程（与基类同名方法语义一致，
   * 此处单独实现以保持 SearchHandlers renderer 侧的通道名不变）
   */
  private forwardToMainRenderer(data: any): void {
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('📤 [SearchWindowHandlers] 转发消息到主渲染进程:', data)
      mainWindow.webContents.send('search-request-from-search-window', data)
    } else {
      console.error('❌ [SearchWindowHandlers] 主渲染窗口不可用，消息未转发:', data)
    }
  }

  private getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows()
    const searchWindow = this.handler.getWindow()
    return (
      windows.find((w: any) => w !== searchWindow && w.aliasName === 'Mira') ||
      windows.find((w) => w !== searchWindow) ||
      null
    )
  }

  /**
   * 处理拖拽文件请求
   */
  private async handleDragFile(filePath: string, _fileName?: string): Promise<void> {
    console.log('🖱️ [SearchWindowHandlers] 处理拖拽文件请求:', filePath)

    if (!filePath) {
      console.error('❌ [SearchWindowHandlers] 文件路径为空')
      return
    }

    try {
      const mainWindow = BrowserWindow.getAllWindows().find((win: any) => {
        return win.aliasName == 'Mira'
      })

      if (mainWindow && !mainWindow.isDestroyed()) {
        const result = await mainWindow.webContents.executeJavaScript(
          `window.electronAPI.dragDrop.startDrag('${filePath.replace(/\\/g, '\\\\')}')`
        )

        if (result && result.success) {
          console.log('✅ [SearchWindowHandlers] 通过DragDropHandler启动拖拽成功')
        } else {
          console.warn('⚠️ [SearchWindowHandlers] DragDropHandler处理结果:', result)
        }
      } else {
        console.error('❌ [SearchWindowHandlers] 主窗口不可用')
      }
    } catch (error) {
      console.error('❌ [SearchWindowHandlers] 启动拖拽失败:', error)
    }
  }
}
