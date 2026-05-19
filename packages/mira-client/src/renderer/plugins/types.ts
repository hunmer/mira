/**
 * 插件相关类型定义
 */

import type {
  PluginInfo,
  PluginRuntime,
  PluginManagerConfig
} from '../../shared/types'

// 扩展的插件信息类型，支持本地状态
export interface ExtendedPluginInfo extends PluginInfo {
  isInstalling?: boolean
  isUninstalling?: boolean
  installProgress?: number
  lastError?: string
  isLocal?: boolean
  runtime?: PluginRuntime
}

// 通用操作结果类型
export interface OperationResult {
  success: boolean
  message?: string
  data?: any
}

// 插件操作类型
export type PluginOperation = 'install' | 'uninstall' | 'enable' | 'disable' | 'reload' | 'import-file' | 'import-url' | 'discover'

// 插件状态数据结构
export interface PluginStateData {
  plugins: ExtendedPluginInfo[]
  currentPlugin: ExtendedPluginInfo | null
  searchQuery: string
  filterStatus: 'all' | 'installed' | 'available' | 'enabled'
  sortBy: 'name' | 'version' | 'installedAt' | 'author'
  sortOrder: 'asc' | 'desc'
  lastUpdated: string | null
}

// 插件系统全局API类型
export interface PluginSystemAPI {
  plugins: Map<string, any>
  instancesFactory: Map<string, () => any>
  instances: Map<string, any>
  registerPlugin: (pluginId: string, pluginInfo: any) => void
  registerPluginInstance: (pluginId: string, factory: () => any) => void
  getPluginInstanceFactory: (pluginId: string) => (() => any) | undefined
  loadPluginInstance: (pluginId: string, context: any) => Promise<any>
  getPluginInstance: (pluginId: string) => any
  unloadPluginInstance: (pluginId: string) => Promise<void>
  getPlugin: (pluginId: string) => any
  getAllPlugins: () => any[]
  events: {
    listeners: Map<string, Function[]>
    on: (event: string, handler: Function) => void
    emit: (event: string, data?: any) => void
    off: (event: string, handler: Function) => void
  }
}

// 重新导出共享类型
export type { PluginInfo, PluginRuntime, PluginManagerConfig }