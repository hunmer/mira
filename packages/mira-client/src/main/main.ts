import { app, BrowserView, BrowserWindow, ipcMain, session, shell } from 'electron'
import type { WebContents } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { IPCHandlers } from './ipc/handlers'
import { ProtocolService } from './services/ProtocolService'
import { TrayService } from './services/TrayService'
import { MainWindowService } from './services/MainWindowService'
import { DownloadService } from './services/DownloadService'
import { logger } from './utils/Logger'
import { closeProcm, initProcm, setProcmMainWindow } from './services/ProcmService'
import { getAutoUpdater } from './services/useAutoUpdater'
import { ensureLocalServerStarted, runLocalServerScriptSync } from './services/LocalServerService'

interface BrowserViewState {
  enabled: boolean
  activeId: string
  activeLibraryId: string | null
  runningLibraryIds: string[]
  canCloseCurrent: boolean
}

interface ManagedLibraryView {
  id: string
  type: 'library'
  libraryId: string
  view: BrowserView
}

interface BrowserViewAuthBootstrap {
  user: unknown
  token: string | null
  refreshToken: string | null
  tokenExpiration: string | null
}

/**
 * 素材库多开管理器。主 BrowserWindow 是固定的 default 视图，其他素材库使用
 * 独立持久化 session，确保相同 localStorage key 在不同素材库间不会互相覆盖。
 */
class BrowserViewManager {
  private readonly views = new Map<string, ManagedLibraryView>()
  private readonly history: string[] = []
  private enabled = false
  private activeId = 'default'
  private defaultLibraryId: string | null = null

  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  private getViewId(libraryId: string): string {
    return `library:${Buffer.from(libraryId).toString('base64url')}`
  }

  private getLibraryId(viewId: string): string | null {
    return viewId === 'default'
      ? this.defaultLibraryId
      : this.views.get(viewId)?.libraryId ?? null
  }

  private getRunningLibraryIds(): string[] {
    const ids = [
      this.defaultLibraryId,
      ...Array.from(this.views.values())
        .filter(item => item.type === 'library')
        .map(item => item.libraryId),
    ]
    return ids.filter((id): id is string => Boolean(id))
  }

  private getState(): BrowserViewState {
    const runningLibraryIds = this.getRunningLibraryIds()
    return {
      enabled: this.enabled,
      activeId: this.activeId,
      activeLibraryId: this.getLibraryId(this.activeId),
      runningLibraryIds,
      canCloseCurrent: runningLibraryIds.length > 1,
    }
  }

  private broadcastState(): BrowserViewState {
    const state = this.getState()
    logger.info('BrowserViewManager', 'broadcast state', state)
    const targets = [
      this.getWindow()?.webContents,
      ...Array.from(this.views.values(), item => item.view.webContents),
    ]
    for (const target of targets) {
      if (target && !target.isDestroyed()) target.send('browser-view:state-changed', state)
    }
    return state
  }

  private resizeActiveView(): void {
    if (this.activeId === 'default') return
    const win = this.getWindow()
    const managed = this.views.get(this.activeId)
    if (!win || !managed) return
    const { width, height } = win.getContentBounds()
    managed.view.setBounds({ x: 0, y: 0, width, height })
  }

  private show(viewId: string): void {
    const win = this.getWindow()
    if (!win) return

    if (this.activeId !== viewId) {
      this.history.push(this.activeId)
    }
    this.activeId = viewId

    if (viewId === 'default') {
      win.setBrowserView(null)
    } else {
      const managed = this.views.get(viewId)
      if (!managed) return
      win.setBrowserView(managed.view)
      this.resizeActiveView()
    }
    this.broadcastState()
  }

