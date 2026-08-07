import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { logger } from '../utils/Logger'
import {
  createWindowStateKeeper,
  saveWindowState,
  WindowStateKeeper,
} from '../utils/windowStateKeeper'
import { injectConsoleHook } from '../utils/consoleHook'

/**
 * 主窗口服务：封装主窗口的创建、显示、状态持久化、快捷键与生命周期管理。
 * 对应原 MiraApplication 中 createWindow / setupShortcuts / showMainWindow /
 * saveWindowState 等窗口相关职责。
 */
export class MainWindowService {
  private mainWindow: BrowserWindow | null = null
  private windowState: WindowStateKeeper | null = null

  /** 创建并配置主窗口，加载渲染进程入口 */
  create(): BrowserWindow {
    logger.info('MainWindowService', 'Creating main window')

    // 创建窗口状态管理器
    const mainWindowState = createWindowStateKeeper({
      defaultWidth: 1200,
      defaultHeight: 800,
      file: 'mira-window-state.json',
      maximize: true,
      fullScreen: false,
    })

    // 记录窗口状态文件位置
    logger.info('MainWindowService', 'Window state file location', {
      userDataPath: app.getPath('userData'),
      stateFile: 'mira-window-state.json',
    })

    this.windowState = mainWindowState

    logger.debug('MainWindowService', 'Window state loaded', {
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      isMaximized: mainWindowState.isMaximized,
      isFullScreen: mainWindowState.isFullScreen,
    })

    // 创建主窗口
    this.mainWindow = new BrowserWindow({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: 800,
      minHeight: 600,
      movable: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        zoomFactor: 1,
        spellcheck: false,
        webSecurity: false, // 禁用 web 安全策略，取消 CSP 检查
        webviewTag: true,
        preload: join(__dirname, '../dist-preload/preload.js'),
      },
      frame: false,
      show: false, // 先隐藏，加载完成后显示
      title: 'Mira Media Library',
      icon: join(
        app.isPackaged ? process.resourcesPath : __dirname,
        app.isPackaged ? 'assets/icon.ico' : '../assets/icon.ico',
      ),
    })

