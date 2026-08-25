/**
 * Home library management.
 */
import { useLibraryManagement } from '@renderer/composables'
import { resetTabsForLibrary } from '@renderer/composables/useTabs'
import { useServerListStore } from '@renderer/stores/serverList'
import { useLibraryStore } from '@/renderer/stores/library'
import { useFolderStore } from '@renderer/stores/folder'
import { useTagStore } from '@renderer/stores/tag'
import { createTabScopeId } from '@renderer/composables/TabPersistence'
import { watch } from 'vue'
import type { LibraryInfo } from '../../../shared/types'
import type { ServerConfig } from '@renderer/stores/serverList'
import type { Ref } from 'vue'

export function useHomeLibraryManagement(
  showServerManagementDialog: Ref<boolean>,
  showServerEditDialog: Ref<boolean>,
  editingServer: Ref<ServerConfig | null>
) {
  const serverListStore = useServerListStore()
  const libraryStore = useLibraryStore()
  const folderStore = useFolderStore()
  const tagStore = useTagStore()

  const {
    showNoLibraryDialog,
    handleCreateLibrary,
    initializeDefaultLibrary
  } = useLibraryManagement(serverListStore)

  const handleSelectCollection = async (collection: LibraryInfo) => {
    try {
      await libraryStore.setCurrentLibrary(collection)
      await resetTabsForLibrary(createTabScopeId(
        serverListStore.activeServer?.id,
        collection.id,
        serverListStore.activeServer?.serverUrl
      ))
      await Promise.all([
        folderStore.fetchFolders(collection.id),
        tagStore.fetchTags(collection.id)
      ])

      window.dispatchEvent(new CustomEvent('collection-changed', {
        detail: { collection }
      }))

      return true
    } catch (error) {
      console.error('Failed to switch library:', error)
      return false
    }
  }

  const handleEditServer = (server: ServerConfig) => {
    editingServer.value = server
    showServerEditDialog.value = true
    showServerManagementDialog.value = false
  }

  const handleAddServer = () => {
    editingServer.value = null
    showServerEditDialog.value = true
    showServerManagementDialog.value = false
  }

  const handleServerSaved = () => {
    showServerEditDialog.value = false
    editingServer.value = null
  }

  // 编辑框关闭时（取消或保存），回弹到服务器管理对话框
  watch(showServerEditDialog, (visible) => {
    if (!visible) {
      showServerManagementDialog.value = true
    }
  })

  const handleAddLibrary = handleAddServer
  const handleEditLibrary = handleEditServer
  const handleLibrarySaved = handleServerSaved

  return {
    showNoLibraryDialog,

    handleSelectCollection,
    handleEditServer,
    handleAddServer,
    handleServerSaved,
    handleCreateLibrary,
    initializeDefaultLibrary,

    handleAddLibrary,
    handleEditLibrary,
    handleLibrarySaved
  }
}
