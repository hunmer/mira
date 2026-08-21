import { ipcMain, BrowserWindow } from 'electron'
import { PluginHandler } from '../handlers/PluginHandler'
import { DragDropHandler } from '../handlers/DragDropHandler'
import { ProtocolHandlers } from './ProtocolHandlers'
import { TrayHandlers } from './TrayHandlers'
import { AppHandlers } from './AppHandlers'
import { FileSystemHandlers } from './FileSystemHandlers'
import { SystemHandlers } from './SystemHandlers'
import { SearchWindowHandlers } from './SearchWindowHandlers'
import { NotificationWindowHandlers } from './NotificationWindowHandlers'
import { FloatingBallWindowHandlers } from './FloatingBallWindowHandlers'
import { MenuHandlers } from './MenuHandlers'
import { ShortcutHandlers } from './ShortcutHandlers'
import { AutoUpdateHandlers } from './AutoUpdateHandlers'
import { NetworkHandlers } from './NetworkHandlers'
import { NotificationHandlers } from './NotificationHandlers'
import { ServerDeployHandlers } from './ServerDeployHandlers'
import { ServerControlHandlers } from './ServerControlHandlers'
import { PluginWindowHandlers } from './PluginWindowHandlers'
import { PluginExecHandlers } from './PluginExecHandlers'
import { LoginWindowHandlers } from './LoginWindowHandlers'
import { getAutoUpdater } from '../services/useAutoUpdater'
import { getProcmLogger } from '../services/ProcmService'
import { ProtocolService } from '../services/ProtocolService'
import { ScreenshotHandlers } from './ScreenshotHandlers'

type RendererLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

function emitRendererLog(level: RendererLogLevel, args: any[]): void {
  // Keep the complete console argument list in one structured payload. The
  // dashboard renders this array with a single JSON Viewer.
  const message = ''
  const procmLogger = getProcmLogger()
  if (level === 'warn') procmLogger.warn(message, args)
  else if (level === 'error') procmLogger.error(message, args)
  else if (level === 'debug') procmLogger.debug(message, args)
  else procmLogger.info(message, args)
}

/**
 * IPC 通信处理器
 * 处理渲染进程和主进程之间的通信
 */
export class IPCHandlers {
  private pluginHandler: PluginHandler
  private searchWindowHandlers: SearchWindowHandlers
  private notificationWindowHandlers: NotificationWindowHandlers
  private floatingBallHandlers: FloatingBallWindowHandlers
  private menuHandlers: MenuHandlers
  private shortcutHandlers: ShortcutHandlers
  private autoUpdateHandlers: AutoUpdateHandlers
  private networkHandlers: NetworkHandlers
  private serverDeployHandlers: ServerDeployHandlers
  private serverControlHandlers: ServerControlHandlers
  private pluginWindowHandlers: PluginWindowHandlers
  private pluginExecHandlers: PluginExecHandlers
  private appHandlers: AppHandlers
  private loginWindowHandlers: LoginWindowHandlers
  private screenshotHandlers: ScreenshotHandlers

