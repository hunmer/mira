import { computed, nextTick } from 'vue'
import type { ComputedRef } from 'vue'

/**
 * 分页：页码列表计算、上一页/下一页/跳页，翻页后滚动回顶部
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabPagination(deps: {
  currentPage: ComputedRef<number>
  totalPages: ComputedRef<number>
  fetchPageData: (page: number) => Promise<void>
}) {
  const { currentPage, totalPages, fetchPageData } = deps

  const paginationPages = computed(() => {
    // 简单的分页页码计算
    const pages: Array<{ number: number; active: boolean }> = []
    const totalPagesValue = totalPages.value
    const currentPageValue = currentPage.value

    if (totalPagesValue <= 0) return pages

    // 如果总页数小于等于10，显示所有页码
    if (totalPagesValue <= 10) {
      for (let i = 1; i <= totalPagesValue; i++) {
        pages.push({
          number: i,
          active: i === currentPageValue
        })
      }
    } else {
      // 复杂分页逻辑
      let startPage = Math.max(1, currentPageValue - 4)
      const endPage = Math.min(totalPagesValue, startPage + 9)

      if (endPage - startPage < 9) {
        startPage = Math.max(1, endPage - 9)
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push({
          number: i,
          active: i === currentPageValue
        })
      }
    }

    return pages
  })

  // 滚动 .selection-container 到顶部
  const scrollToSelectionTop = () => {
    nextTick(() => {
      const container = document.querySelector('.selection-container') as HTMLElement
      if (container) {
        container.scrollTop = 0
      }

      // 多次滚动以等待懒加载图片渲染完成
      setTimeout(() => {
        const container = document.querySelector('.selection-container') as HTMLElement
        if (container) {
          container.scrollTop = 0
        }
      }, 100)

      setTimeout(() => {
        const container = document.querySelector('.selection-container') as HTMLElement
        if (container) {
          container.scrollTop = 0
        }
      }, 300)
    })
  }

  const handlePreviousPage = async () => {
    if (currentPage.value > 1) {
      await fetchPageData(currentPage.value - 1)
      scrollToSelectionTop()
    }
  }

  const handleNextPage = async () => {
    if (currentPage.value < totalPages.value) {
      await fetchPageData(currentPage.value + 1)
      scrollToSelectionTop()
    }
  }

  const handlePageChange = async (page: number) => {
    if (page !== currentPage.value && page >= 1 && page <= totalPages.value) {
      await fetchPageData(page)
      scrollToSelectionTop()
    }
  }

  return {
    paginationPages,
    handlePreviousPage,
    handleNextPage,
    handlePageChange
  }
}
