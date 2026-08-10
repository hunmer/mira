import type { PluginRuntime } from '@/shared/types'
import type { MarketplacePluginEntry } from '@/shared/types'
import { usePluginStore } from '@renderer/stores/plugin'

/**
 * 语义化版本比较：返回正数表示 a 更新，负数表示 b 更新，0 表示相等
 */
export const compareVersions = (a: string, b: string): number => {
  const pa = (a || '').split('.').map(n => parseInt(n, 10) || 0)
  const pb = (b || '').split('.').map(n => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0
    const db = pb[i] || 0
    if (da !== db) return da - db
  }
  return 0
}

/**
 * 平台标识的中文标签
 */
export const platformLabel = (p: string): string => {
  switch (p) {
    case 'win32': return 'Windows'
    case 'darwin': return 'macOS'
    case 'linux': return 'Linux'
    default: return p
  }
}

/**
 * 判断某市场插件相对本地安装状态：未安装 / 已安装(同版本或更新) / 可更新
 */
export const getMarketStatus = (entry: MarketplacePluginEntry, t: (key: string, opts?: any) => string): {
  action: 'install' | 'update' | 'none'
  badge?: string
  badgeClass?: string
} => {
  const pluginStore = usePluginStore()
  const local = (pluginStore.localPlugins || []).find(p => p.config.pluginId === entry.pluginId)
  if (!local) {
    return { action: 'install' }
  }
  const cmp = compareVersions(entry.version, local.config.version)
  if (cmp > 0) {
    return {
      action: 'update',
      badge: t('business.pluginsDialog.badgeUpdatable'),
      badgeClass: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
    }
  }
  return {
    action: 'none',
    badge: t('business.pluginsDialog.badgeInstalled'),
    badgeClass: 'bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground'
  }
}

/**
 * 取某插件的安装进度百分比
 */
export const getInstallPercent = (pluginId: string): number => {
  const pluginStore = usePluginStore()
  return pluginStore.marketInstallProgress?.get(pluginId)?.percent ?? 0
}

/**
 * 取某插件的安装阶段
 */
export const getInstallPhase = (pluginId: string): string => {
  const pluginStore = usePluginStore()
  return pluginStore.marketInstallProgress?.get(pluginId)?.phase ?? 'downloading'
}

/**
 * 取某插件的更新信息（无则返回 undefined）
 */
export const getPluginUpdate = (pluginId: string) => {
  const pluginStore = usePluginStore()
  return pluginStore.pluginUpdates?.get(pluginId)
}

export type { PluginRuntime, MarketplacePluginEntry }
