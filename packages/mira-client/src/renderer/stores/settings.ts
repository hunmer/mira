import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { miraSDKService } from '../services/MiraSDKService'
import { miraAPI } from '../api/MiraAPI'
import type { SystemInfo, SystemHealth } from '../../shared/types'
import ConfigStorage from '@renderer/utils/ConfigStorage'
import {
  THEME_STYLES,
  applyThemeStyle,
  removeThemeStyle,
  applyPrimaryColor,
  removePrimaryColor,
} from '@renderer/utils/theme-style'
import i18n from '../i18n'

/**
 * 媒体项可展示的字段，用于底部状态栏「眼睛」开关控制三个视图的展示信息。
 */
export type ItemField = 'filename' | 'format' | 'size' | 'folder' | 'tags'

export interface AppSettings {
  // 界面设置
  theme: 'light' | 'dark' | 'auto'
  language: string
  autoStartServer: boolean
  closeToTray: boolean

  // 主题风格覆盖（'' | 'mira' | 'lyra' | 'luma' | 'rhea' | 'custom'）
  themeStyle: string
  // Custom 风格模式下的 CSS 变量文本
  themeStyleCustomCss: string
  // 主色覆盖（hex，空字符串表示使用主题自带主色）
  primaryColor: string
  // 全局字体缩放系数（1 = 默认根字号 16px；范围 0.85~1.3）
  fontSizeScale: number
  // 全局界面缩放系数（1 = 默认；范围 0.7~1.5），等比缩放整个窗口（含 px 元素）
  uiZoom: number

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

  /**
   * 媒体项展示字段开关（grid / waterfall / list 三个视图共用）。
   * 控制卡片/行上展示哪些信息：文件名 / 格式 / 大小 / 文件夹 / 标签。
   */
  visibleItemFields: ItemField[]

  // 导入设置
  directImportMode: boolean

  // 悬浮球设置
  /** 是否启用悬浮球（默认关闭，opt-in） */
  floatingBallEnabled: boolean
  /** 悬浮球单击行为：打开上传对话框 / 切换主窗口 */
  floatingBallClickAction: 'openUpload' | 'toggleMain'

  // 高级设置
  debugMode: boolean
  enableNotifications: boolean
  /** 导入文件通知开关（文件创建事件触发桌面通知） */
  enableImportNotifications: boolean
  autoBackup: boolean
  backupInterval: number

  // 插件设置
  pluginsDirectory: string
  enablePluginDevMode: boolean
  autoLoadPlugins: boolean
  maxPluginLoadTime: number
  enablePluginSandbox: boolean
  trustedPlugins: string[]
  clientPluginMarketUrl: string // 客户端插件市场当前选中的源地址（HTTP 静态服务），留空表示未选择
  clientPluginMarketUrls: string[] // 客户端插件市场源地址列表（可配置多个，便于在「插件市场」中切换）

  // 网络设置
  /** 是否启用 HTTP 代理（对插件下载、市场目录拉取、应用自更新等所有网络请求生效） */
  networkProxyEnabled: boolean
  /** 代理地址，例如 http://127.0.0.1:7890；启用代理时必填 */
  networkProxyUrl: string
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
    autoStartServer: false,
    closeToTray: false,

    // 主题风格 / 主色覆盖
    themeStyle: '',
    themeStyleCustomCss: '',
    primaryColor: '',
    fontSizeScale: 1,
    uiZoom: 1,

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
    // 媒体项展示字段：默认全部展示
    visibleItemFields: ['filename', 'format', 'size', 'folder', 'tags'],

    // 导入设置
    directImportMode: false,

    // 悬浮球设置
    floatingBallEnabled: false,
    floatingBallClickAction: 'openUpload',

    // 高级设置
    debugMode: false,
    enableNotifications: true,
    enableImportNotifications: true,
    autoBackup: true,
    backupInterval: 1440, // 24小时

    // 插件设置
    pluginsDirectory: '', // 将在初始化时设置默认值
    enablePluginDevMode: false,
    autoLoadPlugins: true,
    maxPluginLoadTime: 30000, // 30秒
    enablePluginSandbox: false,
    trustedPlugins: [],
    clientPluginMarketUrl: '', // 客户端插件市场当前选中的源地址，留空表示未选择
    clientPluginMarketUrls: ['https://raw.githubusercontent.com/hunmer/mira/refs/heads/main/online_client_plugins/'], // 客户端插件市场源地址列表

