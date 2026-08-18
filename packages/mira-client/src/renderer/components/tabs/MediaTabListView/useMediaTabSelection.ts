import { computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useMediaStore } from '@renderer/stores/media'
import type { FileInfo } from '@/shared/types'
import type { useHomeController } from '@renderer/controllers/HomeController'

/**
 * 选中逻辑：选中集合、全选/反选/取消、选中项与详情侧栏同步
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabSelection(deps: {
  homeController: ReturnType<typeof useHomeController>
  paginatedMediaItems: ComputedRef<any[]>
  emit: {
    (event: 'itemSelect', item: FileInfo, selected: boolean): void
    (event: 'selectionChange', items: any[]): void
  }
}) {
  const { homeController, paginatedMediaItems, emit } = deps
  const mediaStore = useMediaStore()

  const selectedItems = computed(() => [...new Set(homeController.selectedItems?.value || [])])

  // 文件更新刷新链路中可能重复写入同一 ID，统一在状态入口去重
  watch(() => homeController.selectedItems?.value, (ids) => {
    if (!ids) return
    const unique = [...new Set(ids)]
    if (unique.length !== ids.length) homeController.selectedItems.value = unique
  }, { deep: true })

  // 使用本地的 paginatedMediaItems 计算全选状态
  const isAllSelected = computed(() => {
    const items = paginatedMediaItems.value
    const selected = selectedItems.value
    return items.length > 0 &&
      selected.length === items.length &&
      items.every(item => selected.includes(item.id))
  })

  const handleSelectAll = () => {
    // 使用本地的 paginatedMediaItems 而不是 homeController 的
    const items = paginatedMediaItems.value

    if (isAllSelected.value) {
      // 取消全选
      homeController.selectedItems.value = []
    } else {
      // 全选当前页
      homeController.selectedItems.value = items.map(item => item.id)
    }
  }

  const handleMediaSelect = (item: FileInfo, selected: boolean, event?: MouseEvent) => {
    // 子组件按分组清理旧选择；普通点击需要在父级清理其他分组。
    if (selected && event && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      homeController.selectedItems.value = homeController.selectedItems.value.filter(id => id === item.id)
    }
    homeController.handleMediaSelect(item, selected)
    emit('itemSelect', item, selected)
  }

  // 反选当前页
  const handleInvertSelection = () => {
    const items = paginatedMediaItems.value
    const selected = new Set(selectedItems.value)
    const inverted = items
      .map(item => item.id)
      .filter(id => !selected.has(id))
    homeController.selectedItems.value = inverted
  }

  // 取消选择（全部清空）
  const handleClearSelection = () => {
    homeController.selectedItems.value = []
  }

  // 选中项变化时同步 FileInfo 到全局 store
  watch([selectedItems, () => paginatedMediaItems.value], ([ids, items]) => {
    if (!ids || ids.length === 0) {
      mediaStore.clearDetailSidebar()
      emit('selectionChange', [])
      return
    }
    // 刷新分页数据时可能短暂为空；保留当前选中项和右侧详情，避免面板闪退为 empty
    if (!items || items.length === 0) return
    const matched = items.filter((item: FileInfo) => ids.includes(item.id))
    if (matched.length === 0) return
    mediaStore.setDetailSidebarFiles(matched)
    emit('selectionChange', matched)
  }, { deep: true })

  return {
    selectedItems,
    isAllSelected,
    handleSelectAll,
    handleMediaSelect,
    handleInvertSelection,
    handleClearSelection
  }
}
