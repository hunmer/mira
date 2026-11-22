/**
 * 插件状态管理 Store（组合根）
 * 市场安装 / 本地启用 / 更新检查三个切片分别位于 stores/plugin/ 目录，
 * 经由 createPluginXxxSlice 在此处组合为单一 usePluginStore。
 * 对外返回形状与拆分前完全一致。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MockDataGenerator } from '../utils/mockData'
import { pluginService } from '../services/PluginService'

// 导入分离的插件模块
import {
  // 类型
  type ExtendedPluginInfo,
  type PluginRuntime,
  type OperationResult,
  type PluginOperation,

  // 工具函数
  handleError,
  withOperation,
  cleanupPluginScript,

  // 脚本管理
  injectPluginsToDocument,
  injectPluginScript,

  // 实例管理
  registerPluginInstance,
  getPluginInstance,
  loadPluginInstance,
  unloadPluginInstance,
  getPluginInstanceFactory,

  // 操作管理
  executeLocalPluginOperation,

  // 状态持久化
  persistPluginState,
  restorePluginState
} from '../plugins'

// 导入插件 store 切片
import { createPluginMarketSlice } from './plugin/marketSlice'
import { createPluginLocalSlice } from './plugin/localSlice'
import { createPluginUpdateSlice } from './plugin/updateSlice'

/**
 * 插件状态管理
 * 统一管理本地和在线插件，处理插件的加载、卸载、执行和状态持久化
 */
