import { ipcMain, IpcMainInvokeEvent, app, BrowserWindow, screen, nativeTheme } from 'electron'
import * as path from 'path'
import { ensureLocalServerStarted } from '../services/LocalServerService'

/**
 * 应用和窗口控制 IPC 处理器
 */
export class AppHandlers {
  /** dashboard 窗口引用（供 LoginWindowHandlers 回传 cookie） */
  private dashboardWindow: BrowserWindow | null = null

  constructor() {
    this.registerHandlers()
  }

  /** 获取当前 dashboard 窗口（可能为 null 或已销毁） */
  public getDashboardWindow(): BrowserWindow | null {
    return this.dashboardWindow && !this.dashboardWindow.isDestroyed() ? this.dashboardWindow : null
  }

  /**
   * 注册应用相关的 IPC 处理器
   */
  private registerHandlers(): void {
    // 窗口控制
    ipcMain.handle('window:close', this.handleWindowClose.bind(this))
    ipcMain.handle('window:minimize', this.handleWindowMinimize.bind(this))
    ipcMain.handle('window:maximize', this.handleWindowMaximize.bind(this))
    ipcMain.handle('window:toggleSize', this.handleWindowToggleSize.bind(this))
    ipcMain.handle('window:setFullScreen', this.handleWindowSetFullScreen.bind(this))

    // 应用控制
    ipcMain.handle('app:quit', this.handleAppQuit.bind(this))
    ipcMain.handle('app:getVersion', this.handleAppGetVersion.bind(this))
    ipcMain.handle('app:getPath', this.handleAppGetPath.bind(this))
    ipcMain.handle('app:isPackaged', this.handleAppIsPackaged.bind(this))

    // 同步应用主题到 nativeTheme：应用内切换明暗时触发 nativeTheme 'updated'，
    // PluginWindowHandlers 借此向全部插件窗口广播 theme 事件（子窗口 preload 的 onThemeChanged）
    ipcMain.handle('app:set-theme-source', this.handleAppSetThemeSource.bind(this))

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
   *
   * 当 options.dashboard === true 时（用于打开 Mira dashboard 窗口）：
   *   - 注入 dashboard-preload，暴露最小 electronAPI（openLoginWindow / onLoginCookies）
   *   - sandbox:false 让 preload 能 require('electron')
   *   - 保存窗口引用到 this.dashboardWindow，供 LoginWindowHandlers 回传 cookie
   */
  private async handleOpenUrl(
    _event: IpcMainInvokeEvent,
    url: string,
    options?: { width?: number; height?: number; title?: string; dashboard?: boolean }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      if (!url || typeof url !== 'string') {
        return { success: false, message: 'url 不能为空' }
      }
      const isDashboard = !!options?.dashboard
      const webPreferences: Electron.WebPreferences = {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: isDashboard ? false : true,
      }
      if (isDashboard) {
        webPreferences.preload = app.isPackaged
          ? path.join(__dirname, '../dist-preload/dashboard-preload.js')
          : path.join(__dirname, '../src/preload/dashboard-preload.js')
      }
      const win = new BrowserWindow({
        width: options?.width && options.width > 0 ? options.width : 1280,
        height: options?.height && options.height > 0 ? options.height : 800,
        title: options?.title || 'Mira',
        frame: true,
        show: false,
        backgroundColor: '#ffffff',
        webPreferences,
      })

      if (isDashboard) {
        this.dashboardWindow = win
        win.on('closed', () => { if (this.dashboardWindow === win) this.dashboardWindow = null })
      }

      // 去掉从全局应用菜单（Menu.setApplicationMenu）继承的菜单栏。
      // 该窗口用于加载外部 URL（如服务器 dashboard），主窗口的应用菜单对它无意义。
      // 注意：win.setMenu 只在 Windows / Linux 生效；macOS 仍走全局菜单（Electron 限制）。
      win.setMenu(null)

      // dashboard 窗口：外部链接仍交给系统默认浏览器（避免在 dashboard 窗口内跳走）；
      // 其余通用浏览窗口（如收藏夹独立窗口）：http(s) 新链接在当前窗口内跳转
      win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
        if (!isDashboard && /^https?:\/\//i.test(targetUrl)) {
          if (!win.isDestroyed()) win.webContents.loadURL(targetUrl)
          return { action: 'deny' }
        }
        require('electron').shell.openExternal(targetUrl)
        return { action: 'deny' }
      })

      // 与主窗口一致：F12 切换 DevTools（该窗口 setMenu(null) 无角色快捷键，需手动监听）
      win.webContents.on('before-input-event', (_e, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools()
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
   * 处理窗口最大化/还原：还原时恢复默认大小（1200x800，与 MainWindowService 默认值一致）
   * 并居中，而非恢复最大化前的上一次尺寸
   */
  private async handleWindowMaximize(event: IpcMainInvokeEvent): Promise<void> {
    const webContents = event.sender
    const window = BrowserWindow.fromWebContents(webContents)
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
        window.setSize(1200, 800)
        window.center()
      } else {
        window.maximize()
      }
    }
  }

  /**
   * 处理窗口大小智能切换：已最大化/全屏，或宽高接近占满屏幕（≥95% 工作区）时
   * 恢复默认大小（1200x800，与 MainWindowService 默认值一致）并居中，否则最大化
   */
  private async handleWindowToggleSize(event: IpcMainInvokeEvent): Promise<void> {
    const webContents = event.sender
    const window = BrowserWindow.fromWebContents(webContents)
    if (!window) return

    const workArea = screen.getDisplayMatching(window.getBounds()).workArea
    const bounds = window.getBounds()
    const nearlyFullscreen =
      bounds.width >= workArea.width * 0.95 && bounds.height >= workArea.height * 0.95

    if (window.isMaximized() || window.isFullScreen() || nearlyFullscreen) {
      if (window.isMaximized()) window.unmaximize()
      if (window.isFullScreen()) window.setFullScreen(false)
      window.setSize(1200, 800)
      window.center()
    } else {
      window.maximize()
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
   * 设置主题来源（'light' | 'dark' | 'system'）。
   * 渲染进程在 applyTheme 时同步；值变化触发 nativeTheme 'updated'，
   * 已打开的插件窗口经 'plugin-window:mira-event' 收到 'theme' 事件。
   */
  private handleAppSetThemeSource(_event: IpcMainInvokeEvent, source: string): boolean {
    if (source !== 'light' && source !== 'dark' && source !== 'system') return false
    nativeTheme.themeSource = source
    return true
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
