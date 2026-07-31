import { ref, computed, watch, nextTick } from 'vue'
import { useServerListStore } from '@renderer/stores/serverList'
import { useLibraryStore } from '@renderer/stores/library'
import { useToast } from '@/renderer/composables/useToast'
import type { Props, Emits } from './types'
import { useUploadQueue } from './useUploadQueue'
import { useFileManagement } from './useFileManagement'
import { useFolderTagPanel } from './useFolderTagPanel'

export function useFileUploadDialog(props: Props, emit: Emits) {
  const toast = useToast()
  const serverListStore = useServerListStore()
  const libraryStore = useLibraryStore()

  const fileManagement = useFileManagement()
  const uploadQueue = useUploadQueue()
  const folderTagPanel = useFolderTagPanel()

  const selectedLibraryId = ref<string>('')
  const isInitialized = ref(false)

  const isVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value as boolean)
  })

  const libraryOptions = computed(() =>
    libraryStore.libraries.map((lib) => ({ id: lib.id, name: lib.name, path: lib.path }))
  )

  const currentLibrary = computed(() =>
    libraryStore.libraries.find((lib) => lib.id === selectedLibraryId.value)
  )

  // 对话框打开时初始化
  watch(isVisible, async (visible) => {
    if (!visible) return

    if (!isInitialized.value) {
      await nextTick()
      try {
        await serverListStore.initializeServerList()
        await libraryStore.fetchLibraries()
        if (libraryStore.libraries.length > 0) {
          selectedLibraryId.value = libraryStore.currentLibrary?.id || libraryStore.libraries[0].id
          await folderTagPanel.loadFoldersAndTags(selectedLibraryId.value)
        }
        isInitialized.value = true
      } catch (error) {
        console.error('初始化文件上传对话框失败:', error)
      }
    }

    // 每次打开都根据最新 props 重置目标选择，避免上次打开残留的文件夹/标签被错误地带入本次上传
    folderTagPanel.selectedTargetFolderId.value = props.initialFolderId
    folderTagPanel.selectedTargetTagIds.value = props.initialTagIds ? [...props.initialTagIds] : []
    if (props.initialFiles && props.initialFiles.length > 0) {
      fileManagement.addFiles(
        props.initialFiles,
        folderTagPanel.selectedTargetFolderId.value,
        folderTagPanel.selectedTargetTagIds.value
      )
    }
  })

  // 素材库变化时重新加载
  watch(selectedLibraryId, async (newId) => {
    if (newId && isInitialized.value) {
      await folderTagPanel.loadFoldersAndTags(newId)
    }
  })

  // 选中文件变化时更新右侧面板
  watch(
    () => [...fileManagement.selectedPendingIds.value],
    (newIds) => updateRightPanelFromSelection(newIds)
  )

  function handleOpenChange(open: boolean) {
    if (!open) isVisible.value = false
  }

  function handleLibrarySelectChange(value: string) {
    selectedLibraryId.value = value
  }

  function triggerFileSelect(fileInputRef: HTMLInputElement | undefined) {
    fileInputRef?.click()
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files) {
      fileManagement.addFiles(
        Array.from(target.files),
        folderTagPanel.selectedTargetFolderId.value,
        folderTagPanel.selectedTargetTagIds.value
      )
    }
    target.value = ''
  }

  function handleDrop(event: DragEvent) {
    fileManagement.isDragOver.value = false
    if (event.dataTransfer?.files) {
      fileManagement.addFiles(
        Array.from(event.dataTransfer.files),
        folderTagPanel.selectedTargetFolderId.value,
        folderTagPanel.selectedTargetTagIds.value
      )
    }
  }

  function clearSelection() {
    fileManagement.selectedPendingIds.value = []
    folderTagPanel.clearTargetSelection()
  }

  function updateRightPanelFromSelection(ids: string[]) {
    if (ids.length === 0) {
      folderTagPanel.clearTargetSelection()
      return
    }
    const firstFile = fileManagement.pendingFiles.value.find((f) => f.id === ids[0])
    if (firstFile) {
      folderTagPanel.selectedTargetFolderId.value = firstFile.folderId
      folderTagPanel.selectedTargetTagIds.value = firstFile.tags ? [...firstFile.tags] : []
    }
  }

  function startUpload() {
    if (!currentLibrary.value) {
      toast.add({ severity: 'error', summary: '错误', detail: '请先选择一个素材库', life: 3000 })
      return
    }
    if (fileManagement.pendingFiles.value.length === 0) {
      toast.add({ severity: 'warn', summary: '提示', detail: '没有待上传的文件', life: 3000 })
      return
    }

    const filesToUpload = [...fileManagement.pendingFiles.value]
    uploadQueue.enqueueFiles(filesToUpload, currentLibrary.value.id, (id) =>
      fileManagement.removePendingFile(id)
    )

    const stopWatch = watch(
      () => uploadQueue.uploadingFileIds.value.size,
      (size) => {
        if (size === 0) {
          stopWatch()
          isVisible.value = false
        }
      }
    )
  }

  return {
    isVisible,
    selectedLibraryId,
    isInitialized,
    libraryOptions,
    currentLibrary,
    fileManagement,
    uploadQueue,
    folderTagPanel,
    handleOpenChange,
    handleLibrarySelectChange,
    triggerFileSelect,
    handleFileSelect,
    handleDrop,
    clearSelection,
    startUpload
  }
}
