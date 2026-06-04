/**
 * 素材库管理逻辑 - 处理素材库的选择、创建、编辑等操作
 */
import { useLibraryManagement } from '@renderer/composables'
import { useServerListStore } from '@renderer/stores/serverList'
import { useLibraryStore } from '@/renderer/stores/library'
import { tabPersistence } from '@renderer/composables/TabPersistence'
import type { CollectionInfo } from '@shared/types'
import type { ServerConfig } from '@renderer/stores/serverList'
import type { Ref } from 'vue'

export function useHomeLibraryManagement(
  showServerManagementDialog: Ref<boolean>,
  showServerEditDialog: Ref<boolean>,
  editingServer: Ref<ServerConfig | null>
) {
  const serverListStore = useServerListStore()
  const libraryStore = useLibraryStore()

  // 使用素材库管理composable
  const libraryManagement = useLibraryManagement(serverListStore)
  const {
    showNoLibraryDialog,
    selectLibrary,
    handleCreateLibrary,
    initializeDefaultLibrary
  } = libraryManagement

  const ensureServerConfigForCollection = async (collection: CollectionInfo): Promise<boolean> => {
    if (serverListStore.services.some(server => server.id === collection.id)) {
      return true
    }

    const baseServer = serverListStore.activeServer || serverListStore.services[0]
    if (!baseServer) {
      return false
    }

    const result = await serverListStore.addServer({
      ...baseServer,
      id: collection.id,
      name: collection.name || baseServer.name,
      isActive: false
    })

    return result.success
  }

  // 素材库选择处理
  const handleSelectCollection = async (collection: CollectionInfo) => {
    console.log('🏛️ 选择素材库:', collection.name, collection.id)

    try {
      // 切换 tab 持久化的 libraryId（后续 save 会写入新库的 key）
      tabPersistence.setCurrentLibraryId(collection.id)

      // 同步更新 serverListStore 的 activeServerId
      const hasServerConfig = await ensureServerConfigForCollection(collection)
      if (!hasServerConfig) {
        throw new Error(`无法找到素材库 ${collection.id} 对应的服务器配置`)
      }

      if (serverListStore.activeServerId !== collection.id) {
        const result = await serverListStore.setActiveServer(collection.id)
        if (!result.success) {
          throw new Error(result.error || `切换素材库失败: ${collection.id}`)
        }
      }

      // 设置当前选中的素材库（await 确保持久化完成）
      await libraryStore.setCurrentLibrary(collection)

      // 通知相关组件素材库已切换
      window.dispatchEvent(new CustomEvent('collection-changed', {
        detail: { collection }
      }))

      return true
    } catch (error) {
      console.error('❌ 素材库切换失败:', error)
      return false
    }
  }

  // 服务器管理对话框处理
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
    // 关闭编辑对话框并刷新数据
    showServerEditDialog.value = false
    editingServer.value = null
  }

  // 兼容性别名
  const handleAddLibrary = handleAddServer
  const handleEditLibrary = handleEditServer
  const handleLibrarySaved = handleServerSaved

  return {
    // 状态
    showNoLibraryDialog,

    // 方法
    handleSelectCollection,
    handleEditServer,
    handleAddServer,
    handleServerSaved,
    handleCreateLibrary,
    initializeDefaultLibrary,

    // 兼容性别名
    handleAddLibrary,
    handleEditLibrary,
    handleLibrarySaved
  }
}
