/**
 * 插件状态持久化
 * 负责插件状态的保存和恢复到 LibraryStorage
 */

import { LibraryStorage } from '../utils/LibraryStorage'
import type { PluginStateData, ExtendedPluginInfo } from './types'

/**
 * 持久化插件状态到本地存储
 */
export const persistPluginState = async (stateData: {
  plugins: ExtendedPluginInfo[]
  currentPlugin: ExtendedPluginInfo | null
  searchQuery: string
  filterStatus: 'all' | 'installed' | 'available' | 'enabled'
  sortBy: 'name' | 'version' | 'installedAt' | 'author'
  sortOrder: 'asc' | 'desc'
  lastUpdated: Date | null
}) => {
  try {
    const pluginData: PluginStateData = {
      plugins: stateData.plugins.map(plugin => ({
        ...plugin,
        isInstalling: false,
        isUninstalling: false,
        installProgress: undefined
      })),
      currentPlugin: stateData.currentPlugin,
      searchQuery: stateData.searchQuery,
      filterStatus: stateData.filterStatus,
      sortBy: stateData.sortBy,
      sortOrder: stateData.sortOrder,
      lastUpdated: stateData.lastUpdated?.toISOString() || null
    }

    await LibraryStorage.setItem('plugins', JSON.stringify(pluginData))
  } catch (err) {
    console.error('Failed to persist plugin state:', err)
  }
}

/**
 * 从本地存储恢复插件状态
 */
export const restorePluginState = async (): Promise<PluginStateData | null> => {
  try {
    const stored = await LibraryStorage.getItem('plugins')
    if (!stored) return null

    const pluginData: PluginStateData = JSON.parse(stored)

    // 清理运行时状态
    if (pluginData.plugins) {
      pluginData.plugins = pluginData.plugins.map((plugin: any) => ({
        ...plugin,
        isInstalling: false,
        isUninstalling: false,
        installProgress: undefined
      }))
    }

    return pluginData
  } catch (err) {
    console.error('Failed to restore plugin state:', err)
    return null
  }
}

/**
 * 清除插件状态
 */
export const clearPluginState = async () => {
  try {
    await LibraryStorage.removeItem('plugins')
  } catch (err) {
    console.error('Failed to clear plugin state:', err)
  }
}