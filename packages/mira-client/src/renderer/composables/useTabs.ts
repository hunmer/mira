import { ref, computed, type Component } from 'vue'
import { tabRegistry } from './TabRegistry'
import { quickInitTabSystem } from './initTabSystem'
import { tabPersistence, type TabState } from './TabPersistence'
import { restoreTabViewMode, restoreTabAppliedFilterId, clearTabCache } from './useMediaTabData'
import { loadLibraryPrefs } from './LibraryPrefs'
import { tabHistory } from './TabHistory'
import i18n from '../i18n'
import { useTabActivation } from './useTabActivation'
import { useTabLifecycle } from './useTabLifecycle'
import { useTabPersistence } from './useTabPersistence'

// ============================================
// 类型定义
// ============================================
export interface TabItem {
  id: string
  label: string
  icon: string
  iconColor?: string
  type: string // 改为动态字符串类型，支持注册的自定义类型
  data?: any
  active: boolean
  needUpdate?: boolean // 用于标识tab是否需要重新加载数据
  filters?: Record<string, any> // Tab 筛选条件
  transient?: boolean // 不持久化包含运行时对象的Tab
}

export interface WebviewTabOptions {
  id?: string
  label?: string
  icon?: string
  iconColor?: string
  data?: Record<string, any>
  libraryId?: string
}

export interface CustomTabOptions extends Omit<WebviewTabOptions, 'data'> {
  props?: Record<string, any>
  data?: Record<string, any>
  context?: Record<string, any>
  renderMode?: 'component' | 'dom'
}

export type CustomTabView = Component | ((container: HTMLElement, context: any) => (() => void) | void)

// ============================================
// 全局单例状态（确保所有组件共享同一份状态）
// ============================================
const globalTabs = ref<TabItem[]>([]) // 初始为空，等待注册系统设置默认tab或恢复状态
const globalActiveTabId = ref('')
const globalIsRestoringState = ref(true) // 初始为 true，阻止自动创建 tab
const globalHasInitialized = ref(false) // 标记是否已经初始化过
let globalHasSetupEffects = false // 标记是否已设置副作用（watch和初始化）
let tabsResetVersion = 0

const createHomeTab = (): TabItem => ({
  id: 'home',
  label: i18n.global.t('composables.useTabs.homeLabel'),
  icon: 'home',
  iconColor: '#3B82F6',
  type: 'home',
  data: {},
  active: true,
  needUpdate: false
})

const restoreTabsFromSnapshot = (savedState: { tabs: TabState[], activeTabId: string }): boolean => {
  const restoredTabs: TabItem[] = []

  for (const tabState of savedState.tabs) {
    if (!tabRegistry.isRegistered(tabState.type)) {
      console.warn(`Tab类型 "${tabState.type}" 未注册，跳过: ${tabState.label}`)
      continue
    }

    if (tabState.viewMode) {
      restoreTabViewMode(tabState.id, tabState.viewMode)
    }
    if (tabState.appliedFilterId !== undefined) {
      restoreTabAppliedFilterId(tabState.id, tabState.appliedFilterId)
    }

    const restoredData = tabState.type === 'tag' && tabState.data
      ? { ...tabState.data, id: String(tabState.data.id ?? '').replace(/^tag-/, '') }
      : tabState.data

    restoredTabs.push({
      id: tabState.id,
      label: tabState.label,
      icon: tabState.icon,
      iconColor: tabState.iconColor,
      type: tabState.type,
      data: restoredData,
      active: false,
      needUpdate: true,
      filters: tabState.filters
    })
  }

  if (restoredTabs.length === 0) {
    return false
  }

  globalTabs.value = restoredTabs

  const activeTabIndex = restoredTabs.findIndex(tab => tab.id === savedState.activeTabId)
  const targetIndex = activeTabIndex >= 0 ? activeTabIndex : 0
  restoredTabs[targetIndex].active = true
  globalActiveTabId.value = restoredTabs[targetIndex].id

  return true
}

