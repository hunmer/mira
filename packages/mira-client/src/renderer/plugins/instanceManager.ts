/**
 * 插件实例管理
 * 负责插件实例的创建、生命周期管理和全局API
 */

import type { PluginSystemAPI, PluginFileFormat, PluginEventHandler } from './types'
import type { FileInfo } from '../../shared/types'

const normalizeFormatValue = (value: string): string => value.trim().toLowerCase().replace(/^\./, '')
const matchesFileFormat = (format: PluginFileFormat, file: FileInfo): boolean => {
  const extension = (file.extension || file.name?.split('.').pop() || '').toLowerCase()
  const mimeType = (file.mimeType || '').toLowerCase()
  return !!(
    format.extensions?.some(ext => normalizeFormatValue(ext) === extension) ||
    format.mimeTypes?.some(mime => mime.toLowerCase() === mimeType)
  )
}

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
      },

      // 注册插件实例工厂
      registerPluginInstance: (pluginId: string, factory: (context?: any) => any) => {
        ;(window as any).pluginSystem.instancesFactory.set(pluginId, factory)
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

        on: (event: string, handler: PluginEventHandler) => {
          if (!(window as any).pluginSystem.events.listeners.has(event)) {
            ;(window as any).pluginSystem.events.listeners.set(event, [])
          }
          ;(window as any).pluginSystem.events.listeners.get(event).push(handler)
        },

        emit: (event: string, data?: any) => {
          const listeners = (window as any).pluginSystem.events.listeners.get(event)
          if (listeners) {
            listeners.forEach((handler: PluginEventHandler) => {
              try {
                handler(data)
              } catch (err) {
                console.error(`Plugin event handler error:`, err)
              }
            })
          }
        },

        off: (event: string, handler: PluginEventHandler) => {
          const listeners = (window as any).pluginSystem.events.listeners.get(event)
          if (listeners) {
            const index = listeners.indexOf(handler)
            if (index > -1) {
              listeners.splice(index, 1)
            }
          }
        }
      },

      // 插件贡献（UI 入口）注册中心
      // 插件通过 register 向宿主 HomeView 右侧栏注册自定义 UI 入口，
      // 宿主 PluginContributionBar 订阅变化并以 popover 渲染 render() 返回的内容。
      contributions: {
        list: [] as any[],
        listeners: [] as ((contributions: any[]) => void)[],

        register: (contribution: any) => {
          const list = (window as any).pluginSystem.contributions.list
          const idx = list.findIndex((c: any) => c.id === contribution.id)
          if (idx >= 0) {
            list[idx] = contribution
          } else {
            list.push(contribution)
          }
          ;(window as any).pluginSystem.contributions.emit()
        },

        unregister: (id: string) => {
          const list = (window as any).pluginSystem.contributions.list
          const idx = list.findIndex((c: any) => c.id === id)
          if (idx >= 0) {
            list.splice(idx, 1)
            ;(window as any).pluginSystem.contributions.emit()
          }
        },

        getContributions: () => {
          return (window as any).pluginSystem.contributions.list
        },

        subscribe: (fn: (contributions: any[]) => void) => {
          ;(window as any).pluginSystem.contributions.listeners.push(fn)
          // 立即推送一次当前状态
          try {
            fn((window as any).pluginSystem.contributions.list)
          } catch (err) {
            console.error('contribution subscribe initial push failed:', err)
          }
          return () => {
          const arr = (window as any).pluginSystem.contributions.listeners
            const i = arr.indexOf(fn)
            if (i > -1) arr.splice(i, 1)
          }
        },

        // 内部：通知所有订阅者
        emit: () => {
          const snapshot = (window as any).pluginSystem.contributions.list.slice()
          ;(window as any).pluginSystem.contributions.listeners.forEach((fn: (c: any[]) => void) => {
            try {
              fn(snapshot)
            } catch (err) {
              console.error('contribution listener error:', err)
            }
          })
        }
      },

      mediaContextMenus: {
        list: [] as any[],
        register: (item: any) => {
          const list = (window as any).pluginSystem.mediaContextMenus.list
          const idx = list.findIndex((x: any) => x.id === item.id)
          if (idx >= 0) list[idx] = item
          else list.push(item)
          return () => (window as any).pluginSystem.mediaContextMenus.unregister(item.id)
        },
        unregister: (id: string) => {
          const list = (window as any).pluginSystem.mediaContextMenus.list
          const idx = list.findIndex((x: any) => x.id === id)
          if (idx >= 0) list.splice(idx, 1)
        },
        getAll: () => (window as any).pluginSystem.mediaContextMenus.list.slice(),
      },
      fileFormats: {
        list: [] as PluginFileFormat[],
        register: (format: PluginFileFormat) => {
          const list = (window as any).pluginSystem.fileFormats.list
          const index = list.findIndex((item: PluginFileFormat) => item.id === format.id)
          if (index >= 0) list[index] = format
          else list.push(format)
          return () => (window as any).pluginSystem.fileFormats.unregister(format.id)
        },
        unregister: (id: string) => {
          const list = (window as any).pluginSystem.fileFormats.list
          const index = list.findIndex((item: PluginFileFormat) => item.id === id)
          if (index >= 0) list.splice(index, 1)
        },
        getForFile: (file: FileInfo) =>
          (window as any).pluginSystem.fileFormats.list.find((format: PluginFileFormat) => matchesFileFormat(format, file)),
        getAllForFile: (file: FileInfo) =>
          (window as any).pluginSystem.fileFormats.list.filter((format: PluginFileFormat) => matchesFileFormat(format, file)),
        getAll: () => (window as any).pluginSystem.fileFormats.list.slice(),
      }
    } as PluginSystemAPI

  }
}

export const getPluginFileFormat = (file: FileInfo): PluginFileFormat | undefined => {
  if (typeof window === 'undefined') return undefined
  return (window as any).pluginSystem?.fileFormats?.getForFile(file)
}

export const getPluginFileFormats = (file: FileInfo): PluginFileFormat[] => {
  if (typeof window === 'undefined') return []
  const formats = (window as any).pluginSystem?.fileFormats
  return formats?.getAllForFile?.(file) || formats?.getAll?.().filter((format: PluginFileFormat) => matchesFileFormat(format, file)) || []
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
  }
}
