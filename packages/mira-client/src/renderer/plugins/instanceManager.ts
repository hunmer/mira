/**
 * 插件实例管理
 * 负责插件实例的创建、生命周期管理和全局API
 */

import type { PluginSystemAPI } from './types'

/**
 * 初始化全局插件系统API
 */
export const initializeGlobalPluginSystem = () => {
  if (typeof window !== 'undefined') {
    ;(window as any).pluginSystem = {
      // 插件注册表
      plugins: new Map(),

      // 插件实例工厂
      instancesFactory: new Map(),

      // 插件实例
      instances: new Map(),

      // 注册插件
      registerPlugin: (pluginId: string, pluginInfo: any) => {
        ;(window as any).pluginSystem.plugins.set(pluginId, pluginInfo)
        console.log(`🔌 Plugin registered: ${pluginId}`)
      },

      // 注册插件实例工厂
      registerPluginInstance: (pluginId: string, factory: () => any) => {
        ;(window as any).pluginSystem.instancesFactory.set(pluginId, factory)
        console.log(`🏭 Plugin factory registered: ${pluginId}`)

        // 检查是否有匹配的插件配置
        const registeredPlugins = (window as any).pluginSystem.plugins
        if (registeredPlugins) {
          let found = false
          for (const [registeredId] of registeredPlugins) {
            if (registeredId === pluginId) {
              found = true
              console.log(`✅ Factory ID matches registered plugin: ${pluginId}`)
              break
            }
          }
          if (!found) {
            console.warn(`⚠️ Factory ID ${pluginId} doesn't match any registered plugin`)
            console.log(`📋 Registered plugin IDs:`, Array.from(registeredPlugins.keys()))
          }
        }
      },

      // 获取插件实例工厂
      getPluginInstanceFactory: (pluginId: string) => {
        return (window as any).pluginSystem.instancesFactory.get(pluginId)
      },

      // 加载插件实例
      loadPluginInstance: async (pluginId: string, context: any) => {
        try {
          const factory = (window as any).pluginSystem.instancesFactory.get(pluginId)
          if (!factory || typeof factory !== 'function') {
            throw new Error(`Plugin factory not found for: ${pluginId}`)
          }

          const instance: any = await factory(context)
          ;(window as any).pluginSystem.instances.set(pluginId, instance)
          console.log(`🚀 Plugin instance loaded: ${pluginId}`)
          return instance
        } catch (error) {
          console.error(`❌ Failed to load plugin instance ${pluginId}:`, error)
          throw error
        }
      },

      // 获取插件实例
      getPluginInstance: (pluginId: string) => {
        return (window as any).pluginSystem.instances.get(pluginId)
      },

      // 卸载插件实例
      unloadPluginInstance: async (pluginId: string) => {
        try {
          const instance = (window as any).pluginSystem.instances.get(pluginId)
          if (instance && typeof instance.cleanup === 'function') {
            await instance.cleanup()
          }
          ;(window as any).pluginSystem.instances.delete(pluginId)
          console.log(`🗑️ Plugin instance unloaded: ${pluginId}`)
        } catch (error) {
          console.error(`❌ Failed to unload plugin instance ${pluginId}:`, error)
          throw error
        }
      },

      // 获取插件
      getPlugin: (pluginId: string) => {
        return (window as any).pluginSystem.plugins.get(pluginId)
      },

      // 获取所有插件
      getAllPlugins: () => {
        return Array.from((window as any).pluginSystem.plugins.values())
      },

      // 插件事件系统
      events: {
        listeners: new Map(),

        on: (event: string, handler: Function) => {
          if (!(window as any).pluginSystem.events.listeners.has(event)) {
            ;(window as any).pluginSystem.events.listeners.set(event, [])
          }
          ;(window as any).pluginSystem.events.listeners.get(event).push(handler)
        },

        emit: (event: string, data?: any) => {
          const listeners = (window as any).pluginSystem.events.listeners.get(event)
          if (listeners) {
            listeners.forEach((handler: Function) => {
              try {
                handler(data)
              } catch (err) {
                console.error(`Plugin event handler error:`, err)
              }
            })
          }
        },

        off: (event: string, handler: Function) => {
          const listeners = (window as any).pluginSystem.events.listeners.get(event)
          if (listeners) {
            const index = listeners.indexOf(handler)
            if (index > -1) {
              listeners.splice(index, 1)
            }
          }
        }
      }
    } as PluginSystemAPI

    console.log('🌐 Global plugin system initialized')
  }
}

