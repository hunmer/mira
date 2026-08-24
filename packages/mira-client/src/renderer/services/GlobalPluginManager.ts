/**
 * 全局插件管理器
 * 负责应用级别的插件初始化和生命周期管理
 */

import { usePluginStore } from '../stores/plugin'
import { useSettingsStore } from '../stores/settings'
import type { PluginManagerConfig } from '../../shared/types'

/**
 * 全局插件管理器类
 */
export class GlobalPluginManager {
  private static instance: GlobalPluginManager | null = null
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): GlobalPluginManager {
    if (!GlobalPluginManager.instance) {
      GlobalPluginManager.instance = new GlobalPluginManager()
    }
    return GlobalPluginManager.instance
  }

  /**
   * 初始化插件系统
   */
  public async initialize(): Promise<void> {
    // 如果已经在初始化中，等待完成
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    // 如果已经初始化，直接返回
    if (this.isInitialized) {
      return
    }

    // 开始初始化
    this.initializationPromise = this.doInitialize()
    await this.initializationPromise
  }

  /**
   * 执行实际的初始化逻辑
   */
  private async doInitialize(): Promise<void> {
    try {
      const settingsStore = useSettingsStore()
      const pluginStore = usePluginStore()

      // 确保设置已经加载
      // settingsStore 总是已初始化的，所以我们可以直接使用

      // 检查插件目录配置
      if (!settingsStore.settings.pluginsDirectory) {
        this.isInitialized = true
        return
      }

      // 构建插件配置
      const pluginConfig: PluginManagerConfig = {
        pluginsDirectory: settingsStore.settings.pluginsDirectory,
        enableDevMode: settingsStore.settings.enablePluginDevMode,
        autoLoad: settingsStore.settings.autoLoadPlugins,
        maxLoadTime: settingsStore.settings.maxPluginLoadTime * 1000,
        enableSandbox: settingsStore.settings.enablePluginSandbox,
        trustedPlugins: Array.from(settingsStore.settings.trustedPlugins || [])
      }

      // 初始化插件系统
      const result = await pluginStore.initializeLocalPlugins(pluginConfig)
      if (!result.success) {
        throw new Error(result.message || 'Failed to initialize plugin system')
      }

      this.isInitialized = true

      // 监听设置变化，重新初始化插件系统
      this.setupSettingsWatcher(settingsStore, pluginStore)

    } catch (error) {
      this.isInitialized = false
      throw error
    }
  }

  /**
   * 设置设置监听器
   */
  private setupSettingsWatcher(settingsStore: any, _pluginStore: any) {
    // 监听插件目录变化
    let lastPluginsDirectory = settingsStore.settings.pluginsDirectory

    const checkAndReinitialize = async () => {
      const currentDirectory = settingsStore.settings.pluginsDirectory
      
      if (currentDirectory !== lastPluginsDirectory) {
        lastPluginsDirectory = currentDirectory
        
        if (currentDirectory) {
          this.isInitialized = false
          this.initializationPromise = null
          await this.initialize()
        }
      }
    }

    // 使用 setInterval 定期检查，因为我们在初始化阶段无法使用 Vue 的 watch
    const watchInterval = setInterval(checkAndReinitialize, 1000)

    // 在页面卸载时清理
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        clearInterval(watchInterval)
      })
    }
  }

  /**
   * 启用所有已加载的插件
   */
  public async enableAllPlugins(): Promise<{ success: boolean; errors: string[] }> {
    try {
      const pluginStore = usePluginStore()
      const plugins = pluginStore.localPlugins

      if (plugins.length === 0) {
        return { success: true, errors: [] }
      }

      const errors: string[] = []
      // loadLocalPlugins 已根据持久化状态恢复 status；禁用插件不得在启动时被重新启用。
      const enablePromises = plugins
        .filter(plugin => plugin.status !== 'disabled')
        .map(async (plugin) => {
        try {
          const result = await pluginStore.enableLocalPluginNew(plugin.config.pluginId)

          if (!result.success) {
            errors.push(`Failed to enable plugin ${plugin.config.pluginName}: ${result.message}`)
          } else {
            // 验证插件实例是否真的创建成功
            const pluginSystem = (window as any).pluginSystem
            const hasInstance = pluginSystem?.instances?.has(plugin.config.pluginId)

            if (!hasInstance) {
              errors.push(`Plugin ${plugin.config.pluginName} enabled but instance not found`)
            }
          }
        } catch (error) {
          errors.push(`Exception while enabling plugin ${plugin.config.pluginName}: ${error instanceof Error ? error.message : String(error)}`)
        }
      })

      await Promise.all(enablePromises)

      if (errors.length === 0) {
        return { success: true, errors: [] }
      } else {
        return { success: false, errors }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, errors: [errorMessage] }
    }
  }

  /**
   * 重新初始化插件系统
   */
  public async reinitialize(): Promise<void> {
    this.isInitialized = false
    this.initializationPromise = null
    await this.initialize()
  }

  /**
   * 获取初始化状态
   */
  public get initialized(): boolean {
    return this.isInitialized
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    try {
      this.isInitialized = false
      this.initializationPromise = null
    } catch (error) {
    }
  }
}

/**
 * 获取全局插件管理器实例
 */
export const globalPluginManager = GlobalPluginManager.getInstance()

/**
 * 初始化全局插件系统
 */
export async function initializeGlobalPluginSystem(): Promise<void> {
  await globalPluginManager.initialize()
}
