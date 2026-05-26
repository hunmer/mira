import { ref, computed, watch, toRef } from 'vue'
import type { FileInfo } from '../../../../../shared/types'
import type { MenuItem } from '@/components/ui/volt/types'
import { appService } from '@renderer/services'
import { useLibraryStore } from '@renderer/stores/library'
import { useTagStore } from '@renderer/stores/tag'
import { useFolderStore } from '@renderer/stores/folder'
import { useMediaStore } from '@renderer/stores/media'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { runBatchOperation } from '@renderer/composables/useBatchOperation'

interface UseContextMenuProps {
  selectedItems: string[]
  items: FileInfo[]
}

interface UseContextMenuEmits {
  (e: 'media-context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'media-info', item: FileInfo): void
  (e: 'media-set-folder', item: FileInfo): void
  (e: 'media-set-tags', item: FileInfo): void
  (e: 'media-delete', item: FileInfo): void
}

export function useContextMenu(props: UseContextMenuProps, emit: UseContextMenuEmits) {
  const currentContextItem = ref<FileInfo | null>(null)
  const folderPopoverOpen = ref(false)
  const tagPopoverOpen = ref(false)
  const popoverPosition = ref({ x: 0, y: 0 })
  const tagStore = useTagStore()
  const folderStore = useFolderStore()
  const libraryStore = useLibraryStore()
  const mediaStore = useMediaStore()
  const showDetailSidebar = toRef(mediaStore, 'showDetailSidebar')
  const toggleDetailSidebar = () => mediaStore.toggleDetailSidebar()

  watch([folderPopoverOpen, tagPopoverOpen], ([folderOpen, tagOpen]) => {
    const libId = libraryStore.currentLibrary?.id || 'default'
    if (folderOpen) folderStore.fetchFolders(libId)
    if (tagOpen) tagStore.fetchTags(libId)
  })

  const folderTreeNodes = computed(() =>
    folderStore.folders.map((f: any) => ({
      id: String(f.id),
      label: f.title,
      icon: 'folder',
      count: f.fileCount,
      children: f.children?.map((c: any) => ({
        id: String(c.id),
        label: c.title,
        icon: 'folder',
        count: c.fileCount,
      })),
      originalData: f,
    }))
  )

  const getTargetFiles = (): FileInfo[] => {
    if (props.selectedItems.length <= 1 || !currentContextItem.value) {
      return currentContextItem.value ? [currentContextItem.value] : []
    }
    const idSet = new Set(props.selectedItems)
    return props.items.filter(f => idSet.has(f.id))
  }

  const handleFolderSelect = async (folderItem: any) => {
    const client = (miraSDKService as any).client
    if (!client) return
    const files = getTargetFiles()
    if (files.length === 0) return
    folderPopoverOpen.value = false
    await runBatchOperation(files, async (file) => {
      const libId = file.libraryId || 'default'
      await client.folders().setFileFolder({ libraryId: libId, fileId: parseInt(file.id), folder: parseInt(folderItem.id) })
      file.folderId = String(folderItem.id)
      emit('media-set-folder', file)
    }, { label: '设置文件夹' })
  }

  const handleTagSelect = async (tagData: any) => {
    const client = (miraSDKService as any).client
    if (!client) return
    const tagName = tagData.title || tagData.name
    const files = getTargetFiles()
    if (files.length === 0) return
    tagPopoverOpen.value = false
    await runBatchOperation(files, async (file) => {
      const libId = file.libraryId || 'default'
      await client.tags().addTagsToFile(libId, parseInt(file.id), [tagName])
      if (!file.tags) file.tags = []
      if (!file.tags.includes(tagName)) file.tags.push(tagName)
      emit('media-set-tags', file)
    }, { label: '设置标签' })
  }

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
        mediaStore.setDetailSidebarFiles([item])
        if (!showDetailSidebar.value) toggleDetailSidebar()
      })
    },
    {
      separator: true
    },
    {
      label: props.selectedItems.length > 1 ? `设置文件夹 (${props.selectedItems.length})` : '设置文件夹',
      shortcut: 'Ctrl+M',
      command: () => runWithCurrentItem((item) => {
        setTimeout(() => { folderPopoverOpen.value = true }, 100)
      })
    },
    {
      label: props.selectedItems.length > 1 ? `设置标签 (${props.selectedItems.length})` : '设置标签',
      shortcut: 'Ctrl+T',
      command: () => runWithCurrentItem((item) => {
        setTimeout(() => { tagPopoverOpen.value = true }, 100)
      })
    },
    {
      separator: true
    },
    {
      label: props.selectedItems.length > 1 ? `删除 (${props.selectedItems.length})` : '删除',
      shortcut: 'Delete',
      command: () => runWithCurrentItem(async () => {
        const files = getTargetFiles()
        if (files.length === 0) return
        await runBatchOperation(files, async (file) => {
          const libraryId = file.libraryId || libraryStore.currentLibrary?.id
          if (!libraryId) return
          await appService.deleteFile(libraryId, file.id)
          emit('media-delete', file)
        }, { label: '删除' })
      })
    }
  ])

  const handleContextMenu = (item: FileInfo, event: MouseEvent) => {
    currentContextItem.value = item
    popoverPosition.value = { x: event.clientX, y: event.clientY }
    emit('media-context-menu', item, event)
  }

  return {
    currentContextItem,
    contextMenuItems,
    handleContextMenu,
    folderPopoverOpen,
    tagPopoverOpen,
    popoverPosition,
    folderTreeNodes,
    handleFolderSelect,
    handleTagSelect,
    tagStore,
  }
}
