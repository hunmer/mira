/**
 * 主进程和渲染进程共享的类型定义
 */

// Mira 连接配置
export interface MiraConnectionConfig {
  serverUrl: string
  apiKey?: string
  timeout?: number
}

// 通用响应类型
export interface BaseResponse {
  success: boolean
  message: string
  data?: any
}

// 用户信息
export interface UserInfo {
  id: string
  username: string
  realName?: string
  email?: string
  avatar?: string
  role?: string
}

// 文件信息
export interface FileInfo {
  id: string
  name: string
  path?: string
  size: number
  extension?: string
  mimeType: string
  url?: string
  thumbnailPath?: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  folderId?: string
  hash?: string
  metadata?: Record<string, any>
  libraryId?: string
  localFile?: string // SMB映射的本地文件路径
}

// 收藏夹/库信息
export interface LibraryInfo {
  id: string
  name: string
  description?: string
  type: string
  path: string
  fileCount: number
  createdAt: string
  updatedAt: string
}

// 插件信息
export interface PluginInfo {
  id: string
  name: string
  version: string
  description?: string
  longDescription?: string
  author?: string
  homepage?: string
  installed: boolean
  enabled: boolean
  installedAt?: string
  category?: string
  tags?: string[]
  image?: string
  rating?: number
  downloads?: number
  fileSize?: number
  features?: string[]
  requirements?: string
  changelog?: Array<{
    version: string
    date: string
    description: string
  }>
  screenshots?: string[]
}

// 本地插件配置（plugin.json）
export interface LocalPluginConfig {
  pluginName: string
  pluginId: string // 唯一UUID
  priority: number // 加载优先级，越大优先级越高
  version: string
  index: string // 入口文件，默认'index.js'
  tags: string[]
  category?: string // 插件分类
  description: string
  author: string
  homepage?: string
  enable: boolean // 是否启用
  config: Record<string, any> // 默认配置
  hotkey: Record<string, string> // 
  events: string[] // 监听的自定义事件
  dependencies: string[] // 依赖的插件ID列表
  permissions?: string[] // 插件所需权限
  minAppVersion?: string // 最低应用版本要求
  maxAppVersion?: string // 最高应用版本要求
  platform?: string[] // 支持的平台 ['win32', 'darwin', 'linux']
  actualDirectory?: string // 插件实际所在的目录路径
}

// 插件运行时状态
export interface PluginRuntime {
  config: LocalPluginConfig
  module?: any // 加载的模块
  context?: PluginContext // 执行上下文
  status: 'loading' | 'loaded' | 'error' | 'disabled'
  error?: string // 错误信息
  loadedAt?: string // 加载时间
  directory: string // 插件目录路径
}

// 插件执行上下文
export interface PluginContext {
  pluginId: string
  pluginName: string
  version: string
  api: PluginAPI // 提供给插件的API接口
}

// 插件API接口
export interface PluginAPI {
  // 基础API
  log: {
    info: (message: string, ...args: any[]) => void
    warn: (message: string, ...args: any[]) => void
    error: (message: string, ...args: any[]) => void
    debug: (message: string, ...args: any[]) => void
  }

  // 配置管理
  config: {
    get: (key: string) => any
    set: (key: string, value: any) => void
    has: (key: string) => boolean
    delete: (key: string) => void
  }

  // 事件系统
  events: {
    emit: (event: string, data?: any) => void
    on: (event: string, handler: (...args: any[]) => void) => void
    off: (event: string, handler: (...args: any[]) => void) => void
  }

  // UI交互（有限的接口）
  ui: {
    showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
    showDialog: (options: { title: string; message: string; type: 'info' | 'confirm' }) => Promise<boolean>
  }

  // 应用信息
  app: {
    version: string
    platform: string
    isDev: boolean
  }

  // 存储管理
  storage: {
    set: (key: string, value: any) => void
    get: (key: string) => any
    has: (key: string) => boolean
    delete: (key: string) => void
  }

  // 媒体文件管理
  media: {
    setLocalFile: (libraryId: string, fileId: string, localPath: string) => void
    setLocalFiles: (libraryId: string, filePathMap: Record<string, string>) => void
  }
}

// 插件管理器配置
export interface PluginManagerConfig {
  pluginsDirectory: string
  enableDevMode: boolean
  autoLoad: boolean
  maxLoadTime: number // 最大加载时间（毫秒）
  enableSandbox: boolean
  trustedPlugins: string[] // 受信任的插件ID列表
}

// 系统信息
export interface SystemInfo {
  version: string
  platform: string
  arch: string
  nodeVersion: string
  uptime: number
  memory: {
    total: number
    used: number
    available: number
  }
  disk: {
    total: number
    used: number
    available: number
  }
}

// 系统健康状态
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error' | 'disconnected'
  timestamp: string
  details?: Record<string, any>
}

// 托盘设置
export interface TraySettings {
  enabled: boolean
  clickAction: 'toggle' | 'show' | 'minimize'
}

// 协议数据结构
export interface ProtocolData {
  type: string
  data: any
}

// 文件上传请求
export interface FileUploadRequest {
  buffer: ArrayBuffer
  name: string
  type: string
  libraryId: string
  metadata?: Record<string, any>
}

// 认证凭据
export interface LoginCredentials {
  username: string
  password: string
}

