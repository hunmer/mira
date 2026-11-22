import type { Ref } from 'vue'
import { pluginService } from '../../services/PluginService'
import {
  // 类型
  type PluginRuntime,
  type PluginManagerConfig,
  type OperationResult,

  // 工具函数
  handleError,
  cleanupPluginScript,

  // 脚本管理
  injectPluginsToDocument,

  // 实例管理
  initializeGlobalPluginSystem,
  unloadPluginInstance,
  syncPluginStates,
  startPluginStateMonitoring,
  stopPluginStateMonitoring,

  // 操作管理
  enableLocalPluginNew,
  disableLocalPluginNew,
  reloadLocalPlugin,
  executeLocalPluginOperation,

  // 状态持久化
  restorePluginState
} from '../../plugins'

/**
 * 插件 store —— 本地启用切片（本地/服务端插件的启用禁用、导入卸载、状态监控）
 * 由 stores/plugin.ts 组合进 usePluginStore，不单独注册 Pinia store。
 */
export interface PluginLocalSliceDeps {
  /** 本地插件运行时列表（组合根持有，切片操作） */
  localPlugins: Ref<PluginRuntime[]>
  /** 服务端插件运行时列表（组合根持有，切片操作） */
  serverPlugins: Ref<PluginRuntime[]>
  /** 共享的进行中操作集合（与市场切片共用） */
  pendingOperations: Ref<Set<string>>
  /** 设置共享错误信息 */
  setError: (message: string | null) => void
  /** 持久化完整插件状态（来自组合根） */
  persistState: () => Promise<void>
  /** 带操作跟踪的包装器（来自组合根） */
  wrappedWithOperation: <T>(
    operationId: string,
    operation: () => Promise<T>,
    errorMessage: string
  ) => Promise<OperationResult & { data?: T }>
}

