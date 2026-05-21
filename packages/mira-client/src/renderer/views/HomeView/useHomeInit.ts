/**
 * 初始化逻辑 - 处理组件挂载时的初始化流程
 */
import { useAppState } from '@renderer/stores/appState'
import { useLibraryStore } from '@/renderer/stores/library'
import { tabPersistence } from '@renderer/composables/TabPersistence'
import {
  useHomeRouteHandler,
  useHomeTagHandler,
  useHomeFolderHandler
} from '@renderer/modules/home'

export function useHomeInit() {
  const { setRouteHandlersRegistered } = useAppState()
  const libraryStore = useLibraryStore()

  const routeHandler = useHomeRouteHandler()
  const tagHandler = useHomeTagHandler()
  const folderHandler = useHomeFolderHandler()

  // 初始化 Home 模块
  const initializeHomeModules = async () => {
    try {
      await routeHandler.initialize()

      const cleanupTagEvents = tagHandler.listenToRouteEvents()
      const cleanupFolderEvents = folderHandler.listenToRouteEvents()
      const cleanupRouteEvents = routeHandler.watchRouteChanges()

      await routeHandler.handleCurrentRoute()

      setRouteHandlersRegistered()

      return () => {
        cleanupTagEvents?.()
        cleanupFolderEvents?.()
        cleanupRouteEvents?.()
      }
    } catch (error) {
      console.error('Home route handler init failed:', error)
      return null
    }
  }

  // 初始化素材库
  const initializeLibrary = async (
    initializeDefaultLibrary: () => Promise<void>
  ) => {
    await initializeDefaultLibrary()
    await libraryStore.restoreLibraryState()

    if (libraryStore.currentLibrary?.id) {
      tabPersistence.setCurrentLibraryId(libraryStore.currentLibrary.id)
    }

    if (libraryStore.libraries.length === 0) {
      const result = await libraryStore.fetchLibraries()
      if (!result.success) {
        console.warn('Failed to fetch libraries:', result.error)
      }
    }
  }

  // 完整的初始化流程
  const performInitialization = async (
    homeController: any,
    getCurrentTab: () => any,
    setTabNeedUpdate: (tabId: string, needUpdate: boolean) => void,
    switchToTabWithCallback: (tabId: string) => void,
    initializeDefaultLibrary: () => Promise<void>
  ) => {
    homeController.setGetCurrentTabCallback(() => getCurrentTab())
    homeController.setGetCurrentLibraryCallback(() => libraryStore.currentLibrary)

    await initializeLibrary(initializeDefaultLibrary)

    const { useTabs } = await import('@renderer/composables/useTabs')
    const tabsComposable = useTabs()
    await tabsComposable.restoreTabsState(true)

    const cleanupModules = await initializeHomeModules()

    const currentTab = getCurrentTab()
    if (currentTab) {
      setTabNeedUpdate(currentTab.id, true)

      if (libraryStore.currentLibrary?.id) {
        switchToTabWithCallback(currentTab.id)
      }
    }

    return cleanupModules
  }

  return {
    initializeHomeModules,
    initializeLibrary,
    performInitialization
  }
}
