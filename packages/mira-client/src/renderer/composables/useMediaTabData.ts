import { reactive, computed, watch } from 'vue'
import type { FilterRule } from '@/renderer/types/filter'
import { resolveDefaultViewMode, getLibraryPrefs } from './LibraryPrefs'


// 媒体Tab的数据管理接口
export interface MediaTabData {
  tabId: string
  filters: Record<string, FilterRule>
  cachedData: any[]
  cachedTotal: number
  pagination: {
    currentPage: number
    totalRecords: number
    itemsPerPage: number
    isServerPagination: boolean
  }
  viewMode: 'grid' | 'list' | 'waterfall' // Tab独立的视图模式
  appliedFilterId?: string | null // 已应用的保存过滤器 id（书签图标旁精准展示名称）
  lastUpdated: number
}

// 全局存储所有Tab的数据
const tabDataStore = reactive<Record<string, MediaTabData>>({})

// 单页最多展示配置变化时，同步所有已打开媒体 Tab 的分页大小并重置页码
watch(() => getLibraryPrefs().pageSize, (pageSize) => {
  Object.values(tabDataStore).forEach((tab) => {
    tab.pagination.itemsPerPage = pageSize
    tab.pagination.currentPage = 1
  })
})

// 恢复时暂存每个tab的viewMode
const _restoredViewModes: Record<string, 'grid' | 'list' | 'waterfall'> = {}

// 恢复时暂存每个tab的appliedFilterId
const _restoredAppliedFilterIds: Record<string, string | null> = {}

// viewMode变化时的回调（由useTabs注册，触发tab状态保存）
let _viewModeChangeCallback: (() => void) | null = null

export function registerViewModeChangeCallback(cb: () => void) {
  _viewModeChangeCallback = cb
}

/**
 * MediaTabListView专用的数据管理Composable
 * 负责管理特定于媒体列表视图的状态，如筛选器、缓存数据、分页等
 */
export function useMediaTabData(tabId: string) {
  // 确保该Tab的数据存在
  if (!tabDataStore[tabId]) {
    const defaultMode = _restoredViewModes[tabId] || resolveDefaultViewMode()
    const restoredAppliedFilterId = _restoredAppliedFilterIds[tabId] ?? null
    delete _restoredViewModes[tabId]
    delete _restoredAppliedFilterIds[tabId]

    tabDataStore[tabId] = {
      tabId,
      filters: {},
      cachedData: [],
      cachedTotal: 0,
      pagination: {
        currentPage: 1,
        totalRecords: 0,
        itemsPerPage: getLibraryPrefs().pageSize,
        isServerPagination: false
      },
      viewMode: defaultMode,
      appliedFilterId: restoredAppliedFilterId,
      lastUpdated: 0
    }
  }

  const tabData = computed(() => tabDataStore[tabId])

  // 筛选器管理
  const updateFilters = (filters: Record<string, FilterRule>) => {
    tabDataStore[tabId].filters = { ...filters }
  }

  // 初始化筛选器
  const setInitialFilters = (filters: Record<string, FilterRule>) => {
    tabDataStore[tabId].filters = { ...filters }
  }

  const clearFilters = (filterId?: string) => {
    if (filterId) {
      delete tabDataStore[tabId].filters[filterId]
    } else {
      tabDataStore[tabId].filters = {}
    }
  }

  const hasActiveFilters = computed(() => {
    const filters = tabDataStore[tabId]?.filters
    return filters && Object.keys(filters).length > 0
  })

  // 缓存数据管理
  const cacheData = (data: any[], total?: number) => {
    tabDataStore[tabId].cachedData = [...data] // 深拷贝数据
    tabDataStore[tabId].cachedTotal = total || data.length
    tabDataStore[tabId].lastUpdated = Date.now()
  }

  const getCachedData = () => {
    const data = tabDataStore[tabId]
    return {
      data: data?.cachedData || [],
      total: data?.cachedTotal || 0,
      lastUpdated: data?.lastUpdated || 0
    }
  }

  const clearCache = () => {
    tabDataStore[tabId].cachedData = []
    tabDataStore[tabId].cachedTotal = 0
    tabDataStore[tabId].lastUpdated = 0
  }

  const hasCachedData = computed(() => {
    const data = tabDataStore[tabId]
    return data && data.cachedData.length > 0
  })

  // 分页状态管理
  const updatePagination = (paginationState: Partial<{
    currentPage: number
    totalRecords: number
    itemsPerPage: number
    isServerPagination: boolean
  }>) => {
    Object.assign(tabDataStore[tabId].pagination, paginationState)
  }

  const resetPagination = () => {
    tabDataStore[tabId].pagination = {
      currentPage: 1,
      totalRecords: 0,
      itemsPerPage: getLibraryPrefs().pageSize,
      isServerPagination: false
    }
  }

  const currentPage = computed(() => tabDataStore[tabId]?.pagination?.currentPage || 1)
  const totalRecords = computed(() => tabDataStore[tabId]?.pagination?.totalRecords || 0)
  const itemsPerPage = computed(() => tabDataStore[tabId]?.pagination?.itemsPerPage || getLibraryPrefs().pageSize)
  const isServerPagination = computed(() => tabDataStore[tabId]?.pagination?.isServerPagination || false)

  const totalPages = computed(() => {
    const total = totalRecords.value
    const perPage = itemsPerPage.value
    return Math.max(1, Math.ceil(total / perPage))
  })

  // 页面切换
  const setCurrentPage = (page: number) => {
    const maxPage = totalPages.value
    const newPage = Math.max(1, Math.min(maxPage, page))
    updatePagination({ currentPage: newPage })
  }

  const nextPage = () => {
    setCurrentPage(currentPage.value + 1)
  }

  const previousPage = () => {
    setCurrentPage(currentPage.value - 1)
  }

  // 视图模式管理
  const viewMode = computed(() => tabDataStore[tabId]?.viewMode || 'grid')

  const setViewMode = async (mode: 'grid' | 'list' | 'waterfall') => {
    if (tabDataStore[tabId]) {
      tabDataStore[tabId].viewMode = mode
      _viewModeChangeCallback?.()
    }
  }

  // 已应用过滤器 id 管理
  const appliedFilterId = computed(() => tabDataStore[tabId]?.appliedFilterId || null)

  const setAppliedFilterId = (id: string | null) => {
    if (tabDataStore[tabId]) {
      tabDataStore[tabId].appliedFilterId = id || null
      _viewModeChangeCallback?.() // 触发 tab 状态保存（与 viewMode 共用回调）
    }
  }

  // 清理Tab数据（Tab关闭时调用）
  const cleanup = () => {
    delete tabDataStore[tabId]
  }

  // 调试信息
  const debugInfo = computed(() => ({
    tabId,
    hasFilters: hasActiveFilters.value,
    filterCount: Object.keys(tabDataStore[tabId]?.filters || {}).length,
    hasCachedData: hasCachedData.value,
    cachedDataCount: tabDataStore[tabId]?.cachedData?.length || 0,
    pagination: tabDataStore[tabId]?.pagination,
    lastUpdated: new Date(tabDataStore[tabId]?.lastUpdated || 0).toLocaleString()
  }))

  return {
    // 状态
    tabData,

    // 筛选器
    updateFilters,
    setInitialFilters,
    clearFilters,
    hasActiveFilters,
    filters: computed(() => tabDataStore[tabId]?.filters || {}),

    // 缓存数据
    cacheData,
    getCachedData,
    clearCache,
    hasCachedData,

    // 分页
    updatePagination,
    resetPagination,
    currentPage,
    totalRecords,
    itemsPerPage,
    isServerPagination,
    totalPages,
    setCurrentPage,
    nextPage,
    previousPage,

    // 视图模式
    viewMode,
    setViewMode,

    // 已应用过滤器
    appliedFilterId,
    setAppliedFilterId,

    // 工具方法
    cleanup,
    debugInfo
  }
}

