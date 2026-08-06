import type {
  LocalPluginConfig,
  PluginRuntime,
  PluginManagerConfig,
  BaseResponse,
  PluginContext,
  MarketplaceCatalog,
  MarketplacePluginEntry,
  MarketplacePluginFile
} from '../../shared/types'
import { toRaw } from 'vue'
import { pluginSystem } from './PluginSystemCore'

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

/**
 * 在线插件配置
 */
interface OnlinePluginConfig extends LocalPluginConfig {
  url: string // 插件的在线地址
  isOnline: true
  lastUpdated?: string
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
        } else {
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
        return { success: false, message: '插件ID已存在' }
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
        return { success: false, message: '在线插件不存在' }
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
    }
  }

  /**
   * 保存在线插件配置到本地存储
   */
  private async saveOnlinePluginsToStorage(): Promise<void> {
    try {
      const configs = Array.from(this.onlinePlugins.values())
      await ConfigStorage.setItem('mira-online-plugins', JSON.stringify(configs))
    } catch (error) {
    }
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
        return { success: false, message: '市场源地址为空' }
      }
      const catalogUrl = `${base}/plugins.json`
      const response = await fetch(catalogUrl)
      if (!response.ok) {
        return { success: false, message: `拉取市场目录失败 (${response.status}): ${catalogUrl}` }
      }
      const catalog = (await response.json()) as MarketplaceCatalog
      if (!catalog || !Array.isArray(catalog.plugins)) {
        return { success: false, message: '市场目录格式不正确' }
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
  public async installMarketplacePlugin(marketUrl: string, entry: MarketplacePluginEntry): Promise<BaseResponse> {
    try {
      if (!this.isElectronEnvironment) {
        return { success: false, message: '插件市场安装仅在 Electron 环境可用' }
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
        showNotification: (_message: string, _type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
          // TODO: 集成实际的通知系统
        },
        showDialog: async (options: { title: string; message: string; type: 'info' | 'confirm' }): Promise<boolean> => {
          if (options.type === 'confirm') {
            return confirm(`${options.title}\n\n${options.message}`)
          } else {
            alert(`${options.title}\n\n${options.message}`)
            return true
          }
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
        }
      },

      // 插件窗口管理API：打开插件 dist 的独立 BrowserWindow
      // 默认 pluginId 为当前插件，避免插件误开他人窗口。
      window: {
        openPluginWindow: async (opts: {
          pluginId?: string
          entry?: string
          title?: string
          width?: number
          height?: number
          query?: Record<string, string>
        }) => {
          const finalOpts = {
            pluginId: config.pluginId,
            entry: 'dist/index.html',
            ...opts,
          }
          const w: any = typeof window !== 'undefined' ? (window as any).electronAPI : undefined
          if (!w?.pluginWindow?.open) {
            return { success: false, message: '插件窗口 API 在当前环境不可用（仅 Electron）' }
          }
          try {
            return await w.pluginWindow.open(finalOpts)
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            console.error(`[${config.pluginName}] openPluginWindow failed:`, error)
            return { success: false, message: msg }
          }
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
