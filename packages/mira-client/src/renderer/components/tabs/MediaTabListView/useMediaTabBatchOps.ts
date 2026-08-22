import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLibraryStore } from '@renderer/stores/library'
import { useToast } from '@renderer/composables/useToast'
import { appService } from '@renderer/services'
import { getLibraryPrefs, saveSkipDeleteConfirm } from '@renderer/composables/LibraryPrefs'
import type { ComputedRef } from 'vue'
import type { FileInfo } from '@/shared/types'
import type { useMediaTabData } from '@renderer/composables/useMediaTabData'
import type { useHomeController } from '@renderer/controllers/HomeController'

/**
 * 批量操作：按素材库分组执行恢复/彻底删除/删除，删除确认弹窗，Delete 键触发
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabBatchOps(deps: {
  selectedItems: ComputedRef<string[]>
  mediaTabData: ReturnType<typeof useMediaTabData>
  homeController: ReturnType<typeof useHomeController>
  handleRefresh: (preserveSelection?: boolean) => Promise<void>
  rootEl: () => HTMLElement | null
}) {
  const { selectedItems, mediaTabData, homeController, handleRefresh, rootEl } = deps
  const { t } = useI18n()
  const libraryStore = useLibraryStore()
  const toast = useToast()

  // 将选中文件按 libraryId 分组，缺少 libraryId 的进入 ungrouped
  const groupSelectedByLibrary = () => {
    const cachedFiles = mediaTabData.getCachedData().data
    const groups = new Map<string, string[]>()
    const ungrouped: string[] = []
    for (const id of selectedItems.value) {
      const file = cachedFiles.find((f: FileInfo) => f.id === id)
      const libraryId = file?.libraryId || libraryStore.currentLibrary?.id
      if (!libraryId) { ungrouped.push(id); continue }
      const list = groups.get(libraryId) ?? []
      list.push(id)
      groups.set(libraryId, list)
    }
    return { groups, ungrouped }
  }

  // 分组执行批量操作（每组只发一次请求），完成后弹 toast，返回失败数
  const runGroupedBatchOperation = async (
    label: string,
    operation: (libraryId: string, fileIds: string[]) => Promise<{ failedIds?: unknown[] }>
  ) => {
    const total = selectedItems.value.length
    const { groups, ungrouped } = groupSelectedByLibrary()
    let failed = ungrouped.length
    let completed = 0
    for (const [libraryId, fileIds] of groups) {
      try {
        const result = await operation(libraryId, fileIds)
        const groupFailed = result?.failedIds?.length ?? 0
        failed += groupFailed
        completed += fileIds.length - groupFailed
      } catch {
        failed += fileIds.length
      }
    }
    toast.add({
      severity: failed === 0 ? 'success' : (completed > 0 ? 'warn' : 'error'),
      summary: label,
      detail: failed === 0
        ? t('composables.useBatchOperation.completedAll', { label, completed, total })
        : t('composables.useBatchOperation.completedWithFailures', { label, completed, failed }),
      life: failed > 0 ? 5000 : 3000
    })
    return failed
  }

  // 批量删除确认弹窗
  const deleteDialogOpen = ref(false)
  // 确认框内「记住此操作」勾选状态，勾选后下次删除不再弹窗
  const rememberDeleteChoice = ref(false)

  const handleToolbarAction = async (action: string) => {
    // 回收站：恢复 / 彻底删除
    if (action === 'restore') {
      if (selectedItems.value.length === 0) return
      await runGroupedBatchOperation(
        t('tabs.mediaTabListView.restoreBatchLabel'),
        (libraryId, fileIds) => appService.batchRestoreFiles(libraryId, fileIds)
      )

      homeController.selectedItems.value = []
      await handleRefresh()
      return
    }

    if (action === 'purge') {
      if (selectedItems.value.length === 0) return
      await runGroupedBatchOperation(
        t('tabs.mediaTabListView.purgeBatchLabel'),
        (libraryId, fileIds) => appService.batchDeleteFiles(libraryId, fileIds, false)
      )

      homeController.selectedItems.value = []
      await handleRefresh()
      return
    }

    if (action === 'delete') {
      // 批量删除前需用户确认（已记住选择时直接执行）
      if (selectedItems.value.length === 0) return
      if (getLibraryPrefs().skipDeleteConfirm) {
        void confirmDelete()
        return
      }
      rememberDeleteChoice.value = false
      deleteDialogOpen.value = true
      return
    }
    homeController.handleToolbarAction(action)
  }

  const handleDeleteKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Delete' || selectedItems.value.length === 0) return

    const activeElement = document.activeElement
    const selectionBox = activeElement instanceof HTMLElement
      ? activeElement.closest('.selection-container')
      : null
    if (!selectionBox || !rootEl()?.contains(selectionBox)) return

    event.preventDefault()
    event.stopImmediatePropagation()
    void handleToolbarAction('delete')
  }

  const confirmDelete = async () => {
    deleteDialogOpen.value = false
    if (rememberDeleteChoice.value) {
      rememberDeleteChoice.value = false
      await saveSkipDeleteConfirm(true)
    }
    if (selectedItems.value.length === 0) return
    const failed = await runGroupedBatchOperation(
      t('tabs.mediaTabListView.deleteBatchLabel'),
      (libraryId, fileIds) => appService.batchDeleteFiles(libraryId, fileIds)
    )
    if (failed > 0) console.error(`删除失败: ${failed} 个文件`)
    homeController.selectedItems.value = []
    await handleRefresh()
  }

  return {
    handleToolbarAction,
    handleDeleteKeyDown,
    deleteDialogOpen,
    rememberDeleteChoice,
    confirmDelete
  }
}
