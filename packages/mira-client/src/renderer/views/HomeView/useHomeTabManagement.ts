/**
 * Tab管理逻辑 - 处理Tab的切换、创建、关闭等操作
 */
import { ref, computed, watch, type Ref } from 'vue'
import { useTabs, type TabItem } from '@renderer/composables'
import { useLibraryStore } from '@/renderer/stores/library'
import { useMediaStore } from '@renderer/stores/media'
import { useHomeController } from '@renderer/controllers/HomeController'
import { tabRegistryAPI, type TabViewConfig } from '@renderer/api/TabRegistryAPI'
import { cacheTabData, clearTabCache, useMediaTabData } from '@renderer/composables/useMediaTabData'
import { getLibraryPrefs } from '@renderer/composables/LibraryPrefs'
import {
  useHomeRouteHandler
} from '@renderer/modules/home'
import i18n from '../../i18n'

export function useHomeTabManagement(
  sidebarRef?: Ref<{ locateItem: (type: 'folder' | 'tag', id: string) => void | Promise<void> } | null | undefined>
) {
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
    canActivateLastTab: canActivateLastActivatedTab,
    reopenLastClosedTab
  } = tabsComposable

  // Tab右键菜单相关
  const currentContextTab = ref<TabItem | null>(null)

  // 当前Tab和视图配置
  const currentTab = computed(() => {
    return activeTabs.value.find(tab => tab.active) || null
  })

  const currentTabViewConfig = ref<TabViewConfig | null>(null)
  // 原地替换 Tab 时保留旧内容，供顶部返回按钮恢复。
  const replacedTabHistory = ref<TabItem[]>([])
  const visitedTabIds = ref<string[]>([])
  const tabViewConfigMap = ref<Record<string, TabViewConfig | null>>({})

  const visitedTabs = computed(() => {
    return visitedTabIds.value
      .map(tabId => activeTabs.value.find(tab => tab.id === tabId))
      .filter((tab): tab is TabItem => Boolean(tab))
  })

  const getTabViewConfigForTab = (tabId: string) => {
    return tabViewConfigMap.value[tabId] || null
  }

  const loadTabViewConfig = async (tab: TabItem) => {
    if (!visitedTabIds.value.includes(tab.id)) {
      visitedTabIds.value.push(tab.id)
    }

    const tabId = tab.id

    try {
      const config = await tabRegistryAPI.getTabViewConfig(tab.type, {
        tabId: tab.id,
        libraryId: libraryStore.currentLibrary?.id,
        tabData: tab.data,
        filters: {}
      })

      tabViewConfigMap.value = {
        ...tabViewConfigMap.value,
        [tabId]: config
      }

      if (currentTab.value?.id === tabId) {
        currentTabViewConfig.value = config
      }
    } catch (error) {
      console.error('获取Tab视图配置失败:', error)

      tabViewConfigMap.value = {
        ...tabViewConfigMap.value,
        [tabId]: null
      }

      if (currentTab.value?.id === tabId) {
        currentTabViewConfig.value = null
      }
    }
  }

  // 监听当前tab变化并异步获取视图配置
  watch(
    () => currentTab.value,
    async (newTab) => {
      if (!newTab) {
        currentTabViewConfig.value = null
        return
      }

      if (!visitedTabIds.value.includes(newTab.id)) {
        visitedTabIds.value.push(newTab.id)
      }

      const tabId = newTab.id

      // 已访问的 tab 复用原配置，避免 TabViewRenderer 进入 loading 并重建瀑布流。
      if (tabId in tabViewConfigMap.value) {
        currentTabViewConfig.value = tabViewConfigMap.value[tabId]
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
        tabViewConfigMap.value = {
          ...tabViewConfigMap.value,
          [tabId]: config
        }

        if (currentTab.value?.id === tabId) {
          currentTabViewConfig.value = config
        }
      } catch (error) {
        console.error('获取Tab视图配置失败:', error)

        tabViewConfigMap.value = {
          ...tabViewConfigMap.value,
          [tabId]: null
        }

        if (currentTab.value?.id === tabId) {
          currentTabViewConfig.value = null
        }
      }
    },
    { immediate: true }
  )

  watch(
    () => activeTabs.value.map(tab => tab.id),
    (tabIds) => {
      visitedTabIds.value = visitedTabIds.value.filter(tabId => tabIds.includes(tabId))

      const nextConfigMap: Record<string, TabViewConfig | null> = {}
      for (const tabId of tabIds) {
        if (tabId in tabViewConfigMap.value) {
          nextConfigMap[tabId] = tabViewConfigMap.value[tabId]
        }
      }
      tabViewConfigMap.value = nextConfigMap
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
        label: i18n.global.t('views.homeTab.ctxLocateItem'),
        icon: 'my_location',
        command: () => {
          const tab = currentContextTab.value
          if (!tab) return
          const type = tab.type === 'tag' ? 'tag' as const : 'folder' as const
          const targetId = String(tab.data?.id ?? tab.id)
          sidebarRef?.value?.locateItem(type, targetId)
        }
      },
      {
        label: i18n.global.t('views.homeTab.ctxCloneTab'),
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
        label: i18n.global.t('views.homeTab.ctxCloseTab'),
        icon: 'close',
        command: async () => {
          if (currentContextTab.value && activeTabs.value.length > 1) {
            await closeTabWithCallback(currentContextTab.value.id)
          }
        },
        disabled: activeTabs.value.length <= 1
      },
      {
        label: i18n.global.t('views.homeTab.ctxCloseOthers'),
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
  const handleTabContextMenu = (tab: TabItem, _event: MouseEvent) => {
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
    if (
      activeTab.type === 'folder' ||
      activeTab.type === 'base' ||
      activeTab.type === 'all' ||
      activeTab.type === 'trash' ||
      activeTab.type === 'uncategorized' ||
      activeTab.type === 'untagged'
    ) {
      homeController.selectedFolder.value = String(activeTab.data?.id ?? activeTab.id).replace(/^folder-/, '')
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
          itemsPerPage: pagination?.limit || getLibraryPrefs().pageSize
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
        sort: 'imported_at' as const,
        order: 'desc' as const
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
        await loadTabData(tab, { limit: getLibraryPrefs().pageSize, offset: 0 })
      }
    })
  }

  // 分屏内容已经挂载时只切换激活态，避免再次触发 Tab 懒加载/数据刷新。
  const activateTabWithoutReload = (tabId: string) => {
    switchToTab(tabId, { onSwitchCallback: handleTabSwitch })
  }

  const refreshCurrentTabAfterLibrarySwitch = async () => {
    visitedTabIds.value = []
    tabViewConfigMap.value = {}
    currentTabViewConfig.value = null

    const activeTab = getCurrentTab()
    if (!activeTab) return

    await loadTabViewConfig(activeTab)
    setTabNeedUpdate(activeTab.id, true)
    switchToTabWithCallback(activeTab.id)
  }

  /**
   * 原地替换当前 Tab 的内容（保留同一个 Tab 槽位）。
   * 用于面包屑点击：不新建/切换 Tab，而是把当前 Tab 变成目标 文件夹/标签/全部文件。
   */
  const replaceCurrentTab = async (
    kind: 'folder' | 'tag' | 'all',
    payload: { id?: string; title?: string; label?: string }
  ) => {
    const current = getCurrentTab()
    if (!current) return

    const libraryId = current.data?.libraryId
    replacedTabHistory.value.push({
      ...current,
      data: current.data ? { ...current.data } : current.data,
    })

    // 1. 计算新的 tab 元数据（与 createTabFromFolder/Tag 保持一致）
    let newId = current.id
    let newType = current.type
    let newData = current.data
    let newLabel = current.label
    let newIcon = current.icon

    if (kind === 'all') {
      newId = 'all'
      newType = 'all'
      newLabel = i18n.global.t('views.homeTab.allFilesLabel')
      newIcon = 'folder'
      newData = { ...current.data, id: 'all', title: i18n.global.t('views.homeTab.allFilesLabel'), libraryId }
    } else if (kind === 'folder') {
      const folderId = String(payload.id)
      newId = folderId.startsWith('folder-') ? folderId : `folder-${folderId}`
      newType = 'folder'
      newIcon = 'folder'
      newLabel = payload.title || payload.label || folderId
      newData = { ...current.data, id: folderId, title: newLabel, libraryId }
    } else {
      // tag
      const tagId = String(payload.id)
      newId = tagId.startsWith('tag-') ? tagId : `tag-${tagId}`
      newType = 'tag'
      newIcon = 'label'
      newLabel = payload.title || i18n.global.t('views.homeTab.tagLabel', { label: payload.label || tagId })
      newData = { ...current.data, id: tagId, title: newLabel, libraryId }
    }

    // 2. 原地更新当前 tab（保留槽位，id 变化以匹配新内容并触发视图配置重新拉取）
    const oldId = current.id
    Object.assign(current, {
      id: newId,
      type: newType,
      data: newData,
      label: newLabel,
      icon: newIcon,
      needUpdate: true
    })

    // 3. 清除旧 id 的视图配置缓存，并主动为新 id 加载视图配置
    delete tabViewConfigMap.value[oldId]
    await loadTabViewConfig(current)
    currentTabViewConfig.value = tabViewConfigMap.value[newId] ?? null

    // 4. 清掉媒体数据缓存 & 标记需要更新，触发重新加载
    clearTabCache(newId)
    setTabNeedUpdate(newId, true)

    // 5. 同步路由 / 控制器状态，并触发数据懒加载
    await handleTabSwitch(current)
    switchToTabWithCallback(newId)
  }

  // 关闭Tab的包装方法
  const closeTabWithCallback = async (tabId: string) => {
    await closeTab(tabId, {
      onSwitchCallback: handleTabSwitch,
      lazyLoadHandler: async (tab) => {
        await loadTabData(tab, { limit: getLibraryPrefs().pageSize, offset: 0 })
      }
    })
  }

  // 激活上一次的tab
  const handleActivateLastTab = async () => {
    const replaced = replacedTabHistory.value.pop()
    const current = getCurrentTab()
    if (replaced && current) {
      const currentId = current.id
      Object.assign(current, replaced, { active: true, needUpdate: true })
      clearTabCache(currentId)
      clearTabCache(replaced.id)
      await loadTabViewConfig(current)
      currentTabViewConfig.value = tabViewConfigMap.value[current.id] ?? null
      await handleTabSwitch(current)
      switchToTabWithCallback(current.id)
      return true
    }
    activateLastTab()
    return true
  }

  const canActivateLastTab = computed(() =>
    replacedTabHistory.value.length > 0 || canActivateLastActivatedTab.value
  )

  // 重新打开最后关闭的tab
  const handleReopenClosedTab = async () => {
    await reopenLastClosedTab()
  }

  const handleCloseCurrentTab = async () => {
    const currentTab = getCurrentTab()
    if (currentTab) {
      await closeTabWithCallback(currentTab.id)
    }
  }

  return {
    // Tab composable导出
    tabsComposable,
    activeTabs,
    currentTab,
    currentTabViewConfig,
    visitedTabs,
    getTabViewConfigForTab,
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
    activateTabWithoutReload,
    closeTabWithCallback,
    handleActivateLastTab,
    canActivateLastTab,
    handleReopenClosedTab,
    handleCloseCurrentTab,
    refreshCurrentTabAfterLibrarySwitch,
    replaceCurrentTab,
    loadTabData,

    // 分页状态管理
    getTabPaginationState,
    updateTabPaginationState
  }
}
