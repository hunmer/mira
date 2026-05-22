/**
 * Tab管理逻辑 - 处理Tab的切换、创建、关闭等操作
 */
import { ref, computed, watch, type Ref } from 'vue'
import { useTabs, type TabItem } from '@renderer/composables'
import { useLibraryStore } from '@/renderer/stores/library'
import { useMediaStore } from '@renderer/stores/media'
import { useHomeController } from '@renderer/controllers/HomeController'
import { tabRegistryAPI, type TabViewConfig } from '@renderer/api/TabRegistryAPI'
import { cacheTabData, useMediaTabData } from '@renderer/composables/useMediaTabData'
import {
  useHomeRouteHandler,
  useHomeTagHandler,
  useHomeFolderHandler
} from '@renderer/modules/home'

export function useHomeTabManagement() {
  const libraryStore = useLibraryStore()
  const mediaStore = useMediaStore()
  const homeController = useHomeController()
  const routeHandler = useHomeRouteHandler()

  // 使用tabs composable
  const tabsComposable = useTabs()
  const {
    activeTabs,
    switchToTab,
    closeTab,
    createTabFromFolder,
    createTabFromTag,
    cloneTab,
    closeOtherTabs,
    getCurrentTab,
    setTabNeedUpdate,
    activateLastTab,
    reopenLastClosedTab
  } = tabsComposable

  // Tab右键菜单相关
  const currentContextTab = ref<TabItem | null>(null)

  // 当前Tab和视图配置
  const currentTab = computed(() => {
    return activeTabs.value.find(tab => tab.active) || null
  })

  const currentTabViewConfig = ref<TabViewConfig | null>(null)

  // 监听当前tab变化并异步获取视图配置
  watch(
    () => currentTab.value,
    async (newTab) => {
      if (!newTab) {
        currentTabViewConfig.value = null
        return
      }

      try {
        // 使用 tabRegistryAPI 异步获取 Tab 的视图配置
        const config = await tabRegistryAPI.getTabViewConfig(newTab.type, {
          tabId: newTab.id,
          libraryId: libraryStore.currentLibrary?.id,
          tabData: newTab.data,
          filters: {}
        })
        currentTabViewConfig.value = config
      } catch (error) {
        console.error('获取Tab视图配置失败:', error)
        currentTabViewConfig.value = null
      }
    },
    { immediate: true }
  )

  // Tab右键菜单配置
  const tabContextMenuItems = computed(() => {
    // home tab 不显示右键菜单
    if (!currentContextTab.value || currentContextTab.value.type === 'home') {
      return []
    }
    return [
      {
        label: '克隆标签',
        icon: 'content_copy',
        command: () => {
          if (currentContextTab.value) {
            cloneTab(currentContextTab.value)
          }
        }
      },
      {
        separator: true
      },
      {
        label: '关闭标签',
        icon: 'close',
        command: async () => {
          if (currentContextTab.value && activeTabs.value.length > 1) {
            await closeTabWithCallback(currentContextTab.value.id)
          }
        },
        disabled: activeTabs.value.length <= 1
      },
      {
        label: '关闭其他标签',
        icon: 'clear_all',
        command: () => {
          if (currentContextTab.value) {
            closeOtherTabs(currentContextTab.value.id)
          }
        }
      }
    ]
  })

  // Tab右键菜单事件处理
  const handleTabContextMenu = (tab: TabItem, event: MouseEvent) => {
    currentContextTab.value = tab
  }

  // 获取Tab的分页状态
  const getTabPaginationState = (tabId: string) => {
    const tabData = useMediaTabData(tabId)
    return {
      currentPage: tabData.currentPage.value,
      totalRecords: tabData.totalRecords.value,
      itemsPerPage: tabData.itemsPerPage.value,
      isServerPagination: tabData.isServerPagination.value
    }
  }

  // 更新Tab的分页状态
  const updateTabPaginationState = (tabId: string, state: any) => {
    const tabData = useMediaTabData(tabId)
    tabData.updatePagination(state)
  }

  // Tab切换回调函数
  const handleTabSwitch = async (activeTab: TabItem) => {
    mediaStore.setCurrentTab(activeTab.id)

    // 更新 HomeController 状态
    if (activeTab.type === 'folder') {
      homeController.selectedFolder.value = activeTab.id
    } else if (activeTab.type === 'base' || activeTab.type === 'all') {
      homeController.selectedFolder.value = activeTab.id
    }

    // 同步Tab级别分页状态到全局HomeController
    const tabPaginationState = getTabPaginationState(activeTab.id)

    homeController.currentPage.value = tabPaginationState.currentPage
    homeController.serverTotalRecords.value = tabPaginationState.totalRecords
    homeController.isServerPagination.value = tabPaginationState.isServerPagination

    // 静态更新路由参数以匹配当前 tab
    try {
      if (activeTab.type === 'tag') {
        await routeHandler.updateRouteParams({
          type: 'tag',
          id: activeTab.id,
          libraryId: libraryStore.currentLibrary?.id,
          title: activeTab.label
        })
      } else if (activeTab.type === 'folder') {
        await routeHandler.updateRouteParams({
          type: 'folder',
          id: activeTab.id,
          libraryId: libraryStore.currentLibrary?.id,
          title: activeTab.label
        })
      } else if (activeTab.type === 'base' || activeTab.type === 'all') {
        // 默认主页 tab，清除路由参数
        await routeHandler.updateRouteParams({
          type: 'clear'
        })
      }
    } catch (error) {
      console.error('Tab切换时更新路由参数失败:', error)
    }
  }

  // Tab懒加载处理器
  const loadTabData = async (tab: TabItem, pagination?: { limit?: number; offset?: number }) => {
    if (!libraryStore.currentLibrary?.id) return

    try {
      // 获取或初始化Tab级别的分页状态
      let tabPaginationState = getTabPaginationState(tab.id)

      // 如果是首次加载或需要重置，重置分页状态
      if (tab.needUpdate || !tabPaginationState.isServerPagination) {
        updateTabPaginationState(tab.id, {
          currentPage: 1,
          isServerPagination: true,
          itemsPerPage: pagination?.limit || 50
        })
        tabPaginationState = getTabPaginationState(tab.id)
      }

      // 同步全局状态到Tab状态
      homeController.currentPage.value = tabPaginationState.currentPage
      homeController.serverTotalRecords.value = tabPaginationState.totalRecords
      homeController.isServerPagination.value = tabPaginationState.isServerPagination

      // 使用服务端分页获取数据
      const tabWithLibrary = {
        ...tab,
        libraryId: libraryStore.currentLibrary.id,
        sort: tab.sort || 'imported_at',
        order: tab.order || 'desc'
      }

      const result = await mediaStore.fetchFilesForTab(
        tabWithLibrary,
        pagination
      )

      if (result.success) {
        // 更新Tab级别的分页状态
        if (result.total !== undefined) {
          updateTabPaginationState(tab.id, {
            totalRecords: result.total,
            isServerPagination: true
          })

          // 同步到全局状态
          homeController.serverTotalRecords.value = result.total
          homeController.isServerPagination.value = true
        }

        // 缓存数据到tab中
        const loadedData = mediaStore.getFilesForTab(tab.id) || []
        cacheTabData(tab.id, loadedData, result.total)
      } else {
        console.error(`加载Tab数据失败: ${tab.label}`, (result as any).error || 'Unknown error')
      }
    } catch (error) {
      console.error('Tab数据加载失败:', error)
      // 直接设置状态而不是调用disableServerPagination避免重置
      homeController.isServerPagination.value = false
      homeController.serverTotalRecords.value = 0
    }
  }

  // 重写switchToTab以包含回调和懒加载
  const switchToTabWithCallback = (tabId: string) => {
    switchToTab(tabId, {
      onSwitchCallback: handleTabSwitch,
      lazyLoadHandler: async (tab) => {
        // 使用默认分页参数
        await loadTabData(tab, { limit: 999, offset: 0 })
      }
    })
  }

  // 关闭Tab的包装方法
  const closeTabWithCallback = async (tabId: string) => {
    await closeTab(tabId, {
      onSwitchCallback: handleTabSwitch,
      lazyLoadHandler: async (tab) => {
        await loadTabData(tab, { limit: 999, offset: 0 })
      }
    })
  }

  // 激活上一次的tab
  const handleActivateLastTab = () => {
    activateLastTab()
  }

  // 重新打开最后关闭的tab
  const handleReopenClosedTab = async () => {
    await reopenLastClosedTab()
  }

  const handleCloseCurrentTab = async () => {
    console.log('[shortcut:close-current-tab] handleCloseCurrentTab called')
    const currentTab = getCurrentTab()
    console.log('[shortcut:close-current-tab] currentTab:', currentTab ? { id: currentTab.id, type: currentTab.type } : null)
    if (currentTab) {
      await closeTabWithCallback(currentTab.id)
      console.log('[shortcut:close-current-tab] closeTabWithCallback done, tabId:', currentTab.id)
    } else {
      console.warn('[shortcut:close-current-tab] no current tab, skipping close')
    }
  }

  return {
    // Tab composable导出
    tabsComposable,
    activeTabs,
    currentTab,
    currentTabViewConfig,
    getCurrentTab,
    setTabNeedUpdate,
    createTabFromFolder,
    createTabFromTag,

    // Tab右键菜单
    currentContextTab,
    tabContextMenuItems,
    handleTabContextMenu,

    // Tab操作方法
    switchToTabWithCallback,
    closeTabWithCallback,
    handleActivateLastTab,
    handleReopenClosedTab,
    handleCloseCurrentTab,
    loadTabData,

    // 分页状态管理
    getTabPaginationState,
    updateTabPaginationState
  }
}
