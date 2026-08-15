import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FolderItem } from '@renderer/types/components'
import type { MenuItem } from '@/renderer/types/menu'
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
  const { t } = useI18n()

  const currentContextFolder = ref<FolderItem | null>(null)
  const currentContextTag = ref<any | null>(null)

  // 编辑对话框
  const showEditDialog = ref(false)
  const editingItem = ref<any | null>(null)
  const editingParentItem = ref<any | null>(null)
  const editingItemType = ref<ContextType>('folder')
  const dialogTitle = computed(() => {
    const isFolder = editingItemType.value === 'folder'
    if (editingItem.value) return isFolder ? t('business.folderOperations.editFolder') : t('business.folderOperations.editTag')
    if (editingParentItem.value) {
      return isFolder ? t('business.folderOperations.addSubFolder') : t('business.folderOperations.addSubTag')
    }
    return isFolder ? t('business.folderOperations.addFolder') : t('business.folderOperations.addTag')
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
    const addItemLabel = isFolder ? t('business.folderOperations.addFolder') : t('business.folderOperations.addTag')
    const addSubItemLabel = isFolder ? t('business.folderOperations.addSubFolder') : t('business.folderOperations.addSubTag')

    return [
      {
        label: addItemLabel,
        command: () => handleItemOperation('add', type),
      },
      {
        label: addSubItemLabel,
        command: () => handleItemOperation('addSub', type),
        disabled: !currentItem,
      },
      { separator: true },
      {
        label: t('business.folderOperations.edit'),
        command: () => handleItemOperation('edit', type),
        disabled: !currentItem,
      },
      {
        label: t('business.folderOperations.move'),
        command: () => handleItemOperation('move', type),
        disabled: !currentItem,
      },
      {
        label: t('business.folderOperations.clone'),
        command: () => handleItemOperation('clone', type),
        disabled: !currentItem,
      },
      { separator: true },
      {
        label: t('business.folderOperations.delete'),
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
          libraryId, parseInt(folder.id), `${folder.label}${t('business.folderOperations.copySuffix')}`, folderData.parent_id,
        )
        if (result) {
          emit['folder-clone'](folder)
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-folders']()
        }
      } else {
        const tag = currentItem
        const result = await miraSDKService.createTag(
          libraryId, `${tag.name || tag.title || tag.label}${t('business.folderOperations.copySuffix')}`, tag.color, tag.description,
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
        const tagId = parseInt(String(currentItem.id).replace(/^tag-/, ''), 10)
        await miraSDKService.deleteTag(libraryId, tagId)
        emit['tag-delete'](currentItem)
        await new Promise(resolve => setTimeout(resolve, 100))
        emit['refresh-tags']()
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error)
      type === 'folder' ? emit['refresh-folders']() : emit['refresh-tags']()
    }
  }

  // 批量删除（多选模式）
  const showBatchDeleteDialog = ref(false)
  const batchDeletingNodes = ref<any[]>([])
  const batchDeletingType = ref<ContextType>('folder')
  const batchDeleteTotalCount = ref(0)
  // 每次成功完成批量删除后自增，供外部 watch 以清理选择
  const batchDeleteCompleted = ref(0)

  function startBatchDelete(type: ContextType, nodes: any[], totalCount: number) {
    if (nodes.length === 0 || !libraryStore.currentLibrary) return
    batchDeletingType.value = type
    batchDeletingNodes.value = nodes
    batchDeleteTotalCount.value = totalCount
    deleteWithFiles.value = false
    showBatchDeleteDialog.value = true
  }

  async function confirmBatchDelete() {
    const type = batchDeletingType.value
    const nodes = batchDeletingNodes.value
    if (nodes.length === 0 || !libraryStore.currentLibrary) return
    showBatchDeleteDialog.value = false

    const libraryId = libraryStore.currentLibrary.id
    let success = 0
    let failed = 0
    for (const node of nodes) {
      try {
        const rawId = String(node.id)
        if (type === 'folder') {
          await miraSDKService.deleteFolder(libraryId, parseInt(rawId), deleteWithFiles.value)
          emit['folder-delete'](node)
        } else {
          await miraSDKService.deleteTag(libraryId, parseInt(rawId.replace('tag-', '')))
          emit['tag-delete'](node)
        }
        success++
      } catch (error) {
        failed++
        console.error(`Failed to delete ${type} ${node.id}:`, error)
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
    type === 'folder' ? emit['refresh-folders']() : emit['refresh-tags']()
    batchDeleteCompleted.value++
    return { success, failed }
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
    icon?: string
    autoOpenTab?: boolean
  }) {
    if (!libraryStore.currentLibrary) return
    const itemType = editingItemType.value
    try {
      const libraryId = libraryStore.currentLibrary.id

      if (editingItem.value) {
        if (itemType === 'folder') {
          await miraSDKService.updateFolder(libraryId, parseInt(editingItem.value.id), {
            title: data.title, parent_id: data.parentId, color: data.color, description: data.description, icon: data.icon,
          })
          emit['folder-edit'](editingItem.value)
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-folders']()
        } else {
          await miraSDKService.updateTag(libraryId, editingItem.value.id, {
            name: data.title, color: data.color, description: data.description, icon: data.icon,
          })
          emit['tag-edit'](editingItem.value)
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-tags']()
        }
      } else {
        if (itemType === 'folder') {
          const result = await miraSDKService.createFolder(
            libraryId, data.title, data.parentId, data.color, data.description, data.icon,
          )
          const folderId = typeof result === 'object' ? result.id : result
          if (editingParentItem.value) emit['folder-add'](editingParentItem.value)
          else emit['folder-add']()
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-folders']()
          if (data.autoOpenTab && result) {
            window.dispatchEvent(new CustomEvent('home-folder-selected', {
              detail: { id: String(folderId), title: data.title, libraryId, color: data.color }
            }))
          }
        } else {
          const result = await miraSDKService.createTag(
            libraryId, data.title, data.color, data.description, data.icon,
          )
          const tagId = typeof result === 'object' ? result.id : result
          if (editingParentItem.value) emit['tag-add'](editingParentItem.value)
          else emit['tag-add']()
          await new Promise(resolve => setTimeout(resolve, 100))
          emit['refresh-tags']()
          if (data.autoOpenTab && result) {
            window.dispatchEvent(new CustomEvent('home-tag-selected', {
              detail: { id: String(tagId), title: data.title, libraryId, color: data.color }
            }))
          }
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
    showBatchDeleteDialog,
    batchDeletingNodes,
    batchDeletingType,
    batchDeleteTotalCount,
    batchDeleteCompleted,
    startBatchDelete,
    confirmBatchDelete,
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
