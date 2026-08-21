/**
 * 主进程和渲染进程共享的类型定义
 */

// Mira 连接配置
export interface MiraConnectionConfig {
  serverUrl: string
  websocketUrl?: string
  apiKey?: string
  timeout?: number
}

// 通用响应类型
export interface BaseResponse {
  success: boolean
  message: string
  data?: any
}

// 本地文件系统节点（导入本地文件夹时递归读取的树形结构）
export interface LocalFsNode {
  name: string
  path: string
  isDir: boolean
  size?: number
  ext?: string
  children?: LocalFsNode[]
}

export interface LocalFsRoot {
  name: string
  path: string
}

export interface LocalFileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedAt: number
  extension: string
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
  website?: string
  stars?: number
  notes?: string
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
  allowedRoles?: string[]
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
  icon?: string // 插件图标文件（相对插件目录的路径，如 'icon.png'）
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
  source?: 'local' | 'online' | 'server'
  serverPluginName?: string
  libraryId?: string
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

  tabs: {
    registerCustomTab: (definition: PluginCustomTabDefinition) => () => void
    openCustomTab: (id: string, data?: Record<string, any>) => Promise<any>
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
    registerContextMenu: (item: { id: string; label: string; icon?: string; onSelect: (files: FileInfo[]) => void | Promise<void> }) => () => void
    registerFileFormat: (format: {
      id: string
      title?: string
      icon?: string
      openByDefault?: boolean
      extensions?: string[]
      mimeTypes?: string[]
      renderThumbnail?: (container: HTMLElement, file: FileInfo) => (() => void) | void
      renderHoverCard?: (container: HTMLElement, file: FileInfo) => (() => void) | void
      getPreviewUrl?: (file: FileInfo) => string | Promise<string>
      open?: (file: FileInfo) => boolean | void | Promise<boolean | void>
    }) => () => void
    getExtraFileList: (libraryId: string, fileId: string) => Promise<string[]>
    getExtraFile: (libraryId: string, fileId: string, fileName: string) => Promise<Blob>
    getExtraFileUrl: (libraryId: string, fileId: string, fileName: string) => string
  }

  // 插件窗口管理（打开插件 dist 的独立 BrowserWindow）
  window: {
    openPluginWindow: (opts: PluginWindowOpenOptions) => Promise<{ success: boolean; windowId?: string; message?: string }>
  }
}

export interface PluginCustomTabDefinition {
  id: string
  label: string
  icon?: string
  iconColor?: string
  render: (container: HTMLElement, context: {
    pluginId: string
    tabId: string
    api: PluginAPI
    data?: Record<string, any>
  }) => (() => void) | void
}