  private createView(libraryId: string, authBootstrap?: BrowserViewAuthBootstrap): ManagedLibraryView {
    const id = this.getViewId(libraryId)
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        spellcheck: false,
        webSecurity: false,
        webviewTag: true,
        partition: `persist:mira-${Buffer.from(libraryId).toString('base64url')}`,
        preload: path.join(__dirname, '../dist-preload/preload.js'),
        additionalArguments: [
          `--mira-library-id=${libraryId}`,
          ...(authBootstrap?.token
            ? [`--mira-auth-bootstrap=${Buffer.from(JSON.stringify(authBootstrap)).toString('base64url')}`]
            : []),
        ],
      },
    })
    view.setAutoResize({ width: true, height: true })
    view.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url)
      return { action: 'deny' }
    })
    view.webContents.on('did-start-loading', () => {
      logger.info('BrowserViewManager', 'BrowserView navigation started', { id, libraryId })
    })
    view.webContents.on('did-finish-load', () => {
      logger.info('BrowserViewManager', 'BrowserView navigation finished', { id, libraryId })
    })
    view.webContents.on('zoom-changed', () => view.webContents.setZoomFactor(1))
    const managed = { id, type: 'library' as const, libraryId, view }
    this.views.set(id, managed)
    return managed
  }

  private async loadView(managed: ManagedLibraryView, authBootstrap?: BrowserViewAuthBootstrap): Promise<void> {
    const win = this.getWindow()
    if (!win) return
    const target = new URL(win.webContents.getURL())
    target.searchParams.set('mira-library-id', managed.libraryId)
    logger.info('BrowserViewManager', 'load BrowserView once', {
      id: managed.id,
      libraryId: managed.libraryId,
      url: target.toString().replace(/([?&])mira-library-id=[^&]*/g, '$1mira-library-id=<redacted>'),
      hasAuthBootstrap: Boolean(authBootstrap?.token),
    })
    await managed.view.webContents.loadURL(target.toString())
  }

  async setEnabled(enabled: boolean, currentLibraryId: string | null, sender: WebContents): Promise<BrowserViewState> {
    const win = this.getWindow()
    this.enabled = enabled
    logger.info('BrowserViewManager', 'set enabled', {
      enabled,
      currentLibraryId,
      senderId: sender.id,
      defaultLibraryId: this.defaultLibraryId,
    })

    if (enabled) {
      if (sender.id === win?.webContents.id && this.activeId === 'default' && currentLibraryId) {
        if (this.defaultLibraryId !== currentLibraryId) {
          logger.info('BrowserViewManager', 'sync default library binding', {
            previousLibraryId: this.defaultLibraryId,
            currentLibraryId,
          })
        }
        this.defaultLibraryId = currentLibraryId
      }
      return this.broadcastState()
    }

    this.activeId = 'default'
    this.defaultLibraryId = currentLibraryId
    if (win && currentLibraryId && sender.id !== win.webContents.id) {
      win.setBrowserView(null)
      win.webContents.send('browser-view:activate-library', currentLibraryId)
      const state = this.broadcastState()
      setImmediate(() => {
        this.destroyViews()
        this.broadcastState()
      })
      return state
    }
    this.destroyViews()
    return this.broadcastState()
  }

  async switchToLibrary(libraryId: string, authBootstrap?: BrowserViewAuthBootstrap): Promise<BrowserViewState> {
    logger.info('BrowserViewManager', 'switch requested', {
      libraryId,
      enabled: this.enabled,
      activeId: this.activeId,
      hasAuthBootstrap: Boolean(authBootstrap?.token),
    })
    if (!this.enabled || !libraryId) return this.getState()

    if (this.defaultLibraryId === libraryId) {
      this.show('default')
      return this.getState()
    }

    const id = this.getViewId(libraryId)
    let managed = this.views.get(id)
    if (managed?.view.webContents.isDestroyed()) {
      logger.warn('BrowserViewManager', 'found destroyed view, recreating', { id, libraryId })
      this.views.delete(id)
      managed = undefined
    }
    if (!managed) {
      logger.info('BrowserViewManager', 'creating BrowserView', { id, libraryId })
      managed = this.createView(libraryId, authBootstrap)
      try {
        await this.loadView(managed, authBootstrap)
      } catch (error) {
        this.views.delete(id)
        if (!managed.view.webContents.isDestroyed()) managed.view.webContents.close({ waitForBeforeUnload: false })
        throw error
      }
    } else {
      logger.info('BrowserViewManager', 'reusing BrowserView without reload', { id, libraryId })
    }
    this.show(id)
    logger.info('BrowserViewManager', 'switched BrowserView', { id, libraryId, state: this.getState() })
    return this.getState()
  }

  async switchAdjacent(direction: -1 | 1): Promise<BrowserViewState> {
    const runningLibraryIds = this.getRunningLibraryIds()
    if (!this.enabled || runningLibraryIds.length <= 1) return this.getState()

    const activeLibraryId = this.getLibraryId(this.activeId)
    const currentIndex = activeLibraryId ? runningLibraryIds.indexOf(activeLibraryId) : -1
    const nextIndex = (currentIndex + direction + runningLibraryIds.length) % runningLibraryIds.length
    const nextLibraryId = runningLibraryIds[nextIndex]
    logger.info('BrowserViewManager', 'switch adjacent', {
      direction,
      activeLibraryId,
      nextLibraryId,
      runningLibraryIds,
    })

    if (nextLibraryId === this.defaultLibraryId) {
      this.show('default')
      return this.getState()
    }
    return this.switchToLibrary(nextLibraryId)
  }

  closeCurrent(): BrowserViewState {
    if (this.getRunningLibraryIds().length <= 1) return this.getState()

    const closingId = this.activeId
    let fallbackId = this.history.pop()
    while (fallbackId && fallbackId === closingId) fallbackId = this.history.pop()
    if (!fallbackId || (fallbackId !== 'default' && !this.views.has(fallbackId))) {
      fallbackId = this.defaultLibraryId ? 'default' : this.views.keys().next().value
    }

    if (closingId === 'default') {
      this.defaultLibraryId = null
    } else {
      const managed = this.views.get(closingId)
      this.views.delete(closingId)
      this.getWindow()?.setBrowserView(null)
      if (managed && !managed.view.webContents.isDestroyed()) managed.view.webContents.close({ waitForBeforeUnload: false })
    }

    this.activeId = fallbackId ?? 'default'
    this.show(this.activeId)
    return this.getState()
  }

  closeOthers(): BrowserViewState {
    if (this.activeId === 'default') {
      for (const [id, managed] of this.views) {
        if (managed.type === 'library') {
          if (!managed.view.webContents.isDestroyed()) {
            managed.view.webContents.close({ waitForBeforeUnload: false })
          }
          this.views.delete(id)
        }
      }
    } else {
      for (const [id, managed] of this.views) {
        if (managed.type === 'library' && id !== this.activeId) {
          if (!managed.view.webContents.isDestroyed()) {
            managed.view.webContents.close({ waitForBeforeUnload: false })
          }
          this.views.delete(id)
        }
      }
      this.defaultLibraryId = null
    }
    this.history.length = 0
    return this.broadcastState()
  }

  state(): BrowserViewState {
    return this.getState()
  }

  attachWindowListeners(win: BrowserWindow): void {
    win.on('resize', () => this.resizeActiveView())
    win.on('maximize', () => this.resizeActiveView())
    win.on('unmaximize', () => this.resizeActiveView())
  }

  destroyViews(): void {
    const win = this.getWindow()
    win?.setBrowserView(null)
    for (const managed of this.views.values()) {
      if (!managed.view.webContents.isDestroyed()) managed.view.webContents.close({ waitForBeforeUnload: false })
    }
    this.views.clear()
    this.history.length = 0
  }
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

