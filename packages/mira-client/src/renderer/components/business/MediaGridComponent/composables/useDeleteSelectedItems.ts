import { ref } from 'vue'
import type { FileInfo } from '../../../../../shared/types'
import { appService } from '../../../../services'
import { useLibraryStore } from '../../../../stores/library'
import { runBatchOperation } from '../../../../composables/useBatchOperation'

interface UseDeleteSelectedItemsProps {
  items: FileInfo[]
  selectedItems: string[]
}

interface UseDeleteSelectedItemsEmits {
  (e: 'media-select', item: FileInfo, selected: boolean): void
  (e: 'media-delete', item: FileInfo): void
}

interface UseDeleteSelectedItemsOptions {
  isActive?: () => boolean
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  return target.isContentEditable || ['input', 'textarea', 'select'].includes(tagName)
}

export function useDeleteSelectedItems(
  props: UseDeleteSelectedItemsProps,
  emit: UseDeleteSelectedItemsEmits,
  options: UseDeleteSelectedItemsOptions = {}
) {
  const isDeletingSelectedItems = ref(false)

  const deleteSelectedItems = async () => {
    if (isDeletingSelectedItems.value || props.selectedItems.length === 0) return

    const selectedIds = [...new Set(props.selectedItems)]
    const selectedFiles = selectedIds
      .map(id => props.items.find(item => item.id === id))
      .filter((item): item is FileInfo => Boolean(item))

    if (selectedFiles.length === 0) return

    isDeletingSelectedItems.value = true

    try {
      const libraryStore = useLibraryStore()
      const deletedFiles: FileInfo[] = []

      await runBatchOperation(selectedFiles, async (file) => {
        const libraryId = file.libraryId || libraryStore.currentLibrary?.id
        if (!libraryId) throw new Error('缺少库ID')
        await appService.deleteFile(libraryId, file.id)
        deletedFiles.push(file)
      }, { label: '删除' })

      deletedFiles.forEach(file => {
        emit('media-select', file, false)
      })

      if (deletedFiles.length > 0) {
        emit('media-delete', deletedFiles[0])
      }
    } finally {
      isDeletingSelectedItems.value = false
    }
  }

  const canHandleDelete = (target: EventTarget | null) => {
    if (options.isActive && !options.isActive()) return false
    if (props.selectedItems.length === 0) return false
    return !isEditableTarget(target)
  }

  const handleDelete = (event: KeyboardEvent | Event) => {
    const isKeyboardEvent = event instanceof KeyboardEvent
    if (isKeyboardEvent && (event.key !== 'Delete' || event.repeat)) return
    if (!canHandleDelete(isKeyboardEvent ? event.target : null)) return

    event.preventDefault()
    void deleteSelectedItems()
  }

  const handleDeleteKeyDown = (event: KeyboardEvent) => {
    handleDelete(event)
  }

  const handleEditAction = (event: Event) => {
    const detail = (event as CustomEvent).detail
    if (detail?.action !== 'delete') return
    handleDelete(event)
  }

  return {
    handleDeleteKeyDown,
    handleEditAction
  }
}