export function createPluginLocalSlice(deps: PluginLocalSliceDeps) {
  const { localPlugins, serverPlugins, pendingOperations, setError, persistState, wrappedWithOperation } = deps

  /**
   * 初始化本地插件系统
   */
  const initializeLocalPlugins = async (config: PluginManagerConfig) => {
    return wrappedWithOperation('initialize', async () => {
      // 初始化全局插件系统API
      initializeGlobalPluginSystem()

      // 使用renderer进程PluginService
      const result = await pluginService.initialize(config)
      if (result.success) {
        await loadLocalPlugins()
      }

      return result
    }, 'Failed to initialize local plugins')
  }

  /**
   * 从持久化状态恢复本地插件的启用/禁用状态
   */
  const restoreLocalPluginStates = async (plugins: PluginRuntime[]) => {
    try {
      const stateData = await restorePluginState()
      if (!stateData || !stateData.plugins) return

      // 创建一个映射，便于快速查找保存的插件状态
      const savedStatesMap = new Map<string, boolean>()
      stateData.plugins.forEach(plugin => {
        if (plugin.isLocal) {
          savedStatesMap.set(plugin.id, plugin.enabled)
        }
      })

      // 应用保存的状态到当前插件
      for (const plugin of plugins) {
        const savedEnabled = savedStatesMap.get(plugin.config.pluginId)
        if (savedEnabled !== undefined) {
          // 根据保存的enabled状态设置插件的status
          const oldStatus = plugin.status
          plugin.status = savedEnabled ? 'loaded' : 'disabled'
          // 如果插件从enabled变为disabled，需要清理实例和脚本
          if (oldStatus === 'loaded' && plugin.status === 'disabled') {
            try {
              // 卸载插件实例
              await unloadPluginInstance(plugin.config.pluginId)
              // 清理插件脚本
              cleanupPluginScript(plugin.config.pluginId)
            } catch (err) {
              console.warn(`Failed to cleanup plugin ${plugin.config.pluginName}:`, err)
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to restore local plugin states:', err)
    }
  }

  /**
   * 加载本地插件列表
   */
  const loadLocalPlugins = async () => {
    try {
      // 使用renderer进程PluginService
      const plugins = pluginService.getAllPlugins()
      const local = plugins.filter(plugin => plugin.config.source !== 'server')

      // 从持久化状态恢复插件的enabled状态
      await restoreLocalPluginStates(local)

      localPlugins.value = local
      serverPlugins.value = plugins.filter(plugin => plugin.config.source === 'server')

      // 将本地插件注入到document中
      await injectPluginsToDocument(plugins)

      return { success: true, data: plugins }
    } catch (err) {
      const errorMessage = handleError(err, 'Failed to load local plugins')
      return { success: false, message: errorMessage }
    }
  }

  const syncServerPlugins = async (libraryId: string) => {
    const previousPlugins = [...serverPlugins.value]
    const result = await pluginService.syncServerPlugins(libraryId)
    if (!result.success) return result

    for (const plugin of previousPlugins) {
      if (plugin.status !== 'disabled') {
        await disableLocalPluginNew(plugin.config.pluginId, { value: previousPlugins }, pendingOperations.value, setError)
      }
      cleanupPluginScript(plugin.config.pluginId)
    }

    serverPlugins.value = pluginService.getServerPlugins()
    const enabledPlugins = serverPlugins.value.filter(plugin => plugin.status !== 'disabled')
    await injectPluginsToDocument(enabledPlugins)
    for (const plugin of enabledPlugins) {
      await enableLocalPluginNew(plugin.config.pluginId, serverPlugins, pendingOperations.value, setError)
    }
    return { success: true, data: serverPlugins.value, message: result.message }
  }

  const enableServerPlugin = async (pluginId: string) => {
    const result = await enableLocalPluginNew(pluginId, serverPlugins, pendingOperations.value, setError)
    if (result.success) await pluginService.setServerPluginEnabled(pluginId, true)
    return result
  }

  const disableServerPlugin = async (pluginId: string) => {
    const result = await disableLocalPluginNew(pluginId, serverPlugins, pendingOperations.value, setError)
    if (result.success) await pluginService.setServerPluginEnabled(pluginId, false)
    return result
  }

  /**
   * 启用本地插件
   */
  const enableLocalPlugin = async (pluginId: string) => {
    const result = await executeLocalPluginOperation(
      'enable',
      pluginId,
      pluginService,
      localPlugins,
      pendingOperations.value,
      setError
    )
    if (result.success) {
      await persistState()
    }
    return result
  }

  /**
   * 禁用本地插件
   */
  const disableLocalPlugin = async (pluginId: string) => {
    const result = await executeLocalPluginOperation(
      'disable',
      pluginId,
      pluginService,
      localPlugins,
      pendingOperations.value,
      setError
    )
    if (result.success) {
      await persistState()
    }
    return result
  }

  /**
   * 重新加载本地插件
   */
  const reloadLocalPluginWrapped = async (pluginId: string) => {
    const result = await reloadLocalPlugin(
      pluginId,
      pluginService,
      localPlugins,
      pendingOperations.value,
      setError
    )
    if (result.success) {
      await persistState()
    }
    return result
  }

  /**
   * 从文件导入本地插件
   */
  const importPluginFromFile = async (targetDirectory: string) => {
    const result = await executeLocalPluginOperation(
      'import-file',
      'import',
      pluginService,
      localPlugins,
      pendingOperations.value,
      setError,
      targetDirectory
    )
    if (result.success) {
      await persistState()
    }
    return result
  }

  /**
   * 从URL导入本地插件
   */
  const importPluginFromUrl = async (url: string, targetDirectory: string) => {
    const result = await executeLocalPluginOperation(
      'import-url',
      'import',
      pluginService,
      localPlugins,
      pendingOperations.value,
      setError,
      url,
      targetDirectory
    )
    if (result.success) {
      await persistState()
    }
    return result
  }

  /**
   * 卸载本地插件
   */
  const uninstallLocalPlugin = async (pluginId: string, pluginDirectory: string, pluginName: string) => {
    // 在卸载前清理插件脚本
    cleanupPluginScript(pluginId)

    const result = await executeLocalPluginOperation(
      'uninstall',
      pluginId,
      pluginService,
      localPlugins,
      pendingOperations.value,
      setError,
      pluginDirectory,
      pluginName
    )
    if (result.success) {
      // 卸载成功后立即移除本地运行时记录，避免通用操作管理器的刷新结果
      // 将已卸载插件再次写入持久化状态。
      localPlugins.value = localPlugins.value.filter(plugin => plugin.config.pluginId !== pluginId)
      await persistState()
    }
    return result
  }

  /**
   * 重新发现本地插件
   */
  const discoverLocalPlugins = async () => {
    const result = await executeLocalPluginOperation(
      'discover',
      '',
      pluginService,
      localPlugins,
      pendingOperations.value,
      setError
    )
    if (result.success) {
      await persistState()
    }
    return result
  }

  /**
   * 选择插件目录
   */
  const selectPluginDirectory = async (title?: string) => {
    return wrappedWithOperation('select-directory', async () => {
      return await pluginService.selectPluginDirectory(title)
    }, 'Failed to select directory')
  }

  /**
   * 选择ZIP文件
   */
  const selectZipFile = async () => {
    return wrappedWithOperation('select-zip', async () => {
      return await pluginService.selectZipFile()
    }, 'Failed to select ZIP file')
  }

  /**
   * 启用/禁用本地插件（供组合根与其它切片复用的原始包装）
   */
  const enableLocalPluginNewWrapped = async (pluginId: string) => {
    const result = await enableLocalPluginNew(pluginId, localPlugins, pendingOperations.value, setError)
    if (result.success) {
      await persistState()
    }
    return result
  }

  const disableLocalPluginNewWrapped = async (pluginId: string) => {
    const result = await disableLocalPluginNew(pluginId, localPlugins, pendingOperations.value, setError)
    if (result.success) {
      await persistState()
    }
    return result
  }

  const wrappedSyncPluginStates = () => {
    syncPluginStates(pluginService, localPlugins, injectPluginsToDocument)
  }

  const wrappedStartPluginStateMonitoring = (intervalMs = 5000) => {
    return startPluginStateMonitoring(intervalMs, wrappedSyncPluginStates)
  }

  const wrappedStopPluginStateMonitoring = () => {
    stopPluginStateMonitoring()
  }

  return {
    // 本地插件操作（localPlugins/serverPlugins/isLocalPluginSystemInitialized 由组合根持有）
    initializeLocalPlugins,
    loadLocalPlugins,
    enableLocalPlugin,
    disableLocalPlugin,
    reloadLocalPlugin: reloadLocalPluginWrapped,
    importPluginFromFile,
    importPluginFromUrl,
    uninstallLocalPlugin,
    discoverLocalPlugins,
    syncServerPlugins,
    enableServerPlugin,
    disableServerPlugin,
    selectPluginDirectory,
    selectZipFile,

    // 启用/禁用原始包装（组合根以 enableLocalPluginNew/disableLocalPluginNew 暴露）
    enableLocalPluginNewWrapped,
    disableLocalPluginNewWrapped,

    // 状态监控
    wrappedSyncPluginStates,
    wrappedStartPluginStateMonitoring,
    wrappedStopPluginStateMonitoring
  }
}
