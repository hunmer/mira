import { ref, computed } from 'vue'
import type { FileInfo } from '../../../../../shared/types'
import type { MenuItem } from '@/components/ui/volt/types'
import { appService } from '@renderer/services'
import { useLibraryStore } from '@renderer/stores/library'

interface UseContextMenuEmits {
  (e: 'media-context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'media-info', item: FileInfo): void
  (e: 'media-set-folder', item: FileInfo): void
  (e: 'media-set-tags', item: FileInfo): void
  (e: 'media-delete', item: FileInfo): void
}

export function useContextMenu(emit: UseContextMenuEmits) {
  const currentContextItem = ref<FileInfo | null>(null)

  const runWithCurrentItem = async (handler: (item: FileInfo) => void | Promise<void>) => {
    const item = currentContextItem.value
    if (!item) {
      console.warn('Context menu command ignored: no current media item')
      return
    }

    await handler(item)
  }

  const contextMenuItems = computed((): MenuItem[] => [
    {
      label: '查看信息',
      shortcut: 'Ctrl+I',
      command: () => runWithCurrentItem(async (item) => {
        emit('media-info', item)
      })
    },
    {
      separator: true
    },
    {
      label: '设置文件夹',
      shortcut: 'Ctrl+M',
      command: () => runWithCurrentItem((item) => {
        emit('media-set-folder', item)
      })
    },
    {
      label: '设置标签',
      shortcut: 'Ctrl+T',
      command: () => runWithCurrentItem((item) => {
        emit('media-set-tags', item)
      })
    },
    {
      separator: true
    },
    {
      label: '删除',
      shortcut: 'Delete',
      command: () => runWithCurrentItem(async (item) => {
        const libraryStore = useLibraryStore()
        const libraryId = item.libraryId || libraryStore.currentLibrary?.id
        if (!libraryId) {
          console.error('无法确定 libraryId')
          return
        }

        try {
          await appService.deleteFile(libraryId, item.id)
          emit('media-delete', item)
        } catch (err) {
          console.error('删除文件失败:', err)
        }
      })
    }
  ])

  const handleContextMenu = (item: FileInfo, event: MouseEvent) => {
    currentContextItem.value = item
    emit('media-context-menu', item, event)
  }

  return {
    currentContextItem,
    contextMenuItems,
    handleContextMenu
  }
}
