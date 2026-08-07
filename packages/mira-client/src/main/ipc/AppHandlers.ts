import { ipcMain, IpcMainInvokeEvent, app, BrowserWindow } from 'electron'
import { ensureLocalServerStarted } from '../services/LocalServerService'

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

    // 服务自启动（系统登录项）
    ipcMain.handle('server-autostart:get', this.handleServerAutoStartGet.bind(this))
    ipcMain.handle('server-autostart:set', this.handleServerAutoStartSet.bind(this))
    ipcMain.handle('server-autostart:wait-ready', this.handleServerAutoStartWaitReady.bind(this))

    ipcMain.handle('app:toggle-devtools', this.handleAppToggleDevTools.bind(this))
    ipcMain.handle('dev:toggle-devtools', this.handleAppToggleDevTools.bind(this))
    ipcMain.handle('dev:force-reload', this.handleDevForceReload.bind(this))

    // 打开独立 BrowserWindow 加载指定 URL（如服务器 /dashboard）
    ipcMain.handle('window:open-url', this.handleOpenUrl.bind(this))
  }

  /**
   * 打开一个独立的 BrowserWindow 加载指定 URL。
   * 用于在新窗口中访问外部页面（如服务器 dashboard），不复用主窗口。
   */
  private async handleOpenUrl(
    _event: IpcMainInvokeEvent,
    url: string,
    options?: { width?: number; height?: number; title?: string }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      if (!url || typeof url !== 'string') {
        return { success: false, message: 'url 不能为空' }
      }
      const win = new BrowserWindow({
        width: options?.width && options.width > 0 ? options.width : 1280,
        height: options?.height && options.height > 0 ? options.height : 800,
        title: options?.title || 'Mira',
        frame: true,
        show: false,
        backgroundColor: '#ffffff',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      })

      // 外部链接交给系统默认浏览器，避免在 dashboard 窗口内再开窗口
      win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
        require('electron').shell.openExternal(targetUrl)
        return { action: 'deny' }
      })

      win.once('ready-to-show', () => {
        win.show()
        win.focus()
      })

      await win.loadURL(url)
      return { success: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return { success: false, message: msg }
    }
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

  private async handleServerAutoStartGet(_event: IpcMainInvokeEvent): Promise<{ success: boolean; enabled: boolean; message?: string }> {
    try {
      const settings = app.getLoginItemSettings({ args: ['--mira-server-startup'] })
      return { success: true, enabled: settings.openAtLogin }
    } catch (error) {
      return { success: false, enabled: false, message: error instanceof Error ? error.message : String(error) }
    }
  }

  private async handleServerAutoStartSet(
    _event: IpcMainInvokeEvent,
    enabled: boolean,
  ): Promise<{ success: boolean; enabled: boolean; message?: string }> {
    try {
      app.setLoginItemSettings({
        openAtLogin: Boolean(enabled),
        openAsHidden: true,
        args: ['--mira-server-startup'],
      })
      const settings = app.getLoginItemSettings({ args: ['--mira-server-startup'] })
      return { success: true, enabled: settings.openAtLogin }
    } catch (error) {
      return { success: false, enabled: false, message: error instanceof Error ? error.message : String(error) }
    }
  }

  private async handleServerAutoStartWaitReady(_event: IpcMainInvokeEvent): Promise<{ success: boolean; message?: string }> {
    try {
      await ensureLocalServerStarted()
      return { success: true }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  }
}