    // 页面长时间未就绪时也显示窗口，避免开发服务器阻塞导致应用完全不可见。
    const showFallbackTimer = setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed() && !this.mainWindow.isVisible()) {
        logger.warn('MainWindowService', 'Main window load timed out, showing window for diagnostics')
        this.mainWindow.show()
      }
    }, 10000)
    showFallbackTimer.unref()

    this.mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return
        clearTimeout(showFallbackTimer)
        logger.error('MainWindowService', 'Main window failed to load', {
          errorCode,
          errorDescription,
          validatedURL,
        })
        this.mainWindow?.show()
      },
    )

    // 让 windowStateKeeper 管理这个窗口
    mainWindowState.manage(this.mainWindow)

    // 如果上次是最大化状态，恢复最大化
    if (mainWindowState.isMaximized) {
      this.mainWindow.maximize()
      logger.debug('MainWindowService', 'Window restored to maximized state')
    }

    // 如果上次是全屏状态，恢复全屏
    if (mainWindowState.isFullScreen) {
      this.mainWindow.setFullScreen(true)
      logger.debug('MainWindowService', 'Window restored to fullscreen state')
    }

    // 窗口加载完成后显示
    this.mainWindow.once('ready-to-show', () => {
      clearTimeout(showFallbackTimer)
      logger.info('MainWindowService', 'Main window ready to show')
      this.mainWindow?.show()
      this.mainWindow?.webContents.setZoomFactor(1)
      // 在开发环境或未打包时打开开发者工具
      const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged
      if (isDevelopment) {
        this.mainWindow?.webContents.openDevTools()
      }

      // 注入 console hook 到渲染进程
      if (this.mainWindow) {
        injectConsoleHook(this.mainWindow)
      }
    })

    // 加载应用
    if (app.isPackaged) {
      // 生产环境 - 加载打包后的文件
      logger.info('MainWindowService', 'Loading production app')
      this.mainWindow.loadFile(join(__dirname, '../dist-renderer/index.html'))
    } else {
      // 开发环境 - vite-plugin-electron 会自动处理
      logger.info('MainWindowService', 'Loading development app')
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000'
      this.mainWindow.loadURL(devServerUrl)
    }
    // 浮动窗口通过该标识将点击事件准确转发给主窗口，生产和开发环境都必须设置。
    ;(this.mainWindow as BrowserWindow & { aliasName?: string }).aliasName = 'Mira'

    // 窗口关闭时清理引用
    this.mainWindow.on('closed', () => {
      clearTimeout(showFallbackTimer)
      logger.info('MainWindowService', 'Main window closed')
      this.mainWindow = null
    })

    // 监听窗口状态变化
    this.mainWindow.on('resize', () => {
      const bounds = this.mainWindow?.getBounds()
      logger.debug('MainWindowService', 'Window resized', bounds)
    })

    this.mainWindow.on('move', () => {
      const bounds = this.mainWindow?.getBounds()
      logger.debug('MainWindowService', 'Window moved', bounds)
    })

    this.mainWindow.on('maximize', () => {
      logger.debug('MainWindowService', 'Window maximized')
    })

    this.mainWindow.on('unmaximize', () => {
      logger.debug('MainWindowService', 'Window unmaximized')
    })

    this.mainWindow.on('enter-full-screen', () => {
      logger.debug('MainWindowService', 'Window entered fullscreen')
    })

    this.mainWindow.on('leave-full-screen', () => {
      logger.debug('MainWindowService', 'Window left fullscreen')
    })

    // 处理外部链接
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      logger.debug('MainWindowService', 'Opening external URL', { url })
      // 在默认浏览器中打开外部链接
      require('electron').shell.openExternal(url)
      return { action: 'deny' }
    })

    // 禁用 Ctrl+滚轮缩放
    this.mainWindow.webContents.on('zoom-changed', (_event, zoomDirection) => {
      if (zoomDirection === 'in' || zoomDirection === 'out') {
        this.mainWindow?.webContents.setZoomFactor(1)
      }
    })

    // 设置快捷键
    this.setupShortcuts()

    return this.mainWindow
  }

  /** 获取主窗口引用（可能为 null） */
  getWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  /**
   * 显示主窗口（用于协议处理和托盘点击）。
   * 若窗口最小化会先还原，并保证聚焦；macOS 下会显示 Dock。
   */
  show(): void {
    if (!this.mainWindow) return

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }

    this.mainWindow.show()
    this.mainWindow.focus()

    // macOS 特定：显示应用在 Dock 中
    if (process.platform === 'darwin') {
      app.dock?.show()
    }

    logger.debug('MainWindowService', 'Main window shown')
  }

  /** 向渲染进程发送消息；窗口不可用时安全跳过 */
  send(channel: string, ...args: any[]): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args)
    }
  }

  /** 手动保存窗口状态 */
  saveState(): void {
    saveWindowState(this.windowState, this.mainWindow)
  }

  /**
   * 销毁所有窗口（cleanup 时调用）。
   * 先丢弃窗口状态管理器引用，再强制销毁所有 BrowserWindow，
   * 避免残留句柄阻止退出。
   */
  destroyAll(): void {
    this.windowState = null

    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.destroy()
      }
    }
  }

  /**
   * 在主窗口 webContents 上注册键盘快捷键：
   * F12 切换 DevTools、F11 切换全屏、禁用 Ctrl+/- 缩放。
   */
  private setupShortcuts(): void {
    if (!this.mainWindow) return

    // 监听键盘事件
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      // F12 - 切换开发者工具
      if (input.key === 'F12' && input.type === 'keyDown') {
        this.mainWindow?.webContents.toggleDevTools()
      }

      // F11 - 切换全屏
      if (input.key === 'F11' && input.type === 'keyDown') {
        const isFullScreen = this.mainWindow?.isFullScreen()
        this.mainWindow?.setFullScreen(!isFullScreen)
        logger.debug('MainWindowService', `Fullscreen toggled via F11: ${!isFullScreen}`)
      }

      // 禁用 Ctrl++ / Ctrl+- / Ctrl+Scroll 缩放
      if (
        input.type === 'keyDown' &&
        input.control &&
        (input.key === '+' || input.key === '=' || input.key === '-')
      ) {
        event.preventDefault()
      }
    })
  }
}
