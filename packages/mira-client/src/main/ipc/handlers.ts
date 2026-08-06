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
import { NotificationHandlers } from './NotificationHandlers'
import { ServerDeployHandlers } from './ServerDeployHandlers'
import { PluginWindowHandlers } from './PluginWindowHandlers'
import { getAutoUpdater } from '../services/useAutoUpdater'

/**
 * IPC 通信处理器
 * 处理渲染进程和主进程之间的通信
 */
export class IPCHandlers {
  private pluginHandler: PluginHandler
  private dragDropHandler: DragDropHandler
  private protocolHandlers: ProtocolHandlers
  private trayHandlers: TrayHandlers
  private appHandlers: AppHandlers
  private fileSystemHandlers: FileSystemHandlers
  private systemHandlers: SystemHandlers
  private searchWindowHandlers: SearchWindowHandlers
  private notificationWindowHandlers: NotificationWindowHandlers
  private floatingBallHandlers: FloatingBallWindowHandlers
  private menuHandlers: MenuHandlers
  private shortcutHandlers: ShortcutHandlers
  private autoUpdateHandlers: AutoUpdateHandlers
  private notificationHandlers: NotificationHandlers
  private serverDeployHandlers: ServerDeployHandlers
  private pluginWindowHandlers: PluginWindowHandlers

  constructor() {
    this.pluginHandler = new PluginHandler()
    this.dragDropHandler = new DragDropHandler()
    this.protocolHandlers = new ProtocolHandlers()
    this.trayHandlers = new TrayHandlers()
    this.appHandlers = new AppHandlers()
    this.fileSystemHandlers = new FileSystemHandlers()
    this.systemHandlers = new SystemHandlers()
    this.searchWindowHandlers = new SearchWindowHandlers()
    this.notificationWindowHandlers = new NotificationWindowHandlers()
    this.floatingBallHandlers = new FloatingBallWindowHandlers()
    this.menuHandlers = new MenuHandlers()
    this.shortcutHandlers = new ShortcutHandlers()
    this.autoUpdateHandlers = new AutoUpdateHandlers()
    this.notificationHandlers = new NotificationHandlers()
    this.serverDeployHandlers = new ServerDeployHandlers()
    // 插件窗口处理器依赖 pluginHandler 解析插件目录
    this.pluginWindowHandlers = new PluginWindowHandlers(this.pluginHandler)

    // 注册本地插件管理
    this.pluginHandler.registerHandlers()

    // 注册插件窗口管理（打开插件 dist 的独立 BrowserWindow）
    this.pluginWindowHandlers.registerHandlers()

    // 注册自动更新
    this.autoUpdateHandlers.registerHandlers()

    // 注册搜索结果处理
    this.registerSearchResultHandlers()
  }

  /**
   * 设置主窗口引用，让各个处理器可以使用
   */
  public setMainWindow(window: BrowserWindow): void {
    this.menuHandlers.setMainWindow(window)
    this.shortcutHandlers.setMainWindow(window)
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
    console.log('🔄 [IPCHandlers] 收到主渲染进程搜索结果:', result)
    console.log('🔄 [IPCHandlers] 结果类型:', result?.type)
    console.log('🔄 [IPCHandlers] 结果数据数量:', result?.results?.length || 0)

    // 将搜索结果转发给搜索窗口
    this.searchWindowHandlers.forwardResultToSearchWindow(result)
    console.log('✅ [IPCHandlers] 已转发搜索结果到搜索窗口')
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

    // 清理剩余的监听器
    ipcMain.removeAllListeners('protocol:register-handler')
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

    // 清理后端部署处理器
    this.serverDeployHandlers.cleanup()

    // 清理插件窗口处理器
    this.pluginWindowHandlers.cleanup()
  }
}