// 打开插件窗口的参数
export interface PluginWindowOpenOptions {
  /** 插件 id（用于在 pluginsDirectory/<pluginId>/ 下定位） */
  pluginId: string
  /** 入口文件相对插件目录的路径，默认 'dist/index.html' */
  entry?: string
  /** 服务端 Web 插件入口 URL */
  url?: string
  /** dev 模式：url 不受服务端插件 URL 校验限制，任意 http/https 地址均可 */
  dev?: boolean
  /** 窗口标题，默认取插件名 */
  title?: string
  /** 窗口宽度，默认 1200 */
  width?: number
  /** 窗口高度，默认 800 */
  height?: number
  /** 传递给窗口页面的查询参数（拼到 URL query 上） */
  query?: Record<string, string>
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

// 客户端插件市场：索引中的单个文件描述
export interface MarketplacePluginFile {
  path: string // 相对插件目录的路径（posix 风格）
  size: number
  checksum: string // 形如 "sha256:..."
}

// 客户端插件市场：索引中的单个插件条目
export interface MarketplacePluginEntry {
  pluginId: string
  pluginName: string
  version: string
  description: string
  author: string
  homepage?: string
  category?: string
  tags: string[]
  minAppVersion?: string
  platform?: string[]
  directory: string // 相对市场源根目录，例如 "plugins/<pluginId>"
  icon?: string | null // 相对插件目录的图标文件
  readme?: string | null // 相对插件目录的 README 文件
  size: number // 目录总字节数
  checksum: string // 整目录聚合哈希 "sha256:..."
  files?: MarketplacePluginFile[] // 文件清单（用于逐文件下载与校验）
}

// 客户端插件市场：plugins.json 根结构
export interface MarketplaceCatalog {
  version: number
  generatedAt: string
  plugins: MarketplacePluginEntry[]
}

// 插件市场安装进度（主进程逐文件流式下载时回推到渲染进程）
export interface PluginInstallProgress {
  pluginId: string
  percent: number // 0-100
  transferred: number // 已下载字节数
  total: number // 总字节数
  phase: 'downloading' | 'verifying' | 'done'
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
  isDocker?: boolean
}

// 托盘设置
export interface TraySettings {
  enabled: boolean
  clickAction: 'toggle' | 'show' | 'minimize'
}

// 浮动窗口位置预设
export type FloatingWindowPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'center'
  | { x: number; y: number }

// 通知窗口操作按钮
export interface NotificationAction {
  id: string
  label: string
}

/** 通知出现动画类型 */
export type NotificationAnimation =
  | 'slide'      // 从所在边滑入（默认；右下角从右滑入，左下角从左滑入）
  | 'fade'       // 淡入
  | 'zoom'       // 缩放放大
  | 'bounce'     // 弹跳
  | 'none'       // 无动画

/** 悬浮球点击行为：打开上传对话框 / 切换主窗口 */
export type FloatingBallClickAction = 'openUpload' | 'toggleMain'

// 通知窗口载荷（结构化字段 + 可选任意 HTML）
export interface NotificationPayload {
  /** 业务通知 ID；重复调用 show 时原位更新同一通知 */
  notificationId?: string
  /** 标题（必填） */
  title: string
  /** 正文 */
  body?: string
  /** 图标（Material Icons 名称或图片 URL） */
  icon?: string
  /** 多文件通知的缩略图 URL（最多展示 4 张） */
  icons?: string[]
  /** 附带图片通知：图片 URL 列表（卡片左侧展示，优先于 icons） */
  images?: string[]
  /** 通知类型，决定左侧色条颜色：info | success | warning | error | loading（loader 旋转图标） */
  type?: 'info' | 'success' | 'warning' | 'error' | 'loading'
  /** 操作按钮 [{ id, label }]，点击后通过 action 事件回传 id */
  actions?: NotificationAction[]
  /** 任意自定义 HTML（存在时以 v-html 渲染，覆盖 body） */
  html?: string
  /** 自动消失时长（ms），0 表示常驻，默认 5000 */
  duration?: number
  /** 屏幕位置覆盖（默认右下角） */
  position?: FloatingWindowPosition
  /** 出现动画，默认 'slide' */
  animation?: NotificationAnimation
  /**
   * 业务自定义数据，点击/操作时原样回传给主渲染进程。
   * 例如导入通知携带 { fileId }，点击后据此跳转图片详情。
   */
  data?: Record<string, any>
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

// HTTP 代理配置（网络设置）
export interface ProxyConfig {
  /** 是否启用代理 */
  enabled: boolean
  /** 代理地址，例如 http://127.0.0.1:7890 */
  url: string
}

// 代理测试结果
export interface ProxyTestResult {
  success: boolean
  /** HTTP 状态码（请求未发出/超时时为 undefined） */
  statusCode?: number
  /** 本次探测耗时（毫秒） */
  elapsedMs?: number
  message: string
}

// Electron API 接口定义
export interface ElectronAPI {
  isDevelopment: boolean,
  isProduction: boolean,
  process: NodeJS.Process,
  // IPC 通信
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, ...args: any[]) => void
  on: (channel: string, callback: (...args: any[]) => void) => () => void
  removeAllListeners: (channel: string) => void

  // 系统信息
  platform: string