// procm 托管时启用 room 客户端与结构化日志，否则退化为 no-op
initProcm()

// Electron 主进程
class MiraApplication {
  private windows: MainWindowService = new MainWindowService()
  private ipcHandlers: IPCHandlers | null = null
  private protocolService: ProtocolService | null = null
  private trayService: TrayService | null = null
  private isQuitting = false
  private browserViews = new BrowserViewManager(() => this.windows.getWindow())

  constructor() {
    this.setupEnvironment()
    if (!this.setupSingleInstance()) {
      return
    }

    // 设置日志级别
    // 在打包环境中，检查 app.isPackaged 来确定是否为生产环境
    const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged
    if (isDevelopment) {
      logger.setLogLevel('DEBUG')
    } else {
      logger.setLogLevel('INFO')
    }

    logger.info('MiraApplication', 'Starting Mira Media Library Application - Single Instance Confirmed')

    // 系统登录项只负责唤起脚本管理的后台服务，不创建 Mira UI。
    if (process.argv.includes('--mira-server-startup')) {
      this.setupServerStartupApp()
      return
    }

    this.protocolService = ProtocolService.getInstance()
    this.trayService = TrayService.getInstance()
    this.setupApp()
  }

  /**
   * Windows 系统额外的编码设置。
   */
  private setupEnvironment() {
    if (process.platform !== 'win32') return

    // 设置控制台代码页为 UTF-8
    if (process.stdout && process.stdout.setEncoding) {
      process.stdout.setEncoding('utf8')
    }
    if (process.stderr && process.stderr.setEncoding) {
      process.stderr.setEncoding('utf8')
    }

    // 设置环境变量
    process.env.LANG = 'zh_CN.UTF-8'
    process.env.LC_ALL = 'zh_CN.UTF-8'
  }

