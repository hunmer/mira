import { ref, computed, inject, watch } from 'vue'
import { useTabs } from './useTabs'

/**
 * Tab级别的分页状态管理
 * 每个Tab组件使用独立的分页状态，避免全局状态冲突
 */
export function useTabPagination(tabId?: string) {
  const { getTabPaginationState, updateTabPaginationState } = useTabs()

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
      console.log(`📄 Tab ${currentTabId} 计算总页数:`, {
        totalRecords: totalRecords.value,
        itemsPerPage: itemsPerPage.value,
        isServerPagination: isServerPagination.value,
        计算结果: pages
      })
      return pages
    } else {
      // 客户端分页时，需要从外部传入过滤后的数据长度
      return 1 // 默认值，实际应该由调用方设置
    }
  })

  // 分页操作方法
  const setServerPaginationData = (total: number, page: number = 1) => {
    console.log(`📄 Tab ${currentTabId} 设置服务端分页数据:`, {
      total,
      page,
      itemsPerPage: itemsPerPage.value
    })

    updateTabPaginationState(currentTabId, {
      totalRecords: total,
      currentPage: page,
      isServerPagination: true
    })
  }

  const resetPagination = () => {
    console.log(`📄 Tab ${currentTabId} 重置分页状态`)

    updateTabPaginationState(currentTabId, {
      currentPage: 1,
      totalRecords: 0,
      isServerPagination: false
    })
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      console.log(`📄 Tab ${currentTabId} 页码变化:`, {
        从: currentPage.value,
        到: page,
        totalPages: totalPages.value
      })
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
      console.log(`📄 Tab ${currentTabId} 分页状态变化:`, {
        currentPage: `${oldPage} -> ${newPage}`,
        totalRecords: `${oldTotal} -> ${newTotal}`,
        isServerPagination: `${oldServerPag} -> ${newServerPag}`,
        totalPages: totalPages.value
      })
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