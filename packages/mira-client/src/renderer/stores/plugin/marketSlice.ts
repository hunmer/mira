import { ref } from 'vue'
import type { Ref } from 'vue'
import { pluginService } from '../../services/PluginService'
import { useSettingsStore } from '../settings'
import i18n from '../../i18n'
import type { MarketplacePluginEntry, PluginInstallProgress } from '../../../shared/types'

/**
 * 插件 store —— 市场切片（目录拉取 / 市场安装 / 安装进度）
 * 由 stores/plugin.ts 组合进 usePluginStore，不单独注册 Pinia store。
 */
export interface PluginMarketSliceDeps {
  /** 共享的进行中操作集合（与本地启用切片共用） */
  pendingOperations: Ref<Set<string>>
  /** 安装成功后刷新本地插件列表（来自本地启用切片） */
  loadLocalPlugins: () => Promise<{ success: boolean; data?: unknown; message?: string }>
}

export function createPluginMarketSlice(deps: PluginMarketSliceDeps) {
  const { pendingOperations, loadLocalPlugins } = deps

  // 插件市场状态
  const marketplacePlugins = ref<MarketplacePluginEntry[]>([])
  const isMarketplaceLoading = ref(false)
  const marketplaceError = ref<string | null>(null)
  const marketplaceLastUpdated = ref<Date | null>(null)

  // 插件市场安装进度：key: pluginId，value: { percent, phase, transferred, total }
  // 由主进程逐块下载时回推，驱动 UI 进度条
  const marketInstallProgress = ref<Map<string, { percent: number; phase: PluginInstallProgress['phase']; transferred: number; total: number }>>(new Map())

  // 订阅主进程安装进度事件（仅注册一次）
  pluginService.onInstallProgress((p: PluginInstallProgress) => {
    const next = new Map(marketInstallProgress.value)
    next.set(p.pluginId, { percent: p.percent, phase: p.phase, transferred: p.transferred, total: p.total })
    marketInstallProgress.value = next
  })

  /**
   * 拉取插件市场目录
   * 从 settings.clientPluginMarketUrl 指向的 HTTP 静态服务获取 plugins.json
   */
  const fetchMarketplaceCatalog = async () => {
    const settingsStore = useSettingsStore()
    const marketUrl = (settingsStore.settings.clientPluginMarketUrl || '').trim()

    if (!marketUrl) {
      marketplacePlugins.value = []
      marketplaceError.value = i18n.global.t('stores.plugin.marketUrlNotConfigured')
      return { success: false, message: i18n.global.t('stores.plugin.marketUrlNotConfigured') }
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
        marketplaceError.value = result.message || i18n.global.t('stores.plugin.fetchCatalogFailed')
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
      return { success: false, message: i18n.global.t('stores.plugin.pluginInstalling') }
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
        return { success: false, message: i18n.global.t('stores.plugin.marketUrlNotConfigured') }
      }

      // 构建产物可能在市场列表打开后发生变化。安装前重拉目录，确保传给
      // 主进程的文件清单与当前静态源内容属于同一次索引生成结果。
      const catalogResult = await fetchMarketplaceCatalog()
      if (!catalogResult.success) {
        const detail = 'message' in catalogResult ? catalogResult.message : catalogResult.error
        return { success: false, message: detail || i18n.global.t('stores.plugin.refreshCatalogFailed') }
      }
      const latestEntry = marketplacePlugins.value.find(item => item.pluginId === entry.pluginId)
      if (!latestEntry) {
        return { success: false, message: i18n.global.t('stores.plugin.pluginNotInCatalog') }
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

  return {
    // 市场状态
    marketplacePlugins,
    isMarketplaceLoading,
    marketplaceError,
    marketplaceLastUpdated,
    marketInstallProgress,

    // 市场操作
    fetchMarketplaceCatalog,
    installMarketplacePlugin,
    cancelMarketInstall
  }
}
