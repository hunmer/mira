/**
 * 素材库树(文件夹/标签)组件的类型与依赖注入接口。
 *
 * 组件库不直接访问数据源(background 桥 / SDK / fetch),
 * 由宿主通过 services / dialog / upload 注入:
 * - services: 树数据加载与节点 CRUD
 * - dialog:   prompt/alert/confirm 弹窗(编辑动作的名称输入与删除确认)
 * - upload:   拖放/选择文件后的上传动作(宿主自行路由到上传队列)
 */
import type { Component } from 'vue'

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

/** MediaBrowser 自定义菜单项(传入 menus 后在菜单栏渲染,select 抛 menuSelect 由宿主处理) */
export interface MediaBrowserMenuItem {
  /** 唯一标识,menuSelect 事件回传(separator 项可省略) */
  key: string
  /** 显示文案(宿主自行本地化) */
  label: string
  disabled?: boolean
  /** 图标组件(如 @lucide/vue 图标),渲染在文案左侧 */
  icon?: Component
  /** 渲染为分隔线(为 true 时忽略 label/icon/disabled) */
  separator?: boolean
  /** 危险项:红色警示样式(如删除类操作) */
  danger?: boolean
}

/** MediaBrowser 自定义顶层菜单(渲染在内置「文件」菜单之后) */
export interface MediaBrowserMenu {
  /** 唯一标识,menuSelect 事件回传 */
  key: string
  /** 顶层触发器文案(宿主自行本地化) */
  label: string
  items: MediaBrowserMenuItem[]
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
  /** 分页:每页条数(MediaBrowser 固定传 500) */
  limit?: number
  /** 分页:偏移量 */
  offset?: number
}

/** 分页返回形态(提供 total 后 MediaBrowser 底部显示翻页条) */
export interface MediaBrowserListResult {
  items: MediaBrowserItem[]
  /** 满足当前筛选条件的总条数 */
  total: number
}

/** 数据服务:宿主实现(扩展走 background 桥,其他宿主可走 SDK) */
export interface MediaBrowserServices {
  /**
   * 文件列表:filters 含 limit/offset 分页参数;返回数组(不分页,隐藏翻页条)
   * 或 { items, total } 分页对象(服务端 getFiles 的 { result, total })。
   */
  listFiles(filters?: MediaBrowserFilters): Promise<MediaBrowserItem[] | MediaBrowserListResult>
  /**
   * 文件夹扁平列表(提供后过滤栏启用文件夹筛选器);宿主闭包捕获 libraryId,
   * 返回值经 buildTree 组装为选择树。
   */
  listFolders?(): Promise<LibraryFlatItem[] | null>
  /** 标签扁平列表(提供后过滤栏启用标签筛选器) */
  listTags?(): Promise<LibraryFlatItem[] | null>
  /** 缩略图地址(如 /api/files/thumb/:libraryId/:id?token=…);无缩略图返回 undefined,卡片回退类型图标 */
  getThumbUrl?(item: MediaBrowserItem): string | undefined
  /**
   * 批量获取文件宽高(对应 SDK files().getMetadataByIds)。
   * 提供后瀑布流按真实宽高布局(item.aspect 优先,无宽高的项退 1:1)。
   */
  getMetadataByIds?(ids: (string | number)[]): Promise<Array<{ id: string | number; width?: number; height?: number }>>
}

/* ============ 文件详情面板(MediaDetail) ============ */

/**
 * 文件详情条目:MediaBrowserItem 扩展,补齐详情面板的编辑/归属字段
 * (新增字段全部可选,MediaBrowser 的 selected 可直接传入,缺省字段经 services.getFileDetail 补读)。
 */
