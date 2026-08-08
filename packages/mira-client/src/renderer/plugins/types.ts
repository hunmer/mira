/**
 * 插件相关类型定义
 */

import type {
  PluginInfo,
  PluginRuntime,
  PluginManagerConfig,
  FileInfo
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

/**
 * 插件图标
 * 宿主已加载 Material Icons 字体，推荐使用 material 类型避免路径解析。
 */
export interface PluginContributionIcon {
  /**
   * 图标类型：
   * - 'material'：Material Icons 字体类名值（宿主已加载字体）
   * - 'emoji'：emoji 字符
   * - 'text'：单字符
   * - 'image'：图片资源路径（相对插件目录或绝对/URL；宿主用插件目录解析）
   */
  type: 'material' | 'emoji' | 'text' | 'image'
  value: string
}

/**
 * 插件渲染上下文，传给 contribution.render 的第二个参数。
 * 宿主提供：插件自身 API（api）、打开插件窗口的能力（openPluginWindow）。
 */
export interface PluginContributionRenderContext {
  /** 插件自身的 api（与 initialize 时 context.api 一致） */
  api: any
  /** 打开插件窗口（加载插件 dist/index.html），返回 windowId */
  openPluginWindow: (opts: {
    pluginId: string
    entry?: string
    title?: string
    width?: number
    height?: number
    query?: Record<string, string>
  }) => Promise<{ success: boolean; windowId?: string; message?: string }>
}

/**
 * 插件「贡献」——插件向宿主 HomeView 右侧栏注册的自定义 UI 入口。
 * 插件通过 window.pluginSystem.contributions.register() 注册，
 * 宿主 PluginContributionBar 渲染为横向图标。
 *
 * 点击图标的行为由 behavior 决定：
 *   - 'window'（默认）：直接打开插件主界面窗口（onActivate 调 openPluginWindow）
 *   - 'popover'：在宿主内用 popover 弹出 render 返回的内容
 */
export interface PluginContribution {
  /** 贡献唯一 id（一般用 pluginId 即可，同插件多贡献需自定义） */
  id: string
  /** 归属插件 id（用于 openPluginWindow 默认值） */
  pluginId: string
  /** 图标 */
  icon: PluginContributionIcon
  /** 鼠标悬停/无障碍用的标题 */
  title: string
  /** 可选：副标题/描述 */
  description?: string
  /**
   * 点击图标的交互行为，默认 'window'。
   * - 'window'：点击直接打开插件主界面窗口（需提供 onActivate）
   * - 'popover'：点击在宿主内弹出 popover（需提供 render）
   */
  behavior?: 'window' | 'popover'
  /**
   * behavior='window' 时点击图标触发：一般在此调 ctx.openPluginWindow 打开插件主界面。
   */
  onActivate?: (ctx: PluginContributionRenderContext) => void | Promise<void>
  /**
   * behavior='popover' 时把自定义内容渲染进 container（宿主提供的空 div）。
   * 返回一个可选的 cleanup 函数，宿主在关闭 popover 时调用以释放资源。
   */
  render?: (
    container: HTMLElement,
    ctx: PluginContributionRenderContext
  ) => (() => void) | void
}

export interface PluginMediaContextMenu {
  id: string
  pluginId: string
  label: string
  icon?: string
  onSelect: (files: FileInfo[]) => void | Promise<void>
}

export interface PluginFileFormat {
  id: string
  pluginId: string
  title?: string
  icon?: string
  openByDefault?: boolean
  extensions?: string[]
  mimeTypes?: string[]
  renderThumbnail?: (container: HTMLElement, file: FileInfo) => (() => void) | void
  renderHoverCard?: (container: HTMLElement, file: FileInfo) => (() => void) | void
  getPreviewUrl?: (file: FileInfo) => string | Promise<string>
  open?: (file: FileInfo) => boolean | void | Promise<boolean | void>
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
  /** 插件贡献（UI 入口）注册中心 */
  contributions: {
    list: PluginContribution[]
    /** 注册一个贡献；同一 id 再次注册会覆盖旧的 */
    register: (contribution: PluginContribution) => void
    /** 注销贡献 */
    unregister: (id: string) => void
    /** 获取当前所有贡献 */
    getContributions: () => PluginContribution[]
    /** 订阅贡献变化，返回取消订阅函数 */
    subscribe: (fn: (contributions: PluginContribution[]) => void) => () => void
  }
  mediaContextMenus: {
    list: PluginMediaContextMenu[]
    register: (item: PluginMediaContextMenu) => () => void
    unregister: (id: string) => void
    getAll: () => PluginMediaContextMenu[]
  }
  fileFormats: {
    list: PluginFileFormat[]
    register: (format: PluginFileFormat) => () => void
    unregister: (id: string) => void
    getForFile: (file: FileInfo) => PluginFileFormat | undefined
    getAllForFile: (file: FileInfo) => PluginFileFormat[]
    getAll: () => PluginFileFormat[]
  }
}

// 重新导出共享类型
export type { PluginInfo, PluginRuntime, PluginManagerConfig }
