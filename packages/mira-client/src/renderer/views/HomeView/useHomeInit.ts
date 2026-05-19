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
      console.log('🚀 初始化 Home 路由处理模块...')

      // 初始化路由处理器
      console.log('📍 初始化路由处理器...')
      await routeHandler.initialize()

      // 设置事件监听
      console.log('📻 设置事件监听器...')
      const cleanupTagEvents = tagHandler.listenToRouteEvents()
      const cleanupFolderEvents = folderHandler.listenToRouteEvents()
      const cleanupRouteEvents = routeHandler.watchRouteChanges()

      // 处理当前路由
      console.log('🎯 处理当前路由...')
      await routeHandler.handleCurrentRoute()

      // 标记路由处理器已注册
      setRouteHandlersRegistered()

      console.log('✅ Home 路由处理模块初始化完成')

      // 返回清理函数
      return () => {
        console.log('🧹 清理 Home 模块...')
        cleanupTagEvents?.()
        cleanupFolderEvents?.()
        cleanupRouteEvents?.()
      }
    } catch (error) {
      console.error('❌ Home 路由处理模块初始化失败:', error)
      return null
    }
  }

  // 初始化素材库
  const initializeLibrary = async (
    initializeDefaultLibrary: () => Promise<void>
  ) => {
    console.log('🏠 HomeView: 初始化默认素材库')
    await initializeDefaultLibrary()

    // 初始化素材库数据
    console.log('🏠 HomeView: 恢复素材库状态...')
    await libraryStore.restoreLibraryState()

    // 同步 tab 持久化的 libraryId，确保恢复对应素材库的 tabs
    if (libraryStore.currentLibrary?.id) {
      tabPersistence.setCurrentLibraryId(libraryStore.currentLibrary.id)
    }

    // 如果没有素材库数据，尝试获取
    if (libraryStore.libraries.length === 0) {
      console.log('🏠 HomeView: 获取素材库列表...')
      const result = await libraryStore.fetchLibraries()
      if (!result.success) {
        console.warn('⚠️ 获取素材库列表失败:', result.error)
      }
    }

    console.log('🏠 HomeView: 初始化完成，素材库数量:', libraryStore.libraries.length, '当前选中库:', libraryStore.currentLibrary?.name)
  }

  // 完整的初始化流程
  const performInitialization = async (
    homeController: any,
    getCurrentTab: () => any,
    setTabNeedUpdate: (tabId: string, needUpdate: boolean) => void,
    switchToTabWithCallback: (tabId: string) => void,
    initializeDefaultLibrary: () => Promise<void>
  ) => {
    console.log('🏠 HomeView 组件已挂载，开始初始化')

    // 设置HomeController的回调函数
    homeController.setGetCurrentTabCallback(() => getCurrentTab())
    homeController.setGetCurrentLibraryCallback(() => libraryStore.currentLibrary)

    // 先初始化素材库
    await initializeLibrary(initializeDefaultLibrary)

    // 素材库确定后，强制恢复该库对应的 tabs（覆盖模块级初始化的旧 tabs）
    const { useTabs } = await import('@renderer/composables/useTabs')
    const tabsComposable = useTabs()
    await tabsComposable.restoreTabsState(true)

    // 然后初始化 Home 模块
    const cleanupModules = await initializeHomeModules()

    // 设置默认tab需要更新数据，因为这是初始化
    const currentTab = getCurrentTab()
    if (currentTab) {
      console.log('🏷️ 设置默认tab需要更新数据:', currentTab.label)
      setTabNeedUpdate(currentTab.id, true)

      // 手动触发tab切换以加载数据
      if (libraryStore.currentLibrary?.id) {
        console.log('🚀 触发默认tab数据加载:', currentTab.label)
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
