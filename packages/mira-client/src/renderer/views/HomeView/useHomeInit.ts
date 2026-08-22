/**
 * 初始化逻辑 - 处理组件挂载时的初始化流程
 */
import { useAppState } from '@renderer/stores/appState'
import { useLibraryStore } from '@/renderer/stores/library'
import { useServerListStore } from '@renderer/stores/serverList'
import { useDashboardStore } from '@renderer/stores/dashboard'
import { useAuthStore } from '@renderer/stores/auth'
import { createTabScopeId, tabPersistence } from '@renderer/composables/TabPersistence'
import {
  useHomeRouteHandler,
  useHomeTagHandler,
  useHomeFolderHandler
} from '@renderer/modules/home'

export function useHomeInit() {
  const { setRouteHandlersRegistered } = useAppState()
  const libraryStore = useLibraryStore()
  const serverListStore = useServerListStore()
  const dashboardStore = useDashboardStore()
  const authStore = useAuthStore()

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

    if (libraryStore.libraries.length === 0) {
      const result = await libraryStore.fetchLibraries()
      if (!result.success) {
        console.warn('Failed to fetch libraries:', result.error)
      }
    }

    const requestedLibraryId = new URLSearchParams(window.location.search).get('mira-library-id')
    if (requestedLibraryId) {
      const requestedLibrary = libraryStore.libraries.find(library => String(library.id) === requestedLibraryId)
      if (requestedLibrary) await libraryStore.setCurrentLibrary(requestedLibrary)
    }

    if (libraryStore.currentLibrary?.id) {
      localStorage.setItem('mira-active-library-id', String(libraryStore.currentLibrary.id))
      tabPersistence.setCurrentLibraryId(createTabScopeId(
        serverListStore.activeServer?.serverUrl,
        libraryStore.currentLibrary.id
      ))
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

    // 并行解析 dashboard URL 和刷新用户信息（确保 user.id 存在）
    await Promise.all([
      dashboardStore.resolve(),
      authStore.getCurrentUser(true).catch(() => {})
    ])

    const { useTabs } = await import('@renderer/composables/useTabs')
    const tabsComposable = useTabs()
    await tabsComposable.restoreTabsState(true)

    const cleanupModules = await initializeHomeModules()

    const currentTab = getCurrentTab()
    if (currentTab && currentTab.type !== 'home') {
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