  // 素材库缓存协议
  libraryCache?: {
    clear: (libraryId?: string) => Promise<{ success: boolean }>
  }

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
    installFromMarketplace: (marketUrl: string, entry: MarketplacePluginEntry) => Promise<BaseResponse & { cancelled?: boolean }>
    cancelInstall: (pluginId: string) => Promise<BaseResponse>
    computeFileChecksums: (pluginId: string) => Promise<BaseResponse & { data?: MarketplacePluginFile[] }>
    onInstallProgress?: (callback: (progress: PluginInstallProgress) => void) => () => void
  }

  // 网络代理管理 API
  network: {
    setProxy: (config: ProxyConfig) => Promise<BaseResponse>
    getProxy: () => Promise<BaseResponse & { data?: ProxyConfig }>
    testProxy: (config: ProxyConfig) => Promise<ProxyTestResult>
    /** 检测当前生效的代理地址（应用配置 → 环境变量 → 系统代理） */
    detectProxy: () => Promise<BaseResponse & { data?: { url: string; source?: 'app' | 'env' | 'system' | 'none' } }>
  }

  // 插件窗口管理 API（打开插件 dist 的独立 BrowserWindow）
  pluginWindow: {
    open: (opts: PluginWindowOpenOptions) => Promise<{ success: boolean; windowId?: string; message?: string }>
    close: (windowId: string) => Promise<{ success: boolean; message?: string }>
    send: (pluginId: string, entry: string, channel: string, data: any) => Promise<{ success: boolean; delivered: boolean }>
    copyImage?: (payload: { data: ArrayBuffer; previewData: ArrayBuffer; fileName: string; mimeType: string }) => Promise<{ success: boolean; message?: string }>
    startImageDrag?: (payload: { data: ArrayBuffer; previewData: ArrayBuffer; fileName: string; mimeType: string }) => void
    onMessage?: (callback: (channel: string, data: any) => void) => () => void
    /** 设置本窗口的专属菜单栏（per-window，Windows/Linux 生效） */
    setMenu?: (template: any[]) => Promise<{ success: boolean; message?: string }>
    /** 监听本窗口菜单点击（payload 含 action 与任意附加字段，如 projectId） */
    onMenuAction?: (callback: (payload: { action: string; [key: string]: any }) => void) => () => void
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
    listRoots: () => Promise<{ success: boolean; data?: LocalFsRoot[]; message?: string }>
    listDirectory: (dirPath: string) => Promise<{ success: boolean; data?: LocalFileEntry[]; message?: string }>
    getThumbnail: (filePath: string, size?: { width?: number; height?: number }) => Promise<{ success: boolean; data?: string; message?: string }>
    exists: (filePath: string) => Promise<boolean>
    selectDirectory: (title?: string) => Promise<{ success: boolean; path?: string; message?: string }>
    selectFile: (title?: string, filters?: { name: string; extensions: string[] }[]) => Promise<{ success: boolean; path?: string; message?: string }>
    mkdir: (dirPath: string, recursive?: boolean) => Promise<{ success: boolean; message?: string }>
    copyFile: (src: string, dest: string) => Promise<{ success: boolean; message?: string }>
    showItemInFolder: (filePath: string) => Promise<void>
    openPath: (targetPath: string) => Promise<{ success: boolean; message?: string }>
    copyEntries: (sources: string[], destinationDir: string) => Promise<{ success: boolean; message?: string }>
    moveEntries: (sources: string[], destinationDir: string) => Promise<{ success: boolean; message?: string }>
    removeEntries: (targets: string[]) => Promise<{ success: boolean; message?: string }>
    readDirTree: (dirPath: string) => Promise<{ success: boolean; data?: LocalFsNode[]; message?: string }>
    readFileBytes: (filePath: string) => Promise<{ success: boolean; data?: ArrayBuffer; message?: string }>
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

  // 后端部署 (mira-app-server) API
  serverDeploy: {
    /** 检测本地已安装版本（走 npm ls -g，读 package.json 真实版本） */
    getInstalledVersion: () => Promise<{
      success: boolean
      data?: { installed: boolean; version?: string; prefix?: string }
      message?: string
    }>
    /** 查询 npm registry 最新版本 */
    getLatestVersion: () => Promise<{
      success: boolean
      data: { latest: string | null; error?: string }
    }>
    /** 一键更新到最新版（spawn npm install -g，实时推送进度事件） */
    update: (options?: { registry?: string; proxy?: string }) => Promise<{
      success: boolean
      data?: { success: boolean; version?: string; message?: string }
      message?: string
    }>
    /** 执行完整的本地部署流水线 */
    deploy: (options?: { registry?: string; proxy?: string }) => Promise<{
      success: boolean
      data?: { defaultLibraryId: string }
      message?: string
    }>
    /** 监听更新进度（安装过程的 stdout/stderr 输出） */
    onUpdateProgress: (callback: (progress: {
      type: 'data' | 'done' | 'error'
      line?: string
      exitCode?: number
    }) => void) => void
    /** 移除更新进度监听 */
    removeUpdateProgressListener: () => void
    /** 监听完整部署中每个步骤的状态与后台输出 */
    onDeployProgress: (callback: (progress: {
      stepId: number
      type: 'status' | 'output'
      status?: 'running' | 'success' | 'failed'
      line?: string
    }) => void) => void
    /** 移除部署进度监听 */
    removeDeployProgressListener: () => void
  }

  // 本地服务系统登录自启动
  serverAutoStart: {
    get: () => Promise<{ success: boolean; enabled: boolean; message?: string }>
    set: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean; message?: string }>
    waitReady: () => Promise<{ success: boolean; message?: string }>
  }

