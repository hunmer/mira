import { ref } from 'vue'
import type { Ref } from 'vue'
import { pluginService } from '../../services/PluginService'
import { useSettingsStore } from '../settings'
import i18n from '../../i18n'
import type { PluginRuntime } from '../../plugins'
import type { MarketplacePluginEntry } from '../../../shared/types'

/**
 * 插件 store —— 更新检查切片（市场版本/文件校验对比、启动自动更新）
 * 由 stores/plugin.ts 组合进 usePluginStore，不单独注册 Pinia store。
 */
export interface PluginUpdateSliceDeps {
  /** 本地已安装插件（来自本地启用切片） */
  localPlugins: Ref<PluginRuntime[]>
  /** 市场目录（来自市场切片） */
  marketplacePlugins: Ref<MarketplacePluginEntry[]>
  /** 拉取市场目录（来自市场切片） */
  fetchMarketplaceCatalog: () => Promise<{ success: boolean; message?: string; error?: string }>
  /** 从市场安装/更新插件（来自市场切片） */
  installMarketplacePlugin: (entry: MarketplacePluginEntry) => Promise<{ success: boolean; message?: string; error?: string }>
}

export function createPluginUpdateSlice(deps: PluginUpdateSliceDeps) {
  const { localPlugins, marketplacePlugins, fetchMarketplaceCatalog, installMarketplacePlugin } = deps

  // 插件更新检查状态：key: pluginId，value: { entry, versionOutdated, fileMismatch }
  const pluginUpdates = ref<Map<string, { entry: MarketplacePluginEntry; versionOutdated: boolean; fileMismatch: boolean }>>(new Map())
  const isCheckingUpdates = ref(false)

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
   *   2. 市场条目提供 files 清单，且同一路径文件的内容 sha256 不一致。
   * 无市场源 / 无市场目录时静默返回空。
   * 结果写入 pluginUpdates。
   */
  const checkPluginUpdates = async () => {
    // 清空旧结果
    pluginUpdates.value = new Map()

    const settingsStore = useSettingsStore()
    const marketUrl = (settingsStore.settings.clientPluginMarketUrl || '').trim()
    if (!marketUrl) return { success: false, message: i18n.global.t('stores.plugin.marketUrlNotConfigured') }

    // 每次检查都刷新市场目录，避免复用打开插件窗口时缓存的旧索引。
    const catalogResult = await fetchMarketplaceCatalog()
    if (!catalogResult.success) return catalogResult
    const catalog = marketplacePlugins.value || []
    if (catalog.length === 0) return { success: false, message: i18n.global.t('stores.plugin.catalogEmpty') }

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

        // 2. 文件内容 sha256 对比：仅比较市场和本地都存在的同一路径文件
        if (!versionOutdated && entry.files && entry.files.length > 0) {
          const localFiles = await pluginService.getLocalFileChecksums(local.config.pluginId)
          // 数量差异、文件新增/删除、校验失败都不等同于已有文件内容发生变化。
          // 只有同一路径文件的 checksum 明确不一致时，才标记为文件已改动。
          const marketMap = new Map(entry.files.map((f) => [f.path, f.checksum]))
          for (const lf of localFiles) {
            const expected = marketMap.get(lf.path)
            if (expected !== undefined && expected !== lf.checksum) {
              fileMismatch = true
              break
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

  /**
   * 启动时自动更新：检查本地插件更新并逐个静默安装（无需用户确认）。
   * 仅当设置开启「自动更新插件」时执行；未配置市场源 / 无更新 / 失败均静默返回，
   * 不打断应用启动流程。
   */
  const runAutoPluginUpdates = async () => {
    const settingsStore = useSettingsStore()
    if (!settingsStore.settings.autoUpdatePlugins) {
      return { success: true, data: { updated: 0 } }
    }

    const checkResult = await checkPluginUpdates()
    if (!checkResult.success) return checkResult

    const entries = [...pluginUpdates.value.entries()]
    let updated = 0
    for (const [pluginId, { entry }] of entries) {
      const installResult = await installMarketplacePlugin(entry)
      if (installResult.success) {
        updated++
        pluginUpdates.value.delete(pluginId)
      } else {
        console.warn(`[autoUpdate] Failed to update plugin ${entry.pluginName}:`, (installResult as any).message || (installResult as any).error)
      }
    }
    return { success: true, data: { updated } }
  }

  return {
    // 更新检查状态
    pluginUpdates,
    isCheckingUpdates,

    // 更新检查操作（compareVersions 为切片内部工具，不进入 store 返回形状）
    checkPluginUpdates,
    runAutoPluginUpdates
  }
}
