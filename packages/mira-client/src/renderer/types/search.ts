/**
 * 全局搜索功能相关类型定义
 */

/**
 * 搜索服务接口
 * 定义每个搜索服务必须实现的方法和属性
 */
export interface SearchService {
  /** 搜索服务唯一标识 */
  id: string
  /** 搜索服务显示名称 */
  title: string
  /** 搜索服务描述 */
  desc: string
  /** 搜索服务图标(Material Icon名称) */
  icon: string
  /** 获取该服务的所有数据总数 */
  getTotal: () => any[]
  /** 
   * 执行搜索
   * @param keyword 搜索关键词
   * @returns 搜索结果数组
   */
  search: (keyword: string) => Promise<any[]>
  /** 
   * 处理搜索结果项点击
   * @param item 被点击的搜索结果项
   */
  itemClick: (item: any) => void
  /** 搜索结果显示模板组件 */
  template: any
}

/**
 * 全局搜索状态
 */
export interface GlobalSearchState {
  /** 搜索对话框是否可见 */
  isVisible: boolean
  /** 当前激活的搜索Tab */
  activeTab: string
  /** 当前搜索关键词 */
  searchKeyword: string
  /** 各服务的搜索结果 */
  searchResults: Record<string, any[]>
  /** 是否正在搜索 */
  isSearching: boolean
  /** 搜索结果总数 */
  totalCounts: Record<string, number>
}

/**
 * 搜索结果项基础接口
 */
export interface SearchResultItem {
  /** 结果项唯一标识 */
  id: string
  /** 结果项标题 */
  title: string
  /** 结果项描述 */
  description?: string
  /** 结果项图标或缩略图 */
  icon?: string
  /** 结果项创建时间 */
  createdAt?: string
  /** 结果项更新时间 */
  updatedAt?: string
  /** 扩展数据 */
  [key: string]: any
}

/**
 * 平台类型
 */
export type PlatformType = 'desktop' | 'web'

/**
 * 搜索模式
 */
export type SearchMode = 'window' | 'dialog'

/**
 * 键盘导航事件类型
 */
export interface KeyboardNavigationEvent {
  key: string
  preventDefault: () => void
  stopPropagation: () => void
}

/**
 * 搜索配置
 */
export interface SearchConfig {
  /** 搜索防抖延迟(毫秒) */
  debounceDelay: number
  /** 最大搜索结果数 */
  maxResults: number
  /** 是否启用搜索历史 */
  enableHistory: boolean
  /** 搜索历史最大条数 */
  maxHistoryItems: number
}
