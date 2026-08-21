import { computed, inject, watch, reactive } from 'vue'
import { getLibraryPrefs } from './LibraryPrefs'

/**
 * Tab级别的分页状态管理
 * 每个Tab组件使用独立的分页状态，避免全局状态冲突
 */

// Tab 分页状态的本地存储（useTabs 尚未暴露分页接口，使用本地 Map 保存）
interface TabPaginationState {
  currentPage: number
  totalRecords: number
  itemsPerPage: number
  isServerPagination: boolean
}

const paginationStates = new Map<string, TabPaginationState>()

// 单页最多展示配置变化时，同步所有已注册 Tab 的分页大小并重置页码
watch(() => getLibraryPrefs().pageSize, (pageSize) => {
  paginationStates.forEach((state) => {
    state.itemsPerPage = pageSize
    state.currentPage = 1
  })
})

const getTabPaginationState = (id: string): TabPaginationState => {
  if (!paginationStates.has(id)) {
    paginationStates.set(id, reactive<TabPaginationState>({
      currentPage: 1,
      totalRecords: 0,
      itemsPerPage: getLibraryPrefs().pageSize,
      isServerPagination: false
    }))
  }
  return paginationStates.get(id)!
}

const updateTabPaginationState = (id: string, updates: Partial<TabPaginationState>) => {
  const state = getTabPaginationState(id)
  Object.assign(state, updates)
}

export function useTabPagination(tabId?: string) {

  // 如果没有提供tabId，尝试从注入的props中获取
  const currentTabId = tabId || inject<string>('tabId', '')

  if (!currentTabId) {
    console.warn('⚠️ useTabPagination: 无法获取tabId')
  }

  // 响应式的分页状态
  const currentPage = computed({
    get: () => {
      const state = getTabPaginationState(currentTabId)
      return state.currentPage
    },
    set: (value: number) => {
      updateTabPaginationState(currentTabId, { currentPage: value })
    }
  })

  const totalRecords = computed({
    get: () => {
      const state = getTabPaginationState(currentTabId)
      return state.totalRecords
    },
    set: (value: number) => {
      updateTabPaginationState(currentTabId, { totalRecords: value })
    }
  })

  const itemsPerPage = computed({
    get: () => {
      const state = getTabPaginationState(currentTabId)
      return state.itemsPerPage
    },
    set: (value: number) => {
      updateTabPaginationState(currentTabId, { itemsPerPage: value })
    }
  })

  const isServerPagination = computed({
    get: () => {
      const state = getTabPaginationState(currentTabId)
      return state.isServerPagination
    },
    set: (value: boolean) => {
      updateTabPaginationState(currentTabId, { isServerPagination: value })
    }
  })

  // 计算总页数
  const totalPages = computed(() => {
    if (isServerPagination.value) {
      const pages = Math.ceil(totalRecords.value / itemsPerPage.value)
      return pages
    } else {
      // 客户端分页时，需要从外部传入过滤后的数据长度
      return 1 // 默认值，实际应该由调用方设置
    }
  })

  // 分页操作方法
  const setServerPaginationData = (total: number, page: number = 1) => {
    updateTabPaginationState(currentTabId, {
      totalRecords: total,
      currentPage: page,
      isServerPagination: true
    })
  }

  const resetPagination = () => {
    updateTabPaginationState(currentTabId, {
      currentPage: 1,
      totalRecords: 0,
      isServerPagination: false
    })
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  // 调试信息
  const debugInfo = computed(() => ({
    tabId: currentTabId,
    currentPage: currentPage.value,
    totalPages: totalPages.value,
    totalRecords: totalRecords.value,
    itemsPerPage: itemsPerPage.value,
    isServerPagination: isServerPagination.value
  }))

  // 监听状态变化（用于调试）
  watch(
    [currentPage, totalRecords, isServerPagination],
    ([newPage, newTotal, newServerPag], [oldPage, oldTotal, oldServerPag]) => {
    }
  )

  return {
    // 状态
    currentPage,
    totalRecords,
    itemsPerPage,
    isServerPagination,
    totalPages,

    // 方法
    setServerPaginationData,
    resetPagination,
    handlePageChange,

    // 调试
    debugInfo
  }
}