/**
 * 插件系统核心
 * 提供全局的插件实例管理功能
 */

// 插件实例存储
const pluginInstances = new Map<string, any>()
const pluginFactories = new Map<string, (context?: any) => any>()
const registeredPlugins = new Map<string, any>()
const contributions = new Map<string, any>()
const contributionListeners = new Set<(items: any[]) => void>()
const fileFormats = new Map<string, any>()

// 插件系统核心对象
export const pluginSystem = {
  /** 注册插件配置（与 instanceManager 的全局 API 保持兼容） */
  plugins: registeredPlugins,
  registerPlugin(pluginId: string, pluginInfo: any) {
    registeredPlugins.set(pluginId, pluginInfo)
  },
  contributions: {
    list: [] as any[],
    register(contribution: any) {
      contributions.set(contribution.id, contribution)
      const snapshot = Array.from(contributions.values())
      this.list = snapshot
      contributionListeners.forEach(listener => listener(snapshot))
    },
    unregister(id: string) {
      contributions.delete(id)
      const snapshot = Array.from(contributions.values())
      this.list = snapshot
      contributionListeners.forEach(listener => listener(snapshot))
    },
    getContributions() {
      return Array.from(contributions.values())
    },
    subscribe(listener: (items: any[]) => void) {
      contributionListeners.add(listener)
      listener(Array.from(contributions.values()))
      return () => contributionListeners.delete(listener)
    }
  },
  fileFormats: {
    list: [] as any[],
    register(format: any) {
      fileFormats.set(format.id, format)
      this.list = Array.from(fileFormats.values())
      return () => this.unregister(format.id)
    },
    unregister(id: string) {
      fileFormats.delete(id)
      this.list = Array.from(fileFormats.values())
    },
    getForFile(file: any) {
      const extension = String(file?.extension || file?.name?.split('.').pop() || '').toLowerCase()
      const mimeType = String(file?.mimeType || '').toLowerCase()
      return Array.from(fileFormats.values()).find((format: any) =>
        format.extensions?.some((item: string) => String(item).replace(/^\./, '').toLowerCase() === extension) ||
        format.mimeTypes?.some((item: string) => String(item).toLowerCase() === mimeType)
      )
    },
    getAll() {
      return Array.from(fileFormats.values())
    }
  },

  /**
   * 注册插件实例工厂
   */
  registerPluginInstance(pluginId: string, factory: (context?: any) => any) {
    pluginFactories.set(pluginId, factory)
  },

  /**
   * 获取插件实例
   */
  getPluginInstance(pluginId: string) {
    return pluginInstances.get(pluginId)
  },

  /**
   * 加载插件实例
   */
  async loadPluginInstance(pluginId: string, context: any) {
    const factory = pluginFactories.get(pluginId)
    if (!factory) {
      throw new Error(`Plugin factory not found: ${pluginId}`)
    }

    const instance = await factory(context)
    pluginInstances.set(pluginId, instance)
    return instance
  },

  /**
   * 卸载插件实例
   */
  async unloadPluginInstance(pluginId: string) {
    const instance = pluginInstances.get(pluginId)
    if (instance) {
      // 如果插件有清理方法，调用它
      if (typeof instance.cleanup === 'function') {
        await instance.cleanup()
      }
      
      pluginInstances.delete(pluginId)
    }
  },

  /**
   * 获取插件工厂
   */
  getPluginInstanceFactory(pluginId: string) {
    return pluginFactories.get(pluginId)
  },

  getPlugin(pluginId: string) {
    return registeredPlugins.get(pluginId)
  },

  getAllPlugins() {
    return Array.from(registeredPlugins.values())
  },

  /**
   * 获取所有已注册的插件ID
   */
  getRegisteredPluginIds() {
    return Array.from(pluginFactories.keys())
  },

  /**
   * 获取所有活动实例的插件ID
   */
  getActivePluginIds() {
    return Array.from(pluginInstances.keys())
  },

  /**
   * 清理所有插件
   */
  async cleanup() {
    for (const [pluginId, instance] of pluginInstances) {
      try {
        if (typeof instance.cleanup === 'function') {
          await instance.cleanup()
        }
      } catch (error) {
        console.error(`❌ Failed to cleanup plugin ${pluginId}:`, error)
      }
    }
    
    pluginInstances.clear()
    pluginFactories.clear()
    registeredPlugins.clear()
    contributions.clear()
    contributionListeners.clear()
    fileFormats.clear()
  }
}

// 初始化插件系统
export function initializePluginSystem() {
  // 将插件系统暴露到全局
  if (typeof window !== 'undefined') {
    const existing = (window as any).pluginSystem
    // instanceManager 会先建立包含插件注册、贡献和文件格式 API 的完整对象；
    // DOMContentLoaded 触发时不能再用精简核心对象覆盖它。
    if (!existing) {
      (window as any).pluginSystem = pluginSystem
    }
  }
  
  // 页面卸载时清理所有插件
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      pluginSystem.cleanup()
    })
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  // 确保DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePluginSystem)
  } else {
    initializePluginSystem()
  }
}
