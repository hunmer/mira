/**
 * HomeSidebar 模块化定义。
 *
 * 把侧边栏拆成若干独立模块，按用户在「自定义布局」对话框里拖出的顺序渲染。
 * 这里集中维护模块 id、标题/描述的 i18n key 与图标，供 HomeSidebar 渲染和
 * SidebarLayoutDialog 列表共用，避免两处重复维护文案。
 *
 * 注意：title/description 存 i18n key 而非翻译后的文本 —— 在 computed / 模板中
 * 套 t() 翻译可跟随语言切换即时刷新（早期直接在模块加载时求值，切换语言不生效）。
 */

export type SidebarModuleId =
  | 'shortcuts'
  | 'folders'
  | 'tags'
  | 'recent_added'
  | 'recent_viewed'
  | 'local_files'
  | 'web_favorites'

export interface SidebarModuleDef {
  /** 模块唯一 id，同时作为持久化 key */
  id: SidebarModuleId
  /** 模块标题 i18n key（section header + 对话框列表项主文案） */
  titleKey: string
  /** material icon name */
  icon: string
  /** 对话框列表项副文案 i18n key */
  descriptionKey: string
}

/** 全部可用模块（顺序仅作为「新模块默认追加入启用区末尾」的依据） */
export const SIDEBAR_MODULES: SidebarModuleDef[] = [
  {
    id: 'shortcuts',
    titleKey: 'views.sidebarModule.shortcutsTitle',
    icon: 'bookmarks',
    descriptionKey: 'views.sidebarModule.shortcutsDesc',
  },
  {
    id: 'folders',
    titleKey: 'views.sidebarModule.foldersTitle',
    icon: 'folder',
    descriptionKey: 'views.sidebarModule.foldersDesc',
  },
  {
    id: 'tags',
    titleKey: 'views.sidebarModule.tagsTitle',
    icon: 'sell',
    descriptionKey: 'views.sidebarModule.tagsDesc',
  },
  {
    id: 'recent_added',
    titleKey: 'views.sidebarModule.recentAddedTitle',
    icon: 'schedule',
    descriptionKey: 'views.sidebarModule.recentAddedDesc',
  },
  {
    id: 'recent_viewed',
    titleKey: 'views.sidebarModule.recentViewedTitle',
    icon: 'history',
    descriptionKey: 'views.sidebarModule.recentViewedDesc',
  },
  {
    id: 'local_files',
    titleKey: 'views.sidebarModule.localFilesTitle',
    icon: 'storage',
    descriptionKey: 'views.sidebarModule.localFilesDesc',
  },
  {
    id: 'web_favorites',
    titleKey: 'views.sidebarModule.webFavoritesTitle',
    icon: 'collections_bookmark',
    descriptionKey: 'views.sidebarModule.webFavoritesDesc',
  },
]

/** 全部模块 id（顺序即「新增模块默认追加顺序」） */
export const ALL_MODULE_IDS: SidebarModuleId[] = SIDEBAR_MODULES.map((m) => m.id)

/** id -> 模块定义 */
const MODULE_MAP = new Map<string, SidebarModuleDef>(SIDEBAR_MODULES.map((m) => [m.id, m]))

export function getModuleDef(id: string): SidebarModuleDef | undefined {
  return MODULE_MAP.get(id)
}

/** 判断给定 id 是否为已知的合法模块 id */
export function isKnownModule(id: string): id is SidebarModuleId {
  return MODULE_MAP.has(id)
}
