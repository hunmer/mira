import { reactive, computed } from 'vue'
import type { FilterRule } from '@/components/ui/volt/FilterBar.vue'

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
  lastUpdated: number
}

// 全局存储所有Tab的数据
const tabDataStore = reactive<Record<string, MediaTabData>>({})

/**
 * MediaTabListView专用的数据管理Composable
 * 负责管理特定于媒体列表视图的状态，如筛选器、缓存数据、分页等
 */
export function useMediaTabData(tabId: string) {
  // 确保该Tab的数据存在
  if (!tabDataStore[tabId]) {
    // 从settingsStore获取默认视图模式
    const getDefaultViewMode = () => {
      try {
        const { useSettingsStore } = require('@/renderer/stores/settings')
        const settingsStore = useSettingsStore()
        return settingsStore.settings?.defaultView || 'grid'
      } catch {
        return 'grid'
      }
    }

    tabDataStore[tabId] = {
      tabId,
      filters: {},
      cachedData: [],
      cachedTotal: 0,
      pagination: {
        currentPage: 1,
        totalRecords: 0,
        itemsPerPage: 999,
        isServerPagination: false
      },
      viewMode: getDefaultViewMode(), // 初始化为默认视图模式
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
      itemsPerPage: 999,
      isServerPagination: false
    }
  }

  const currentPage = computed(() => tabDataStore[tabId]?.pagination?.currentPage || 1)
  const totalRecords = computed(() => tabDataStore[tabId]?.pagination?.totalRecords || 0)
  const itemsPerPage = computed(() => tabDataStore[tabId]?.pagination?.itemsPerPage || 50)
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

      // 可选：将该tab的视图模式保存为全局默认设置
      // 这样新打开的tab会使用最后一次使用的视图模式
      try {
        const { useSettingsStore } = require('@/renderer/stores/settings')
        const settingsStore = useSettingsStore()
        await settingsStore.updateSetting('defaultView', mode)
      } catch {
        // silently ignore
      }
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
    // 从settingsStore获取默认视图模式
    const getDefaultViewMode = () => {
      try {
        const { useSettingsStore } = require('@/renderer/stores/settings')
        const settingsStore = useSettingsStore()
        return settingsStore.settings?.defaultView || 'grid'
      } catch {
        return 'grid'
      }
    }

    tabDataStore[tabId] = {
      tabId,
      filters: {},
      cachedData: [],
      cachedTotal: 0,
      pagination: {
        currentPage: 1,
        totalRecords: 0,
        itemsPerPage: 999,
        isServerPagination: false
      },
      viewMode: getDefaultViewMode(),
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