// ============================================
// 模块级别初始化函数（在模块加载时执行）
// ============================================
async function initializeTabsSystem() {
  // 确保Tab系统已初始化
  quickInitTabSystem()

  // 如果已经初始化过，跳过
  if (globalHasInitialized.value) {
    return
  }

  // 初始化Tab历史记录
  await tabHistory.initialize()

  // 加载当前素材库本地偏好（默认视图选项等）
  await loadLibraryPrefs()

  // 尝试从 localStorage 恢复状态
  const scopeAtStart = tabPersistence.getScopeId()
  const savedState = await tabPersistence.loadTabsState()

  // 初始化期间可能发生服务器/素材库切换，旧作用域的结果不能覆盖新状态。
  if (scopeAtStart !== tabPersistence.getScopeId()) {
    return
  }

  if (savedState && savedState.tabs.length > 0) {

    const restoredTabs: TabItem[] = []
    for (const tabState of savedState.tabs) {
      // 检查tab类型是否已注册
      if (!tabRegistry.isRegistered(tabState.type)) {
        console.warn(`⚠️ Tab类型 "${tabState.type}" 未注册，跳过: ${tabState.label}`)
        continue
      }

      const restoredTab: TabItem = {
        id: tabState.id,
        label: tabState.label,
        icon: tabState.icon,
        iconColor: tabState.iconColor,
        type: tabState.type,
        data: tabState.data,
        active: false,
        needUpdate: true, // 恢复的tab需要重新加载数据
        filters: tabState.filters // 恢复筛选条件
      }
      restoredTabs.push(restoredTab)
    }

    if (restoredTabs.length > 0) {
      globalTabs.value = restoredTabs

      // 恢复活跃状态
      const activeTabIndex = restoredTabs.findIndex(tab => tab.id === savedState.activeTabId)
      if (activeTabIndex >= 0) {
        restoredTabs[activeTabIndex].active = true
        globalActiveTabId.value = savedState.activeTabId
      } else {
        restoredTabs[0].active = true
        globalActiveTabId.value = restoredTabs[0].id
      }

      globalHasInitialized.value = true
      globalIsRestoringState.value = false
      return
    }
  }

  globalTabs.value = [{
    id: 'home',
    label: i18n.global.t('composables.useTabs.homeLabel'),
    icon: 'home',
    iconColor: '#3B82F6',
    type: 'home',
    data: {},
    active: true,
    needUpdate: false
  }]
  globalActiveTabId.value = 'home'
  globalHasInitialized.value = true
  globalIsRestoringState.value = false
}

// 模块加载时立即启动初始化
initializeTabsSystem()

export async function resetTabsForLibrary(libraryId: string | null): Promise<void> {
  const resetVersion = ++tabsResetVersion
  quickInitTabSystem()
  tabPersistence.setCurrentLibraryId(libraryId)
  clearTabCache()
  await loadLibraryPrefs()

  globalIsRestoringState.value = true

  try {
    const savedState = await tabPersistence.loadTabsState()

    // 丢弃已被后续服务器/素材库切换取代的恢复结果。
    if (resetVersion !== tabsResetVersion) {
      return
    }

    if (!savedState || savedState.tabs.length === 0 || !restoreTabsFromSnapshot(savedState)) {
      globalTabs.value = [createHomeTab()]
      globalActiveTabId.value = 'home'
    }

    globalHasInitialized.value = true

    try {
      const { useMediaStore } = await import('../stores/media')
      const mediaStore = useMediaStore()
      mediaStore.filesMap = {}
      mediaStore.currentTabId = ''
      mediaStore.currentFile = null
      mediaStore.deselectAllFiles()
      mediaStore.clearDetailSidebar()
      mediaStore.clearImagePreviewItems()
    } catch (error) {
      console.warn('清理Tab关联媒体数据失败:', error)
    }
  } finally {
    globalIsRestoringState.value = false
  }
}

/**
 * Tabs 功能 Composable
 *
 * 组合根：聚合三个子 composable 并保持对外返回形状不变
 * - useTabActivation   激活策略（切换/激活历史回退）
 * - useTabLifecycle    生命周期（创建/关闭/钩子/视图配置/更新标记）
 * - useTabPersistence  持久化（保存/恢复/自动保存副作用）
 */
