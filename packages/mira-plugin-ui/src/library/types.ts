/**
 * 素材库树(文件夹/标签)组件的类型与依赖注入接口。
 *
 * 组件库不直接访问数据源(background 桥 / SDK / fetch),
 * 由宿主通过 services / dialog / upload 注入:
 * - services: 树数据加载与节点 CRUD
 * - dialog:   prompt/alert/confirm 弹窗(编辑动作的名称输入与删除确认)
 * - upload:   拖放/选择文件后的上传动作(宿主自行路由到上传队列)
 */

/** 素材库树节点:文件夹 / 标签通用形态(扁平 + parent_id 组装) */
export interface LibraryTreeNode {
  id: number
  title: string
  color?: number
  /** 描述/图标(宿主数据带出则透传,供编辑对话框回填) */
  description?: string
  icon?: string
  /** 0 表示根节点(无父级) */
  parentId: number
  level: number
  children: LibraryTreeNode[]
}

/** 后端 folder/tag 扁平项的通用形态(id/title/parent_id/color 字段一致) */
export interface LibraryFlatItem {
  id: number
  title: string
  parent_id?: number
  color?: number
  description?: string
  /** Material Icons 图标名 */
  icon?: string
  /** 同层排序号(后端 sort_index,拖拽排序保存;缺省按 title 排) */
  sort_index?: number
}

export type LibraryTreeKind = 'folder' | 'tag'

/** 新建节点载荷(CreateNodeDialog / services.createNode extra) */
export interface LibraryTreeCreatePayload {
  kind: LibraryTreeKind
  /** 0 表示根 */
  parentId: number
  title: string
  description?: string
  color?: number
  /** Material Icons 图标名 */
  icon?: string
}

/** 编辑节点载荷(CreateNodeDialog 编辑模式确认时抛给宿主) */
export type LibraryTreeUpdatePayload = LibraryTreeCreatePayload & { id: number }

/** 素材库候选项(LibrarySelect 的选项形态) */
export interface LibrarySelectOption {
  id: string | number
  name?: string
  title?: string
}

/** 服务器分组:名称作组标签,libraries 为组内候选项(跨服务器需保证库 id 唯一) */
export interface LibrarySelectServer {
  id?: string | number
  name?: string
  title?: string
  libraries: LibrarySelectOption[]
}

/* ============ 服务器管理(ServerManagerView) ============ */

/** 受管服务器配置(扩展 ServerConfig 的结构兼容形态) */
export interface ManagedServer {
  id: string
  name: string
  serverURL: string
  username: string
  password: string
}

/** 服务器管理服务:宿主实现(扩展走 background 桥,其他宿主可走本地存储) */
export interface ServerManagerServices {
  add(input: Omit<ManagedServer, 'id'>): Promise<unknown>
  edit(id: string, patch: Partial<Omit<ManagedServer, 'id'>>): Promise<unknown>
  remove(id: string): Promise<unknown>
  /** 测试连接;ok=false 时 error 带原因 */
  test(serverURL: string, username: string, password: string): Promise<{ ok: boolean; error?: string }>
  /** 激活(切换)服务器;返回是否成功,成功后组件自动 close */
  activate(id: string): Promise<boolean>
}

/** 数据服务:宿主实现(扩展走 background 桥,其他宿主可走 SDK) */
export interface LibraryTreeServices {
  listFolders(libraryId: string): Promise<LibraryFlatItem[] | null>
  listTags(libraryId: string): Promise<LibraryFlatItem[] | null>
  /** 创建节点,返回值不限定(部分后端返回新 id 或含 id 的对象);extra 为可选的描述/颜色/图标 */
  createNode(
    kind: LibraryTreeKind,
    libraryId: string,
    title: string,
    parentId?: number,
    extra?: Pick<LibraryTreeCreatePayload, 'description' | 'color' | 'icon'>,
  ): Promise<unknown>
  /** 删除节点;folder 场景 deleteFiles 表示同时删除其中文件 */
  deleteNode(kind: LibraryTreeKind, libraryId: string, id: number, deleteFiles?: boolean): Promise<unknown>
  /** 更新节点(右键「编辑」);提供后启用菜单项,extra 为可选的描述/颜色/图标 */
  updateNode?(
    kind: LibraryTreeKind,
    libraryId: string,
    id: number,
    title: string,
    extra?: Pick<LibraryTreeCreatePayload, 'description' | 'color' | 'icon'>,
  ): Promise<unknown>
  /** 同层排序(提供后启用树内拖拽排序),items 为该层全部兄弟的新顺序 */
  updateSortIndex?(kind: LibraryTreeKind, libraryId: string, items: { id: number; sort_index: number }[]): Promise<unknown>
  /** 跨层移动节点到新父级(parentId=null 移到根;提供后才允许跨层拖拽) */
  moveNode?(kind: LibraryTreeKind, libraryId: string, id: number, parentId: number | null): Promise<unknown>
}

/** 树内拖拽落点:目标行上缘(before)/下缘(after)/内部(成为其子级) */
export type LibraryTreeDropPosition = 'before' | 'after' | 'inside'

/** 弹窗服务:与扩展 useDialog 的 Promise 风格子集对齐 */
export interface LibraryTreeDialog {
  alert(options: { title?: string; message?: string; danger?: boolean }): Promise<void>
  confirm(options: { message?: string; danger?: boolean }): Promise<boolean>
  prompt(options: { title?: string; message?: string; defaultValue?: string }): Promise<string | null>
  confirmCheck(options: {
    message?: string
    checkboxLabel?: string
    danger?: boolean
  }): Promise<{ ok: boolean; checked: boolean }>
}

