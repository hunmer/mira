/**
 * 事件处理逻辑 - 处理文件夹、标签选择和刷新等事件
 */
import { useHomeController } from '@renderer/controllers/HomeController'
import { useLibraryStore } from '@/renderer/stores/library'
import { useTagStore } from '@renderer/stores/tag'
import {
  useHomeTagHandler,
  useHomeFolderHandler
} from '@renderer/modules/home'
import { clearTabCache } from '@renderer/composables/useMediaTabData'
import { useConfirm } from '@renderer/composables/useConfirm'
import { useToast } from '@renderer/composables/useToast'
import { miraSDKService } from '@renderer/services/MiraSDKService'

export function useHomeEventHandlers(
  createTabFromFolder: any,
  createTabFromTag: any,
  switchToTabWithCallback: any,
  setAllTabsNeedUpdate: any,
  getCurrentTab: () => any
) {
  const homeController = useHomeController()
  const libraryStore = useLibraryStore()
  const tagStore = useTagStore()
  const tagHandler = useHomeTagHandler()
  const folderHandler = useHomeFolderHandler()
  const confirm = useConfirm()
  const toast = useToast()

  // 文件夹选择处理
  const handleFolderSelect = async (folder: any) => {
    console.log('📁 处理文件夹选择:', folder)

    // 使用 folderHandler 打开文件夹
    const success = await folderHandler.openFolder(folder.id, {
      libraryId: libraryStore.currentLibrary?.id,
      title: folder.title || folder.name,
      label: folder.label,
      path: folder.path
    })

    if (success) {
      // folderHandler 会触发 'home-folder-selected' 事件
      // 在事件监听器中会自动创建 tab
      homeController.handleFolderSelect(folder)
    }
  }

  // 标签选择处理
  const handleTagSelect = async (tag: any) => {
    console.log('🏷️ 处理标签选择:', tag)

    // 使用 tagHandler 打开标签
    const success = await tagHandler.openTag(tag.id, {
      libraryId: libraryStore.currentLibrary?.id,
      title: tag.title || tag.name,
      color: tag.color
    })

    if (success) {
      // tagHandler 会触发 'home-tag-selected' 事件
      // 在事件监听器中会自动创建 tab
      console.log('标签选择成功:', tag)
    }
  }

  // 刷新文件夹
  const handleRefreshFolders = async () => {
    console.log('Refreshing folders...')
    // 刷新时清除所有tabs缓存并设置需要更新数据
    clearTabCache() // 清除所有tab的缓存
    setAllTabsNeedUpdate(true)

    // 强制刷新文件夹数据
    try {
      await homeController.handleRefresh()
      console.log('✅ Folders refreshed successfully')
    } catch (error) {
      console.error('❌ Failed to refresh folders:', error)
      // 即使出错也尝试重新获取当前库的文件夹
      if (libraryStore.currentLibrary) {
        const { useFolderStore } = await import('../../stores/folder')
        const folderStore = useFolderStore()
        await folderStore.refreshFolders(libraryStore.currentLibrary.id)
      }
    }
  }

  // 刷新标签
  const handleRefreshTags = async () => {
    console.log('Refreshing tags...')
    // 刷新时清除所有tabs缓存并设置需要更新数据
    clearTabCache() // 清除所有tab的缓存
    setAllTabsNeedUpdate(true)

    // 强制刷新标签数据
    try {
      await homeController.handleRefresh()
      console.log('✅ Tags refreshed successfully')
    } catch (error) {
      console.error('❌ Failed to refresh tags:', error)
      // 即使出错也尝试重新获取当前库的标签
      if (libraryStore.currentLibrary) {
        await tagStore.refreshTags(libraryStore.currentLibrary.id)
      }
    }
  }

  // 标签选择事件处理
  const handleTagSelected = async (event: Event) => {
    const customEvent = event as CustomEvent
    const tagData = customEvent.detail
    console.log('🏷️ handleTagSelected tagData:', tagData)

    // 只创建tab，不处理路由和数据刷新（这些已经由路由处理器处理了）
    const newTab = await createTabFromTag(tagData, tagData.libraryId)

    if (newTab) {
      console.log('✅ 标签 tab 创建完成:', newTab.label)
      // 触发tab切换以确保正确的数据加载
      switchToTabWithCallback(newTab.id)
    }
  }

  // 文件夹选择事件处理
  const handleFolderSelected = async (event: Event) => {
    const customEvent = event as CustomEvent
    const folderData = customEvent.detail
    console.log('📁 handleFolderSelected folderData:', folderData)

    // 只创建tab，不处理路由和数据刷新（这些已经由路由处理器处理了）
    const newTab = createTabFromFolder(folderData, folderData.libraryId || libraryStore.currentLibrary?.id)

    if (newTab) {
      console.log('✅ 文件夹 tab 创建完成:', newTab.label)
      // 触发tab切换以确保正确的数据加载
      switchToTabWithCallback(newTab.id)
    }
  }

  // 清空回收站
  const handleEmptyTrash = async () => {
    const libraryId = libraryStore.currentLibrary?.id
    if (!libraryId) {
      console.warn('清空回收站失败：未选择库')
      return
    }

    // 弹出确认对话框（替代原生 window.confirm）
    confirm.require({
      header: '清空回收站',
      message: '确定要清空回收站吗？此操作不可撤销。',
      acceptLabel: '清空',
      rejectLabel: '取消',
      accept: async () => {
        try {
          const result = await miraSDKService.emptyTrash(libraryId)
          clearTabCache()
          setAllTabsNeedUpdate(true)
          const currentTab = getCurrentTab()
          if (currentTab) {
            switchToTabWithCallback(currentTab.id)
          }
          console.log(`已清空回收站，删除 ${result.deletedCount} 个文件`)
        } catch (error: any) {
          console.error('清空回收站失败:', error)
          if (error?.message?.includes('403') || error?.error?.includes('权限不足')) {
            // 用 Toast 通知替代原生 alert
            toast.add({
              severity: 'error',
              summary: '权限不足',
              detail: '清空回收站需要管理员权限',
              life: 4000
            })
          } else {
            toast.add({
              severity: 'error',
              summary: '清空回收站失败',
              detail: error?.message || '未知错误',
              life: 4000
            })
          }
        }
      }
    })
  }

  // 注册全局事件监听
  const registerGlobalEvents = (
    handleActivateLastTab: () => void,
    handleReopenClosedTab: () => void,
    handleCloseCurrentTab: () => void
  ) => {
    window.addEventListener('home-tag-selected', handleTagSelected)
    window.addEventListener('home-folder-selected', handleFolderSelected)
    document.addEventListener('shortcut:activate-last-tab', handleActivateLastTab)
    document.addEventListener('shortcut:reopen-closed-tab', handleReopenClosedTab)
    document.addEventListener('shortcut:close-current-tab', handleCloseCurrentTab)
  }

  // 清理全局事件监听
  const cleanupGlobalEvents = (
    handleActivateLastTab: () => void,
    handleReopenClosedTab: () => void,
    handleCloseCurrentTab: () => void
  ) => {
    window.removeEventListener('home-tag-selected', handleTagSelected)
    window.removeEventListener('home-folder-selected', handleFolderSelected)
    document.removeEventListener('shortcut:activate-last-tab', handleActivateLastTab)
    document.removeEventListener('shortcut:reopen-closed-tab', handleReopenClosedTab)
    document.removeEventListener('shortcut:close-current-tab', handleCloseCurrentTab)
  }

  return {
    handleFolderSelect,
    handleTagSelect,
    handleRefreshFolders,
    handleRefreshTags,
    handleEmptyTrash,
    handleTagSelected,
    handleFolderSelected,
    registerGlobalEvents,
    cleanupGlobalEvents
  }
}