  /**
   * 强制确保只有一个应用实例运行。
   * 若已有实例，立即退出；否则监听 second-instance 以聚焦首个实例窗口。
   */
  private setupSingleInstance(): boolean {
    const gotTheLock = app.requestSingleInstanceLock()

    if (!gotTheLock) {
      // 如果已经有实例在运行，立即退出
      logger.info('MiraApplication', 'Another instance is already running, quitting immediately...')
      setImmediate(() => app.quit())
      return false
    }

    // 当尝试运行第二个实例时，聚焦到第一个实例的窗口
    app.on('second-instance', (_event, commandLine, _workingDirectory) => {
      // 检查是否有协议参数
      const protocolUrl = commandLine.find(arg => arg.startsWith('mira://'))
      if (protocolUrl) {
        logger.info('MiraApplication', 'Protocol URL detected in second instance', { url: protocolUrl })
      }

      if (app.isReady()) {
        this.showMainWindow()
      } else {
        void app.whenReady().then(() => this.showMainWindow())
      }
    })

    return true
  }

  /**
   * 登录项无头模式：仅启动后台服务后立即退出，不创建 UI。
   */
  private setupServerStartupApp() {
    app.whenReady().then(async () => {
      try {
        await ensureLocalServerStarted({
          onOutput: line => logger.info('LocalServerService', line),
        })
      } catch (error) {
        logger.warn('LocalServerService', 'Login startup failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        app.quit()
      }
    })
  }

  private setupApp() {
    // 当应用就绪时创建窗口
    app.whenReady().then(async () => {
      // 应用持久化的网络代理配置（主进程 fetch + Electron session）
      await this.applyPersistedProxy()

      this.createMainWindow()
      this.setupIPC()
      this.setupProtocol()
      this.setupTray()

      // 本地服务由独立生命周期脚本管理；启动检查不阻塞窗口显示。
      void ensureLocalServerStarted({
        onOutput: line => logger.info('LocalServerService', line),
      }).catch(error => {
        logger.warn('LocalServerService', 'Local backend auto-start failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      })

      // 延迟检查自动更新（避免影响启动速度）
      if (app.isPackaged) {
        setTimeout(() => {
          getAutoUpdater().checkForUpdates()
        }, 3000)
      }

      app.on('activate', () => {
        this.showMainWindow()
      })
    })

    ipcMain.on('window:set-close-to-tray', (_event, enabled: boolean) => {
      this.windows.setCloseToTray(Boolean(enabled))
    })

    // 当所有窗口关闭时退出应用（除了 macOS）
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin' && (this.isQuitting || !this.trayService?.isActive())) {
        app.quit()
      }
    })

    // 应用即将退出
    app.on('before-quit', () => {
      this.isQuitting = true
      this.windows.prepareToQuit()
      try {
        runLocalServerScriptSync('stop')
      } catch (error) {
        logger.warn('LocalServerService', 'Local backend stop failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
      this.cleanup()
    })

    // 捕获退出信号，确保 macOS / 开发模式下也能干净退出
    // （vite-plugin-electron 在 macOS 下 Ctrl+C 经常不会触发 before-quit）
    const quitGracefully = () => {
      // before-quit 钩子会负责 cleanup
      app.quit()
    }
    process.on('SIGINT', quitGracefully)
    process.on('SIGTERM', quitGracefully)
    // macOS 下 SIGHUP 常见于父进程（vite）退出时
    process.on('SIGHUP', quitGracefully)
  }

  /**
   * 读取持久化的网络代理配置并应用：
   *   1. DownloadService.setProxy —— 同步 HTTP_PROXY/HTTPS_PROXY 环境变量（供子进程）
   *   2. session.defaultSession.setProxy —— 渲染层 fetch 与主进程 net.request 的代理
   *
   * 配置文件路径与渲染层 ConfigStorage 一致：resources/configs/mira-settings.json。
   */
  private async applyPersistedProxy(): Promise<void> {
    try {
      const settingsPath = path.join(process.cwd(), 'resources', 'configs', 'mira-settings.json')
      const raw = await fs.readFile(settingsPath, 'utf8')
      const parsed = JSON.parse(raw)
      const enabled = !!parsed?.networkProxyEnabled
      const url = (parsed?.networkProxyUrl || '').trim()
      const proxyRules = enabled && url ? url : 'direct://'

      DownloadService.getInstance().setProxy({ enabled, url })
      await session.defaultSession.setProxy({ proxyRules })
    } catch {
      // 首次启动或文件不存在时静默使用直连
    }
  }

  private createMainWindow(): BrowserWindow {
    const win = this.windows.create()
    this.browserViews.attachWindowListeners(win)
    setProcmMainWindow(win)
    this.ipcHandlers?.setMainWindow(win)
    this.trayService?.setMainWindow(win)
    return win
  }

  private showMainWindow(): void {
    if (!this.windows.getWindow()) {
      this.createMainWindow()
    }
    this.windows.show()
  }

  private setupIPC() {
    // 初始化 IPC 处理器
    this.ipcHandlers = new IPCHandlers()

    // 设置主窗口引用
    const win = this.windows.getWindow()
    if (win) {
      this.ipcHandlers.setMainWindow(win)
    }

    ipcMain.handle('browser-view:set-enabled', (event, enabled: boolean, currentLibraryId?: string) =>
      this.browserViews.setEnabled(Boolean(enabled), currentLibraryId ? String(currentLibraryId) : null, event.sender)
    )
    ipcMain.handle('browser-view:switch', (_event, libraryId: string, authBootstrap?: BrowserViewAuthBootstrap) =>
      this.browserViews.switchToLibrary(String(libraryId), authBootstrap)
    )
    ipcMain.handle('browser-view:get-state', () => this.browserViews.state())
    ipcMain.handle('browser-view:close-current', () => this.browserViews.closeCurrent())
    ipcMain.handle('browser-view:close-others', () => this.browserViews.closeOthers())
    ipcMain.handle('browser-view:previous', () => this.browserViews.switchAdjacent(-1))
    ipcMain.handle('browser-view:next', () => this.browserViews.switchAdjacent(1))
  }

  private setupProtocol() {
    // 初始化协议服务
    this.protocolService?.init()

    // 注册默认的 server_import 处理器
    this.protocolService?.registerHandler('server_import', async data => {
      logger.info('MiraApplication', 'Handling server_import protocol', { data })

      try {
        // 确保主窗口可见
        this.showMainWindow()

        // 发送服务器导入数据到渲染进程
        this.windows.send('protocol:server-import', data)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('MiraApplication', `Error handling server_import: ${errorMessage}`)
      }
    })

    // 注册 openTab 处理器 - 从 dashboard 等外部来源打开 Tab
    this.protocolService?.registerHandler('openTab', async data => {
      logger.info('MiraApplication', 'Handling openTab protocol', { data })

      try {
        this.showMainWindow()
        this.windows.send('protocol:open-tab', data)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('MiraApplication', `Error handling openTab: ${errorMessage}`)
      }
    })
  }

  private setupTray() {
    // 检查托盘是否支持
    if (!this.trayService?.isSupported()) {
      logger.warn('MiraApplication', 'System tray is not supported on this platform')
      return
    }

    // 初始化托盘服务
    const win = this.windows.getWindow()
    if (win) {
      this.trayService?.init(win, () => this.showMainWindow())
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 保存窗口状态
    this.windows.saveState()
    this.browserViews.destroyViews()

    for (const channel of [
      'browser-view:set-enabled',
      'browser-view:switch',
      'browser-view:get-state',
      'browser-view:close-current',
      'browser-view:close-others',
      'browser-view:previous',
      'browser-view:next',
    ]) {
      ipcMain.removeHandler(channel)
    }

    // 移除 IPC 处理器
    if (this.ipcHandlers) {
      this.ipcHandlers.removeAllHandlers()
      this.ipcHandlers = null
    }

    // 清理协议服务
    this.protocolService?.cleanup()
    this.protocolService = null

    // 清理托盘服务（macOS 下托盘残留是进程不退出的常见原因）
    this.trayService?.cleanup()
    this.trayService = null

    // 强制销毁所有窗口，避免残留句柄阻止退出
    this.windows.destroyAll()

    // 关闭 procm room 客户端
    closeProcm()
  }
}

// 创建应用实例
new MiraApplication()
