/**
 * 插件系统核心
 * 提供全局的插件实例管理功能
 */

// 插件实例存储
const pluginInstances = new Map<string, any>()
const pluginFactories = new Map<string, Function>()

// 插件系统核心对象
export const pluginSystem = {
  /**
   * 注册插件实例工厂
   */
  registerPluginInstance(pluginId: string, factory: Function) {
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
  }
}

// 初始化插件系统
export function initializePluginSystem() {
  // 将插件系统暴露到全局
  if (typeof window !== 'undefined') {
    // instanceManager 会先建立包含插件注册、贡献和文件格式 API 的完整对象；
    // DOMContentLoaded 触发时不能再用精简核心对象覆盖它。
    if (!(window as any).pluginSystem) {
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
