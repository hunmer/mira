import type {
  LocalPluginConfig,
  PluginRuntime,
  PluginManagerConfig,
  BaseResponse,
  PluginContext,
  PluginWindowOpenOptions,
  MarketplaceCatalog,
  MarketplacePluginEntry,
  MarketplacePluginFile,
  PluginInstallProgress,
  PluginCustomTabDefinition
} from '../../shared/types'
import { toRaw } from 'vue'
import { pluginSystem } from './PluginSystemCore'
import { useConfirm } from '@renderer/composables/useConfirm'
import { useToast } from '@renderer/composables/useToast'
import { miraSDKService } from './MiraSDKService'
import { openPluginWindow, resolveServerPluginUrl } from '../plugins/openPluginWindow'

/**
 * 递归剥离对象的响应式 Proxy，返回可被 Electron IPC（structured clone）克隆的纯对象。
 * 用于在跨 IPC 边界前把 Vue/Pinia 的响应式状态转换为普通对象，避免
 * “对象不能被克隆”错误。
 */
const toPlainObject = <T>(obj: T): T => {
  const raw = toRaw(obj as any)
  if (raw === null || typeof raw !== 'object') return raw as T
  if (Array.isArray(raw)) {
    return raw.map((item) => toPlainObject(item)) as unknown as T
  }
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(raw)) {
    result[key] = toPlainObject((raw as Record<string, unknown>)[key])
  }
  return result as T
}
import ConfigStorage from '@renderer/utils/ConfigStorage'
import i18n from '../i18n'

const t = i18n.global.t.bind(i18n.global)

/**
 * 在线插件配置
 */
interface OnlinePluginConfig extends LocalPluginConfig {
  url: string // 插件的在线地址
  isOnline: true
  lastUpdated?: string
}

interface ServerPluginConfig extends OnlinePluginConfig {
  source: 'server'
  serverPluginName: string
  libraryId: string
}

/**
 * 前端插件管理服务
 * 统一管理本地和在线插件，支持 Electron 和 Web 环境
 * 本地插件通过IPC与主进程通信，在线插件存储在localStorage中
 */
export class PluginService {
  private static instance: PluginService | null = null
  private plugins = new Map<string, PluginRuntime>()
  private onlinePlugins = new Map<string, OnlinePluginConfig>() // 新增：用户添加的在线插件
  private serverPlugins = new Map<string, ServerPluginConfig>()
  private disabledServerPluginIds = new Set<string>()
  private config: PluginManagerConfig | null = null
  private isElectronEnvironment: boolean
  private isInitialized = false

  private constructor() {
    this.isElectronEnvironment = typeof window !== 'undefined' && !!(window as any).electronAPI
  }

  public static getInstance(): PluginService {
    if (!PluginService.instance) {
      PluginService.instance = new PluginService()
    }
    return PluginService.instance
  }

  /**
   * 是否已初始化
   */
  public get initialized(): boolean {
    return this.isInitialized
  }

