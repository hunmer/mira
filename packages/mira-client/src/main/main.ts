import { app, BrowserWindow, ipcMain, session } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { IPCHandlers } from './ipc/handlers'
import { ProtocolService } from './services/ProtocolService'
import { TrayService } from './services/TrayService'
import { MainWindowService } from './services/MainWindowService'
import { DownloadService } from './services/DownloadService'
import { logger } from './utils/Logger'
import { getAutoUpdater } from './services/useAutoUpdater'
import { ensureLocalServerStarted, runLocalServerScriptSync } from './services/LocalServerService'

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

// Electron 主进程
class MiraApplication {
  private windows: MainWindowService = new MainWindowService()
  private ipcHandlers: IPCHandlers | null = null
  private protocolService: ProtocolService | null = null
  private trayService: TrayService | null = null
  private isQuitting = false

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

    // 记录启动参数，用于调试协议处理
    logger.debug('MiraApplication', 'Startup arguments', { argv: process.argv })

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
    app.on('second-instance', (_event, commandLine, workingDirectory) => {
      logger.info('MiraApplication', 'Second instance detected, focusing main window', {
        commandLine,
        workingDirectory,
      })

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
    logger.info('MiraApplication', 'Setting up application')

    // 当应用就绪时创建窗口
    app.whenReady().then(async () => {
      logger.info('MiraApplication', 'App is ready')

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
          logger.info('MiraApplication', '开始检查更新...')
          getAutoUpdater().checkForUpdates()
        }, 3000)
      }

      app.on('activate', () => {
        logger.debug('MiraApplication', 'App activated')
        this.showMainWindow()
      })
    })

    ipcMain.on('window:set-close-to-tray', (_event, enabled: boolean) => {
      this.windows.setCloseToTray(Boolean(enabled))
    })

    // 当所有窗口关闭时退出应用（除了 macOS）
    app.on('window-all-closed', () => {
      logger.info('MiraApplication', 'All windows closed')
      if (process.platform !== 'darwin' && (this.isQuitting || !this.trayService?.isActive())) {
        app.quit()
      }
    })

    // 应用即将退出
    app.on('before-quit', () => {
      this.isQuitting = true
      this.windows.prepareToQuit()
      logger.info('MiraApplication', 'App is about to quit')
      try {
        const output = runLocalServerScriptSync('stop')
        if (output) logger.info('LocalServerService', output)
      } catch (error) {
        logger.warn('LocalServerService', 'Local backend stop failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
      this.cleanup()
    })

    // 捕获退出信号，确保 macOS / 开发模式下也能干净退出
    // （vite-plugin-electron 在 macOS 下 Ctrl+C 经常不会触发 before-quit）
    const quitGracefully = (signal: NodeJS.Signals) => {
      logger.info('MiraApplication', `Received ${signal}, quitting...`)
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
   *   1. DownloadService.setProxy —— 设置 undici 全局 dispatcher（主进程 fetch）
   *   2. session.defaultSession.setProxy —— 渲染层 fetch（如插件市场目录拉取）
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
      logger.info('MiraApplication', `Persisted proxy applied (enabled=${enabled}, url=${url || '-'})`)
    } catch (err) {
      // 首次启动或文件不存在时静默使用直连
      logger.debug('MiraApplication', `No persisted proxy config, using direct connection (${err instanceof Error ? err.message : String(err)})`)
    }
  }

  private createMainWindow(): BrowserWindow {
    const win = this.windows.create()
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

    logger.info('MiraApplication', 'IPC handlers initialized')
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

    logger.info('MiraApplication', 'Protocol service initialized with server_import handler')
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
      logger.info('MiraApplication', 'Tray service initialized')
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    logger.info('MiraApplication', 'Starting application cleanup')

    // 保存窗口状态
    this.windows.saveState()

    // 移除 IPC 处理器
    if (this.ipcHandlers) {
      this.ipcHandlers.removeAllHandlers()
      this.ipcHandlers = null
      logger.debug('MiraApplication', 'IPC handlers removed')
    }

    // 清理协议服务
    this.protocolService?.cleanup()
    this.protocolService = null

    // 清理托盘服务（macOS 下托盘残留是进程不退出的常见原因）
    this.trayService?.cleanup()
    this.trayService = null

    // 强制销毁所有窗口，避免残留句柄阻止退出
    this.windows.destroyAll()

    logger.info('MiraApplication', 'Application cleanup completed')
  }
}

// 创建应用实例
new MiraApplication()