// Electron API 接口定义
export interface ElectronAPI {
  isDevelopment: boolean,
  isProduction: boolean,
  process: NodeJS.Process,
  // IPC 通信
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, ...args: any[]) => void
  on: (channel: string, callback: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void

  // 系统信息
  platform: string

  // 协议处理 API
  protocol: {
    registerHandler: (type: string, handler: string) => Promise<BaseResponse>
    unregisterHandler: (type: string) => Promise<BaseResponse>
    getHandlers: () => Promise<string[]>
    createUrl: (type: string, data: any) => Promise<string>
  }

  // 托盘管理 API
  tray: {
    updateSettings: (settings: TraySettings) => Promise<BaseResponse>
    getSettings: () => Promise<TraySettings>
    isSupported: () => Promise<boolean>
    flash: (duration?: number) => Promise<BaseResponse>
    setTooltip: (tooltip: string) => Promise<BaseResponse>
  }

  // 搜索窗口管理 API
  searchWindow: {
    show: () => Promise<void>
    hide: () => Promise<void>
    toggle: () => Promise<void>
  }

  // 快捷键管理 API
  shortcut: {
    register: (shortcut: string, actionId: string) => Promise<boolean>
    unregister: (shortcut: string) => Promise<boolean>
    unregisterAll: () => Promise<boolean>
    getRegistered: () => Promise<Record<string, string>>
  }

  // 插件管理 API
  plugin: {
    discover: () => Promise<BaseResponse>
    initialize: (config: PluginManagerConfig) => Promise<BaseResponse>
    getAll: () => Promise<BaseResponse>
    get: (pluginId: string) => Promise<BaseResponse>
    enable: (pluginId: string) => Promise<BaseResponse>
    disable: (pluginId: string) => Promise<BaseResponse>
    reload: (pluginId: string) => Promise<BaseResponse>
    execute: (pluginId: string, method: string, ...args: any[]) => Promise<BaseResponse>
    importFromFile: (targetDirectory: string) => Promise<BaseResponse>
    importFromUrl: (url: string, targetDirectory: string) => Promise<BaseResponse>
    uninstall: (pluginId: string, pluginDirectory: string, pluginName: string) => Promise<BaseResponse>
    selectDirectory: (title?: string) => Promise<BaseResponse>
    selectZipFile: () => Promise<BaseResponse>
    updateConfig: (config: any) => Promise<BaseResponse>
    getConfig: () => Promise<BaseResponse>
    clearCache: () => Promise<BaseResponse>
  }

  // 拖拽功能 API
  dragDrop: {
    startDrag: (filePath: string, iconInfo?: { iconPath?: string; iconType?: string }) => Promise<{ success: boolean; message?: string }>
    startDragMultiple: (filePaths: string[], iconInfo?: { iconPath?: string; iconType?: string }) => Promise<{ success: boolean; message?: string }>
  }

  // 文件系统 API
  fs: {
    readFile: (filePath: string, encoding?: BufferEncoding) => Promise<{ success: boolean; data?: string; message?: string }>
    writeFile: (filePath: string, data: string, encoding?: BufferEncoding) => Promise<{ success: boolean; message?: string }>
    readDir: (dirPath: string) => Promise<{ success: boolean; data?: string[]; message?: string }>
    exists: (filePath: string) => Promise<boolean>
    selectDirectory: (title?: string) => Promise<{ success: boolean; path?: string; message?: string }>
    selectFile: (title?: string, filters?: { name: string; extensions: string[] }[]) => Promise<{ success: boolean; path?: string; message?: string }>
    mkdir: (dirPath: string, recursive?: boolean) => Promise<{ success: boolean; message?: string }>
    copyFile: (src: string, dest: string) => Promise<{ success: boolean; message?: string }>
  }

  // 自动更新 API
  updater: {
    check: () => Promise<{ success: boolean; updateInfo?: { version: string; releaseDate: string; releaseNotes: any }; error?: string }>
    download: () => Promise<{ success: boolean; error?: string }>
    install: (isSilent?: boolean) => Promise<{ success: boolean }>
    getVersion: () => Promise<{ success: boolean; version: string }>
    onUpdateChecking: (callback: () => void) => () => void
    onUpdateAvailable: (callback: (info: any) => void) => () => void
    onUpdateNotAvailable: (callback: (info: any) => void) => () => void
    onUpdateDownloadProgress: (callback: (progress: any) => void) => () => void
    onUpdateDownloaded: (callback: (info: any) => void) => () => void
    onUpdateError: (callback: (error: any) => void) => () => void
  }

  // 应用信息 API
  app: {
    getPath: (name: string) => Promise<string>
    getVersion: () => Promise<string>
    isPackaged: () => Promise<boolean>
  }

  // 兼容性API（用于插件）
  startDrag: (filePath: string, iconInfo?: { iconPath?: string; iconType?: string }) => Promise<{ success: boolean; message?: string }>

  // IPC Renderer 直接访问（用于搜索窗口的postMessage通信）
  ipcRenderer?: {
    send: (channel: string, ...args: any[]) => void
    invoke: (channel: string, ...args: any[]) => Promise<any>
    on: (channel: string, callback: (...args: any[]) => void) => void
    removeAllListeners: (channel: string) => void
  }

  // 日志 API（渲染进程日志会通过 IPC 发送到主进程统一写文件）
  // 注意：console.* 已通过 executeJavaScript 自动拦截，无需手动调用
  logger?: {
    log: (...args: any[]) => void
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
    debug: (...args: any[]) => void
  }
}

// 全局类型声明
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
