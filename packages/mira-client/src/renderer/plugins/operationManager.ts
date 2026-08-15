/**
 * 插件操作管理
 * 负责插件的安装、卸载、启用、禁用等操作逻辑
 */

import type { PluginOperation, OperationResult, PluginRuntime } from './types'
import { withOperation, cleanupPluginScript } from './utils'
import {
  getPluginInstanceFactory,
  loadPluginInstance,
  unloadPluginInstance
} from './instanceManager'
import { injectPluginScript } from './scriptManager'

/**
 * 启用本地插件（新的流程：脚本注入后再启用实例）
 */
export const enableLocalPluginNew = async (
  pluginId: string,
  localPlugins: { value: PluginRuntime[] },
  pendingOperations: Set<string>,
  setError: (error: string | null) => void
): Promise<OperationResult> => {
  return withOperation(
    `enable-${pluginId}`,
    async () => {
      // 1. 首先确保脚本已注入
      const plugin = localPlugins.value.find(p => p.config.pluginId === pluginId)
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginId}`)
      }

      // 2. 如果脚本未注入，先注入
      if (plugin.status !== 'loaded') {
        const injectSuccess = await injectPluginScript(plugin)
        if (!injectSuccess) {
          throw new Error(`Failed to inject plugin script: ${pluginId}`)
        }
      }

      // 3. 等待脚本加载完成并获取工厂函数
      let retries = 0
      const maxRetries = 10
      let factory = null

      while (retries < maxRetries && !factory) {
        factory = getPluginInstanceFactory(pluginId)
        if (!factory) {
          await new Promise(resolve => setTimeout(resolve, 300))
          retries++
        }
      }

      if (!factory) {
        // 最后尝试：检查是否有其他可能的插件ID匹配
        const allFactories = (window as any).pluginSystem?.instancesFactory
        if (allFactories) {
          // 尝试按插件名称查找
          for (const [factoryId, factoryFn] of allFactories) {
            if (factoryId.includes(plugin.config.pluginName.toLowerCase().replace(/\s+/g, '-'))) {
              factory = factoryFn
              break
            }
          }
        }

        if (!factory) {
          throw new Error(`Plugin factory not registered: ${pluginId}. Available factories: ${Array.from(allFactories?.keys() || [])}`)
        }
      }

      // 4. 创建插件上下文
      let context = plugin.context
      if (!context) {
        // 如果插件没有上下文,需要动态创建一个
        // 导入 PluginService 来创建上下文
        const { pluginService } = await import('../services/PluginService')
        context = pluginService.createPluginContext(plugin.config)
        plugin.context = context // 保存上下文到插件运行时
      }

      // 5. 加载插件实例
      await loadPluginInstance(pluginId, context)

      // 6. 更新插件状态
      plugin.status = 'loaded'

      return { success: true, message: `Plugin ${plugin.config.pluginName} enabled successfully` }
    },
    'Failed to enable plugin',
    pendingOperations,
    setError
  )
}

/**
 * 禁用本地插件（卸载实例但保留脚本）
 */
export const disableLocalPluginNew = async (
  pluginId: string,
  localPlugins: { value: PluginRuntime[] },
  pendingOperations: Set<string>,
  setError: (error: string | null) => void
): Promise<OperationResult> => {
  return withOperation(
    `disable-${pluginId}`,
    async () => {
      // 1. 卸载插件实例
      await unloadPluginInstance(pluginId)

      // 2. 更新插件状态
      const plugin = localPlugins.value.find(p => p.config.pluginId === pluginId)
      if (plugin) {
        plugin.status = 'disabled'
      }

      return { success: true, message: `Plugin disabled successfully` }
    },
    'Failed to disable plugin',
    pendingOperations,
    setError
  )
}

/**
 * 重新加载本地插件
 */
export const reloadLocalPlugin = async (
  pluginId: string,
  pluginService: any,
  localPlugins: { value: PluginRuntime[] },
  pendingOperations: Set<string>,
  setError: (error: string | null) => void
): Promise<OperationResult> => {
  return withOperation(
    `reload-${pluginId}`,
    async () => {
      // 在重新加载前清理旧的脚本
      cleanupPluginScript(pluginId)

      // 调用 pluginService 重新加载插件
      const result = await pluginService.reloadPlugin(pluginId)

      if (result.success) {
        // 重新获取本地插件状态
        const plugins = pluginService.getAllPlugins()
        localPlugins.value = plugins

        // 如果重新加载成功，重新注入脚本
        const plugin = localPlugins.value.find(p => p.config.pluginId === pluginId)
        if (plugin && plugin.status === 'loaded') {
          await injectPluginScript(plugin)
        }
      }

      return result
    },
    'Failed to reload plugin',
    pendingOperations,
    setError
  )
}

/**
 * 通用本地插件操作函数
 */
export const executeLocalPluginOperation = async (
  operation: PluginOperation,
  pluginId: string,
  pluginService: any,
  localPlugins: { value: PluginRuntime[] },
  pendingOperations: Set<string>,
  setError: (error: string | null) => void,
  ...args: any[]
): Promise<OperationResult> => {
  const operationId = `${operation}-${pluginId}`
  return withOperation(
    operationId,
    async () => {
      let result: OperationResult

      switch (operation) {
        case 'enable':
          result = await enableLocalPluginNew(pluginId, localPlugins, pendingOperations, setError)
          break
        case 'disable':
          result = await disableLocalPluginNew(pluginId, localPlugins, pendingOperations, setError)
          break
        case 'reload':
          result = await pluginService.reloadPlugin(pluginId)
          break
        case 'uninstall':
          const [pluginDirectory, pluginName] = args
          result = await pluginService.uninstallPlugin(pluginId, pluginDirectory, pluginName)
          break
        case 'import-file':
          const [targetDirectory] = args
          result = await pluginService.importPluginFromFile(targetDirectory)
          break
        case 'import-url':
          const [url, target] = args
          result = await pluginService.importPluginFromUrl(url, target)
          break
        case 'discover':
          result = await pluginService.discoverAndLoadPlugins()
          break
        default:
          throw new Error(`Unsupported operation: ${operation}`)
      }

      if (result.success) {
        if (operation === 'enable') {
          pluginService.setPluginStatus(pluginId, 'loaded')
        } else if (operation === 'disable') {
          pluginService.setPluginStatus(pluginId, 'disabled')
        }

        // 对于某些操作，避免重复调用loadLocalPlugins和persistPluginState
        // enable、disable、reload操作已经在内部处理了状态保存
        const skipReload = ['enable', 'disable', 'reload'].includes(operation)

        if (!skipReload) {
          // 对于其他操作，需要重新获取插件列表
          const plugins = pluginService.getAllPlugins()
          localPlugins.value = plugins.filter((plugin: PluginRuntime) => plugin.config.source !== 'server')
        } else {
          // 对于enable/disable操作，只需要重新同步本地插件状态
          const plugins = pluginService.getAllPlugins()
          localPlugins.value = plugins.filter((plugin: PluginRuntime) => plugin.config.source !== 'server')
        }
      }

      return result
    },
    `Failed to ${operation} plugin`,
    pendingOperations,
    setError
  )
}
