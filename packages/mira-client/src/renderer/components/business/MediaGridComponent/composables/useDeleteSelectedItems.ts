import { ref } from 'vue'
import type { FileInfo } from '../../../../../shared/types'
import { appService } from '../../../../services'
import { useLibraryStore } from '../../../../stores/library'

interface UseDeleteSelectedItemsProps {
  items: FileInfo[]
  selectedItems: string[]
}

interface UseDeleteSelectedItemsEmits {
  (e: 'media-select', item: FileInfo, selected: boolean): void
  (e: 'media-delete', item: FileInfo): void
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  return target.isContentEditable || ['input', 'textarea', 'select'].includes(tagName)
}

export function useDeleteSelectedItems(
  props: UseDeleteSelectedItemsProps,
  emit: UseDeleteSelectedItemsEmits
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
      let failed = 0

      for (const file of selectedFiles) {
        const libraryId = file.libraryId || libraryStore.currentLibrary?.id
        if (!libraryId) {
          failed++
          continue
        }

        try {
          await appService.deleteFile(libraryId, file.id)
          deletedFiles.push(file)
        } catch (error) {
          failed++
          console.error('删除文件失败:', file.id, error)
        }
      }

      if (failed > 0) {
        console.error(`删除失败: ${failed} 个文件`)
      }

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

  const handleDeleteKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Delete' || event.repeat || isEditableTarget(event.target)) return
    if (props.selectedItems.length === 0) return

    event.preventDefault()
    void deleteSelectedItems()
  }

  return {
    handleDeleteKeyDown
  }
}
