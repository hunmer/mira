import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLibraryStore } from '@renderer/stores/library'
import { useMediaStore } from '@renderer/stores/media'
import { useSettingsStore } from '@renderer/stores/settings'
import { useUrlImportStore } from '@renderer/stores/urlImport'
import { useToast } from '@renderer/composables/useToast'
import type { ImportFolderPayload, ImportTarget } from '@renderer/composables/useImportHandler'

/**
 * 拖拽上传 / 导入：根区与文件夹卡片拖放、URL 拖入识别、直接导入模式、上传对话框开关
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabUpload(deps: {
  props: {
    tabId: string
    viewType?: 'files' | 'trash'
    filters?: Record<string, any>
  }
}) {
  const { props } = deps
  const { t } = useI18n()
  const mediaStore = useMediaStore()
  const libraryStore = useLibraryStore()
  const settingsStore = useSettingsStore()
  const urlImportStore = useUrlImportStore()
  const toast = useToast()

  // 拖拽上传
  const canUpload = computed(() =>
    props.viewType !== 'trash'
    && props.tabId !== 'folder-uncategorized'
    && props.tabId !== 'folder-untagged'
  )
  const isDragOver = ref(false)
  const showUploadDialog = ref(false)
  const droppedFiles = ref<File[]>([])
  const uploadInitialTree = ref<ImportFolderPayload | undefined>()
  const uploadFolderId = ref<string>()
  const uploadTagIds = ref<string[]>([])

  function handleListUpload() {
    const target = importTarget.value
    uploadFolderId.value = target.folderId == null ? undefined : String(target.folderId)
    uploadTagIds.value = (target.tagIds || []).map(String)
    droppedFiles.value = []
    uploadInitialTree.value = undefined
    showUploadDialog.value = true
  }

  const importTarget = computed<ImportTarget>(() => {
    const folder = props.filters?.folder
    const tags = props.filters?.tags
    return {
      folderId: folder != null && folder !== '=null' ? String(folder) : undefined,
      tagIds: Array.isArray(tags) ? tags.map(String) : [],
    }
  })

  function handleImportFolder(payload: ImportFolderPayload) {
    uploadFolderId.value = payload.folderId == null ? undefined : String(payload.folderId)
    uploadTagIds.value = (payload.tagIds || []).map(String)
    droppedFiles.value = []
    uploadInitialTree.value = payload
    showUploadDialog.value = true
  }

  const handleDragOver = (_e: DragEvent) => {
    if ((window as any).__miraInternalDrag) return
    isDragOver.value = true
  }

  // 文件夹卡片使用自身的 drop 目标，避免根覆盖层改变拖拽命中区域。
  const handleFolderCardDragOver = (e: DragEvent) => {
    if ((window as any).__miraInternalDrag) return
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    isDragOver.value = false
  }

  const handleFolderCardDragLeave = (_e: DragEvent) => {
    isDragOver.value = false
  }

  const handleDragLeave = (e: DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
      isDragOver.value = false
    }
  }

  const handleDrop = async (e: DragEvent, targetFolderId?: string) => {
    isDragOver.value = false
    if ((window as any).__miraInternalDrag) return

    // 优先识别 http(s) 链接拖入（来自浏览器地址栏/链接的 text/uri-list 或 text/plain）
    if (!e.dataTransfer?.files?.length) {
      const uriList = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || ''
      const urls = uriList.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s))
      if (urls.length > 0) {
        const folder = props.filters?.folder
        const folderIdNum = targetFolderId != null
          ? Number(targetFolderId)
          : (folder != null && Number.isFinite(Number(folder)) ? Number(folder) : null)
        const tags = props.filters?.tags
        urlImportStore.open({ urls, folderId: folderIdNum, tagIds: Array.isArray(tags) ? tags.map(String) : [] })
        return
      }
      return
    }

    const files = Array.from(e.dataTransfer.files)
    const folder = props.filters?.folder
    const folderId = targetFolderId
      || (folder != null && Number.isFinite(Number(folder)) ? String(folder) : undefined)
    const tags = props.filters?.tags
    const tagIds = Array.isArray(tags) ? tags.map(String) : []

    if (settingsStore.settings.directImportMode) {
      const libraryId = libraryStore.currentLibrary?.id
      if (!libraryId) {
        toast.add({ severity: 'error', summary: t('tabs.mediaTabListView.errorSummary'), detail: t('tabs.mediaTabListView.noLibraryDetail'), life: 3000 })
        return
      }
      const metadata: Record<string, any> = {}
      if (folderId) metadata.folderId = folderId
      if (tagIds.length > 0) metadata.tags = tagIds
      for (const file of files) {
        mediaStore.uploadFile(file, libraryId, Object.keys(metadata).length > 0 ? metadata : undefined)
      }
      toast.add({ severity: 'success', summary: t('tabs.mediaTabListView.directImportSummary'), detail: t('tabs.mediaTabListView.uploadingFilesDetail', { count: files.length }), life: 2000 })
      return
    }

    droppedFiles.value = files
    uploadFolderId.value = folderId
    uploadTagIds.value = tagIds
    showUploadDialog.value = true
  }

  return {
    canUpload,
    isDragOver,
    showUploadDialog,
    droppedFiles,
    uploadInitialTree,
    uploadFolderId,
    uploadTagIds,
    importTarget,
    handleListUpload,
    handleImportFolder,
    handleDragOver,
    handleFolderCardDragOver,
    handleFolderCardDragLeave,
    handleDragLeave,
    handleDrop
  }
}
