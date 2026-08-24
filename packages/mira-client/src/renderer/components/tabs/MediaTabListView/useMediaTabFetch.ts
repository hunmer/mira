import { ref } from 'vue'
import { useLibraryStore } from '@renderer/stores/library'
import { useMediaStore } from '@renderer/stores/media'
import type { useMediaTabData } from '@renderer/composables/useMediaTabData'
import type { useHomeController } from '@renderer/controllers/HomeController'

/**
 * 数据加载：分页取数、排序、刷新（含 WebSocket 活跃 tab 刷新回调）
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabFetch(deps: {
  props: {
    tabId: string
    libraryId?: string
    viewType?: 'files' | 'trash'
    filters?: Record<string, any>
  }
  mediaTabData: ReturnType<typeof useMediaTabData>
  homeController: ReturnType<typeof useHomeController>
  emit: (event: 'refresh') => void
}) {
  const { props, mediaTabData, homeController, emit } = deps
  const libraryStore = useLibraryStore()
  const mediaStore = useMediaStore()

  // 响应式状态
  const isLoading = ref(false)
  const sortField = ref<'imported_at' | 'id' | 'name' | 'size' | 'stars' | 'folder_id' | 'tags' | 'custom_fields'>('imported_at')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  // 方法
  // 获取指定页面的数据
  const fetchPageData = async (page: number) => {
    // 检查并获取 libraryId
    let libraryId = props.libraryId
    if (!libraryId) {
      // 尝试从当前素材库获取 libraryId
      try {
        if (libraryStore.currentLibrary?.id) {
          libraryId = libraryStore.currentLibrary.id
        } else {
          console.warn('缺少 libraryId，无法获取分页数据')
          return
        }
      } catch (error) {
        console.error('❌ 获取当前素材库失败:', error)
        return
      }
    }

    isLoading.value = true

    try {
      // 更新分页状态
      mediaTabData.setCurrentPage(page)

      // 计算offset
      const itemsPerPage = mediaTabData.itemsPerPage.value
      const offset = (page - 1) * itemsPerPage

      // 清理 null/undefined 值
      // tab 固有筛选来自视图配置；恢复流程中 MediaTabData 可能尚未完成初始化，
      // 先合并固有筛选，再用当前 tab 已保存/编辑过的筛选覆盖同名字段。
      const rawFilters = {
        ...(props.filters ?? {}),
        ...mediaTabData.filters.value
      }
      const currentFilters: Record<string, any> = {}
      Object.entries(rawFilters).forEach(([key, value]) => {
        if (value !== undefined && !(typeof value === 'number' && Number.isNaN(value))) {
          currentFilters[key] = value
        }
      })

      const tabInfo = {
        id: props.tabId,
        type: props.viewType || 'all',
        libraryId, // 将 libraryId 放在顶层，确保 fetchFilesForTab 能正确获取
        data: {},
        filters: currentFilters, // 将筛选器放在正确的位置
        sort: sortField.value as 'imported_at' | 'id' | 'size' | 'stars' | 'folder_id' | 'tags' | 'name' | 'custom_fields',
        order: sortOrder.value
      }

      // 调用mediaStore的fetchFilesForTab获取数据
      const result = await mediaStore.fetchFilesForTab(tabInfo, {
        limit: itemsPerPage,
        offset
      })

      if (result.success && result.data) {
        // 缓存数据到MediaTabData
        mediaTabData.cacheData(result.data, result.total || 0)

        // 更新分页信息
        if (result.total !== undefined) {
          mediaTabData.updatePagination({
            totalRecords: result.total,
            isServerPagination: true
          })
        }
      } else {
        console.error('❌ 分页数据加载失败:', (result as any).error || '未知错误')
      }
    } catch (error) {
      console.error('❌ 分页数据获取异常:', error)
    } finally {
      isLoading.value = false
    }
  }

  const handleRefresh = async (preserveSelection = false) => {
    if (!preserveSelection) homeController.selectedItems.value = []
    await fetchPageData(1)
    emit('refresh')
  }

  const handleManualRefresh = () => handleRefresh()

  // WebSocket 活跃 tab 刷新回调
  const handleActiveTabRefresh = (e: Event) => {
    const { tabId } = (e as CustomEvent).detail
    if (tabId === props.tabId) {
      const eventType = (e as CustomEvent).detail?.eventType
      // 文件属性更新可能影响当前排序（例如按名称、星标或更新时间排序）。
      // 重新按当前排序查询，避免局部更新把文件留在列表首位；保留用户选中状态。
      if (eventType === 'updated') {
        void handleRefresh(true)
        return
      }
      void handleRefresh()
    }
  }

  const handleSortChange = async (field: string, order: string) => {
    sortField.value = field as 'imported_at' | 'id' | 'name' | 'size' | 'stars' | 'folder_id' | 'tags' | 'custom_fields'
    sortOrder.value = order as 'asc' | 'desc'
    await fetchPageData(1)
  }

  return {
    isLoading,
    sortField,
    sortOrder,
    fetchPageData,
    handleRefresh,
    handleManualRefresh,
    handleActiveTabRefresh,
    handleSortChange
  }
}