export interface MediaDetailItem extends MediaBrowserItem {
  /** 所属文件夹 id(null/undefined 表示未分类) */
  folder_id?: number | string | null
  /** 标签数组(后端按标题关联) */
  tags?: string[]
  /** 评分 0-5 */
  stars?: number
  /** 备注 */
  notes?: string
  /** 来源网址 */
  website?: string
  /** 文件可访问地址(展示 + 复制用,宿主按需提供) */
  url?: string
  created_at?: string | number
  updated_at?: string | number
  /** 图片宽(px) */
  width?: number
  /** 图片高(px) */
  height?: number
  /** 时长(秒) */
  duration?: number
}

/** 详情面板数据服务:宿主实现(SDK / background 桥);仅展示时可不传,编辑能力按需提供 */
export interface MediaDetailServices {
  /** 单文件详情补读(stars/notes/tags 等列表缓存缺失的字段);不提供则直接用传入条目 */
  getFileDetail?(item: MediaDetailItem): Promise<MediaDetailItem | null>
  /** 重命名;名称冲突时抛含 409 的错误(组件展示冲突提示) */
  renameFile?(item: MediaDetailItem, name: string): Promise<unknown>
  /** 更新编辑字段(website/stars/notes) */
  updateFile?(item: MediaDetailItem, patch: Partial<Pick<MediaDetailItem, 'website' | 'stars' | 'notes'>>): Promise<unknown>
  /** 设置所属文件夹(folderId=null 移出文件夹);批量应用于多选 */
  setFileFolder?(items: MediaDetailItem[], folderId: number | null): Promise<unknown>
  /** 批量追加标签(按标题) */
  addTagsToFile?(items: MediaDetailItem[], tagTitles: string[]): Promise<unknown>
  /** 覆盖保存单文件标签(按标题;移除标签用) */
  setFileTags?(item: MediaDetailItem, tags: string[]): Promise<unknown>
  /** 文件夹/标签树数据(编辑弹层的选树);缺省回退树视图的 services */
  listFolders?(): Promise<LibraryFlatItem[] | null>
  listTags?(): Promise<LibraryFlatItem[] | null>
  /** 大图预览地址;缺省回退 thumbnail_path */
  getPreviewUrl?(item: MediaDetailItem): string | undefined
}

/* ============ 素材库三栏视图(MediaLibraryView) ============ */

/** 三栏素材库视图(左树/中列表/右详情)的聚合服务 */
export interface MediaLibraryServices {
  /** 左侧文件夹/标签树(CRUD + 拖拽排序) */
  tree: LibraryTreeServices
  /** 中部文件列表(筛选/排序/分页/缩略图) */
  media: MediaBrowserServices
  /** 右侧详情面板(编辑能力;listFolders/listTags 缺省回退 tree) */
  detail?: MediaDetailServices
  /** 弹窗服务(树拖拽跨层移动确认等) */
  dialog?: LibraryTreeDialog
  /** 上传服务(树拖放/右键上传) */
  upload?: LibraryTreeUpload
}

/* ============ MediaBrowser 顶部服务器管理入口 ============ */

/** MediaBrowser 菜单栏服务器图标的弹层数据(传入后显示图标,点击弹 ServerManagerView) */
export interface MediaBrowserServerManager {
  /** 受管服务器列表 */
  servers: ManagedServer[]
  /** 当前激活服务器 id */
  activeServerId?: string
  /** 服务器管理服务(add/edit/remove/test/activate,由宿主实现) */
  services: ServerManagerServices
}

/* ============ 素材库选图对话框(MediaPickerDialog) ============ */

/** MediaPickerDialog 确认抛出的选中文件(直链 + 宽高) */
export interface MediaPickerFile {
  id: string | number
  name: string
  width: number
  height: number
  /** 原图直链(带 token,可直接 img/fetch 访问) */
  url: string
  /** 缩略图直链(带 token,列表展示用) */
  thumbUrl: string
  /** 源文件是否图片(按扩展名判断,无扩展名视为图片);非图片的源文件 url 不是图,如需图片内容应改用 thumbUrl */
  isImage: boolean
}

/** resolveUrls 自定义直链解析的返回结构 */
export interface MediaPickerUrls {
  url: string
  thumbUrl: string
}