export function useTabs() {
  // 确保Tab系统已初始化
  quickInitTabSystem()

  // 使用全局单例状态
  const tabs = globalTabs
  const activeTabId = globalActiveTabId
  const isRestoringState = globalIsRestoringState
  const hasInitialized = globalHasInitialized

  // ============================================
  // 激活策略
  // ============================================
  const {
    getCurrentTab,
    switchToTab,
    switchToTabSimple,
    activateLastTab,
    canActivateLastTab
  } = useTabActivation({ tabs, activeTabId })

  // ============================================
  // 持久化
  // ============================================
  const {
    saveTabsState,
    restoreTabsState,
    clearTabsState,
    setupPersistenceEffects
  } = useTabPersistence({ tabs, activeTabId, isRestoringState, hasInitialized, createHomeTab })

  // ============================================
  // 生命周期
  // ============================================
  const {
    createDefaultHomeTab,
    closeTab,
    createTabFromFolder,
    createTabFromTag,
    cloneTab,
    closeOtherTabs,
    setTabNeedUpdate,
    setAllTabsNeedUpdate,
    markTabsForEvent,
    createTabFromRegisteredType,
    createWebviewTab,
    createCustomTab,
    executeTabLifecycle,
    setDefaultTab,
    ensureDefaultTabExists,
    isTabClosable,
    getTabViewConfig,
    getCurrentTabViewConfig,
    refreshTabViewConfig,
    reopenLastClosedTab
  } = useTabLifecycle({ tabs, activeTabId, switchToTab })

  // ============================================
  // 计算属性
  // ============================================

  // 活动的 tabs
  const activeTabs = computed(() => {
    // 如果没有任何tab且不在恢复状态，自动创建home tab
    if (tabs.value.length === 0 && !isRestoringState.value) {
      // 异步创建home tab，但立即返回一个placeholder
      createDefaultHomeTab()
      return [{
        id: 'home',
        label: i18n.global.t('composables.useTabs.homeLabel'),
        icon: 'home',
        iconColor: '#3B82F6',
        type: 'home',
        active: true,
        needUpdate: false
      }]
    }
    return tabs.value
  })

  // 当前 tab 内容
  const currentTabContent = computed(() => {
    const activeTab = tabs.value.find(tab => tab.active)
    if (!activeTab) {
      return {
        type: 'files' as const,
        id: 'home',
        label: i18n.global.t('composables.useTabs.homeLabel'),
        icon: 'home',
        iconColor: '#6B7280'
      }
    }

    // 为了向后兼容，all类型映射为files
    if (activeTab.type === 'all') {
      return {
        ...activeTab,
        type: 'files' as const
      }
    }

    return activeTab
  })

  // 仅在首次调用时设置 watch 监听器（初始化已在模块级别完成）
  if (!globalHasSetupEffects) {
    globalHasSetupEffects = true
    setupPersistenceEffects()
  }

  // ============================================
  // 返回接口
  // ============================================
  return {
    // 状态
    tabs,
    activeTabId,

    // 计算属性
    activeTabs,
    currentTabContent,

    // 传统方法（保持向后兼容）
    switchToTab,
    switchToTabSimple,
    closeTab,
    createTabFromFolder,
    createTabFromTag,
    cloneTab,
    closeOtherTabs,
    getCurrentTab,
    setTabNeedUpdate,
    setAllTabsNeedUpdate,
    markTabsForEvent,

    // 新的注册系统方法
    createTabFromRegisteredType,
    createWebviewTab,
    createCustomTab,
    executeTabLifecycle,
    setDefaultTab,
    ensureDefaultTabExists,

    // 持久化方法
    saveTabsState,
    restoreTabsState,
    clearTabsState,

    // 工具方法
    isTabClosable,

    // 视图配置方法
    getTabViewConfig,
    getCurrentTabViewConfig,
    refreshTabViewConfig,

    // Tab历史方法
    activateLastTab,
    canActivateLastTab,
    reopenLastClosedTab
  }
}