  // 后端运行控制（启用 / 停止 / 重启 / 状态）
  serverControl: {
    /** 启动本地后端（mira-server-service.mjs start） */
    start: () => Promise<{ success: boolean; message?: string }>
    /** 停止本地后端 */
    stop: () => Promise<{ success: boolean; message?: string }>
    /** 重启本地后端（stop + start） */
    restart: () => Promise<{ success: boolean; message?: string }>
    /** 查询运行状态（healthy / managed / pid / ports） */
    status: () => Promise<{
      success: boolean
      message?: string
      status?: {
        healthy: boolean
        managed: boolean
        pid: number | null
        httpPort: number
        dataPath: string
        logFile: string
      }
    }>
    /** 监听启停动作的实时进度（stdout/stderr 行与结束事件） */
    onProgress: (callback: (progress: {
      type: 'data' | 'done'
      action: 'start' | 'stop' | 'restart'
      line?: string
      success?: boolean
      message?: string
    }) => void) => void
    /** 移除进度监听 */
    removeProgressListener: () => void
  }

  // 通知 API
  notification: {
    show: (options: { title: string; body?: string; silent?: boolean }) => Promise<{ success: boolean; error?: string }>
    isSupported: () => Promise<boolean>
  }

  // 通知窗口 API（自定义 BrowserWindow 通知，支持多种位置与自定义内容）
  notificationWindow: {
    show: (payload: NotificationPayload) => Promise<void>
    hide: () => Promise<void>
    /** 关闭指定通知（传 id）或全部（不传） */
    dismiss: (id?: number) => Promise<void>
  }

  // 悬浮球窗口 API（单实例，可拖拽 / 接收文件拖放 / 持久化位置）
  floatingBall: {
    show: () => Promise<void>
    hide: () => Promise<void>
    toggle: () => Promise<void>
    /** 设置位置；传 null 重置到默认（右下角）并清除持久化 */
    setPosition: (pos?: { x: number; y: number } | null) => Promise<void>
    /** 读取当前坐标（窗口未创建时返回上次持久化的坐标或 null） */
    getState: () => Promise<{ x: number; y: number } | null>
    /** 恢复、显示并聚焦主窗口 */
    showMainWindow: () => Promise<void>
    /** 切换主渲染窗口显示/隐藏（点击行为 toggleMain 时由渲染进程调用） */
    toggleMainWindow: () => Promise<void>
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