/**
 * 注册插件实例工厂
 */
export const registerPluginInstance = (pluginId: string, factory: () => any) => {
  if (typeof window !== 'undefined' && (window as any).pluginSystem) {
    return (window as any).pluginSystem.registerPluginInstance(pluginId, factory)
  }
}

/**
 * 获取插件实例
 */
export const getPluginInstance = (pluginId: string) => {
  if (typeof window !== 'undefined' && (window as any).pluginSystem) {
    return (window as any).pluginSystem.getPluginInstance(pluginId)
  }
  return null
}

/**
 * 加载插件实例
 */
export const loadPluginInstance = async (pluginId: string, context: any) => {
  if (typeof window !== 'undefined' && (window as any).pluginSystem) {
    return await (window as any).pluginSystem.loadPluginInstance(pluginId, context)
  }
  return null
}

/**
 * 卸载插件实例
 */
export const unloadPluginInstance = async (pluginId: string) => {
  if (typeof window !== 'undefined' && (window as any).pluginSystem) {
    return await (window as any).pluginSystem.unloadPluginInstance(pluginId)
  }
}

/**
 * 获取插件实例工厂
 */
export const getPluginInstanceFactory = (pluginId: string) => {
  if (typeof window !== 'undefined' && (window as any).pluginSystem) {
    return (window as any).pluginSystem.getPluginInstanceFactory(pluginId)
  }
  return null
}

/**
 * 同步插件状态（用于实时更新）
 */
export const syncPluginStates = (
  pluginService: any,
  localPlugins: any,
  injectPluginsToDocument: (plugins: any[]) => Promise<void>
) => {
  try {
    const currentPlugins = pluginService.getAllPlugins()

    // 检查是否有状态变化
    let hasChanges = false

    if (currentPlugins.length !== localPlugins.value.length) {
      hasChanges = true
    } else {
      for (const current of currentPlugins) {
        const existing = localPlugins.value.find((p: any) => p.config.pluginId === current.config.pluginId)
        if (!existing || existing.status !== current.status) {
          hasChanges = true
          break
        }
      }
    }

    if (hasChanges) {
      console.log('🔄 Plugin states changed, updating...')
      localPlugins.value = currentPlugins

      // 重新注入所有插件脚本
      injectPluginsToDocument(currentPlugins)
    }
  } catch (err) {
    console.warn('⚠️ Failed to sync plugin states:', err)
  }
}

/**
 * 启动插件状态监控（定期同步）
 */
export const startPluginStateMonitoring = (
  intervalMs: number,
  syncCallback: () => void
) => {
  if (typeof window !== 'undefined') {
    const interval = setInterval(syncCallback, intervalMs)

    // 在window上保存interval ID，以便后续清理
    if (!(window as any).pluginStateMonitorInterval) {
      ;(window as any).pluginStateMonitorInterval = interval
    }

    console.log(`🔍 Plugin state monitoring started (interval: ${intervalMs}ms)`)
    return interval
  }
}

/**
 * 停止插件状态监控
 */
export const stopPluginStateMonitoring = () => {
  if (typeof window !== 'undefined' && (window as any).pluginStateMonitorInterval) {
    clearInterval((window as any).pluginStateMonitorInterval)
    delete (window as any).pluginStateMonitorInterval
    console.log('🛑 Plugin state monitoring stopped')
  }
}