  /**
   * 初始化插件服务
   */
  public async initialize(config: PluginManagerConfig): Promise<BaseResponse> {
    try {
      this.config = config
      
      // 加载在线插件配置
      await this.loadOnlinePluginsFromStorage()
      await this.loadDisabledServerPluginsFromStorage()
      
      // 在Electron环境中，初始化本地插件系统
      if (this.isElectronEnvironment) {
        const result = await (window as any).electronAPI.plugin.initialize(config)
        if (!result.success) {
          return result
        }
      }

      // 发现并加载所有插件（本地+在线）
      await this.discoverAndLoadPlugins()

      this.isInitialized = true
      return { success: true, message: 'Plugin service initialized successfully' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 发现并加载插件（合并本地和在线插件）
   */
  public async discoverAndLoadPlugins(): Promise<BaseResponse> {
    try {
      // 快照当前运行时状态：刷新（discover）时若某插件仍在运行（脚本已注入、
      // 实例已加载），需保留其 status/context，避免 UI 把"已加载"插件重置为
      // 禁用。store 的 restoreLocalPluginStates 仅在持久化有记录时才恢复，
      // 无法保证覆盖所有正在运行的插件，因此这里优先沿用运行时真实状态。
      const previousPlugins = new Map(this.plugins)
      this.plugins.clear()

      // 1. 加载本地插件（仅在Electron环境）
      if (this.isElectronEnvironment) {
        const result = await (window as any).electronAPI.plugin.getAll()

        if (result.success && result.data) {
          for (const runtime of result.data) {
            // 若该插件此前已在运行（status 非 disabled），保留其真实状态与上下文；
            // 否则默认禁用，交由 store 的 restoreLocalPluginStates 处理启用状态。
            const existing = previousPlugins.get(runtime.config.pluginId)
            const keepRuntime = existing && existing.status !== 'disabled'
            const pluginRuntime: PluginRuntime = {
              ...runtime,
              status: keepRuntime ? existing!.status : 'disabled',
              context: keepRuntime ? existing!.context : undefined
            }
            this.plugins.set(runtime.config.pluginId, pluginRuntime)
          }
        }
      }

      // 2. 加载在线插件
      for (const [pluginId, config] of this.onlinePlugins) {
        const runtime: PluginRuntime = {
          config,
          status: 'loaded',
          directory: config.url, // 对于在线插件，directory 是URL
          context: this.createPluginContext(config) // 为在线插件也创建上下文
        }
        this.plugins.set(pluginId, runtime)
      }

      // 3. 服务端 Web 插件使用相同的远程脚本加载机制，但不属于本地安装项
      for (const [pluginId, config] of this.serverPlugins) {
        this.plugins.set(pluginId, {
          config,
          status: this.disabledServerPluginIds.has(pluginId) ? 'disabled' : 'loaded',
          directory: config.url,
          context: this.createPluginContext(config)
        })
      }

      return {
        success: true, 
        data: Array.from(this.plugins.values()),
        message: `Loaded ${this.plugins.size} plugins successfully` 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 添加在线插件
   */
  public async addOnlinePlugin(config: Omit<OnlinePluginConfig, 'isOnline'>): Promise<BaseResponse> {
    try {
      const onlineConfig: OnlinePluginConfig = {
        ...config,
        isOnline: true,
        lastUpdated: new Date().toISOString()
      }

      // 检查插件ID是否已存在
      if (this.onlinePlugins.has(config.pluginId) || this.plugins.has(config.pluginId)) {
        return { success: false, message: t('services.plugin.pluginIdExists') }
      }

      // 添加到在线插件映射
      this.onlinePlugins.set(config.pluginId, onlineConfig)

      // 创建运行时实例
      const runtime: PluginRuntime = {
        config: onlineConfig,
        status: 'loaded',
        directory: config.url,
        context: this.createPluginContext(onlineConfig) // 为新添加的在线插件创建上下文
      }
      this.plugins.set(config.pluginId, runtime)

      // 持久化到本地存储
      await this.saveOnlinePluginsToStorage()

      return { success: true, message: 'Online plugin added successfully' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 移除在线插件
   */
  public async removeOnlinePlugin(pluginId: string): Promise<BaseResponse> {
    try {
      const config = this.onlinePlugins.get(pluginId)
      if (!config) {
        return { success: false, message: t('services.plugin.onlinePluginNotFound') }
      }

      // 从映射中移除
      this.onlinePlugins.delete(pluginId)
      this.plugins.delete(pluginId)

      // 持久化到本地存储
      await this.saveOnlinePluginsToStorage()

      return { success: true, message: 'Online plugin removed successfully' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 从本地存储加载在线插件配置
   */
  private async loadOnlinePluginsFromStorage(): Promise<void> {
    try {
      const stored = await ConfigStorage.getItem('mira-online-plugins')
      if (stored) {
        const configs: OnlinePluginConfig[] = JSON.parse(stored)
        this.onlinePlugins.clear()
        
        for (const config of configs) {
          this.onlinePlugins.set(config.pluginId, config)
        }
      }
    } catch (error) {
      console.error('[PLUGIN-DEBUG][storage:load] failed', error)
    }
  }

  /**
   * 保存在线插件配置到本地存储
   */
  private async saveOnlinePluginsToStorage(): Promise<void> {
    try {
      const configs = Array.from(this.onlinePlugins.values())
      const serialized = JSON.stringify(configs)
      await ConfigStorage.setItem('mira-online-plugins', serialized)
    } catch (error) {
      console.error('[PLUGIN-DEBUG][storage:save] failed', error)
    }
  }

  private async loadDisabledServerPluginsFromStorage(): Promise<void> {
    try {
      const stored = await ConfigStorage.getItem('mira-disabled-server-plugins')
      const pluginIds = stored ? JSON.parse(stored) : []
      this.disabledServerPluginIds = new Set(Array.isArray(pluginIds) ? pluginIds : [])
    } catch (error) {
      console.warn('Failed to restore disabled server plugins:', error)
      this.disabledServerPluginIds.clear()
    }
  }

  private async saveDisabledServerPluginsToStorage(): Promise<void> {
    await ConfigStorage.setItem(
      'mira-disabled-server-plugins',
      JSON.stringify(Array.from(this.disabledServerPluginIds))
    )
  }

  /**
   * 服务端插件 icon 解析：裸图片文件名（相对插件 web 目录）拼成 server 绝对 URL，
   * 使 PluginIcon 等展示组件可直接 <img> 加载；emoji / material 名 / 绝对 URL 原样返回。
   */
  private resolveServerPluginIcon(entry: { icon?: string; url?: string; serverPluginName?: string }): string | undefined {
    const icon = entry.icon
    if (!icon) return undefined
    if (/^(https?:|file:|data:|[a-zA-Z]:[\\/]|\/)/.test(icon)) return icon
    if (!/\.(png|jpe?g|svg|ico|gif|webp|bmp)$/i.test(icon)) return icon
    const resolved = resolveServerPluginUrl({ url: entry.url, serverPluginName: entry.serverPluginName }, icon)
    // 调试: 图标仍显示文字时, 在客户端 devtools console 检查此处 resolved 是否为完整 http URL
    console.debug('[PluginService] server plugin icon:', entry.serverPluginName, '->', resolved || icon)
    return resolved || icon
  }

  public async syncServerPlugins(libraryId: string): Promise<BaseResponse> {
    try {
      const entries = await miraSDKService.getServerWebPlugins(libraryId)
      for (const [pluginId] of this.serverPlugins) {
        if ((this.plugins.get(pluginId)?.config.source) === 'server') this.plugins.delete(pluginId)
      }
      this.serverPlugins.clear()

      for (const entry of entries) {
        const config: ServerPluginConfig = {
          pluginName: entry.pluginName,
          pluginId: entry.pluginId,
          priority: entry.priority ?? 0,
          version: entry.version,
          index: entry.index || 'index.js',
          icon: this.resolveServerPluginIcon(entry),
          tags: entry.tags || [],
          category: entry.category,
          description: entry.description || '',
          author: entry.author || '',
          homepage: entry.homepage,
          enable: !this.disabledServerPluginIds.has(entry.pluginId),
          config: entry.config || {},
          hotkey: entry.hotkey || {},
          events: entry.events || [],
          dependencies: entry.dependencies || [],
          permissions: entry.permissions,
          minAppVersion: entry.minAppVersion,
          platform: entry.platform,
          actualDirectory: entry.url,
          url: entry.url,
          isOnline: true,
          source: 'server',
          serverPluginName: entry.serverPluginName,
          libraryId: entry.libraryId,
          lastUpdated: new Date().toISOString()
        }
        this.serverPlugins.set(config.pluginId, config)
        this.plugins.set(config.pluginId, {
          config,
          status: config.enable ? 'loaded' : 'disabled',
          directory: config.url,
          context: this.createPluginContext(config)
        })
      }

      return { success: true, data: this.getServerPlugins(), message: `Loaded ${entries.length} server plugins` }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, message }
    }
  }

  public getServerPlugins(): PluginRuntime[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.config.source === 'server')
  }

  public async setServerPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
    if (enabled) this.disabledServerPluginIds.delete(pluginId)
    else this.disabledServerPluginIds.add(pluginId)
    const config = this.serverPlugins.get(pluginId)
    if (config) config.enable = enabled
    await this.saveDisabledServerPluginsToStorage()
  }

  /**
   * 获取所有插件（本地+在线）
   */
  public getAllPlugins(): PluginRuntime[] {
    return Array.from(this.plugins.values())
  }

  /**
   * 获取单个插件
   */
  public getPlugin(pluginId: string): PluginRuntime | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * 同步插件运行状态。
   * Store 中的 PluginRuntime 可能是 Vue Proxy，不能依赖它与内部 Map 始终共享引用。
   */
  public setPluginStatus(pluginId: string, status: PluginRuntime['status']): void {
    const plugin = this.plugins.get(pluginId)
    if (plugin) plugin.status = status
  }

  /**
   * 卸载插件
   */
  public async uninstallPlugin(pluginId: string, pluginDirectory: string, pluginName: string): Promise<BaseResponse> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return { success: false, message: 'Plugin not found' }
    }

    // 检查是否为在线插件
    if (this.onlinePlugins.has(pluginId)) {
      return await this.removeOnlinePlugin(pluginId)
    }

    // 本地插件卸载（通过Electron API）
    if (this.isElectronEnvironment) {
      const result = await (window as any).electronAPI.plugin.uninstall(pluginId, pluginDirectory, pluginName)
      if (result.success) {
        this.plugins.delete(pluginId)
      }
      return result
    }

    return { success: false, message: 'Cannot uninstall local plugins in web environment' }
  }

  /**
   * 导入插件从文件
   */
  public async importPluginFromFile(targetDirectory: string): Promise<BaseResponse> {
    if (!this.isElectronEnvironment) {
      return { success: false, message: 'File import only available in Electron environment' }
    }

    return await (window as any).electronAPI.plugin.importFromFile(targetDirectory)
  }

  /**
   * 导入插件从URL
   */
  public async importPluginFromUrl(url: string, targetDirectory: string): Promise<BaseResponse> {
    if (!this.isElectronEnvironment) {
      return { success: false, message: 'URL import only available in Electron environment' }
    }

    return await (window as any).electronAPI.plugin.importFromUrl(url, targetDirectory)
  }

  /**
   * 选择插件目录
   */
  public async selectPluginDirectory(title?: string): Promise<BaseResponse> {
    if (!this.isElectronEnvironment) {
      return { success: false, message: 'Directory selection only available in Electron environment' }
    }

    return await (window as any).electronAPI.plugin.selectDirectory(title)
  }

  /**
   * 选择ZIP文件
   */
  public async selectZipFile(): Promise<BaseResponse> {
    if (!this.isElectronEnvironment) {
      return { success: false, message: 'File selection only available in Electron environment' }
    }

    return await (window as any).electronAPI.plugin.selectZipFile()
  }

  /**
   * 重新发现本地插件
   */
  public async discoverLocalPlugins(): Promise<BaseResponse> {
    if (!this.isElectronEnvironment) {
      return { success: false, message: 'Local plugin discovery only available in Electron environment' }
    }

    const result = await (window as any).electronAPI.plugin.discover()
    if (result.success) {
      // 重新加载所有插件
      await this.discoverAndLoadPlugins()
    }
    return result
  }

  /**
   * 重新加载单个本地插件。
   * 从主进程重新获取该插件的最新配置/目录，更新内部运行时表（保留运行状态）。
   * 注意：脚本清理与重新注入由调用方（operationManager）负责，这里只刷新元数据。
   * @param pluginId 插件 ID
   */
  public async reloadPlugin(pluginId: string): Promise<BaseResponse> {
    if (!this.isElectronEnvironment) {
      return { success: false, message: 'Local plugin reload only available in Electron environment' }
    }
    if (!pluginId) {
      return { success: false, message: t('services.plugin.pluginIdMissing') }
    }

    try {
      const result = await (window as any).electronAPI.plugin.get(pluginId)
      if (!result.success || !result.data) {
        return { success: false, message: result.message || `Plugin not found: ${pluginId}` }
      }

      const runtime = result.data as PluginRuntime
      // 保留该插件原有的运行状态（重载前后启用状态不变）
      const existing = this.plugins.get(pluginId)
      const status = existing?.status && existing.status !== 'disabled' ? existing.status : 'disabled'
      const context = existing?.context

      this.plugins.set(pluginId, {
        ...runtime,
        status,
        context
      })

      return { success: true, message: `Plugin ${pluginId} reloaded`, data: this.plugins.get(pluginId) }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 获取插件配置
   */
  public getConfig(): PluginManagerConfig | null {
    return this.config
  }

  /**
   * 获取在线插件列表
   */
  public getOnlinePlugins(): OnlinePluginConfig[] {
    return Array.from(this.onlinePlugins.values())
  }

  /**
   * 拉取插件市场目录（plugins.json）
   * 直接在渲染进程 fetch，Web/Electron 环境均可用。
   * @param marketUrl 市场源根地址
   */
  public async fetchMarketplaceCatalog(marketUrl: string): Promise<BaseResponse> {
    try {
      const base = (marketUrl || '').trim().replace(/\/+$/, '')
      if (!base) {
        return { success: false, message: t('services.plugin.marketUrlEmpty') }
      }
      const catalogUrl = `${base}/plugins.json`
      const response = await fetch(catalogUrl, { cache: 'no-store' })
      if (!response.ok) {
        return { success: false, message: t('services.plugin.fetchMarketCatalogFailed', { status: response.status, url: catalogUrl }) }
      }
      const catalog = (await response.json()) as MarketplaceCatalog
      if (!catalog || !Array.isArray(catalog.plugins)) {
        return { success: false, message: t('services.plugin.marketCatalogInvalid') }
      }
      return { success: true, data: catalog, message: `Loaded ${catalog.plugins.length} marketplace plugins` }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 从插件市场安装/更新插件
   * 由主进程负责下载到本地 pluginsDirectory，成功后刷新已加载的插件列表。
   * @param marketUrl 市场源根地址
   * @param entry 市场目录中的插件条目
   */
  public async installMarketplacePlugin(marketUrl: string, entry: MarketplacePluginEntry): Promise<BaseResponse & { cancelled?: boolean }> {
    try {
      if (!this.isElectronEnvironment) {
        return await this.installMarketplacePluginForWeb(marketUrl, entry)
      }

      // entry 来自 Pinia 响应式状态，是 Vue 的 Proxy；Electron IPC 的 structured
      // clone 无法克隆 Proxy，会抛 “对象不能被克隆”。跨 IPC 边界前用 toRaw 递归
      // 剥离响应式包装，得到纯对象后再传递。
      const plainEntry = toPlainObject(entry) as MarketplacePluginEntry

      const result = await (window as any).electronAPI.plugin.installFromMarketplace(marketUrl, plainEntry)
      if (result.success) {
        // 安装成功后重新发现并加载本地插件，让新插件出现在列表里
        await this.discoverAndLoadPlugins()
      }
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Web 环境无法写入 pluginsDirectory，改为保存远程插件配置并通过
   * scriptManager 的动态 script 注入加载入口脚本。
   */
  private async installMarketplacePluginForWeb(
    marketUrl: string,
    entry: MarketplacePluginEntry
  ): Promise<BaseResponse> {
    const base = (marketUrl || '').trim().replace(/\/+$/, '')
    if (!base) return { success: false, message: t('services.plugin.marketUrlEmpty') }

    try {
      const directory = entry.directory.replace(/^\/+|\/+$/g, '')
      const marketOrigin = new URL(base)
      if (!['http:', 'https:'].includes(marketOrigin.protocol) || !directory || directory.includes('..')) {
        return { success: false, message: t('services.plugin.marketUrlOrDirInvalid') }
      }
      const pluginUrl = `${base}/${directory}`
      const manifestResponse = await fetch(`${pluginUrl}/plugin.json`, { cache: 'no-store' })
      if (!manifestResponse.ok) {
        return { success: false, message: t('services.plugin.fetchPluginConfigFailed', { status: manifestResponse.status }) }
      }

      const manifest = (await manifestResponse.json()) as Partial<LocalPluginConfig>
      const pluginId = manifest.pluginId || entry.pluginId
      if (pluginId !== entry.pluginId) {
        return { success: false, message: t('services.plugin.pluginIdMismatch') }
      }
      const index = manifest.index || 'index.js'
      if (!/^[-\w./]+$/.test(index) || index.includes('..')) {
        return { success: false, message: t('services.plugin.pluginEntryInvalid') }
      }

      const config: OnlinePluginConfig = {
        pluginName: manifest.pluginName || entry.pluginName,
        pluginId,
        priority: manifest.priority ?? 0,
        version: manifest.version || entry.version,
        index,
        icon: manifest.icon,
        tags: manifest.tags || entry.tags || [],
        category: manifest.category || entry.category,
        description: manifest.description || entry.description,
        author: manifest.author || entry.author,
        homepage: manifest.homepage || entry.homepage,
        enable: manifest.enable ?? false,
        config: manifest.config || {},
        hotkey: manifest.hotkey || {},
        events: manifest.events || [],
        dependencies: manifest.dependencies || [],
        permissions: manifest.permissions,
        minAppVersion: manifest.minAppVersion || entry.minAppVersion,
        platform: manifest.platform || entry.platform,
        actualDirectory: pluginUrl,
        url: pluginUrl,
        isOnline: true,
        lastUpdated: new Date().toISOString()
      }

      this.onlinePlugins.set(pluginId, config)
      this.plugins.set(pluginId, {
        config,
        status: 'loaded',
        directory: pluginUrl,
        context: this.createPluginContext(config)
      })
      await this.saveOnlinePluginsToStorage()
      return { success: true, message: 'Web plugin installed successfully' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 取消正在进行的插件市场安装
   * @param pluginId 插件ID
   */
  public async cancelInstall(pluginId: string): Promise<BaseResponse> {
    if (!this.isElectronEnvironment) {
      return { success: false, message: t('services.plugin.installOnlyInElectron') }
    }
    try {
      return await (window as any).electronAPI.plugin.cancelInstall(pluginId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 订阅插件市场安装进度事件（由主进程逐块下载时回推）。
   * @returns 反订阅函数（调用后移除监听）
   */
  public onInstallProgress(callback: (progress: PluginInstallProgress) => void): () => void {
    if (!this.isElectronEnvironment) {
      return () => {}
    }
    const api = (window as any).electronAPI.plugin.onInstallProgress
    if (typeof api === 'function') {
      return api(callback)
    }
    return () => {}
  }

  /**
   * 计算本地已安装插件的文件 sha256 清单（更新检查用）。
   * 通过主进程 IPC 读取 pluginsDirectory/<pluginId>/ 下的文件并计算 sha256。
   * @returns 与市场条目 files 字段结构一致的清单；非 Electron 环境或失败返回空数组。
   */
  public async getLocalFileChecksums(pluginId: string): Promise<MarketplacePluginFile[]> {
    if (!this.isElectronEnvironment) return []
    try {
      const result = await (window as any).electronAPI.plugin.computeFileChecksums(pluginId)
      if (result?.success && Array.isArray(result.data)) {
        return result.data as MarketplacePluginFile[]
      }
      return []
    } catch {
      return []
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.plugins.clear()
    this.onlinePlugins.clear()
    this.isInitialized = false
  }

  /**
   * 创建插件上下文
   * 提供插件运行时需要的API和服务
   */
  public createPluginContext(config: LocalPluginConfig): PluginContext {
    const customTabs = new Map<string, PluginCustomTabDefinition>()

    const api = {
      // 基础API
      log: {
        info: (message: string, ...args: any[]) => console.log(`[${config.pluginName}] ${message}`, ...args),
        warn: (message: string, ...args: any[]) => console.warn(`[${config.pluginName}] ${message}`, ...args),
        error: (message: string, ...args: any[]) => console.error(`[${config.pluginName}] ${message}`, ...args),
        debug: (message: string, ...args: any[]) => console.debug(`[${config.pluginName}] ${message}`, ...args)
      },
      
      // 配置管理
      config: {
        get: (key: string) => (config as any)[key],
        set: (key: string, value: any) => {
          // 对于静态配置，这里可能需要额外处理
          console.warn(`Plugin ${config.pluginName} tried to set config ${key} = ${value}`)
        },
        has: (key: string) => key in config,
        delete: (key: string) => {
          console.warn(`Plugin ${config.pluginName} tried to delete config ${key}`)
        }
      },
      
      // 事件系统
      events: {
        emit: (eventName: string, data?: any) => {
          const customEvent = new CustomEvent(`plugin_${config.pluginId}_${eventName}`, {
            detail: { pluginId: config.pluginId, data }
          })
          window.dispatchEvent(customEvent)
        },
        on: (eventName: string, handler: (...args: any[]) => void) => {
          const eventType = `plugin_${config.pluginId}_${eventName}`
          const wrapper = (event: CustomEvent) => handler(event.detail.data)
          window.addEventListener(eventType, wrapper as EventListener)
        },
        off: (eventName: string, handler: (...args: any[]) => void) => {
          const eventType = `plugin_${config.pluginId}_${eventName}`
          window.removeEventListener(eventType, handler as EventListener)
        }
      },
      
      // UI交互
      ui: {
        showNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
          // 通过全局 Toast 系统展示通知（替代原生 alert）
          useToast().add({
            severity: type === 'warning' ? 'warn' : type,
            summary: config.pluginName,
            detail: message,
            life: 3000
          })
        },
        showDialog: (options: { title: string; message: string; type: 'info' | 'confirm' }): Promise<boolean> => {
          // info 类型：仅提示，返回已解决的 Promise
          if (options.type !== 'confirm') {
            useToast().add({
              severity: 'info',
              summary: options.title,
              detail: options.message,
              life: 4000
            })
            return Promise.resolve(true)
          }
          // confirm 类型：弹出全局确认对话框（替代原生 window.confirm）
          return new Promise<boolean>(resolve => {
            useConfirm().require({
              header: options.title,
              message: options.message,
              acceptLabel: t('services.plugin.confirmLabel'),
              rejectLabel: t('services.plugin.cancelLabel'),
              accept: () => resolve(true),
              reject: () => resolve(false)
            })
          })
        }
      },

      tabs: {
        registerCustomTab: (definition: PluginCustomTabDefinition) => {
          customTabs.set(definition.id, definition)
          return () => {
            customTabs.delete(definition.id)
            void import('../composables/useTabs').then(async ({ useTabs }) => {
              const tabs = useTabs()
              const tabIds = tabs.tabs.value
                .filter(tab => tab.type === 'custom' && tab.data?.renderContext?.pluginId === config.pluginId)
                .map(tab => tab.id)
              await Promise.all(tabIds.map(tabId => tabs.closeTab(tabId)))
            })
          }
        },
        openCustomTab: async (id: string, data: Record<string, any> = {}) => {
          const definition = customTabs.get(id)
          if (!definition) throw new Error(`Custom tab not registered: ${id}`)
          const { useTabs } = await import('../composables/useTabs')
          const tabId = `${config.pluginId}:${id}`
          return await useTabs().createCustomTab(definition.render, {
            id: tabId,
            label: definition.label,
            icon: definition.icon,
            iconColor: definition.iconColor,
            renderMode: 'dom',
            data,
            context: {
              pluginId: config.pluginId,
              api,
              data
            }
          })
        }
      },
      
      // 应用信息
      app: {
        version: '1.0.0', // 这里应该从实际的应用信息获取
        platform: navigator.platform,
        isDev: process.env.NODE_ENV === 'development'
      },
      
      // 扩展API - 存储
      storage: {
        get: async (key: string) => {
          try {
            const storageKey = `plugin_${config.pluginId}_${key}`
            const value = await ConfigStorage.getItem(storageKey)
            return value ? JSON.parse(value) : null
          } catch (error) {
            console.error(`Failed to get storage value for ${key}:`, error)
            return null
          }
        },
        set: async (key: string, value: any) => {
          try {
            const storageKey = `plugin_${config.pluginId}_${key}`
            await ConfigStorage.setItem(storageKey, JSON.stringify(value))
            return true
          } catch (error) {
            console.error(`Failed to set storage value for ${key}:`, error)
            return false
          }
        },
        remove: async (key: string) => {
          try {
            const storageKey = `plugin_${config.pluginId}_${key}`
            await ConfigStorage.removeItem(storageKey)
            return true
          } catch (error) {
            console.error(`Failed to remove storage value for ${key}:`, error)
            return false
          }
        }
      },
      
      // 扩展API - DOM操作
      dom: {
        querySelector: (selector: string) => document.querySelector(selector),
        querySelectorAll: (selector: string) => document.querySelectorAll(selector),
        createElement: (tagName: string) => document.createElement(tagName),
        getElementById: (id: string) => document.getElementById(id)
      },
      
      // 扩展API - HTTP请求
      http: {
        get: async (url: string, options?: RequestInit) => {
          const response = await fetch(url, { ...options, method: 'GET' })
          return response.json()
        },
        post: async (url: string, data?: any, options?: RequestInit) => {
          const response = await fetch(url, { 
            ...options, 
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...options?.headers },
            body: data ? JSON.stringify(data) : undefined
          })
          return response.json()
        }
      },

      // 媒体文件管理API
      media: {
        setLocalFile: (libraryId: string, fileId: string, localPath: string) => {
          try {
            // 动态导入 useMediaStore 以避免循环依赖
            import('../stores/media').then(({ useMediaStore }) => {
              const mediaStore = useMediaStore()
              mediaStore.setLocalFile(libraryId, fileId, localPath)
            })
          } catch (error) {
            console.error(`[${config.pluginName}] Failed to set local file:`, error)
          }
        },
        setLocalFiles: (libraryId: string, filePathMap: Record<string, string>) => {
          try {
            // 动态导入 useMediaStore 以避免循环依赖
            import('../stores/media').then(({ useMediaStore }) => {
              const mediaStore = useMediaStore()
              mediaStore.setLocalFiles(libraryId, filePathMap)
            })
          } catch (error) {
            console.error(`[${config.pluginName}] Failed to set local files:`, error)
          }
        },
        registerContextMenu: (item: any) => {
          const ps: any = (window as any).pluginSystem
          if (!ps?.mediaContextMenus?.register) return () => undefined
          return ps.mediaContextMenus.register({ ...item, pluginId: config.pluginId })
        },
        registerFileFormat: (format: any) => {
          const ps: any = (window as any).pluginSystem
          if (!ps?.fileFormats?.register) return () => undefined
          return ps.fileFormats.register({ ...format, pluginId: config.pluginId })
        },
        getExtraFileList: (libraryId: string, fileId: string) =>
          miraSDKService.getExtraFileList(libraryId, fileId),
        getExtraFile: (libraryId: string, fileId: string, fileName: string) =>
          miraSDKService.getExtraFile(libraryId, fileId, fileName),
        getExtraFileUrl: (libraryId: string, fileId: string, fileName: string) =>
          miraSDKService.getExtraFileUrl(libraryId, fileId, fileName)
      },

      // 插件窗口管理API：打开插件 dist 的独立 BrowserWindow
      // 默认 pluginId 为当前插件，避免插件误开他人窗口。
      // server/token 注入与 Electron/Web 双路径打开由 plugins/openPluginWindow 公共实现。
      window: {
        openPluginWindow: async (opts: Omit<PluginWindowOpenOptions, 'pluginId'> & { pluginId?: string }) => {
          // 服务端 Web 插件：入口 URL 指向 server 托管的插件页，并注入其所属素材库 id
          let remoteUrl: string | undefined
          let libraryId: string | undefined
          if (config.source === 'server') {
            const serverConfig = config as ServerPluginConfig
            remoteUrl = resolveServerPluginUrl(serverConfig, opts.entry)
            libraryId = serverConfig.libraryId
          }
          return openPluginWindow(
            {
              ...opts,
              pluginId: opts.pluginId || config.pluginId,
              ...(remoteUrl ? { url: remoteUrl } : {}),
              query: { ...opts.query, ...(libraryId ? { libraryId } : {}) },
            },
            { webBaseUrl: (config as OnlinePluginConfig).url || config.actualDirectory },
          )
        }
      },

      // 插件系统核心API
      pluginSystem
    }
    
    const context: PluginContext = {
      pluginId: config.pluginId,
      pluginName: config.pluginName,
      version: config.version,
      api: api as any // 临时类型转换，因为我们扩展了标准API
    }
    
    return context
  }
}

// 导出单例实例
export const pluginService = PluginService.getInstance()
