import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import type { LocalFileEntry, LocalFsNode } from '@/shared/types'

export function useLocalFileActions(deps: {
  libraryId: () => string | undefined
  currentPath: () => string
  selectedPaths: () => string[]
  setSelectedPaths: (paths: string[]) => void
  loadDirectory: (targetPath?: string) => Promise<boolean>
}) {
  const { t } = useI18n()
  const api = computed(() => window.electronAPI?.fs)

  const pickerOpen = ref(false)
  const pickerOperation = ref<'copy' | 'move'>('copy')
  const pickerSources = ref<string[]>([])
  const uploadDialogOpen = ref(false)
  const uploadInitialTree = ref<{ rootPath: string, tree: LocalFsNode[] }>()

  async function importFiles(files: LocalFileEntry[]) {
    const libraryId = deps.libraryId()
    if (!libraryId) {
      toast.error(t('views.localFolder.noLibrary'))
      return
    }
    if (!files.length) return
    const id = toast.loading(t('views.localFolder.importing', { count: files.length }))
    let imported = 0
    try {
      for (const entry of files) {
        const result = await api.value?.readFileBytes(entry.path)
        if (!result?.success || !result.data) throw new Error(result?.message || t('views.localFolder.readFailed'))
        const file = new window.File([new Uint8Array(result.data)], entry.name)
        await miraSDKService.uploadFile(file, libraryId)
        imported++
      }
      toast.success(t('views.localFolder.importComplete', { count: imported }), { id })
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : t('views.localFolder.importFailed'), { id })
    }
  }

  function openImportTo(entries: LocalFileEntry[]) {
    const files = entries.filter((entry) => !entry.isDirectory)
    if (!files.length) return
    uploadInitialTree.value = {
      rootPath: deps.currentPath(),
      tree: files.map((entry) => ({
        name: entry.name,
        path: entry.path,
        isDir: false,
        size: entry.size,
        ext: entry.extension,
      })),
    }
    uploadDialogOpen.value = true
  }

  function showPicker(operation: 'copy' | 'move', paths: string[]) {
    pickerOperation.value = operation
    pickerSources.value = paths
    pickerOpen.value = true
  }

  async function handlePickerConfirm(paths: string[]) {
    const destination = paths[0]
    if (!destination) return
    const method = pickerOperation.value === 'copy' ? api.value?.copyEntries : api.value?.moveEntries
    const result = await method?.(pickerSources.value, destination)
    if (!result?.success) {
      toast.error(result?.message || t(`views.localFolder.${pickerOperation.value}Failed`))
      return
    }
    toast.success(t(`views.localFolder.${pickerOperation.value}Complete`))
    await deps.loadDirectory()
  }

  async function removeEntries(paths: string[]) {
    if (!paths.length || !window.confirm(t('views.localFolder.deleteConfirm', { count: paths.length }))) return
    const result = await api.value?.removeEntries(paths)
    if (!result?.success) {
      toast.error(result?.message || t('views.localFolder.deleteFailed'))
      return
    }
    toast.success(t('views.localFolder.deleteComplete'))
    await deps.loadDirectory()
  }

  function locate(entry: LocalFileEntry) {
    api.value?.showItemInFolder(entry.path)
  }

  function dragPathsFor(entry: LocalFileEntry) {
    return deps.selectedPaths().includes(entry.path) ? [...deps.selectedPaths()] : [entry.path]
  }

  function handleDragStart(entry: LocalFileEntry, event: DragEvent) {
    const paths = dragPathsFor(entry)
    deps.setSelectedPaths(paths)
    ;(window as any).__miraLocalDragPaths = paths
    event.dataTransfer?.setData('application/x-mira-local-paths', JSON.stringify(paths))
    event.dataTransfer?.setData('text/plain', paths.join('\n'))
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove'
    void window.electronAPI?.dragDrop?.startDragMultiple(paths)
  }

  function handleDragEnd() {
    window.setTimeout(() => { (window as any).__miraLocalDragPaths = [] }, 0)
  }

  async function handleFolderDrop(folder: LocalFileEntry, event: DragEvent) {
    if (!folder.isDirectory) return
    const raw = event.dataTransfer?.getData('application/x-mira-local-paths')
    let paths = ((window as any).__miraLocalDragPaths || []) as string[]
    if (raw) {
      try { paths = JSON.parse(raw) } catch { /* use renderer drag cache */ }
    }
    if (!paths.length) return
    const result = await api.value?.moveEntries(paths, folder.path)
    if (!result?.success) {
      toast.error(result?.message || t('views.localFolder.moveFailed'))
      return
    }
    toast.success(t('views.localFolder.moveComplete'))
    await deps.loadDirectory()
  }

  return {
    pickerOpen,
    uploadDialogOpen,
    uploadInitialTree,
    importFiles,
    openImportTo,
    showPicker,
    handlePickerConfirm,
    removeEntries,
    locate,
    dragPathsFor,
    handleDragStart,
    handleDragEnd,
    handleFolderDrop,
  }
}
