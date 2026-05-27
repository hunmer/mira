import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { miraSDKService } from '../services/MiraSDKService'
import { miraAPI } from '../api/MiraAPI'
import type { MiraConnectionConfig, SystemInfo, SystemHealth } from '../../shared/types'
import ConfigStorage from '@renderer/utils/ConfigStorage'

export interface AppSettings {
  // 界面设置
  theme: 'light' | 'dark' | 'auto'
  language: string

  columnsPerRow: number

  sidebarWidth: number
  
  // 文件设置
  autoSync: boolean
  syncInterval: number
  maxFileSize: number
  allowedFileTypes: string[]
  downloadPath: string
  
  // 性能设置
  enableCache: boolean
  cacheSize: number
  preloadImages: boolean
  lazyLoading: boolean
  maxConcurrentUploads: number

  // 媒体预览设置
  videoPreviewMuted: boolean
  
  // 高级设置
  debugMode: boolean
  enableNotifications: boolean
  autoBackup: boolean
  backupInterval: number

  // 插件设置
  pluginsDirectory: string
  enablePluginDevMode: boolean
  autoLoadPlugins: boolean
  maxPluginLoadTime: number
  enablePluginSandbox: boolean
  trustedPlugins: string[]
}

// 添加素材库类型定义
export interface Library {
  id: string
  name: string
  path: string
  createdAt?: string
  updatedAt?: string
  // 为了兼容 SDK 的 Library 类型，添加一些可选属性
  status?: 'active' | 'inactive' | 'error'
  fileCount?: number
  size?: number
  description?: string
  icon?: string
  customFields?: {
    enableHash?: boolean
  }
  pluginsDir?: string
}

// Settings interface
export interface Settings {
  theme: 'light' | 'dark' | 'system'
  language: string
  fontSize: number
  autoSave: boolean
  autoBackup: boolean
  backupInterval: number // minutes
  maxBackups: number
  showHiddenFiles: boolean

  columnsPerRow: number
  sortBy: 'name' | 'date' | 'size' | 'type'
  sortOrder: 'asc' | 'desc'
  enableNotifications: boolean
  enableSounds: boolean
  enablePreview: boolean
  previewSize: number
  compressionQuality: number
  maxFileSize: number // MB
  allowedFileTypes: string[]
  serverUrl: string
  serverPort: number
  apiTimeout: number // seconds
  retryAttempts: number
  cacheSize: number // MB
  cacheDuration: number // hours
  enableAnalytics: boolean
  enableTelemetry: boolean
  shortcuts: Record<string, string>
  pluginSettings: Record<string, any>
}


/**
 * 应用设置状态管理
 * 处理应用配置、连接状态、系统信息和设置持久化
 */
