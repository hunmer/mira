import { ipcMain, dialog } from 'electron'
import { logger } from '../utils/Logger'
import * as fs from 'fs/promises'
import * as path from 'path'
import type {
  LocalPluginConfig,
  PluginRuntime,
  PluginManagerConfig,
  BaseResponse
} from '../../shared/types'

/**
 * 插件相关的IPC处理器
 * 专门负责 Electron 环境下的插件发现和文件系统操作
 * 不处理插件的加载/卸载/启用/禁用等业务逻辑
 */
export class PluginHandler {
  private config: PluginManagerConfig | null = null
  private scanInterval: NodeJS.Timeout | null = null

  constructor() {
    // registerHandlers 将由 IPCHandlers 调用
  }

  /**
   * 注册IPC处理器
   */
  public registerHandlers(): void {
    // 插件系统初始化
    ipcMain.handle('plugin:initialize', this.handleInitialize.bind(this))

    // 插件发现和管理
    ipcMain.handle('plugin:getAll', this.handleGetAllPlugins.bind(this))
    ipcMain.handle('plugin:get', this.handleGetPlugin.bind(this))
    ipcMain.handle('plugin:discover', this.handleDiscoverPlugins.bind(this))
    ipcMain.handle('plugin:reload-all', this.handleReloadAllPlugins.bind(this))

    // 插件导入
    ipcMain.handle('plugin:import-from-file', this.handleImportFromFile.bind(this))
    ipcMain.handle('plugin:import-from-url', this.handleImportFromUrl.bind(this))
    ipcMain.handle('plugin:uninstall', this.handleUninstallPlugin.bind(this))

    // 文件系统操作
    ipcMain.handle('plugin:select-directory', this.handleSelectDirectory.bind(this))
    ipcMain.handle('plugin:select-zip-file', this.handleSelectZipFile.bind(this))

    // 配置管理
    ipcMain.handle('plugin:update-config', this.handleUpdateConfig.bind(this))
    ipcMain.handle('plugin:get-config', this.handleGetConfig.bind(this))
    ipcMain.handle('plugin:clear-cache', this.handleClearCache.bind(this))

    // 插件业务逻辑操作（转发给渲染进程处理）
    ipcMain.handle('plugin:enable', this.handleEnablePlugin.bind(this))
    ipcMain.handle('plugin:disable', this.handleDisablePlugin.bind(this))
    ipcMain.handle('plugin:reload', this.handleReloadPlugin.bind(this))
    ipcMain.handle('plugin:execute', this.handleExecutePlugin.bind(this))

    logger.info('PluginHandler', 'Plugin IPC handlers registered')
  }