  constructor() {
    this.pluginHandler = new PluginHandler()
    // 这些 handler 在构造时即注册各自的 IPC 监听，实例只需保持存活即可
    new DragDropHandler()
    new ProtocolHandlers()
    ipcMain.handle('library-cache:clear', async (_event, libraryId?: string) => {
      await ProtocolService.getInstance().clearLibraryCache(libraryId)
      return { success: true }
    })
    new TrayHandlers()
    this.appHandlers = new AppHandlers()
    new FileSystemHandlers()
    new SystemHandlers()
    new NotificationHandlers()
    this.searchWindowHandlers = new SearchWindowHandlers()
    this.notificationWindowHandlers = new NotificationWindowHandlers()
    this.floatingBallHandlers = new FloatingBallWindowHandlers()
    this.menuHandlers = new MenuHandlers()
    this.shortcutHandlers = new ShortcutHandlers()
    this.screenshotHandlers = new ScreenshotHandlers()
    this.autoUpdateHandlers = new AutoUpdateHandlers()
    this.networkHandlers = new NetworkHandlers()
    this.serverDeployHandlers = new ServerDeployHandlers()
    this.serverControlHandlers = new ServerControlHandlers()
    // 插件窗口处理器依赖 pluginHandler 解析插件目录
    this.pluginWindowHandlers = new PluginWindowHandlers(this.pluginHandler)
    // 登录子窗口处理器依赖 AppHandlers（取 dashboard 窗口引用回传 cookie）
    this.loginWindowHandlers = new LoginWindowHandlers(this.appHandlers)

    // 注册本地插件管理
    this.pluginHandler.registerHandlers()

    // 注册插件窗口管理（打开插件 dist 的独立 BrowserWindow）
    this.pluginWindowHandlers.registerHandlers()

    // 注册插件窗口受控执行（白名单 spawn + 最小文件原语）
    this.pluginExecHandlers = new PluginExecHandlers()
    this.pluginExecHandlers.registerHandlers()

    // 注册登录子窗口管理（dashboard 设置页 → 弹窗提取 cookie）
    this.loginWindowHandlers.registerHandlers()

    // 注册自动更新
    this.autoUpdateHandlers.registerHandlers()

    // 注册网络/代理管理
    this.networkHandlers.registerHandlers()

    // 注册搜索结果处理
    this.registerSearchResultHandlers()

    // console hook/preload 将 renderer 日志通过受限 IPC 转发到 main，
    // 由 main Logger 统一写入 electron-log 和 procm 结构化日志。
    ipcMain.on('renderer-log', (_event, level: RendererLogLevel, ...args: any[]) => {
      if (!['log', 'info', 'warn', 'error', 'debug'].includes(level)) return
      // Preserve the complete console argument list in one structured entry;
      // LogPanel renders the array through a single JSON Viewer.
      emitRendererLog(level, args)
    })
  }

  /**
   * 设置主窗口引用，让各个处理器可以使用
   */
  public setMainWindow(window: BrowserWindow): void {
    this.menuHandlers.setMainWindow(window)
    this.shortcutHandlers.setMainWindow(window)
    this.screenshotHandlers.setMainWindow(window)
    getAutoUpdater().setMainWindow(window)
    this.serverDeployHandlers.setMainWindow(window)
  }

  /**
   * 注册搜索结果处理器
   */
  private registerSearchResultHandlers(): void {
    ipcMain.handle('search-result-from-main-renderer', this.handleSearchResultFromMainRenderer.bind(this))
  }

  /**
   * 处理来自主渲染进程的搜索结果
   */
  private async handleSearchResultFromMainRenderer(_event: any, result: any): Promise<void> {
    // 将搜索结果转发给搜索窗口
    this.searchWindowHandlers.forwardResultToSearchWindow(result)
  }

  /**
   * 获取搜索窗口实例
   */
  public getSearchWindow(): BrowserWindow | null {
    return this.searchWindowHandlers.getSearchWindow()
  }

  /**
   * 创建搜索窗口
   */
  public createSearchWindow(): BrowserWindow {
    return this.searchWindowHandlers.createSearchWindow()
  }

  /**
   * 显示搜索窗口
   */
  public async showSearchWindow(): Promise<void> {
    return this.searchWindowHandlers.showSearchWindow()
  }

  /**
   * 隐藏搜索窗口
   */
  public async hideSearchWindow(): Promise<void> {
    return this.searchWindowHandlers.hideSearchWindow()
  }

  /**
   * 切换搜索窗口显示状态
   */
  public async toggleSearchWindow(): Promise<void> {
    return this.searchWindowHandlers.toggleSearchWindow()
  }

  /**
   * 设置搜索窗口引用，用于外部管理
   */
  public setSearchWindow(window: BrowserWindow | null): void {
    this.searchWindowHandlers.setSearchWindow(window)
  }

  /**
   * 向搜索窗口发送消息
   */
  public sendMessageToSearchWindow(message: any): void {
    this.searchWindowHandlers.sendMessageToSearchWindow(message)
  }

  /**
   * 获取通知窗口处理器
   */
  public getNotificationWindowHandlers(): NotificationWindowHandlers {
    return this.notificationWindowHandlers
  }