export const usePluginStore = defineStore('plugin', () => {
  // ==================== 状态定义 ====================
  const plugins = ref<ExtendedPluginInfo[]>([])
  const localPlugins = ref<PluginRuntime[]>([])
  const serverPlugins = ref<PluginRuntime[]>([])
  const currentPlugin = ref<ExtendedPluginInfo | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const installProgress = ref<Map<string, number>>(new Map())
  const lastUpdated = ref<Date | null>(null)
  const pendingOperations = ref<Set<string>>(new Set())
  const isLocalPluginSystemInitialized = computed(() => pluginService.initialized)

  // 搜索和过滤状态
  const searchQuery = ref('')
  const filterStatus = ref<'all' | 'installed' | 'available' | 'enabled'>('all')
  const sortBy = ref<'name' | 'version' | 'installedAt' | 'author'>('name')
  const sortOrder = ref<'asc' | 'desc'>('asc')

  // ==================== 计算属性 ====================
  const totalPlugins = computed(() => plugins.value.length)

  const installedPlugins = computed(() =>
    plugins.value.filter(plugin => plugin.installed)
  )

  const availablePlugins = computed(() =>
    plugins.value.filter(plugin => !plugin.installed)
  )

  const enabledPlugins = computed(() =>
    plugins.value.filter(plugin => plugin.installed && plugin.enabled)
  )

  const localInstalledPlugins = computed(() =>
    localPlugins.value.filter(plugin => plugin.status === 'loaded')
  )

  const localDisabledPlugins = computed(() =>
    localPlugins.value.filter(plugin => plugin.status === 'disabled')
  )

  const allPluginsCombined = computed(() => {
    const combined = [...plugins.value]

    // 添加本地插件到组合列表中
    for (const localPlugin of localPlugins.value) {
      const existingIndex = combined.findIndex(p => p.id === localPlugin.config.pluginId)

      if (existingIndex >= 0) {
        // 更新现有插件的本地信息
        combined[existingIndex] = {
          ...combined[existingIndex],
          isLocal: true,
          runtime: localPlugin,
          installed: true,
          enabled: localPlugin.status === 'loaded'
        }
      } else {
        // 添加新的本地插件
        const localPluginInfo: ExtendedPluginInfo = {
          id: localPlugin.config.pluginId,
          name: localPlugin.config.pluginName,
          version: localPlugin.config.version,
          description: localPlugin.config.description,
          author: localPlugin.config.author,
          homepage: localPlugin.config.homepage,
          installed: true,
          enabled: localPlugin.status === 'loaded',
          tags: localPlugin.config.tags,
          isLocal: true,
          runtime: localPlugin,
          installedAt: localPlugin.loadedAt
        }
        combined.push(localPluginInfo)
      }
    }

    return combined
  })

  const installingPlugins = computed(() =>
    plugins.value.filter(plugin => plugin.isInstalling)
  )

  const filteredPlugins = computed(() => {
    let result = [...plugins.value]

    // 搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(plugin =>
        plugin.name.toLowerCase().includes(query) ||
        plugin.description?.toLowerCase().includes(query) ||
        plugin.author?.toLowerCase().includes(query) ||
        plugin.id.toLowerCase().includes(query)
      )
    }

    // 状态过滤
    if (filterStatus.value !== 'all') {
      if (filterStatus.value === 'installed') {
        result = result.filter(plugin => plugin.installed)
      } else if (filterStatus.value === 'available') {
        result = result.filter(plugin => !plugin.installed)
      } else if (filterStatus.value === 'enabled') {
        result = result.filter(plugin => plugin.installed && plugin.enabled)
      }
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0

      if (sortBy.value === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy.value === 'version') {
        comparison = a.version.localeCompare(b.version)
      } else if (sortBy.value === 'author') {
        const aAuthor = a.author || ''
        const bAuthor = b.author || ''
        comparison = aAuthor.localeCompare(bAuthor)
      } else if (sortBy.value === 'installedAt') {
        const aTime = a.installedAt ? new Date(a.installedAt).getTime() : 0
        const bTime = b.installedAt ? new Date(b.installedAt).getTime() : 0
        comparison = bTime - aTime // 最新安装的在前
      }

      return sortOrder.value === 'asc' ? comparison : -comparison
    })

    return result
  })

  const getPluginById = computed(() => {
    return (id: string) => plugins.value.find(plugin => plugin.id === id)
  })

  const isPluginInstalled = computed(() => {
    return (id: string) => {
      const plugin = plugins.value.find(p => p.id === id)
      return plugin?.installed || false
    }
  })

  const isPluginEnabled = computed(() => {
    return (id: string) => {
      const plugin = plugins.value.find(p => p.id === id)
      return plugin?.enabled || false
    }
  })

  const isOperationPending = computed(() => {
    return (operationId: string) => pendingOperations.value.has(operationId)
  })

  // ==================== 工具函数封装 ====================
  const setError = (message: string | null) => {
    error.value = message
  }

  const wrappedWithOperation = async <T>(
    operationId: string,
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<OperationResult & { data?: T }> => {
    return withOperation(operationId, operation, errorMessage, pendingOperations.value, setError)
  }

  // ==================== 状态持久化 ====================
  const persistState = async () => {
    await persistPluginState({
      plugins: allPluginsCombined.value,
      currentPlugin: currentPlugin.value,
      searchQuery: searchQuery.value,
      filterStatus: filterStatus.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      lastUpdated: lastUpdated.value
    })
  }

  const restoreState = async () => {
    const stateData = await restorePluginState()
    if (stateData) {
      // 恢复在线插件列表（过滤掉本地插件）
      plugins.value = stateData.plugins.filter(plugin => !plugin.isLocal)

      currentPlugin.value = stateData.currentPlugin
      searchQuery.value = stateData.searchQuery || ''
      filterStatus.value = stateData.filterStatus || 'all'
      sortBy.value = stateData.sortBy || 'name'
      sortOrder.value = stateData.sortOrder || 'asc'
      lastUpdated.value = stateData.lastUpdated ? new Date(stateData.lastUpdated) : null
    }
  }

  // ==================== 切片组合（本地启用 → 市场安装 → 更新检查） ====================

  // 本地启用切片：依赖共享 refs 与持久化/操作包装器
  const localSlice = createPluginLocalSlice({
    localPlugins,
    serverPlugins,
    pendingOperations,
    setError,
    persistState,
    wrappedWithOperation
  })

  // 市场安装切片：安装成功后需要刷新本地插件列表
  const marketSlice = createPluginMarketSlice({
    pendingOperations,
    loadLocalPlugins: localSlice.loadLocalPlugins
  })

  // 更新检查切片：对比本地插件与市场目录，自动更新走市场安装
  const updateSlice = createPluginUpdateSlice({
    localPlugins,
    marketplacePlugins: marketSlice.marketplacePlugins,
    fetchMarketplaceCatalog: marketSlice.fetchMarketplaceCatalog,
    installMarketplacePlugin: marketSlice.installMarketplacePlugin
  })

  // ==================== 插件管理操作 ====================

  /**
   * 获取插件列表
   */
  const fetchPlugins = async () => {
    isLoading.value = true
    error.value = null

    try {
      // 尝试从miraSDKService服务获取插件，如果失败则使用示例数据
      const result = MockDataGenerator.generatePlugins()

      plugins.value = result.map(plugin => ({
        ...plugin,
        isInstalling: false,
        isUninstalling: false
      }))
      lastUpdated.value = new Date()

      // 持久化到本地存储
      await persistState()

      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plugins'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 安装插件
   */
  const installPlugin = async (pluginId: string) => {
    const operationId = `install-${pluginId}`
    pendingOperations.value.add(operationId)

    const plugin = plugins.value.find(p => p.id === pluginId)
    if (!plugin) {
      pendingOperations.value.delete(operationId)
      error.value = 'Plugin not found'
      return { success: false, error: error.value }
    }

    // 乐观更新：标记为正在安装
    plugin.isInstalling = true
    plugin.installProgress = 0
    installProgress.value.set(pluginId, 0)
    error.value = null

    try {
      // 模拟安装进度
      const progressInterval = setInterval(() => {
        const current = installProgress.value.get(pluginId) || 0
        if (current < 90) {
          const newProgress = current + 10
          installProgress.value.set(pluginId, newProgress)
          if (plugin) {
            plugin.installProgress = newProgress
          }
        }
      }, 200)

      // TODO: Implement installPlugin in MiraSDKService
      console.warn('installPlugin not implemented in plugin store', { pluginId })
      const result = { success: false, message: 'Not implemented' }

      clearInterval(progressInterval)
      installProgress.value.set(pluginId, 100)

      if (result.success) {
        // 更新插件状态
        plugin.installed = true
        plugin.enabled = true
        plugin.installedAt = new Date().toISOString()
        plugin.isInstalling = false
        plugin.installProgress = undefined

        await persistState()
      } else {
        // 回滚乐观更新
        plugin.isInstalling = false
        plugin.installProgress = undefined
        plugin.lastError = result.message || 'Installation failed'
      }

      // 清除安装进度
      setTimeout(() => {
        installProgress.value.delete(pluginId)
      }, 1000)

      return result
    } catch (err) {
      // 回滚乐观更新
      plugin.isInstalling = false
      plugin.installProgress = undefined

      const errorMessage = err instanceof Error ? err.message : 'Failed to install plugin'
      plugin.lastError = errorMessage
      error.value = errorMessage
      installProgress.value.delete(pluginId)
      return { success: false, error: errorMessage }
    } finally {
      pendingOperations.value.delete(operationId)
    }
  }

  /**
   * 卸载插件
   */
  const uninstallPlugin = async (pluginId: string) => {
    const operationId = `uninstall-${pluginId}`
    pendingOperations.value.add(operationId)

    const plugin = plugins.value.find(p => p.id === pluginId)
    if (!plugin) {
      pendingOperations.value.delete(operationId)
      error.value = 'Plugin not found'
      return { success: false, error: error.value }
    }

    // 保存原始状态用于回滚
    const originalState = {
      installed: plugin.installed,
      enabled: plugin.enabled,
      installedAt: plugin.installedAt
    }

    // 乐观更新：标记为正在卸载
    plugin.isUninstalling = true
    plugin.installed = false
    plugin.enabled = false
    error.value = null

    try {
      // TODO: Implement uninstallPlugin in MiraSDKService
      console.warn('uninstallPlugin not implemented in plugin store', { pluginId })
      const result = { success: false, message: 'Not implemented' }

      if (result.success) {
        // 确认卸载成功
        plugin.installedAt = undefined
        plugin.isUninstalling = false
        plugin.lastError = undefined

        await persistState()
      } else {
        // 回滚乐观更新
        plugin.installed = originalState.installed
        plugin.enabled = originalState.enabled
        plugin.installedAt = originalState.installedAt
        plugin.isUninstalling = false
        plugin.lastError = result.message || 'Uninstallation failed'
      }

      return result
    } catch (err) {
      // 回滚乐观更新
      plugin.installed = originalState.installed
      plugin.enabled = originalState.enabled
      plugin.installedAt = originalState.installedAt
      plugin.isUninstalling = false

      const errorMessage = err instanceof Error ? err.message : 'Failed to uninstall plugin'
      plugin.lastError = errorMessage
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      pendingOperations.value.delete(operationId)
    }
  }

  /**
   * 批量安装插件
   */
  const installMultiplePlugins = async (pluginIds: string[]) => {
    const results: any[] = []
    const errors: string[] = []

    for (const pluginId of pluginIds) {
      try {
        const result = await installPlugin(pluginId)
        results.push(result)

        if (!result.success) {
          const errorMsg = 'error' in result && result.error ? result.error : 'Installation failed'
          errors.push(`${pluginId}: ${errorMsg}`)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Installation failed'
        errors.push(`${pluginId}: ${errorMessage}`)
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    }
  }

  /**
   * 切换插件启用状态
   */
  const togglePlugin = (pluginId: string) => {
    const plugin = plugins.value.find(p => p.id === pluginId)
    if (plugin && plugin.installed) {
      plugin.enabled = !plugin.enabled
      persistState()
    }
  }

  /**
   * 设置当前选中的插件
   */
  const setCurrentPlugin = (plugin: ExtendedPluginInfo | null) => {
    currentPlugin.value = plugin
  }

  /**
   * 设置搜索查询
   */
  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  /**
   * 设置过滤状态
   */
  const setFilterStatus = (status: typeof filterStatus.value) => {
    filterStatus.value = status
  }

  /**
   * 设置排序方式
   */
  const setSorting = (sort: typeof sortBy.value, order: typeof sortOrder.value) => {
    sortBy.value = sort
    sortOrder.value = order
  }

  /**
   * 带重试机制的获取插件
   */
  const fetchPluginsWithRetry = async (maxRetries = 3) => {
    let lastError = ''

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await fetchPlugins()

      if (result.success) {
        return result
      }

      lastError = result.error || 'Unknown error'

      if (attempt < maxRetries) {
        // 等待一定时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }

    return { success: false, error: `Fetch failed after ${maxRetries} attempts: ${lastError}` }
  }

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null

    // 同时清除插件的错误信息
    plugins.value.forEach(plugin => {
      plugin.lastError = undefined
    })
  }

  /**
   * 刷新插件列表
   */
  const refreshPlugins = async () => {
    return await fetchPlugins()
  }

  // ==================== 返回store接口 ====================
  return {
    // 状态
    plugins,
    localPlugins,
    serverPlugins,
    currentPlugin,
    isLoading,
    error,
    installProgress,
    lastUpdated,
    pendingOperations,
    searchQuery,
    filterStatus,
    sortBy,
    sortOrder,
    isLocalPluginSystemInitialized,

    // 插件市场状态
    marketplacePlugins: marketSlice.marketplacePlugins,
    isMarketplaceLoading: marketSlice.isMarketplaceLoading,
    marketplaceError: marketSlice.marketplaceError,
    marketplaceLastUpdated: marketSlice.marketplaceLastUpdated,

    // 插件更新检查状态
    pluginUpdates: updateSlice.pluginUpdates,
    isCheckingUpdates: updateSlice.isCheckingUpdates,

    // 插件市场安装进度
    marketInstallProgress: marketSlice.marketInstallProgress,

    // 计算属性
    totalPlugins,
    installedPlugins,
    availablePlugins,
    enabledPlugins,
    localInstalledPlugins,
    localDisabledPlugins,
    allPluginsCombined,
    installingPlugins,
    filteredPlugins,
    getPluginById,
    isPluginInstalled,
    isPluginEnabled,
    isOperationPending,

    // 基础操作
    fetchPlugins,
    installPlugin,
    uninstallPlugin,
    installMultiplePlugins,
    togglePlugin,
    setCurrentPlugin,
    setSearchQuery,
    setFilterStatus,
    setSorting,
    fetchPluginsWithRetry,
    clearError,
    refreshPlugins,

    // 状态持久化
    persistState,
    restoreState,

    // 本地插件操作
    initializeLocalPlugins: localSlice.initializeLocalPlugins,
    loadLocalPlugins: localSlice.loadLocalPlugins,
    enableLocalPlugin: localSlice.enableLocalPlugin,
    disableLocalPlugin: localSlice.disableLocalPlugin,
    reloadLocalPlugin: localSlice.reloadLocalPlugin,
    importPluginFromFile: localSlice.importPluginFromFile,
    importPluginFromUrl: localSlice.importPluginFromUrl,
    uninstallLocalPlugin: localSlice.uninstallLocalPlugin,
    discoverLocalPlugins: localSlice.discoverLocalPlugins,
    syncServerPlugins: localSlice.syncServerPlugins,
    enableServerPlugin: localSlice.enableServerPlugin,
    disableServerPlugin: localSlice.disableServerPlugin,
    selectPluginDirectory: localSlice.selectPluginDirectory,
    selectZipFile: localSlice.selectZipFile,

    // 插件市场操作
    fetchMarketplaceCatalog: marketSlice.fetchMarketplaceCatalog,
    installMarketplacePlugin: marketSlice.installMarketplacePlugin,
    cancelMarketInstall: marketSlice.cancelMarketInstall,
    checkPluginUpdates: updateSlice.checkPluginUpdates,
    runAutoPluginUpdates: updateSlice.runAutoPluginUpdates,

    // 脚本管理（从模块导入）
    injectPluginsToDocument,
    injectPluginScript,
    cleanupPluginScript,

    // 实例管理（从模块导入）
    registerPluginInstance,
    getPluginInstance,
    loadPluginInstance,
    unloadPluginInstance,
    getPluginInstanceFactory,
    enableLocalPluginNew: localSlice.enableLocalPluginNewWrapped,
    disableLocalPluginNew: localSlice.disableLocalPluginNewWrapped,

    // 状态监控（从模块导入）
    syncPluginStates: localSlice.wrappedSyncPluginStates,
    startPluginStateMonitoring: localSlice.wrappedStartPluginStateMonitoring,
    stopPluginStateMonitoring: localSlice.wrappedStopPluginStateMonitoring,

    // 工具函数（从模块导入）
    handleError,
    withOperation: wrappedWithOperation,
    executeLocalPluginOperation: (operation: PluginOperation, pluginId: string, ...args: any[]) =>
      executeLocalPluginOperation(operation, pluginId, pluginService, localPlugins, pendingOperations.value, setError, ...args)
  }
})