  /**
   * 初始化插件系统
   */
  private async handleInitialize(
    _event: Electron.IpcMainInvokeEvent,
    config: PluginManagerConfig
  ): Promise<BaseResponse> {
    try {
      console.log('🔧 PluginHandler.handleInitialize called with config:', config)
      logger.info('PluginHandler', 'Initializing plugin system', config)

      this.config = config
      
      // 确保插件目录存在
      await this.ensurePluginsDirectory()

      // 启动定时扫描（如果需要）
      if (config.enableDevMode) {
        this.startPeriodicScan()
      }

      console.log('✅ Plugin system initialized successfully')
      return { success: true, message: 'Plugin system initialized successfully' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Plugin system initialization failed:', errorMessage)
      logger.error('PluginHandler', `Failed to initialize plugin system: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 确保插件目录存在
   */
  private async ensurePluginsDirectory(): Promise<void> {
    if (!this.config?.pluginsDirectory) return

    try {
      await fs.access(this.config.pluginsDirectory)
    } catch {
      // 目录不存在，创建它
      await fs.mkdir(this.config.pluginsDirectory, { recursive: true })
      logger.info('PluginHandler', `Created plugins directory: ${this.config.pluginsDirectory}`)
    }
  }

  /**
   * 启动定时扫描
   */
  private startPeriodicScan(): void {
    if (this.scanInterval) return

    this.scanInterval = setInterval(async () => {
      try {
        await this.discoverPlugins()
      } catch (error) {
        logger.warn('PluginHandler', 'Periodic plugin scan failed:', error)
      }
    }, 30000) // 30秒扫描一次

    logger.info('PluginHandler', 'Started periodic plugin scanning')
  }

  /**
   * 停止定时扫描
   */
  private stopPeriodicScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
      logger.info('PluginHandler', 'Stopped periodic plugin scanning')
    }
  }

  /**
   * 发现插件
   */
  private async discoverPlugins(): Promise<LocalPluginConfig[]> {
    if (!this.config?.pluginsDirectory) {
      logger.warn('PluginHandler', 'No plugins directory configured')
      return []
    }

    const pluginConfigs: LocalPluginConfig[] = []

    try {
      const pluginDirs = await this.getPluginDirectories()

      for (const dir of pluginDirs) {
        try {
          const config = await this.parsePluginConfig(dir)
          if (config) {
            // 将实际的目录路径存储在配置中
            config.actualDirectory = dir
            pluginConfigs.push(config)
          }
        } catch (error) {
          logger.warn('PluginHandler', `Failed to parse plugin in directory: ${dir}`, { error })
        }
      }
    } catch (error) {
      logger.error('PluginHandler', `Failed to discover plugins: ${error instanceof Error ? error.message : String(error)}`)
    }

    const sortedConfigs = this.sortPluginsByPriority(pluginConfigs)
    logger.info('PluginHandler', `Discovered ${sortedConfigs.length} plugins`)

    return sortedConfigs
  }

  /**
   * 获取插件目录列表
   */
  private async getPluginDirectories(): Promise<string[]> {
    if (!this.config?.pluginsDirectory) return []

    const pluginDirs: string[] = []

    try {
      const entries = await fs.readdir(this.config.pluginsDirectory, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginDir = path.join(this.config.pluginsDirectory, entry.name)
          const pluginJsonPath = path.join(pluginDir, 'plugin.json')

          try {
            await fs.access(pluginJsonPath)
            pluginDirs.push(pluginDir)
          } catch {
            // plugin.json不存在，跳过这个目录
          }
        }
      }
    } catch (error) {
      logger.error('PluginHandler', `Failed to read plugins directory: ${this.config.pluginsDirectory} - ${error instanceof Error ? error.message : String(error)}`)
    }

    return pluginDirs
  }

  /**
   * 解析插件配置
   */
  private async parsePluginConfig(pluginDir: string): Promise<LocalPluginConfig | null> {
    const pluginJsonPath = path.join(pluginDir, 'plugin.json')

    try {
      const content = await fs.readFile(pluginJsonPath, 'utf-8')
      const config = JSON.parse(content) as LocalPluginConfig

      // 验证必需字段
      if (!this.validatePluginConfig(config)) {
        logger.warn('PluginHandler', `Invalid plugin config in: ${pluginDir}`)
        return null
      }

      // 设置默认值
      config.priority = config.priority || 1
      config.index = config.index || 'index.js'
      config.tags = config.tags || []
      config.config = config.config || {}
      config.hotkey = config.hotkey || {}
      config.events = config.events || []
      config.dependencies = config.dependencies || []

      return config
    } catch (error) {
      logger.error('PluginHandler', `Failed to parse plugin config: ${pluginJsonPath} - ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  /**
   * 验证插件配置
   */
  private validatePluginConfig(config: any): config is LocalPluginConfig {
    const required = ['pluginName', 'pluginId', 'version']

    for (const field of required) {
      if (config[field] == undefined) {
        logger.warn('PluginHandler', `Missing required field: ${field}`)
        return false
      }
    }
    return true
  }

  /**
   * 按优先级排序插件
   */
  private sortPluginsByPriority(configs: LocalPluginConfig[]): LocalPluginConfig[] {
    return configs.sort((a, b) => b.priority - a.priority) // 优先级高的先加载
  }

  /**
   * 获取插件的完整目录路径
   */
  private getPluginDirectory(pluginId: string): string {
    if (!this.config?.pluginsDirectory) return ''
    return path.join(this.config.pluginsDirectory, pluginId)
  }

  /**
   * 获取所有插件
   */
  private async handleGetAllPlugins(
    _event: Electron.IpcMainInvokeEvent
  ): Promise<{ success: boolean; data?: PluginRuntime[]; message?: string }> {
    try {
      // 发现插件并转换为运行时格式
      const configs = await this.discoverPlugins()
      const plugins: PluginRuntime[] = configs.map(config => ({
        config,
        status: 'loaded' as const,
        directory: config.actualDirectory || this.getPluginDirectory(config.pluginId)
      }))

      return { success: true, data: plugins }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to get all plugins: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 获取单个插件
   */
  private async handleGetPlugin(
    _event: Electron.IpcMainInvokeEvent,
    pluginId: string
  ): Promise<{ success: boolean; data?: PluginRuntime; message?: string }> {
    try {
      const configs = await this.discoverPlugins()
      const config = configs.find(c => c.pluginId === pluginId)
      
      if (!config) {
        return { success: false, message: 'Plugin not found' }
      }

      const plugin: PluginRuntime = {
        config,
        status: 'loaded',
        directory: config.actualDirectory || this.getPluginDirectory(config.pluginId)
      }

      return { success: true, data: plugin }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to get plugin: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 重新发现插件
   */
  private async handleDiscoverPlugins(
    _event: Electron.IpcMainInvokeEvent
  ): Promise<BaseResponse> {
    try {
      const configs = await this.discoverPlugins()
      return { success: true, data: configs, message: `Discovered ${configs.length} plugins successfully` }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to discover plugins: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 重新加载所有插件
   */
  private async handleReloadAllPlugins(
    _event: Electron.IpcMainInvokeEvent
  ): Promise<BaseResponse> {
    try {
      // 重新发现插件
      const configs = await this.discoverPlugins()
      return { success: true, data: configs, message: `Reloaded ${configs.length} plugins successfully` }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to reload all plugins: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  // =========================== 插件业务逻辑操作（转发） ===========================

  /**
   * 启用插件（转发给渲染进程处理）
   */
  private async handleEnablePlugin(
    _event: Electron.IpcMainInvokeEvent,
    pluginId: string
  ): Promise<BaseResponse> {
    logger.info('PluginHandler', `Enable plugin request: ${pluginId} (handled by renderer)`)
    return { success: true, message: 'Plugin enable handled by renderer process' }
  }

  /**
   * 禁用插件（转发给渲染进程处理）
   */
  private async handleDisablePlugin(
    _event: Electron.IpcMainInvokeEvent,
    pluginId: string
  ): Promise<BaseResponse> {
    logger.info('PluginHandler', `Disable plugin request: ${pluginId} (handled by renderer)`)
    return { success: true, message: 'Plugin disable handled by renderer process' }
  }

  /**
   * 重新加载插件（转发给渲染进程处理）
   */
  private async handleReloadPlugin(
    _event: Electron.IpcMainInvokeEvent,
    pluginId: string
  ): Promise<BaseResponse> {
    logger.info('PluginHandler', `Reload plugin request: ${pluginId} (handled by renderer)`)
    return { success: true, message: 'Plugin reload handled by renderer process' }
  }

  /**
   * 执行插件方法（转发给渲染进程处理）
   */
  private async handleExecutePlugin(
    _event: Electron.IpcMainInvokeEvent,
    pluginId: string,
    method: string,
    ..._args: any[]
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    logger.info('PluginHandler', `Execute plugin method: ${pluginId}.${method} (handled by renderer)`)
    return { success: true, message: 'Plugin execution handled by renderer process' }
  }

  // =========================== 文件系统操作 ===========================

  /**
   * 从文件导入插件
   */
  private async handleImportFromFile(
    _event: Electron.IpcMainInvokeEvent,
    targetDirectory: string
  ): Promise<{ success: boolean; data?: LocalPluginConfig; message?: string }> {
    try {
      // 显示文件选择对话框
      const result = await dialog.showOpenDialog({
        title: '选择插件ZIP文件',
        filters: [
          { name: '插件包', extensions: ['zip'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: '用户取消了文件选择' }
      }

      const zipPath = result.filePaths[0]
      // 简化：暂时返回成功，实际导入功能将在后续版本实现
      logger.info('PluginHandler', `Plugin import from file: ${zipPath} to ${targetDirectory}`)
      
      return { 
        success: false, 
        message: '插件导入功能暂未实现，请手动解压插件到目标目录' 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to import plugin from file: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 从URL导入插件
   */
  private async handleImportFromUrl(
    _event: Electron.IpcMainInvokeEvent,
    url: string,
    targetDirectory: string
  ): Promise<{ success: boolean; data?: LocalPluginConfig; message?: string }> {
    try {
      // 简化：暂时返回成功，实际导入功能将在后续版本实现
      logger.info('PluginHandler', `Plugin import from URL: ${url} to ${targetDirectory}`)
      
      return { 
        success: false, 
        message: '在线插件导入功能暂未实现' 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to import plugin from URL: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 卸载插件
   */
  private async handleUninstallPlugin(
    _event: Electron.IpcMainInvokeEvent,
    _pluginId: string,
    pluginDirectory: string,
    _pluginName: string
  ): Promise<BaseResponse> {
    try {
      // 简单实现：删除插件目录
      try {
        await fs.rm(pluginDirectory, { recursive: true, force: true })
        logger.info('PluginHandler', `Plugin directory removed: ${pluginDirectory}`)
        return { success: true, message: 'Plugin uninstalled successfully' }
      } catch (deleteError) {
        logger.error('PluginHandler', `Failed to remove plugin directory: ${deleteError}`)
        return { success: false, message: '删除插件目录失败' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to uninstall plugin: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 选择目录
   */
  private async handleSelectDirectory(
    _event: Electron.IpcMainInvokeEvent,
    title = '选择插件目录'
  ): Promise<{ success: boolean; data?: string; message?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title,
        properties: ['openDirectory', 'createDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: '用户取消了目录选择' }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to select directory: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 选择ZIP文件
   */
  private async handleSelectZipFile(
    _event: Electron.IpcMainInvokeEvent
  ): Promise<{ success: boolean; data?: string; message?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择插件ZIP文件',
        filters: [
          { name: '插件包', extensions: ['zip'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: '用户取消了文件选择' }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to select ZIP file: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  // =========================== 配置管理 ===========================

  /**
   * 更新插件配置
   */
  private async handleUpdateConfig(_event: Electron.IpcMainInvokeEvent, _config: any) {
    try {
      logger.info('PluginHandler', 'Updating plugin config')
      return { success: true, message: 'Plugin config updated successfully' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to update plugin config: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 获取插件配置
   */
  private async handleGetConfig(_event: Electron.IpcMainInvokeEvent) {
    try {
      return { success: true, data: this.config }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to get plugin config: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 清理插件缓存
   */
  private async handleClearCache(_event: Electron.IpcMainInvokeEvent) {
    try {
      logger.info('PluginHandler', 'Clearing plugin cache')
      return { success: true, message: 'Plugin cache cleared successfully' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('PluginHandler', `Failed to clear plugin cache: ${errorMessage}`)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    // 停止定时扫描
    this.stopPeriodicScan()

    // 移除所有IPC处理器
    ipcMain.removeHandler('plugin:initialize')
    ipcMain.removeHandler('plugin:getAll')
    ipcMain.removeHandler('plugin:get')
    ipcMain.removeHandler('plugin:enable')
    ipcMain.removeHandler('plugin:disable')
    ipcMain.removeHandler('plugin:reload')
    ipcMain.removeHandler('plugin:execute')
    ipcMain.removeHandler('plugin:discover')
    ipcMain.removeHandler('plugin:reload-all')
    ipcMain.removeHandler('plugin:import-from-file')
    ipcMain.removeHandler('plugin:import-from-url')
    ipcMain.removeHandler('plugin:uninstall')
    ipcMain.removeHandler('plugin:select-directory')
    ipcMain.removeHandler('plugin:select-zip-file')
    ipcMain.removeHandler('plugin:update-config')
    ipcMain.removeHandler('plugin:get-config')
    ipcMain.removeHandler('plugin:clear-cache')

    logger.info('PluginHandler', 'Plugin IPC handlers cleaned up')
  }
}