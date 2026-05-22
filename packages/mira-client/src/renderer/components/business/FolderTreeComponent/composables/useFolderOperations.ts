import { computed, ref } from 'vue'
import type { FolderItem } from '@renderer/types/components'
import type { MenuItem } from '@/components/ui/volt/types'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'

export type ContextType = 'folder' | 'tag'
type OperationType = 'add' | 'addSub' | 'edit' | 'move' | 'clone' | 'delete'

export interface FolderOperationsEmits {
  'folder-add': (parentFolder?: FolderItem) => void
  'folder-edit': (folder: FolderItem) => void
  'folder-move': (folder: FolderItem) => void
  'folder-clone': (folder: FolderItem) => void
  'folder-delete': (folder: FolderItem) => void
  'refresh-folders': () => void
  'tag-add': (parentTag?: any) => void
  'tag-edit': (tag: any) => void
  'tag-move': (tag: any) => void
  'tag-clone': (tag: any) => void
  'tag-delete': (tag: any) => void
  'refresh-tags': () => void
}

export function useFolderOperations(emit: FolderOperationsEmits) {
  const libraryStore = useLibraryStore()

  const currentContextFolder = ref<FolderItem | null>(null)
  const currentContextTag = ref<any | null>(null)

  // 编辑对话框
  const showEditDialog = ref(false)
  const editingItem = ref<any | null>(null)
  const editingParentItem = ref<any | null>(null)
  const editingItemType = ref<ContextType>('folder')
  const dialogTitle = computed(() => {
    const itemTypeName = editingItemType.value === 'folder' ? '文件夹' : '标签'
    if (editingItem.value) return `编辑${itemTypeName}`
    if (editingParentItem.value) {
      const subItemName = editingItemType.value === 'folder' ? '子文件夹' : '子标签'
      return `添加${subItemName}`
    }
    return `添加${itemTypeName}`
  })

  // 移动对话框
  const showMoveDialog = ref(false)
  const movingItem = ref<any | null>(null)
  const movingItemType = ref<ContextType>('folder')

  // 删除确认对话框
  const showDeleteDialog = ref(false)
  const deletingItem = ref<any | null>(null)
  const deletingType = ref<ContextType>('folder')
  const deleteWithFiles = ref(false)

  function createContextMenuItems(type: ContextType): MenuItem[] {
    const isFolder = type === 'folder'
    const currentItem = isFolder ? currentContextFolder.value : currentContextTag.value
    const itemLabel = isFolder ? '文件夹' : '标签'
    const subItemLabel = isFolder ? '子文件夹' : '子标签'

    return [
      {
        label: `添加${itemLabel}`,
        icon: 'add',
        command: () => handleItemOperation('add', type),
      },
      {
        label: `添加${subItemLabel}`,
        icon: isFolder ? 'create_new_folder' : 'label',
        command: () => handleItemOperation('addSub', type),
        disabled: !currentItem,
      },
      { separator: true },
      {
        label: '编辑',
        icon: 'edit',
        command: () => handleItemOperation('edit', type),
        disabled: !currentItem,
      },
      {
        label: '移动',
        icon: 'drive_file_move',
        command: () => handleItemOperation('move', type),
        disabled: !currentItem,
      },
      {
        label: '克隆',
        icon: 'content_copy',
        command: () => handleItemOperation('clone', type),
        disabled: !currentItem,
      },
      { separator: true },
      {
        label: '删除',
        icon: 'delete',
        command: () => handleItemOperation('delete', type),
        disabled: !currentItem,
        class: 'text-red-600',
      },
    ]
  }

  const folderContextMenuItems = computed((): MenuItem[] => createContextMenuItems('folder'))
  const tagContextMenuItems = computed((): MenuItem[] => createContextMenuItems('tag'))

  async function handleItemOperation(operation: OperationType, type: ContextType) {
    const currentItem = type === 'folder' ? currentContextFolder.value : currentContextTag.value
    switch (operation) {
      case 'add': handleAdd(type); break
      case 'addSub': handleAddSub(type, currentItem); break
      case 'edit': handleEdit(type, currentItem); break
      case 'move': handleMove(type, currentItem); break
      case 'clone': await handleClone(type, currentItem); break
      case 'delete': await handleDelete(type, currentItem); break
    }
  }

  function handleAdd(type: ContextType) {
    editingItem.value = null
    editingParentItem.value = null
    editingItemType.value = type
    showEditDialog.value = true
  }

  function handleAddSub(type: ContextType, currentItem: any) {
    if (!currentItem) return
    editingItem.value = null
    editingItemType.value = type
    if (type === 'folder') {
      const parentFolderData = currentItem as FolderItem
      editingParentItem.value = {
        ...parentFolderData,
        id: parentFolderData.id,
        label: parentFolderData.label,
        title: parentFolderData.label,
        parent_id: (parentFolderData as any).data?.parent_id,
      } as any
    } else {
      editingParentItem.value = { ...currentItem, type: 'tag' }
    }
    showEditDialog.value = true
  }

  function handleEdit(type: ContextType, currentItem: any) {
    if (!currentItem) return
    editingItem.value = currentItem
    editingParentItem.value = null
    editingItemType.value = type
    showEditDialog.value = true
  }

  function handleMove(type: ContextType, currentItem: any) {
    if (!currentItem) return
    movingItem.value = currentItem
    movingItemType.value = type
    showMoveDialog.value = true
  }

  async function handleClone(type: ContextType, currentItem: any) {
    if (!currentItem || !libraryStore.currentLibrary) return
    try {
      const libraryId = libraryStore.currentLibrary.id
      if (type === 'folder') {
        const folder = currentItem as FolderItem
        const folderData = (folder as any).data || folder
        const result = await miraSDKService.cloneFolder(
          libraryId, parseInt(folder.id), `${folder.label} (副本)`, folderData.parent_id,
        )
        if (result) {
          emit['folder-clone'](folder)
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-folders']()
        }
      } else {
        const tag = currentItem
        const result = await miraSDKService.createTag(
          libraryId, `${tag.name || tag.title || tag.label} (副本)`, tag.color, tag.description,
        )
        if (result) {
          emit['tag-clone'](tag)
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-tags']()
        }
      }
    } catch (error) {
      console.error(`Failed to clone ${type}:`, error)
      type === 'folder' ? emit['refresh-folders']() : emit['refresh-tags']()
    }
  }

  function handleDelete(type: ContextType, currentItem: any) {
    if (!currentItem || !libraryStore.currentLibrary) return
    deletingType.value = type
    deletingItem.value = currentItem
    deleteWithFiles.value = false
    showDeleteDialog.value = true
  }

  async function confirmDelete() {
    const type = deletingType.value
    const currentItem = deletingItem.value
    if (!currentItem || !libraryStore.currentLibrary) return
    showDeleteDialog.value = false

    try {
      const libraryId = libraryStore.currentLibrary.id
      if (type === 'folder') {
        await miraSDKService.deleteFolder(libraryId, parseInt((currentItem as FolderItem).id), deleteWithFiles.value)
        emit['folder-delete'](currentItem)
        await new Promise(resolve => setTimeout(resolve, 100))
        emit['refresh-folders']()
      } else {
        await miraSDKService.deleteTag(libraryId, currentItem.id)
        emit['tag-delete'](currentItem)
        await new Promise(resolve => setTimeout(resolve, 100))
        emit['refresh-tags']()
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error)
      type === 'folder' ? emit['refresh-folders']() : emit['refresh-tags']()
    }
  }

  function handleEditDialogClose() {
    showEditDialog.value = false
    editingItem.value = null
    editingParentItem.value = null
    editingItemType.value = 'folder'
  }

  function handleMoveDialogClose() {
    showMoveDialog.value = false
    movingItem.value = null
    movingItemType.value = 'folder'
  }

  async function handleItemMove(data: { folderId: string; newParentId?: number }) {
    if (!libraryStore.currentLibrary || !movingItem.value) return
    try {
      const libraryId = libraryStore.currentLibrary.id
      const itemType = movingItemType.value
      if (itemType === 'folder') {
        await miraSDKService.moveFolder(libraryId, parseInt(data.folderId), data.newParentId || null)
        emit['folder-move'](movingItem.value)
        await new Promise(resolve => setTimeout(resolve, 100))
        emit['refresh-folders']()
      } else {
        emit['tag-move'](movingItem.value)
        await new Promise(resolve => setTimeout(resolve, 100))
        emit['refresh-tags']()
      }
      handleMoveDialogClose()
    } catch (error) {
      console.error(`Failed to move ${movingItemType.value}:`, error)
      movingItemType.value === 'folder' ? emit['refresh-folders']() : emit['refresh-tags']()
    }
  }

  async function handleItemSave(data: {
    title: string
    parentId?: number
    color?: number
    description?: string
  }) {
    if (!libraryStore.currentLibrary) return
    const itemType = editingItemType.value
    try {
      const libraryId = libraryStore.currentLibrary.id

      if (editingItem.value) {
        if (itemType === 'folder') {
          await miraSDKService.updateFolder(libraryId, parseInt(editingItem.value.id), {
            title: data.title, parent_id: data.parentId, color: data.color, description: data.description,
          })
          emit['folder-edit'](editingItem.value)
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-folders']()
        } else {
          await miraSDKService.updateTag(libraryId, editingItem.value.id, {
            name: data.title, color: data.color, description: data.description,
          })
          emit['tag-edit'](editingItem.value)
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-tags']()
        }
      } else {
        if (itemType === 'folder') {
          await miraSDKService.createFolder(
            libraryId, data.title, data.parentId, data.color, data.description,
          )
          if (editingParentItem.value) emit['folder-add'](editingParentItem.value)
          else emit['folder-add']()
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-folders']()
        } else {
          await miraSDKService.createTag(
            libraryId, data.title, data.color, data.description,
          )
          if (editingParentItem.value) emit['tag-add'](editingParentItem.value)
          else emit['tag-add']()
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-tags']()
        }
      }
      handleEditDialogClose()
    } catch (error) {
      console.error(`Failed to save ${itemType}:`, error)
      itemType === 'folder' ? emit['refresh-folders']() : emit['refresh-tags']()
    }
  }

  return {
    currentContextFolder,
    currentContextTag,
    showEditDialog,
    editingItem,
    editingParentItem,
    editingItemType,
    dialogTitle,
    showMoveDialog,
    movingItem,
    movingItemType,
    showDeleteDialog,
    deletingItem,
    deletingType,
    deleteWithFiles,
    folderContextMenuItems,
    tagContextMenuItems,
    handleItemOperation,
    handleAdd,
    handleEditDialogClose,
    handleMoveDialogClose,
    confirmDelete,
    handleItemMove,
    handleItemSave,
  }
}
