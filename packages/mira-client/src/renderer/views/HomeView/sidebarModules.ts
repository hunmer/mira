/**
 * HomeSidebar 模块化定义。
 *
 * 把侧边栏拆成若干独立模块，按用户在「自定义布局」对话框里拖出的顺序渲染。
 * 这里集中维护模块 id、标题、图标与描述，供 HomeSidebar 渲染和
 * SidebarLayoutDialog 列表共用，避免两处重复维护文案。
 */

export type SidebarModuleId =
  | 'shortcuts'
  | 'folders'
  | 'tags'
  | 'recent_added'
  | 'recent_viewed'

export interface SidebarModuleDef {
  /** 模块唯一 id，同时作为持久化 key */
  id: SidebarModuleId
  /** 模块标题（section header + 对话框列表项主文案） */
  title: string
  /** material icon name */
  icon: string
  /** 对话框列表项副文案 */
  description: string
}

/** 全部可用模块（顺序仅作为「新模块默认追加入启用区末尾」的依据） */
export const SIDEBAR_MODULES: SidebarModuleDef[] = [
  {
    id: 'shortcuts',
    title: '快捷分类',
    icon: 'bookmarks',
    description: '全部 / 未分类 / 未标签 / 回收站',
  },
  {
    id: 'folders',
    title: '文件夹树',
    icon: 'folder',
    description: '按目录层级浏览所有文件夹',
  },
  {
    id: 'tags',
    title: '标签树',
    icon: 'sell',
    description: '按标签浏览所有素材',
  },
  {
    id: 'recent_added',
    title: '最新添加',
    icon: 'schedule',
    description: '最近导入的素材',
  },
  {
    id: 'recent_viewed',
    title: '历史查看',
    icon: 'history',
    description: '最近浏览过的素材记录',
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
