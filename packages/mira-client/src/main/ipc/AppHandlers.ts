import { ipcMain, IpcMainInvokeEvent, app, BrowserWindow } from 'electron'

/**
 * 应用和窗口控制 IPC 处理器
 */
export class AppHandlers {
  constructor() {
    this.registerHandlers()
  }

  /**
   * 注册应用相关的 IPC 处理器
   */
  private registerHandlers(): void {
    console.log('Registering AppHandlers IPC handlers')
    // 窗口控制
    ipcMain.handle('window:close', this.handleWindowClose.bind(this))
    ipcMain.handle('window:minimize', this.handleWindowMinimize.bind(this))
    ipcMain.handle('window:maximize', this.handleWindowMaximize.bind(this))
    ipcMain.handle('window:setFullScreen', this.handleWindowSetFullScreen.bind(this))

    // 应用控制
    ipcMain.handle('app:quit', this.handleAppQuit.bind(this))
    ipcMain.handle('app:getVersion', this.handleAppGetVersion.bind(this))
    ipcMain.handle('app:getPath', this.handleAppGetPath.bind(this))
    ipcMain.handle('app:isPackaged', this.handleAppIsPackaged.bind(this))

    ipcMain.handle('app:toggle-devtools', this.handleAppToggleDevTools.bind(this))
    ipcMain.handle('dev:toggle-devtools', this.handleAppToggleDevTools.bind(this))
    ipcMain.handle('dev:force-reload', this.handleDevForceReload.bind(this))

  }

  handleAppToggleDevTools(event: IpcMainInvokeEvent): void {
    const webContents = event.sender
    const window = BrowserWindow.fromWebContents(webContents)
    if (window) {
      window.webContents.toggleDevTools()
    }
  }

  /**
   * 处理强制重新加载
   */
  handleDevForceReload(event: IpcMainInvokeEvent): void {
    const webContents = event.sender
    const window = BrowserWindow.fromWebContents(webContents)
    if (window) {
      window.webContents.reloadIgnoringCache()
    }
  }

  /**
   * 处理窗口关闭
   */
  private async handleWindowClose(event: IpcMainInvokeEvent): Promise<void> {
    const webContents = event.sender
    const window = BrowserWindow.fromWebContents(webContents)
    if (window) {
      window.close()
    }
  }

  /**
   * 处理窗口最小化
   */
  private async handleWindowMinimize(event: IpcMainInvokeEvent): Promise<void> {
    const webContents = event.sender
    const window = BrowserWindow.fromWebContents(webContents)
    if (window) {
      window.minimize()
    }
  }

  /**
   * 处理窗口最大化/还原
   */
  private async handleWindowMaximize(event: IpcMainInvokeEvent): Promise<void> {
    const webContents = event.sender
    const window = BrowserWindow.fromWebContents(webContents)
    if (window) {
      if (window.isMaximized()) {
        window.restore()
      } else {
        window.maximize()
      }
    }
  }

  /**
   * 处理窗口全屏切换
   */
  private async handleWindowSetFullScreen(
    event: IpcMainInvokeEvent,
    fullScreen: boolean
  ): Promise<void> {
    const webContents = event.sender
    const window = BrowserWindow.fromWebContents(webContents)
    if (window) {
      window.setFullScreen(fullScreen)
    }
  }

  /**
   * 处理应用退出
   */
  private async handleAppQuit(_event: IpcMainInvokeEvent): Promise<void> {
    app.quit()
  }

  /**
   * 处理获取应用版本
   */
  private async handleAppGetVersion(_event: IpcMainInvokeEvent): Promise<string> {
    return app.getVersion()
  }

  /**
   * 处理获取应用路径
   */
  private async handleAppGetPath(
    _event: IpcMainInvokeEvent,
    name: string
  ): Promise<string> {
    return app.getPath(name as any)
  }

  /**
   * 处理获取应用是否打包
   */
  private async handleAppIsPackaged(_event: IpcMainInvokeEvent): Promise<boolean> {
    return app.isPackaged
  }
}
