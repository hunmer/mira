import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLibraryStore } from '@renderer/stores/library'
import { useMediaStore } from '@renderer/stores/media'
import { useUrlImportStore } from '@renderer/stores/urlImport'
import { useToast } from '@renderer/composables/useToast'
import { getLibraryPrefs } from '@renderer/composables/LibraryPrefs'
import { useDirectImport } from '@renderer/composables/useDirectImport'
import type { ImportFolderPayload, ImportTarget } from '@renderer/composables/useImportHandler'

/** 剥离树形 id 前缀（folder-xxx / tag-xxx）并排除空值与 '=null'（未分类/无标签特殊值），返回可用的纯 id 字符串 */
function normalizeSourceId(value: unknown): string | undefined {
  if (value == null || value === '' || value === '=null') return undefined
  const raw = String(value).replace(/^(?:folder|tag)-/, '')
  return raw !== '' && raw !== '=null' ? raw : undefined
}

/** 解析筛选中的目标文件夹 id：优先 folders FilterRule（FilterBar 改动），兼容 folder 简单值（FolderTabType） */
function resolveFolderIdFromFilters(filters: Record<string, any> | undefined): string | undefined {
  const rule = filters?.folders
  if (rule && typeof rule === 'object' && Array.isArray(rule.selectedValues)) {
    const id = normalizeSourceId(rule.selectedValues[0])
    if (id !== undefined) return id
  }
  return normalizeSourceId(filters?.folder)
}

/** 解析筛选中的目标标签 id 列表：兼容 FilterRule 对象（TagTabType/FilterBar，selectedValues）与数组格式 */
function resolveTagIdsFromFilters(filters: Record<string, any> | undefined): string[] {
  const tags = filters?.tags
  const values: unknown[] = Array.isArray(tags)
    ? tags
    : (tags && typeof tags === 'object' && Array.isArray(tags.selectedValues) ? tags.selectedValues : [])
  return values
    .map(v => normalizeSourceId(v))
    .filter((v): v is string => v !== undefined)
}

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
  /** tab 当前生效筛选（含 tab 固有初始筛选与用户 FilterBar 改动）；未传时仅用 props.filters */
  mediaTabData?: { filters: { value: Record<string, any> } }
}) {
  const { props } = deps
  const { t } = useI18n()
  const mediaStore = useMediaStore()
  const libraryStore = useLibraryStore()
  const urlImportStore = useUrlImportStore()
  const toast = useToast()
  // 「导入后二次确定」关闭时的直接导入链路
  const { importLocalTreeDirectly } = useDirectImport()

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

  /** tab 当前生效筛选：tab 固有初始筛选（props.filters）+ 用户 FilterBar 改动（mediaTabData.filters） */
  const currentFilters = computed<Record<string, any>>(() => ({
    ...(props.filters ?? {}),
    ...(deps.mediaTabData?.filters?.value ?? {}),
  }))

  const importTarget = computed<ImportTarget>(() => ({
    folderId: resolveFolderIdFromFilters(currentFilters.value),
    tagIds: resolveTagIdsFromFilters(currentFilters.value),
  }))

  function handleImportFolder(payload: ImportFolderPayload) {
    // 关闭「导入后二次确定」：跳过上传对话框直接导入
    if (!getLibraryPrefs().confirmAfterImport) {
      void importLocalTreeDirectly(payload.tree, payload)
      return
    }
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
        const folder = targetFolderId ?? resolveFolderIdFromFilters(currentFilters.value)
        const folderIdNum = folder != null && Number.isFinite(Number(folder)) ? Number(folder) : null
        const tagIds = resolveTagIdsFromFilters(currentFilters.value)
        urlImportStore.open({ urls, folderId: folderIdNum, tagIds })
        return
      }
      return
    }

    const files = Array.from(e.dataTransfer.files)
    const folderId = targetFolderId || resolveFolderIdFromFilters(currentFilters.value)
    const tagIds = resolveTagIdsFromFilters(currentFilters.value)

    // 关闭「导入后二次确定」：拖入文件直接上传，不打开上传对话框
    if (!getLibraryPrefs().confirmAfterImport) {
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