/** 上传落点:文件夹落点带 folderId,标签落点带 tags(按标题,服务器按名称关联) */
export interface LibraryTreeUploadTarget {
  folderId?: number
  tags?: string[]
}

/** 上传服务:树视图拖放/选择文件后回调,宿主路由到自己的上传队列 */
export interface LibraryTreeUpload {
  /** 本地文件落点;target 缺省表示素材库根目录 */
  files(files: File[], target?: LibraryTreeUploadTarget): void
  /** 链接落点;target 缺省表示素材库根目录 */
  urls(urls: string[], target?: LibraryTreeUploadTarget): void
  /** 打开宿主的上传对话框(如 BatchUploadDialog);提供后右键菜单显示「上传」入口,target 为右键节点落点 */
  pick?(target?: LibraryTreeUploadTarget): void
}

/** 文案函数:vue-i18n 风格(key + {n} 命名插值),缺省用内置中文 */
export type LibraryTreeT = (key: string, params?: Record<string, unknown>) => string

/* ============ 过滤栏(FilterBar) ============ */

/**
 * 过滤规则:与桌面端 mira-client FilterBar 的 FilterRule 同构(字段语义一致,规则可互拷),
 * 供 FilterBar / MediaBrowser 与宿主共用。
 */
export interface FilterRule {
  id: string
  type: 'folders' | 'tags' | 'urls' | 'title' | 'size' | 'category' | 'metadata'
  label: string
  /** 预留桌面端 material icons 图标名;组件库按 type 内置 lucide 图标,不消费该字段 */
  icon?: string
  active?: boolean
  selectedValues?: (string | number)[]
  value?: string
  selectedPreset?: string
  customMin?: number
  customMax?: number
  selectedCategory?: string
  // metadata 过滤(type === 'metadata')
  /** 当前子模式:dimension=尺寸(分辨率),duration=时长 */
  metaField?: 'dimension' | 'duration'
  /** 预设 id 或 'custom' */
  selectedMetaPreset?: string
  /** 最长边范围(px),提交后端 */
  metaDimMin?: number
  metaDimMax?: number
  /** 时长范围(秒),提交后端 */
  metaDurMin?: number
  metaDurMax?: number
  /** 自定义输入框值(px) */
  customDimMin?: number
  customDimMax?: number
  /** 自定义输入框值(秒) */
  customDurMin?: number
  customDurMax?: number
  [key: string]: any
}

/** 已保存的过滤器(持久化归宿主,组件库只负责展示与编辑交互) */
export interface SavedFilter {
  id: string
  name: string
  rules: FilterRule[]
  createdAt: number
}

/** FilterBar 排序器下拉选项(缺省用组件内置 8 项) */
export interface FilterBarSortOption {
  value: string
  label: string
}

/* ============ 素材库文件浏览器(MediaBrowser) ============ */

/**
 * 文件条目:后端 FileData 的兼容子集(SDK getFiles 返回值可直接传入),
 * 瀑布流布局可用 aspect 指定宽高比(如 "16:9"),缺省按 1:1。
 */
export interface MediaBrowserItem {
  id: number | string
  title: string
  size?: number
  extension?: string
  mime_type?: string
  thumbnail_path?: string
  imported_at?: number
  /** 宽高比("W:H"),瀑布流卡片高度依据 */
  aspect?: string
}

/** 文件列表排序字段(与桌面端 FilterBar 的排序选项对齐;宿主 listFiles 可只支持其中子集) */
export type MediaBrowserSortField =
  | 'imported_at'
  | 'id'
  | 'name'
  | 'size'
  | 'stars'
  | 'folder_id'
  | 'tags'
  | 'custom_fields'

/** 文件浏览器的筛选/排序条件(透传给 services.listFiles) */
export interface MediaBrowserFilters {
  /** 标题关键词 */
  title?: string
  /** 网址/域名关键词 */
  url?: string
  category?: 'image' | 'video' | 'audio'
  /** 文件夹 id 列表 */
  folders?: (string | number)[]
  /** 标签 id 列表 */
  tags?: (string | number)[]
  /** 文件大小范围(字节) */
  sizeMin?: number
  sizeMax?: number
  /** 最长边范围(px) */
  metaDimMin?: number
  metaDimMax?: number
  /** 时长范围(秒) */
  metaDurMin?: number
  metaDurMax?: number
  sort?: MediaBrowserSortField
  order?: 'asc' | 'desc'
}

/** 数据服务:宿主实现(扩展走 background 桥,其他宿主可走 SDK) */
export interface MediaBrowserServices {
  listFiles(filters?: MediaBrowserFilters): Promise<MediaBrowserItem[]>
  /**
   * 文件夹扁平列表(提供后过滤栏启用文件夹筛选器);宿主闭包捕获 libraryId,
   * 返回值经 buildTree 组装为选择树。
   */
  listFolders?(): Promise<LibraryFlatItem[] | null>
  /** 标签扁平列表(提供后过滤栏启用标签筛选器) */
  listTags?(): Promise<LibraryFlatItem[] | null>
  /** 缩略图地址(如 /api/files/thumb/:libraryId/:id?token=…);不提供则卡片显示类型图标 */
  getThumbUrl?(item: MediaBrowserItem): string
  /**
   * 批量获取文件宽高(对应 SDK files().getMetadataByIds)。
   * 提供后瀑布流按真实宽高布局(item.aspect 优先,无宽高的项退 1:1)。
   */
  getMetadataByIds?(ids: (string | number)[]): Promise<Array<{ id: string | number; width?: number; height?: number }>>
}