  /**
   * 获取悬浮球窗口处理器
   */
  public getFloatingBallHandlers(): FloatingBallWindowHandlers {
    return this.floatingBallHandlers
  }

  /**
   * 获取快捷键处理器
   */
  public getShortcutHandlers(): ShortcutHandlers {
    return this.shortcutHandlers
  }

  /**
   * 移除所有 IPC 处理器
   */
  public removeAllHandlers(): void {
    // 清理各个处理器
    this.pluginHandler.cleanup()
    this.searchWindowHandlers.cleanup()
    this.notificationWindowHandlers.cleanup()
    this.floatingBallHandlers.cleanup()
    this.menuHandlers.removeAllHandlers()
    this.shortcutHandlers.cleanup()
    this.screenshotHandlers.cleanup()

    // 清理剩余的监听器
    ipcMain.removeAllListeners('protocol:register-handler')
    for (const channel of ['screenshot:start', 'screenshot:get-source', 'screenshot:capture', 'screenshot:complete', 'screenshot:cancel']) {
      ipcMain.removeHandler(channel)
    }
    ipcMain.removeAllListeners('protocol:unregister-handler')
    ipcMain.removeAllListeners('protocol:get-handlers')
    ipcMain.removeAllListeners('protocol:create-url')
    ipcMain.removeAllListeners('tray:update-settings')
    ipcMain.removeAllListeners('tray:get-settings')
    ipcMain.removeAllListeners('tray:is-supported')
    ipcMain.removeAllListeners('tray:flash')
    ipcMain.removeAllListeners('tray:set-tooltip')
    ipcMain.removeAllListeners('window:close')
    ipcMain.removeAllListeners('window:minimize')
    ipcMain.removeAllListeners('window:maximize')
    ipcMain.removeAllListeners('window:setFullScreen')
    ipcMain.removeAllListeners('app:quit')
    ipcMain.removeAllListeners('app:getVersion')
    ipcMain.removeAllListeners('app:getPath')
    ipcMain.removeAllListeners('server-autostart:get')
    ipcMain.removeAllListeners('server-autostart:set')
    ipcMain.removeAllListeners('server-autostart:wait-ready')
    ipcMain.removeAllListeners('renderer-log')

    // 文件系统操作
    ipcMain.removeAllListeners('fs:readDir')
    ipcMain.removeAllListeners('fs:readFile')
    ipcMain.removeAllListeners('fs:writeFile')
    ipcMain.removeAllListeners('fs:exists')
    ipcMain.removeAllListeners('fs:selectDirectory')
    ipcMain.removeAllListeners('fs:selectFile')

    // 系统信息
    ipcMain.removeAllListeners('system:getPlatform')
    ipcMain.removeAllListeners('system:getArch')

    // 剪贴板操作
    ipcMain.removeAllListeners('clipboard:writeText')
    ipcMain.removeAllListeners('clipboard:readText')
    ipcMain.removeAllListeners('clipboard:writeImage')

    // 快捷键操作
    ipcMain.removeAllListeners('shortcut:register')
    ipcMain.removeAllListeners('shortcut:unregister')
    ipcMain.removeAllListeners('shortcut:unregister-all')
    ipcMain.removeAllListeners('shortcut:get-registered')

    // 开发者工具操作
    ipcMain.removeAllListeners('dev:toggle-devtools')
    ipcMain.removeAllListeners('dev:force-reload')

    // 清理自动更新处理器
    this.autoUpdateHandlers.cleanup()

    // 清理网络/代理处理器
    this.networkHandlers.cleanup()

    // 清理后端部署处理器
    this.serverDeployHandlers.cleanup()

    // 清理后端运行控制处理器
    this.serverControlHandlers.cleanup()
    ipcMain.removeAllListeners('server-control:start')
    ipcMain.removeAllListeners('server-control:stop')
    ipcMain.removeAllListeners('server-control:restart')
    ipcMain.removeAllListeners('server-control:status')

    // 清理插件窗口处理器
    this.pluginWindowHandlers.cleanup()

    // 清理插件受控执行任务
    this.pluginExecHandlers.cleanup()

    // 清理登录子窗口处理器
    this.loginWindowHandlers.cleanup()
  }
}
