/**
 * 插件状态管理 Store
 * 重构后的版本，使用模块化架构
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MockDataGenerator } from '../utils/mockData'
import { pluginService } from '../services/PluginService'
import { useSettingsStore } from './settings'
import type { MarketplacePluginEntry, PluginInstallProgress } from '../../shared/types'

// 导入分离的插件模块
import {
  // 类型
  type ExtendedPluginInfo,
  type PluginRuntime,
  type PluginManagerConfig,
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
  initializeGlobalPluginSystem,
  registerPluginInstance,
  getPluginInstance,
  loadPluginInstance,
  unloadPluginInstance,
  getPluginInstanceFactory,
  syncPluginStates,
  startPluginStateMonitoring,
  stopPluginStateMonitoring,

  // 操作管理
  enableLocalPluginNew,
  disableLocalPluginNew,
  reloadLocalPlugin,
  executeLocalPluginOperation,

  // 状态持久化
  persistPluginState,
  restorePluginState
} from '../plugins'

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

  // 插件市场状态
  const marketplacePlugins = ref<MarketplacePluginEntry[]>([])
  const isMarketplaceLoading = ref(false)
  const marketplaceError = ref<string | null>(null)
  const marketplaceLastUpdated = ref<Date | null>(null)

  // 插件更新检查状态
  // key: pluginId；value: { entry: 市场条目, versionOutdated: 版本落后, fileMismatch: 文件不一致 }
  const pluginUpdates = ref<Map<string, { entry: MarketplacePluginEntry; versionOutdated: boolean; fileMismatch: boolean }>>(new Map())
  const isCheckingUpdates = ref(false)

  // 插件市场安装进度：key: pluginId，value: { percent, phase, transferred, total }
  // 由主进程逐块下载时回推，驱动 UI 进度条
  const marketInstallProgress = ref<Map<string, { percent: number; phase: PluginInstallProgress['phase']; transferred: number; total: number }>>(new Map())

  // 订阅主进程安装进度事件（仅注册一次）
  pluginService.onInstallProgress((p: PluginInstallProgress) => {
    const next = new Map(marketInstallProgress.value)
    next.set(p.pluginId, { percent: p.percent, phase: p.phase, transferred: p.transferred, total: p.total })
    marketInstallProgress.value = next
  })

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

  // ==================== 插件管理操作 ====================

  /**
   * 获取插件列表
   */
  const fetchPlugins = async () => {
    isLoading.value = true
    error.value = null

    try {
      // 尝试从miraSDKService服务获取插件，如果失败则使用示例数据
      let result
      // result = await miraSDKService.getPlugins()
      result = MockDataGenerator.generatePlugins()

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

  // ==================== 本地插件操作（使用分离的模块） ====================

  /**
   * 初始化本地插件系统
   */
  const initializeLocalPlugins = async (config: PluginManagerConfig) => {
    return wrappedWithOperation('initialize', async () => {
      console.log('🚀 Initializing plugin service with config:', config)

      // 初始化全局插件系统API
      initializeGlobalPluginSystem()

      // 使用renderer进程PluginService
      const result = await pluginService.initialize(config)
      console.log('📡 Received result from PluginService.initialize:', result)

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
          console.log(`🔄 Restored plugin state: ${plugin.config.pluginName} → ${plugin.status}`)

          // 如果插件从enabled变为disabled，需要清理实例和脚本
          if (oldStatus === 'loaded' && plugin.status === 'disabled') {
            try {
              // 卸载插件实例
              await unloadPluginInstance(plugin.config.pluginId)
              // 清理插件脚本
              cleanupPluginScript(plugin.config.pluginId)
              console.log(`🧹 Cleaned up disabled plugin: ${plugin.config.pluginName}`)
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
      console.log('🔄 Store.loadLocalPlugins - 开始加载插件')
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

  // ==================== 插件市场操作 ====================

  /**
   * 拉取插件市场目录
   * 从 settings.clientPluginMarketUrl 指向的 HTTP 静态服务获取 plugins.json
   */
  const fetchMarketplaceCatalog = async () => {
    const settingsStore = useSettingsStore()
    const marketUrl = (settingsStore.settings.clientPluginMarketUrl || '').trim()

    if (!marketUrl) {
      marketplacePlugins.value = []
      marketplaceError.value = '未配置插件市场源地址'
      return { success: false, message: '未配置插件市场源地址' }
    }

    isMarketplaceLoading.value = true
    marketplaceError.value = null
    try {
      const result = await pluginService.fetchMarketplaceCatalog(marketUrl)
      if (result.success && result.data) {
        const catalog = result.data as { plugins: MarketplacePluginEntry[] }
        marketplacePlugins.value = catalog.plugins || []
        marketplaceLastUpdated.value = new Date()
        return { success: true, data: catalog }
      } else {
        marketplaceError.value = result.message || '拉取插件市场目录失败'
        return { success: false, message: marketplaceError.value }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch marketplace catalog'
      marketplaceError.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isMarketplaceLoading.value = false
    }
  }

  /**
   * 从插件市场安装/更新插件
   * 安装成功后会刷新本地插件列表。
   */
  const installMarketplacePlugin = async (entry: MarketplacePluginEntry) => {
    const operationId = `market-install-${entry.pluginId}`
    if (pendingOperations.value.has(operationId)) {
      return { success: false, message: '该插件正在安装中' }
    }
    pendingOperations.value.add(operationId)

    // 初始化进度
    const initProgress = new Map(marketInstallProgress.value)
    initProgress.set(entry.pluginId, { percent: 0, phase: 'downloading', transferred: 0, total: 0 })
    marketInstallProgress.value = initProgress

    try {
      const settingsStore = useSettingsStore()
      const marketUrl = (settingsStore.settings.clientPluginMarketUrl || '').trim()
      if (!marketUrl) {
        return { success: false, message: '未配置插件市场源地址' }
      }

      // 构建产物可能在市场列表打开后发生变化。安装前重拉目录，确保传给
      // 主进程的文件清单与当前静态源内容属于同一次索引生成结果。
      const catalogResult = await fetchMarketplaceCatalog()
      if (!catalogResult.success) {
        const detail = 'message' in catalogResult ? catalogResult.message : catalogResult.error
        return { success: false, message: detail || '刷新插件市场目录失败' }
      }
      const latestEntry = marketplacePlugins.value.find(item => item.pluginId === entry.pluginId)
      if (!latestEntry) {
        return { success: false, message: '插件已不在当前市场目录中' }
      }

      const result = await pluginService.installMarketplacePlugin(marketUrl, latestEntry)
      if (result.success) {
        // 安装成功后刷新本地插件列表
        await loadLocalPlugins()
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to install marketplace plugin'
      return { success: false, error: errorMessage }
    } finally {
      pendingOperations.value.delete(operationId)
      // 清除进度（延迟一点，避免进度条在 100% 之前闪烁消失）
      const clear = () => {
        const next = new Map(marketInstallProgress.value)
        next.delete(entry.pluginId)
        marketInstallProgress.value = next
      }
      setTimeout(clear, 300)
    }
  }

  /**
   * 取消正在进行的插件市场安装
   */
  const cancelMarketInstall = async (pluginId: string) => {
    return await pluginService.cancelInstall(pluginId)
  }

  /**
   * 简单的语义化版本比较：返回正数表示 a 更新，负数表示 b 更新，0 表示相等
   */
  const compareVersions = (a: string, b: string): number => {
    const pa = (a || '').split('.').map((n) => parseInt(n, 10) || 0)
    const pb = (b || '').split('.').map((n) => parseInt(n, 10) || 0)
    const len = Math.max(pa.length, pb.length)
    for (let i = 0; i < len; i++) {
      const da = pa[i] || 0
      const db = pb[i] || 0
      if (da !== db) return da - db
    }
    return 0
  }

  /**
   * 检查本地已安装插件是否有更新。
   * 判定条件（满足任一即标记可更新）：
   *   1. 市场条目版本 > 本地版本；
   *   2. 市场条目提供 files 清单，且与本地文件 sha256 列表对不上。
   * 无市场源 / 无市场目录时静默返回空。
   * 结果写入 pluginUpdates。
   */
  const checkPluginUpdates = async () => {
    // 清空旧结果
    pluginUpdates.value = new Map()

    const settingsStore = useSettingsStore()
    const marketUrl = (settingsStore.settings.clientPluginMarketUrl || '').trim()
    if (!marketUrl) return { success: false, message: '未配置插件市场源地址' }

    // 确保市场目录已加载
    if (!marketplacePlugins.value || marketplacePlugins.value.length === 0) {
      await fetchMarketplaceCatalog()
    }
    const catalog = marketplacePlugins.value || []
    if (catalog.length === 0) return { success: false, message: '插件市场目录为空' }

    isCheckingUpdates.value = true
    try {
      const updates = new Map<string, { entry: MarketplacePluginEntry; versionOutdated: boolean; fileMismatch: boolean }>()
      const localList = localPlugins.value || []

      for (const local of localList) {
        const entry = catalog.find((e) => e.pluginId === local.config.pluginId)
        if (!entry) continue // 市场无此插件，跳过

        let versionOutdated = false
        let fileMismatch = false

        // 1. 版本对比：市场版本 > 本地版本
        if (compareVersions(entry.version, local.config.version) > 0) {
          versionOutdated = true
        }

        // 2. 文件 sha256 对比：仅当市场条目提供 files 清单时
        if (!versionOutdated && entry.files && entry.files.length > 0) {
          const localFiles = await pluginService.getLocalFileChecksums(local.config.pluginId)
          // 数量不同 → 视为不一致
          if (localFiles.length !== entry.files.length) {
            fileMismatch = true
          } else {
            // 按 path 建立 checksum 映射比对
            const marketMap = new Map(entry.files.map((f) => [f.path, f.checksum]))
            for (const lf of localFiles) {
              const expected = marketMap.get(lf.path)
              if (expected === undefined || expected !== lf.checksum) {
                fileMismatch = true
                break
              }
            }
          }
        }

        if (versionOutdated || fileMismatch) {
          updates.set(local.config.pluginId, { entry, versionOutdated, fileMismatch })
        }
      }

      pluginUpdates.value = updates
      return { success: true, data: { count: updates.size } }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check plugin updates'
      return { success: false, error: errorMessage }
    } finally {
      isCheckingUpdates.value = false
    }
  }

  // ==================== 状态管理操作 ====================

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

  // ==================== 插件状态监控（使用分离的模块） ====================

  const wrappedSyncPluginStates = () => {
    syncPluginStates(pluginService, localPlugins, injectPluginsToDocument)
  }

  const wrappedStartPluginStateMonitoring = (intervalMs = 5000) => {
    return startPluginStateMonitoring(intervalMs, wrappedSyncPluginStates)
  }

  const wrappedStopPluginStateMonitoring = () => {
    stopPluginStateMonitoring()
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
    marketplacePlugins,
    isMarketplaceLoading,
    marketplaceError,
    marketplaceLastUpdated,

    // 插件更新检查状态
    pluginUpdates,
    isCheckingUpdates,

    // 插件市场安装进度
    marketInstallProgress,

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

    // 插件市场操作
    fetchMarketplaceCatalog,
    installMarketplacePlugin,
    cancelMarketInstall,
    checkPluginUpdates,

    // 脚本管理（从模块导入）
    injectPluginsToDocument,
    injectPluginScript,
    cleanupPluginScript: cleanupPluginScript,

    // 实例管理（从模块导入）
    registerPluginInstance,
    getPluginInstance,
    loadPluginInstance,
    unloadPluginInstance,
    getPluginInstanceFactory,
    enableLocalPluginNew: async (pluginId: string) => {
      const result = await enableLocalPluginNew(pluginId, localPlugins, pendingOperations.value, setError)
      if (result.success) {
        await persistState()
      }
      return result
    },
    disableLocalPluginNew: async (pluginId: string) => {
      const result = await disableLocalPluginNew(pluginId, localPlugins, pendingOperations.value, setError)
      if (result.success) {
        await persistState()
      }
      return result
    },

    // 状态监控（从模块导入）
    syncPluginStates: wrappedSyncPluginStates,
    startPluginStateMonitoring: wrappedStartPluginStateMonitoring,
    stopPluginStateMonitoring: wrappedStopPluginStateMonitoring,

    // 工具函数（从模块导入）
    handleError,
    withOperation: wrappedWithOperation,
    executeLocalPluginOperation: (operation: PluginOperation, pluginId: string, ...args: any[]) =>
      executeLocalPluginOperation(operation, pluginId, pluginService, localPlugins, pendingOperations.value, setError, ...args)
  }
})