export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const settings = ref<AppSettings>({
    // 界面设置
    theme: 'auto',
    language: 'zh-CN',

    columnsPerRow: 4,


    sidebarWidth: 256,
    
    // 文件设置
    autoSync: true,
    syncInterval: 300, // 5分钟
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedFileTypes: ['image/*', 'video/*', 'audio/*', 'document/*'],
    downloadPath: '',
    
    // 性能设置
    enableCache: true,
    cacheSize: 500, // MB
    preloadImages: true,
    lazyLoading: true,
    maxConcurrentUploads: 3,

    // 媒体预览设置
    videoPreviewMuted: true,
    
    // 高级设置
    debugMode: false,
    enableNotifications: true,
    autoBackup: true,
    backupInterval: 1440, // 24小时

    // 插件设置
    pluginsDirectory: '', // 将在初始化时设置默认值
    enablePluginDevMode: false,
    autoLoadPlugins: true,
    maxPluginLoadTime: 30000, // 30秒
    enablePluginSandbox: false,
    trustedPlugins: []
  })
  
  const isConnected = ref(false)
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'>('disconnected')
  const systemInfo = ref<SystemInfo | null>(null)
  const systemHealth = ref<SystemHealth | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const setConnectionStatus = (status: typeof connectionStatus.value) => {
    connectionStatus.value = status
    isConnected.value = status === 'connected'
  }
  const lastConnectionAttempt = ref<Date | null>(null)
  const connectionRetries = ref(0)

  // 插件系统状态
  const isPluginSystemInitialized = ref<boolean>(false)

  // 素材库列表
  const libraries = ref<Library[]>([])

  // 素材库相关方法
  const setLibraries = (newLibraries: Library[]) => {
    libraries.value = newLibraries
  }

  const addLibrary = (library: Library) => {
    libraries.value.push(library)
  }

  const removeLibrary = (libraryId: string) => {
    const index = libraries.value.findIndex(lib => lib.id === libraryId)
    if (index > -1) {
      libraries.value.splice(index, 1)
    }
  }

  const updateLibrary = (libraryId: string, updates: Partial<Library>) => {
    const index = libraries.value.findIndex(lib => lib.id === libraryId)
    if (index > -1) {
      libraries.value[index] = { ...libraries.value[index], ...updates }
    }
  }

  const getLibrary = (libraryId: string) => {
    return libraries.value.find(lib => lib.id === libraryId)
  }

  // 计算属性 - 连接配置已移至serverList store

  const isDarkMode = computed(() => {
    if (settings.value.theme === 'dark') return true
    if (settings.value.theme === 'light') return false
    
    // 'auto' 模式下检查系统主题
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const formattedFileSize = computed(() => {
    const size = settings.value.maxFileSize
    if (size >= 1024 * 1024 * 1024) {
      return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
    } else if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`
    } else if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    }
    return `${size} B`
  })

  const formattedCacheSize = computed(() => {
    const size = settings.value.cacheSize
    if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} GB`
    }
    return `${size} MB`
  })

  const isHealthy = computed(() => {
    return systemHealth.value?.status === 'healthy'
  })

  const connectionStatusText = computed(() => {
    switch (connectionStatus.value) {
      case 'connected':
        return '已连接'
      case 'connecting':
        return '连接中...'
      case 'reconnecting':
        return '重新连接中...'
      case 'error':
        return '连接错误'
      default:
        return '未连接'
    }
  })


  /**
   * 加载设置从本地存储
   * @returns Promise<void>
   */
  const loadSettings = async () => {
    try {
      const stored = await ConfigStorage.getItem('mira-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        // 合并设置，确保新增的设置项有默认值
        settings.value = { ...settings.value, ...parsed }
      } else {
      }
      // 初始化插件服务（如果配置了插件目录且启用了自动加载，且尚未初始化）
      if (settings.value.pluginsDirectory && settings.value.autoLoadPlugins && !isPluginSystemInitialized.value) {
        try {
          // 创建简单的配置对象，只包含基本数据类型
          const pluginConfig = {
            pluginsDirectory: settings.value.pluginsDirectory,
            autoLoad: settings.value.autoLoadPlugins,
            enableDevMode: settings.value.enablePluginDevMode,
            maxLoadTime: settings.value.maxPluginLoadTime,
            enableSandbox: settings.value.enablePluginSandbox,
            trustedPlugins: [...settings.value.trustedPlugins] // 创建数组副本
          }
          await miraAPI.pluginService.initialize(pluginConfig)
          isPluginSystemInitialized.value = true // 标记为已初始化
        } catch (err) {
          error.value = 'Failed to initialize plugin service'
        }
      } else if (isPluginSystemInitialized.value) {
      }
    } catch (err) {
      error.value = 'Failed to load settings from local storage'
    }
  }

  /**
   * 保存设置到本地存储
   * @returns Promise<void>
   */
  const saveSettings = async () => {
    try {
      const settingsToSave = JSON.stringify(settings.value)
      await ConfigStorage.setItem('mira-settings', settingsToSave)
    } catch (err) {
      error.value = 'Failed to save settings to local storage'
    }
  }

  /**
   * 更新单个设置项
   * @param key - 设置键名
   * @param value - 设置值
   * @returns Promise<void>
   */
  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    settings.value[key] = value
    await saveSettings()
    
    // 特殊处理某些设置项的变更
    if (key === 'theme') {
      applyTheme()
    } else if (key === 'language') {
      // 这里可以添加语言切换逻辑
    } else if (key === 'pluginsDirectory' || key === 'autoLoadPlugins' || 
               key === 'enablePluginDevMode' || key === 'enablePluginSandbox') {
      // 插件相关设置变更时重新初始化插件服务
      if (settings.value.pluginsDirectory && settings.value.autoLoadPlugins) {
        try {
          // 创建简单的配置对象，只包含基本数据类型
          const pluginConfig = {
            pluginsDirectory: settings.value.pluginsDirectory,
            autoLoad: settings.value.autoLoadPlugins,
            enableDevMode: settings.value.enablePluginDevMode,
            maxLoadTime: settings.value.maxPluginLoadTime,
            enableSandbox: settings.value.enablePluginSandbox,
            trustedPlugins: [...settings.value.trustedPlugins] // 创建数组副本
          }
          await miraAPI.pluginService.initialize(pluginConfig)
        } catch (err) {
          error.value = 'Failed to reinitialize plugin service'
        }
      }
    }
  }

  /**
   * 批量更新设置
   * @param updates - 设置更新对象
   * @returns Promise<void>
   */
  const updateSettings = async (updates: Partial<AppSettings>) => {
    const oldTheme = settings.value.theme
    
    Object.assign(settings.value, updates)
    await saveSettings()
    
    // 如果主题发生变化，应用新主题
    if (updates.theme && updates.theme !== oldTheme) {
      applyTheme()
    }
  }

  /**
   * 重置设置为默认值
   * @param preserveConnection - 是否保留连接信息，默认为true
   * @returns Promise<void>
   */
  const resetSettings = async (preserveConnection = true) => {
    const oldSettings = { ...settings.value }
    
    // 重置为默认值
    const defaultSettings: AppSettings = {
      theme: 'auto',
      language: 'zh-CN',

      columnsPerRow: 4,
  
  
      sidebarWidth: 256,
      autoSync: true,
      syncInterval: 300,
      maxFileSize: 100 * 1024 * 1024,
      allowedFileTypes: ['image/*', 'video/*', 'audio/*', 'document/*'],
      downloadPath: '',
      enableCache: true,
      cacheSize: 500,
      preloadImages: true,
      lazyLoading: true,
      maxConcurrentUploads: 3,
      videoPreviewMuted: true,
      debugMode: false,
      enableNotifications: true,
      autoBackup: true,
      backupInterval: 1440,
      pluginsDirectory: '',
      enablePluginDevMode: false,
      autoLoadPlugins: true,
      maxPluginLoadTime: 30000,
      enablePluginSandbox: false,
      trustedPlugins: []
    }
    
    settings.value = defaultSettings
    await saveSettings()
    applyTheme()
  }

  // 连接功能已移至serverList store

  // 服务器库同步功能已移至serverList store

  // 连接状态同步功能已移至serverList store

  // 断开服务器功能已移至serverList store

  // 测试连接功能已移至serverList store

  /**
   * 获取系统信息
   * @returns Promise<SystemInfo | null>
   */
  const getSystemInfo = async () => {
    try {
      systemInfo.value = await miraSDKService.getSystemInfo()
      return systemInfo.value
    } catch (err) {
      return null
    }
  }

  /**
   * 获取系统健康状态
   * @returns Promise<SystemHealth | null>
   */
  const getSystemHealth = async () => {
    try {
      systemHealth.value = await miraSDKService.getSystemHealth()
      return systemHealth.value
    } catch (err) {
      return null
    }
  }

  /**
   * 应用主题设置
   */
  const applyTheme = () => {
    const root = document.documentElement
    
    if (isDarkMode.value) {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
  }

  /**
   * 导出设置配置
   * @returns string - JSON格式的设置配置
   */
  const exportSettings = () => {
    try {
      return JSON.stringify({
        settings: settings.value,
        exportDate: new Date().toISOString(),
        version: '1.0'
      }, null, 2)
    } catch (err) {
      throw new Error('Failed to export settings')
    }
  }

  /**
   * 导入设置配置
   * @param configJson - JSON格式的设置配置
   * @returns Promise<{success: boolean, error?: string}>
   */
  const importSettings = async (configJson: string) => {
    try {
      const config = JSON.parse(configJson)
      
      if (!config.settings) {
        return { success: false, error: 'Invalid settings format' }
      }
      
      // 验证设置格式
      const importedSettings = { ...settings.value, ...config.settings }
      
      await updateSettings(importedSettings)
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import settings'
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 初始化设置状态
   * @returns Promise<void>
   */
  const initialize = async () => {
    await loadSettings()
    applyTheme()

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (settings.value.theme === 'auto') {
        applyTheme()
      }
    })

    // 自动连接功能已移至serverList store
  }

  /**
   * 启动定期健康检查
   */
  const startHealthMonitoring = () => {
    if (isConnected.value) {
      setInterval(async () => {
        if (isConnected.value) {
          await getSystemHealth()
        }
      }, 30000) // 每30秒检查一次
    }
  }

  // 监听连接状态变化，启动健康监控
  watch(isConnected, (connected) => {
    if (connected) {
      startHealthMonitoring()
    }
  })

  return {
    // 状态
    settings,
    isConnected,
    connectionStatus,
    systemInfo,
    systemHealth,
    isLoading,
    error,
    lastConnectionAttempt,
    connectionRetries,
    isPluginSystemInitialized,

    // 计算属性
    isDarkMode,
    formattedFileSize,
    formattedCacheSize,
    isHealthy,
    connectionStatusText,

    // 操作
    loadSettings,
    saveSettings,
    updateSetting,
    updateSettings,
    resetSettings,
    getSystemInfo,
    getSystemHealth,
    applyTheme,
    exportSettings,
    importSettings,
    clearError,
    initialize,
    startHealthMonitoring,
    setConnectionStatus,

    // 素材库相关导出
    libraries,
    setLibraries,
    addLibrary,
    removeLibrary,
    updateLibrary,
    getLibrary
  }
})
