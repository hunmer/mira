import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useServerListStore } from '@renderer/stores/serverList'
import { useLibraryStore } from '@renderer/stores/library'
import { useToast } from '@/renderer/composables/useToast'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import type { Props, Emits, LocalFsNode } from './types'
import { useUploadQueue } from './useUploadQueue'
import { useFileManagement } from './useFileManagement'
import { useFolderTagPanel } from './useFolderTagPanel'
import { useLocalTree } from './useLocalTree'
import { useFileFilters } from './useFileFilters'

export function useFileUploadDialog(props: Props, emit: Emits) {
  const toast = useToast()
  const { t } = useI18n()
  const serverListStore = useServerListStore()
  const libraryStore = useLibraryStore()

  const fileManagement = useFileManagement()
  const uploadQueue = useUploadQueue()
  const folderTagPanel = useFolderTagPanel()
  const localTree = useLocalTree(fileManagement.pendingFiles)
  const fileFilters = useFileFilters(fileManagement.pendingFiles)

  const selectedLibraryId = ref<string>('')
  const isInitialized = ref(false)
  const isReadingClipboard = ref(false)
  // “按原有结构导入”进行中（创建服务器文件夹 + 应用到文件）
  const isImportingStructure = ref(false)

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

    // 处理导入的本地文件夹树：清空旧的本地文件，重新入列
    // 注意：保留之前手动添加的文件会与“每次打开一个导入批次”的语义冲突，故每次打开重置本地来源文件
    if (props.initialLocalTree && props.initialLocalTree.tree.length > 0) {
      localTree.setLocalTree(props.initialLocalTree.rootPath, props.initialLocalTree.tree)
      // 移除上一批本地来源的待上传文件（保留手动添加的非本地文件）
      fileManagement.pendingFiles.value = fileManagement.pendingFiles.value.filter((f) => !f.localPath)
      fileManagement.addLocalFiles(props.initialLocalTree.tree)
    } else {
      // 未传入本地树：清空本地树状态并移除残留的本地来源文件
      localTree.clearLocalTree()
      fileManagement.pendingFiles.value = fileManagement.pendingFiles.value.filter((f) => !f.localPath)
    }
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

  function addClipboardFiles(files: File[]) {
    if (files.length === 0) return
    fileManagement.addFiles(
      files,
      folderTagPanel.selectedTargetFolderId.value,
      folderTagPanel.selectedTargetTagIds.value
    )
  }

  function handleClipboardPaste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.files || [])
    if (files.length === 0) return
    event.preventDefault()
    addClipboardFiles(files)
  }

  async function importFromClipboard() {
    if (isReadingClipboard.value) return

    isReadingClipboard.value = true
    try {
      const nativeResult = await window.electronAPI.invoke('clipboard:readFiles')
      if (nativeResult?.success === false) throw new Error(nativeResult.message)
      if (nativeResult?.data?.length > 0) {
        fileManagement.addLocalFiles(
          nativeResult.data,
          undefined,
          folderTagPanel.selectedTargetFolderId.value,
          folderTagPanel.selectedTargetTagIds.value
        )
        return
      }

      if (!navigator.clipboard?.read) {
        toast.add({
          severity: 'warn',
          summary: t('business.uploadDialog.hintTitle'),
          detail: t('business.fileUploadDialog.clipboardUnavailable'),
          life: 3000
        })
        return
      }
      const clipboardItems = await navigator.clipboard.read()
      const files: File[] = []
      for (const item of clipboardItems) {
        const type = item.types.find((value) => !value.startsWith('text/'))
        if (!type) continue
        const blob = await item.getType(type)
        const extension = type.split('/')[1]?.split('+')[0] || 'bin'
        const name = blob instanceof File && blob.name
          ? blob.name
          : `clipboard-${Date.now()}-${files.length + 1}.${extension}`
        files.push(new File([blob], name, { type: blob.type || type, lastModified: Date.now() }))
      }

      if (files.length === 0) {
        toast.add({
          severity: 'warn',
          summary: t('business.uploadDialog.hintTitle'),
          detail: t('business.fileUploadDialog.clipboardEmpty'),
          life: 3000
        })
        return
      }
      addClipboardFiles(files)
    } catch (error) {
      console.error('从剪切板导入文件失败:', error)
      toast.add({
        severity: 'error',
        summary: t('business.uploadDialog.errorTitle'),
        detail: t('business.fileUploadDialog.clipboardReadFailed'),
        life: 3000
      })
    } finally {
      isReadingClipboard.value = false
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

  /**
   * 按原有本地目录结构导入：
   * 在当前素材库下按层级创建服务器文件夹（保留多层级父子关系），
   * 并把每个待上传文件的 folderId 设置为其所属本地目录对应的服务器文件夹。
   * 完成后刷新右侧面板，使文件夹徽标正确显示名称。
   */
  async function importWithStructure() {
    if (isImportingStructure.value) return
    if (!currentLibrary.value) {
      toast.add({ severity: 'error', summary: t('business.uploadDialog.errorTitle'), detail: t('business.uploadDialog.selectLibraryFirst'), life: 3000 })
      return
    }
    const tree = localTree.localTree.value
    if (!tree || tree.length === 0) {
      toast.add({ severity: 'warn', summary: t('business.uploadDialog.hintTitle'), detail: t('business.uploadDialog.noStructureToImport'), life: 3000 })
      return
    }

    isImportingStructure.value = true
    const libraryId = currentLibrary.value.id
    // 预加载现有文件夹，尽量复用同名同级文件夹避免重复创建
    const existing = new Map<string, number>() // key: `${parentId}:${title}` -> folderId
    try {
      const foldersData = (await miraSDKService.getAllFolders(libraryId)) || []
      for (const f of foldersData) {
        existing.set(`${f.parent_id ?? 0}:${f.title}`, f.id)
      }
    } catch (e) {
      console.warn('加载现有文件夹失败，将全部新建:', e)
    }

    // 广度优先：按层级创建，确保父文件夹 id 先就绪
    // localDirPath -> serverFolderId
    const pathToServerId = new Map<string, number>()
    // 队列：{ node, parentServerId }
    type QItem = { node: LocalFsNode; parentServerId: number | undefined }
    const queue: QItem[] = tree.filter((n) => n.isDir).map((node) => ({ node, parentServerId: undefined }))
    try {
      while (queue.length > 0) {
        const { node, parentServerId } = queue.shift()!
        const key = `${parentServerId ?? 0}:${node.name}`
        let serverId: number | undefined = pathToServerId.get(node.path) ?? existing.get(key)
        if (serverId === undefined) {
          const result = await miraSDKService.createFolder(libraryId, node.name, parentServerId)
          serverId = typeof result === 'object' ? result?.id : result
        }
        if (serverId === undefined || serverId === null) {
          throw new Error(t('business.uploadDialog.createFolderFailedWithName', { name: node.name }))
        }
        pathToServerId.set(node.path, serverId)
        existing.set(`${parentServerId ?? 0}:${node.name}`, serverId)
        // 子目录入队
        for (const child of node.children || []) {
          if (child.isDir) queue.push({ node: child, parentServerId: serverId })
        }
      }
    } catch (error) {
      isImportingStructure.value = false
      console.error('按结构导入失败:', error)
      toast.add({
        severity: 'error',
        summary: t('business.uploadDialog.importFailedTitle'),
        detail: error instanceof Error ? error.message : t('business.uploadDialog.createFolderFailed'),
        life: 5000
      })
      return
    }

    // 将每个待上传文件归属到其本地目录对应的服务器文件夹
    let applied = 0
    for (const pf of fileManagement.pendingFiles.value) {
      if (pf.localDirPath) {
        const sid = pathToServerId.get(pf.localDirPath)
        if (sid !== undefined) {
          pf.folderId = String(sid)
          applied++
        }
      }
    }

    // 刷新右侧面板，使文件夹徽标显示真实名称
    await folderTagPanel.loadFoldersAndTags(libraryId)

    isImportingStructure.value = false
    toast.add({
      severity: 'success',
      summary: t('business.uploadDialog.structureAppliedTitle'),
      detail: t('business.uploadDialog.structureAppliedDetail', { count: applied }),
      life: 3000
    })
  }

  function startUpload(options?: { skipSameName?: boolean; enableHash?: boolean }) {
    if (!currentLibrary.value) {
      toast.add({ severity: 'error', summary: t('business.uploadDialog.errorTitle'), detail: t('business.uploadDialog.selectLibraryFirst'), life: 3000 })
      return
    }
    if (fileManagement.pendingFiles.value.length === 0) {
      toast.add({ severity: 'warn', summary: t('business.uploadDialog.hintTitle'), detail: t('business.uploadDialog.noFilesToUpload'), life: 3000 })
      return
    }

    const filesToUpload = [...fileManagement.pendingFiles.value]
    uploadQueue.enqueueFiles(filesToUpload, currentLibrary.value.id, (id) =>
      fileManagement.removePendingFile(id)
    , options)

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
    localTree,
    fileFilters,
    handleOpenChange,
    handleLibrarySelectChange,
    triggerFileSelect,
    handleFileSelect,
    handleDrop,
    handleClipboardPaste,
    importFromClipboard,
    isReadingClipboard,
    clearSelection,
    importWithStructure,
    isImportingStructure,
    startUpload
  }
}