    // 网络设置
    networkProxyEnabled: false, // 默认不启用代理
    networkProxyUrl: '' // 代理地址，启用代理时填写
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
        return i18n.global.t('stores.settings.statusConnected')
      case 'connecting':
        return i18n.global.t('stores.settings.statusConnecting')
      case 'reconnecting':
        return i18n.global.t('stores.settings.statusReconnecting')
      case 'error':
        return i18n.global.t('stores.settings.statusError')
      default:
        return i18n.global.t('stores.settings.statusDisconnected')
    }
  })


  /**
   * 插件市场源地址迁移：
   * - 若列表为空但存在旧的单值 clientPluginMarketUrl，则将其迁移进列表；
   * - 规范化列表（去空白、去空、去重）；
   * - 确保当前选中的 clientPluginMarketUrl 一定在列表中（否则回退到列表首项）。
   */
  const migrateMarketUrls = () => {
    const oldSingle = (settings.value.clientPluginMarketUrl || '').trim()

    // 列表规范化
    let urls: string[] = Array.isArray(settings.value.clientPluginMarketUrls)
      ? settings.value.clientPluginMarketUrls
      : []
    // 向后兼容：旧版本只有单值
    if (urls.length === 0 && oldSingle) {
      urls = [oldSingle]
    }
    urls = urls
      .map((u) => (u || '').trim())
      .filter((u) => !!u)
      // 去重（保留顺序）
      .filter((u, i, arr) => arr.indexOf(u) === i)

    settings.value.clientPluginMarketUrls = urls

    // 保证选中源在列表内
    const current = oldSingle
    if (urls.length === 0) {
      settings.value.clientPluginMarketUrl = ''
    } else if (current && urls.includes(current)) {
      settings.value.clientPluginMarketUrl = current
    } else {
      settings.value.clientPluginMarketUrl = urls[0]
    }
  }

  /**
   * 把当前网络代理配置推送给主进程，使其立即生效于：
   *   1. DownloadService —— 同步 HTTP_PROXY/HTTPS_PROXY 环境变量（供子进程）
   *   2. Electron session —— 渲染层 fetch 与主进程 net.request 的代理
   * 在非 Electron 环境下静默跳过。
   */
  const pushProxyToMain = async () => {
    try {
      const electronAPI = (window as any).electronAPI
      const network = electronAPI?.network
      if (!network?.setProxy) return
      await network.setProxy({
        enabled: !!settings.value.networkProxyEnabled,
        url: (settings.value.networkProxyUrl || '').trim(),
      })
    } catch (err) {
      console.warn('Failed to push proxy config to main:', err)
    }
  }

  /**
   * 解析默认插件目录：AppData 下用户数据目录 + /plugins。
   * 通过 IPC 从主进程获取 userData 路径（Electron 环境）；
   * 非 Electron 环境则返回空字符串。
   */
  const resolveDefaultPluginsDirectory = async (): Promise<string> => {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.app?.getPath) return ''
      const userData = await electronAPI.app.getPath('userData')
      if (!userData) return ''
      return `${userData}/plugins`
    } catch (err) {
      console.warn('Failed to resolve default plugins directory:', err)
      return ''
    }
  }

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

        // 同步持久化的语言到 vue-i18n（i18n 初始化时只读了 localStorage，
        // 生产环境文件存储的真实值在此校正）
        const lang = (settings.value as any).language
        if (lang) {
          import('../i18n').then(({ setLocale }) => setLocale(lang))
        }

        // 插件市场源：向后兼容迁移（旧版本仅有单一 clientPluginMarketUrl）
        migrateMarketUrls()
      } else {
      }

      // 插件目录兜底：未配置时默认使用 AppData 下 userData/plugins，
      // 并写回设置落库，避免安装市场插件时报「未配置本地插件目录」。
      if (!settings.value.pluginsDirectory) {
        const defaultDir = await resolveDefaultPluginsDirectory()
        if (defaultDir) {
          settings.value.pluginsDirectory = defaultDir
          await saveSettings()
        }
      }

      // 初始化插件服务（如果配置了插件目录且启用了自动加载，且尚未初始化）
      const isWebRuntime = typeof window !== 'undefined' && !(window as any).electronAPI
      if ((isWebRuntime || (settings.value.pluginsDirectory && settings.value.autoLoadPlugins)) && !isPluginSystemInitialized.value) {
        try {
          // 创建简单的配置对象，只包含基本数据类型
          const pluginConfig = {
            pluginsDirectory: settings.value.pluginsDirectory || '',
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

      window.electronAPI?.send('window:set-close-to-tray', settings.value.closeToTray)

      // 把持久化的代理配置同步给主进程（启动后立即生效；主进程在更早的启动阶段
      // 已自行读盘应用，这里保证后续设置变更的回写也能即时反映）
      await pushProxyToMain()
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
      window.electronAPI?.send('window:set-close-to-tray', settings.value.closeToTray)
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
    } else if (key === 'themeStyle' || key === 'themeStyleCustomCss') {
      applyThemeStyleOverride()
    } else if (key === 'primaryColor') {
      applyPrimaryColorOverride()
    } else if (key === 'fontSizeScale') {
      applyFontSizeScale()
    } else if (key === 'uiZoom') {
      applyUiZoom()
    } else if (key === 'language') {
      // 同步切换 vue-i18n 全局语言
      // 动态 import 避免模块加载顺序问题
      import('../i18n').then(({ setLocale }) => {
        setLocale(value as 'zh-CN' | 'en-US')
      })
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
    } else if (key === 'networkProxyEnabled' || key === 'networkProxyUrl') {
      // 网络代理设置变更时，立即推送到主进程生效
      await pushProxyToMain()
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
  const resetSettings = async (_preserveConnection = true) => {
    // 重置为默认值
    const defaultSettings: AppSettings = {
      theme: 'auto',
      language: 'zh-CN',
      autoStartServer: false,
      closeToTray: false,

      themeStyle: '',
      themeStyleCustomCss: '',
      primaryColor: '',
      fontSizeScale: 1,
      uiZoom: 1,

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
      visibleItemFields: ['filename', 'format', 'size', 'folder', 'tags'],
      directImportMode: false,
      floatingBallEnabled: false,
      floatingBallClickAction: 'openUpload',
      debugMode: false,
      enableNotifications: true,
      enableImportNotifications: true,
      autoBackup: true,
      backupInterval: 1440,
      pluginsDirectory: '',
      enablePluginDevMode: false,
      autoLoadPlugins: true,
      maxPluginLoadTime: 30000,
      enablePluginSandbox: false,
      trustedPlugins: [],
      clientPluginMarketUrl: '',
      clientPluginMarketUrls: [],

      // 网络设置
      networkProxyEnabled: false,
      networkProxyUrl: ''
    }

    settings.value = defaultSettings
    await saveSettings()
    applyTheme()
    applyThemeStyleOverride()
    applyPrimaryColorOverride()
    applyFontSizeScale()
    applyUiZoom()
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
   * 应用主题风格覆盖（mira/lyra/luma/rhea/custom）
   * 仅管理 <style> 注入，与 applyTheme() 的 .dark class 互不冲突
   */
  const applyThemeStyleOverride = () => {
    const style = settings.value.themeStyle
    if (!style) {
      removeThemeStyle()
      return
    }
    if (style === 'custom') {
      const css = settings.value.themeStyleCustomCss
      if (css) applyThemeStyle(css)
      else removeThemeStyle()
      return
    }
    const css = THEME_STYLES[style]
    if (css) applyThemeStyle(css)
    else removeThemeStyle()
  }

  /**
   * 应用主色覆盖
   */
  const applyPrimaryColorOverride = () => {
    const color = settings.value.primaryColor
    if (color) applyPrimaryColor(color)
    else removePrimaryColor()
  }

  /**
   * 应用全局字体缩放
   * 通过设置 <html> 的 font-size，使所有 rem 单位（含 Tailwind 工具类）整体等比缩放
   */
  const applyFontSizeScale = () => {
    const scale = settings.value.fontSizeScale
    if (!scale || scale === 1) {
      document.documentElement.style.removeProperty('font-size')
    } else {
      document.documentElement.style.fontSize = `${(16 * scale).toFixed(2)}px`
    }
  }

  /**
   * 应用全局界面缩放
   * 通过 document.body.style.zoom 等比缩放整个窗口（含 px/rem 元素、图标），跨 web/electron 通用
   */
  const applyUiZoom = () => {
    const zoom = settings.value.uiZoom
    if (!zoom || zoom === 1) {
      document.body.style.zoom = ''
    } else {
      document.body.style.zoom = String(zoom)
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

    // 应用主题风格 / 主色覆盖
    applyThemeStyleOverride()
    applyPrimaryColorOverride()
    applyFontSizeScale()
    applyUiZoom()

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
