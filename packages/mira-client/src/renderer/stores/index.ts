export { useAuthStore } from './auth'
export { useLibraryStore } from './library'
export { useMediaStore } from './media'
export { useSettingsStore } from './settings'
export { usePluginStore } from './plugin'
export { useFolderStore } from './folder'
export { useTagStore } from './tag'

// 导出类型
export type { AppSettings } from './settings'
export type { Folder } from './folder'
export type { Tag } from './tag'

/**
 * 初始化所有状态管理store
 * 恢复持久化状态并建立store之间的关联
 * @returns Promise<void>
 */
export async function initializeStores() {
  // 首先执行数据迁移（如果需要）
  const { DataMigration } = await import('../utils/DataMigration')
  await DataMigration.autoMigrate()

  const { useAuthStore } = await import('./auth')
  const { useLibraryStore } = await import('./library')
  const { useMediaStore } = await import('./media')
  const { useSettingsStore } = await import('./settings')
  const { usePluginStore } = await import('./plugin')
  const { useServerListStore } = await import('./serverList')
  // 文件夹和标签 store 将在需要时动态导入

  // 获取store实例
  const authStore = useAuthStore()
  const libraryStore = useLibraryStore()
  const mediaStore = useMediaStore()
  const settingsStore = useSettingsStore()
  const pluginStore = usePluginStore()
  const serverListStore = useServerListStore()

  try {
    // 1. 首先初始化设置store
    await settingsStore.initialize()
    
    // 2. 初始化素材库列表
    await serverListStore.initializeServerList()
    
    // 3. 恢复认证状态
    await authStore.restoreAuthState()
    
    // 4. 如果已认证，初始化认证状态
    if (authStore.isLoggedIn) {
      await authStore.initializeAuth()
    }
    
    // 5. 恢复库状态
    await libraryStore.restoreLibraryState()
    
    // 6. 恢复媒体状态
    await mediaStore.restoreMediaState()
    
    // 6. 恢复插件状态
    await pluginStore.restorePluginState()
    
    // 7. 文件夹和标签状态在需要时动态加载，不需要在此初始化
    // folderStore 和 tagStore 将在 InitializationService 中按需加载
    
    console.log('All stores initialized successfully')
    
    return { success: true }
  } catch (error) {
    console.error('Failed to initialize stores:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * 清除所有store的状态
 * 用于用户登出或重置应用状态
 * @returns Promise<void>
 */
export async function clearAllStores() {
  const { useAuthStore } = await import('./auth')
  const { useLibraryStore } = await import('./library')
  const { useMediaStore } = await import('./media')
  const { useSettingsStore } = await import('./settings')
  const { usePluginStore } = await import('./plugin')
  const { useFolderStore } = await import('./folder')
  const { useTagStore } = await import('./tag')

  // 获取store实例
  const authStore = useAuthStore()
  const libraryStore = useLibraryStore()
  const mediaStore = useMediaStore()
  const settingsStore = useSettingsStore()
  const pluginStore = usePluginStore()
  const folderStore = useFolderStore()
  const tagStore = useTagStore()

  try {
    // 1. 清除认证状态
    await authStore.clearAuthState()
    
    // 2. 清除库状态（但保留本地配置）
    libraryStore.libraries = []
    libraryStore.currentLibrary = null
    
    // 3. 清除媒体状态
    mediaStore.filesMap = {}  // 清除所有 tab 的文件数据
    mediaStore.currentTabId = ''  // 清除当前 tab ID
    mediaStore.currentFile = null
    mediaStore.selectedFiles.clear()
    
    // 4. 清除文件夹状态
    folderStore.cleanup()
    
    // 5. 清除标签状态
    tagStore.cleanup()
    
    // 6. 清除插件错误状态（但保留插件信息）
    pluginStore.clearError()
    
    // 7. 断开服务器连接功能已移至serverList store
    // 在需要时可以通过serverList store管理连接状态
    
    console.log('All stores cleared successfully')
    
    return { success: true }
  } catch (error) {
    console.error('Failed to clear stores:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * 获取应用的整体状态摘要
 * @returns Object 包含各个store的关键状态信息
 */
export function getAppStateSummary() {
  const { useAuthStore } = require('./auth')
  const { useLibraryStore } = require('./library')
  const { useMediaStore } = require('./media')
  const { useSettingsStore } = require('./settings')
  const { usePluginStore } = require('./plugin')

  const authStore = useAuthStore()
  const libraryStore = useLibraryStore()
  const mediaStore = useMediaStore()
  const settingsStore = useSettingsStore()
  const pluginStore = usePluginStore()

  return {
    auth: {
      isLoggedIn: authStore.isLoggedIn,
      user: authStore.user?.username || null,
      isLoading: authStore.isLoading
    },
    library: {
      totalLibraries: libraryStore.totalLibraries,
      currentLibrary: libraryStore.currentLibrary?.name || null,
      isLoading: libraryStore.isLoading
    },
    media: {
      totalFiles: mediaStore.totalFiles,
      selectedCount: mediaStore.selectedFileCount,
      isLoading: mediaStore.isLoading
    },
    plugins: {
      totalPlugins: pluginStore.totalPlugins,
      installedCount: pluginStore.installedPlugins.length,
      enabledCount: pluginStore.enabledPlugins.length,
      isLoading: pluginStore.isLoading
    },
    settings: {
      isConnected: settingsStore.isConnected,
      connectionStatus: settingsStore.connectionStatus,
      theme: settingsStore.settings.theme
    },
    timestamp: new Date().toISOString()
  }
}