/**
 * 缓存指定Tab的数据（全局函数，用于HomeView等地方调用）
 */
export function cacheTabData(tabId: string, data: any[], total?: number) {
  if (!tabDataStore[tabId]) {
    const defaultMode = _restoredViewModes[tabId] || resolveDefaultViewMode()
    const restoredAppliedFilterId = _restoredAppliedFilterIds[tabId] ?? null
    delete _restoredViewModes[tabId]
    delete _restoredAppliedFilterIds[tabId]

    tabDataStore[tabId] = {
      tabId,
      filters: {},
      cachedData: [],
      cachedTotal: 0,
      pagination: {
        currentPage: 1,
        totalRecords: 0,
        itemsPerPage: getLibraryPrefs().pageSize,
        isServerPagination: false
      },
      viewMode: defaultMode,
      appliedFilterId: restoredAppliedFilterId,
      lastUpdated: 0
    }
  }

  tabDataStore[tabId].cachedData = [...data]
  tabDataStore[tabId].cachedTotal = total || data.length
  tabDataStore[tabId].lastUpdated = Date.now()
}

/**
 * 获取指定Tab的缓存数据（全局函数，用于HomeView等地方调用）
 */
export function getTabCachedData(tabId: string) {
  const data = tabDataStore[tabId]
  return {
    data: data?.cachedData || [],
    total: data?.cachedTotal || 0,
    lastUpdated: data?.lastUpdated || 0
  }
}

/**
 * 清理指定Tab或所有Tab的缓存（全局函数，用于HomeView等地方调用）
 */
export function clearTabCache(tabId?: string) {
  if (tabId) {
    if (tabDataStore[tabId]) {
      tabDataStore[tabId].cachedData = []
      tabDataStore[tabId].cachedTotal = 0
      tabDataStore[tabId].lastUpdated = 0
    }
  } else {
    Object.keys(tabDataStore).forEach(id => {
      tabDataStore[id].cachedData = []
      tabDataStore[id].cachedTotal = 0
      tabDataStore[id].lastUpdated = 0
    })
  }
}

/**
 * 清理所有Tab数据（应用关闭时调用）
 */
export function clearAllTabData() {
  Object.keys(tabDataStore).forEach(tabId => {
    delete tabDataStore[tabId]
  })
}

/**
 * 获取所有Tab数据（调试用）
 */
export function getAllTabData() {
  return { ...tabDataStore }
}

/**
 * 获取指定tab的viewMode（用于Tab持久化保存）
 */
export function getTabViewMode(tabId: string): 'grid' | 'list' | 'waterfall' | undefined {
  return tabDataStore[tabId]?.viewMode
}

/**
 * 恢复指定tab的viewMode（Tab状态恢复时调用）
 * 存入 pending map，等 useMediaTabData 初始化时读取
 */
export function restoreTabViewMode(tabId: string, mode: 'grid' | 'list' | 'waterfall') {
  _restoredViewModes[tabId] = mode
}

/**
 * 获取指定tab的appliedFilterId（用于Tab持久化保存）
 */
export function getTabAppliedFilterId(tabId: string): string | null | undefined {
  return tabDataStore[tabId]?.appliedFilterId
}

/**
 * 恢复指定tab的appliedFilterId（Tab状态恢复时调用）
 * 存入 pending map，等 useMediaTabData 初始化时读取
 */
export function restoreTabAppliedFilterId(tabId: string, id: string | null) {
  _restoredAppliedFilterIds[tabId] = id || null
}