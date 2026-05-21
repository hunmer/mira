import { ref, computed, watch, nextTick } from 'vue'
import type { FilterRule } from '@/components/ui/volt/FilterBar.vue'
import { tabRegistry, type TabContext, type TabTypeDefinition, type TabViewConfig } from './TabRegistry'
import { quickInitTabSystem } from './initTabSystem'
import { tabPersistence, type TabState } from './TabPersistence'
import { tabHistory } from './TabHistory'

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
}

// ============================================
// 全局单例状态（确保所有组件共享同一份状态）
// ============================================
const globalTabs = ref<TabItem[]>([]) // 初始为空，等待注册系统设置默认tab或恢复状态
const globalActiveTabId = ref('')
const globalIsRestoringState = ref(true) // 初始为 true，阻止自动创建 tab
const globalHasInitialized = ref(false) // 标记是否已经初始化过
let globalHasSetupEffects = false // 标记是否已设置副作用（watch和初始化）

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

  // 尝试从 localStorage 恢复状态
  const savedState = await tabPersistence.loadTabsState()

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
    label: '首页',
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

/**
 * Tabs 功能 Composable
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
        label: '首页',
        icon: 'home',
        iconColor: '#3B82F6',
        type: 'home',
        active: true,
        needUpdate: false
      }]
    }
    return tabs.value
  })

  // 创建默认home tab的异步方法
  const createDefaultHomeTab = async () => {
    if (tabs.value.length === 0) {
      try {
        await createTabFromRegisteredType('home', {
          id: 'home',
          label: '首页'
        })
      } catch (error) {
        console.error('❌ 创建默认home tab失败:', error)
      }
    }
  }

  // 当前 tab 内容
  const currentTabContent = computed(() => {
    const activeTab = tabs.value.find(tab => tab.active)
    if (!activeTab) {
      return {
        type: 'files' as const,
        id: 'home',
        label: '首页',
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

  // ============================================
  // Tab 操作方法
  // ============================================
  
  /**
   * 切换到指定的tab，支持懒加载
   */
  const switchToTab = (
    tabId: string,
    options?: {
      onSwitchCallback?: (tab: TabItem) => void
      lazyLoadHandler?: (tab: TabItem) => Promise<void>
    }
  ) => {
    const { onSwitchCallback, lazyLoadHandler } = options || {}

    tabs.value.forEach(tab => {
      tab.active = tab.id === tabId
    })
    activeTabId.value = tabId

    const activeTab = tabs.value.find(tab => tab.id === tabId)
    if (activeTab) {
      // 记录Tab激活历史
      tabHistory.recordTabAction(activeTab, 'activate')

      // 执行切换回调
      if (onSwitchCallback) {
        onSwitchCallback(activeTab)
      }

      // 只有在needUpdate为true时才执行懒加载处理器
      if (lazyLoadHandler && activeTab.needUpdate) {
        lazyLoadHandler(activeTab).then(() => {
          // 数据加载完成后，标记为不需要更新
          activeTab.needUpdate = false
        }).catch(error => {
          console.error('Tab lazy loading failed:', error)
        })
      }
    }
  }

  /**
   * 切换到指定的tab（简化版本，保持向后兼容）
   */
  const switchToTabSimple = (tabId: string, onSwitchCallback?: (tab: TabItem) => void) => {
    switchToTab(tabId, { onSwitchCallback })
  }

  /**
   * 关闭指定的tab
   */
  const closeTab = async (
    tabId: string,
    options?: {
      onSwitchCallback?: (tab: TabItem) => void
      lazyLoadHandler?: (tab: TabItem) => Promise<void>
    }
  ) => {
    const tabIndex = tabs.value.findIndex(tab => tab.id === tabId)
    if (tabIndex === -1) return

    const wasActive = tabs.value[tabIndex].active
    const closingTab = tabs.value[tabIndex]

    // 检查tab是否允许关闭
    const tabType = tabRegistry.getType(closingTab.type)
    if (tabType && tabType.allowClose === false) {
      console.warn(`⚠️ Tab "${closingTab.label}" 不允许关闭`)
      return
    }

    // 记录Tab关闭历史
    await tabHistory.recordTabAction(closingTab, 'close')

    // 清理被关闭Tab的数据
    try {
      // 动态导入避免循环依赖
      const { useMediaStore } = await import('../stores/media')
      const mediaStore = useMediaStore()

      // 清理mediaStore中该tab的数据
      mediaStore.clearFilesForTab(tabId)
    } catch (error) {
      console.warn('⚠️ 清理Tab数据时出错:', error)
    }

    // 移除Tab
    tabs.value.splice(tabIndex, 1)

    if (wasActive && tabs.value.length > 0) {
      const newActiveIndex = Math.min(tabIndex, tabs.value.length - 1)
      const newActiveTab = tabs.value[newActiveIndex]

      // 传递完整的切换选项，确保数据正确同步
      switchToTab(newActiveTab.id, options)
    }
  }

  /**
   * 从文件夹创建 Tab
   */
  const createTabFromFolder = (folder: any, libraryId?: string) => {
    // 确保tab ID不会重复添加前缀
    const folderId = folder.id
    const tabId = folderId.startsWith('folder-') ? folderId : `folder-${folderId}`

    const existingTab = tabs.value.find(tab => tab.id === tabId)
    if (existingTab) {
      switchToTab(existingTab.id)
      return existingTab
    }

    tabs.value.forEach(tab => tab.active = false)

    // 获取正确的标签名，优先级: title > label > name > id
    const tabLabel = folder.title || folder.label || folder.name || folderId

    // 识别特殊的文件夹类型
    let tabType = 'folder'
    if (folderId === 'all') {
      tabType = 'all'
    } else if (folderId === 'trash') {
      tabType = 'trash'
    } else if (folderId === 'uncategorized') {
      tabType = 'uncategorized'
    } else if (folderId === 'untagged') {
      tabType = 'untagged'
    }

    const newTab: TabItem = {
      id: tabId, // 使用唯一的 tab ID
      label: tabLabel,
      icon: folder.icon || 'folder',
      iconColor: folder.iconColor,
      type: tabType, // 使用识别后的类型
      data: { ...folder, libraryId }, // libraryId 存储在 data 中
      active: true,
      needUpdate: true // 新创建的tab需要加载数据
    }

    tabs.value.push(newTab)
    activeTabId.value = tabId

    // 记录Tab打开历史
    tabHistory.recordTabAction(newTab, 'open')

    return newTab
  }

  /**
   * 从标签创建 Tab（使用注册系统）
   */
  const createTabFromTag = async (tag: any, libraryId?: string) => {
    // 获取正确的标签名，优先级: title > name > label > id
    const originalTagId = String(tag.id || tag.name)
    const tagName = tag.title || tag.name || tag.label || originalTagId
    const tabLabel = `标签: ${tagName}`

    // 确保tab ID不会重复添加前缀
    const tagId = originalTagId.startsWith('tag-') ? originalTagId : `tag-${originalTagId}`

    // 使用注册系统创建Tab
    return await createTabFromRegisteredType('tag', {
      id: tagId,
      label: tabLabel,
      data: tag,
      libraryId,
      context: {
        // 明确传递标签上下文信息
        id: tag.id,
        tagId: tag.id,
        name: tagName,
        tagName: tagName,
        title: tag.title,
        color: tag.color,
        fileCount: tag.fileCount,
        tabData: tag
      }
    })
  }

  /**
   * 克隆 Tab
   */
  const cloneTab = (tab: TabItem) => {
    tabs.value.forEach(t => t.active = false)
    
    const clonedTab: TabItem = {
      id: `${tab.id}-clone-${Date.now()}`,
      label: `${tab.label} (副本)`,
      icon: tab.icon,
      iconColor: tab.iconColor,
      type: tab.type,
      data: tab.data,
      active: true,
      needUpdate: true
    }
    
    tabs.value.push(clonedTab)
    activeTabId.value = clonedTab.id
    return clonedTab
  }

  /**
   * 关闭其他 Tab
   */
  const closeOtherTabs = (keepTabId: string) => {
    const keepTab = tabs.value.find(tab => tab.id === keepTabId)
    if (keepTab) {
      tabs.value = [keepTab]
      keepTab.active = true
      activeTabId.value = keepTab.id
    }
  }

  /**
   * 获取当前活动的tab
   */
  const getCurrentTab = () => {
    return tabs.value.find(tab => tab.active)
  }


  /**
   * 设置tab需要更新数据
   */
  const setTabNeedUpdate = (tabId: string, needUpdate = true) => {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.needUpdate = needUpdate
    }
  }

  /**
   * 设置所有tabs需要更新数据
   */
  const setAllTabsNeedUpdate = (needUpdate = true) => {
    tabs.value.forEach(tab => {
      tab.needUpdate = needUpdate
    })
  }

  /**
   * 根据 WebSocket 事件标记需要更新的 tab
   * 返回被标记的 tabId 列表
   */
  const markTabsForEvent = (eventData: any, _eventType: string): string[] => {
    const markedIds: string[] = []
    for (const tab of tabs.value) {
      const tabType = tabRegistry.getType(tab.type)
      if (tabType?.shouldUpdateForEvent?.(tab.data, eventData)) {
        tab.needUpdate = true
        markedIds.push(tab.id)
      }
    }
    return markedIds
  }


  // ============================================
  // Tab注册系统集成
  // ============================================

  /**
   * 创建基于注册类型的Tab
   */
  const createTabFromRegisteredType = async (
    typeName: string,
    options: {
      id?: string
      label?: string
      data?: any
      libraryId?: string
      context?: Record<string, any>
    } = {}
  ) => {
    const tabType = tabRegistry.getType(typeName)
    if (!tabType) {
      console.error(`❌ Tab类型 "${typeName}" 未注册`)
      return null
    }

    const { id, label, data, libraryId, context = {} } = options
    const tabId = id || `${typeName}-${Date.now()}`

    // 检查是否允许多个实例
    if (!tabType.allowMultipleInstances) {
      const existingTab = tabs.value.find(tab => tab.type === typeName)
      if (existingTab) {
        switchToTab(existingTab.id)
        return existingTab
      }
    }

    tabs.value.forEach(tab => tab.active = false)

    const newTab: TabItem = {
      id: tabId,
      label: label || tabType.displayName,
      icon: tabType.icon,
      iconColor: tabType.iconColor,
      type: typeName,
      data: { ...data, libraryId },
      active: true,
      needUpdate: false // 让具体的组件负责数据加载，避免重复请求
    }

    // 创建Tab上下文
    const tabContext: TabContext = {
      libraryId,
      ...context,
      ...data
    }

    try {
      // 调用onInit生命周期
      const initResult = await tabType.onInit?.(tabContext)
      if (initResult && !initResult.success) {
        console.error(`❌ Tab ${typeName} 初始化失败:`, initResult.error)
        return null
      }

      tabs.value.push(newTab)
      activeTabId.value = tabId

      // 记录Tab打开历史
      await tabHistory.recordTabAction(newTab, 'open')

      // 调用onActive生命周期
      await tabType.onActive?.(tabContext)

      return newTab
    } catch (error) {
      console.error(`❌ 创建Tab ${typeName} 失败:`, error)
      return null
    }
  }

  /**
   * 执行Tab的生命周期钩子
   */
  const executeTabLifecycle = async (
    tabId: string,
    lifecycle: 'onActive' | 'onInactive' | 'onClose' | 'onDataLoad',
    additionalContext: Record<string, any> = {},
    pagination?: { limit?: number; offset?: number }
  ) => {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) {
      console.warn(`⚠️ Tab ${tabId} not found`)
      return { success: false, error: 'Tab not found' }
    }

    const tabType = tabRegistry.getType(tab.type)
    if (!tabType) {
      console.warn(`⚠️ Tab类型 ${tab.type} 未注册`)
      return { success: false, error: 'Tab type not registered' }
    }

    const context: TabContext = {
      libraryId: tab.data?.libraryId,
      ...tab.data,
      ...additionalContext
    }

    try {
      const lifecycleMethod = tabType[lifecycle]
      if (lifecycleMethod) {
        if (lifecycle === 'onDataLoad') {
          return await lifecycleMethod.call(tabType, context, pagination)
        } else {
          return await lifecycleMethod.call(tabType, context)
        }
      }
      return { success: true }
    } catch (error) {
      console.error(`❌ Tab ${tabId} 生命周期 ${lifecycle} 执行失败:`, error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * 设置默认Tab类型
   */
  const setDefaultTab = async (typeName: string, options: Record<string, any> = {}) => {
    if (tabs.value.length === 0) {
      const defaultTab = await createTabFromRegisteredType(typeName, {
        id: typeName,
        ...options
      })
      return defaultTab
    }
    return null
  }

  /**
   * 确保有默认Tab存在（如果没有Tab则自动创建home类型）
   */
  const ensureDefaultTabExists = async () => {
    if (tabs.value.length === 0) {
      return await setDefaultTab('home')
    }
    return tabs.value[0]
  }

  // ============================================
  // 持久化相关方法
  // ============================================

  /**
   * 保存Tab状态到localStorage
   */
  const saveTabsState = async () => {
    await tabPersistence.saveTabsState(tabs.value, activeTabId.value)
  }

  /**
   * 从localStorage恢复Tab状态
   * @param force - 强制恢复（用于素材库切换后重新加载对应库的 tabs）
   */
  const restoreTabsState = async (force = false): Promise<boolean> => {
    // 如果已经初始化过且非强制，跳过恢复
    if (hasInitialized.value && !force) {
      return true
    }

    try {
      isRestoringState.value = true

      const savedState = await tabPersistence.loadTabsState()
      if (!savedState || savedState.tabs.length === 0) {
        return false
      }

      // 清空当前tabs
      tabs.value = []

      // 恢复每个tab
      const restoredTabs: TabItem[] = []
      for (const tabState of savedState.tabs) {
        try {
          // 检查tab类型是否已注册
          if (!tabRegistry.isRegistered(tabState.type)) {
            console.warn(`⚠️ Tab类型 "${tabState.type}" 未注册，跳过恢复 tab: ${tabState.label}`)
            continue
          }

          // 重建tab对象
          const restoredTab: TabItem = {
            id: tabState.id,
            label: tabState.label,
            icon: tabState.icon,
            iconColor: tabState.iconColor,
            type: tabState.type,
            data: tabState.data,
            active: false, // 先设为false，后面统一设置active
            needUpdate: true // 恢复的tab需要重新加载数据
          }

          restoredTabs.push(restoredTab)
        } catch (error) {
          console.error(`❌ 恢复Tab失败: ${tabState.label}`, error)
        }
      }

      if (restoredTabs.length === 0) {
        return false
      }

      // 设置tabs
      tabs.value = restoredTabs

      // 恢复活跃状态
      const targetActiveId = savedState.activeTabId
      const activeTabIndex = tabs.value.findIndex(tab => tab.id === targetActiveId)

      if (activeTabIndex >= 0) {
        tabs.value[activeTabIndex].active = true
        activeTabId.value = targetActiveId
      } else if (tabs.value.length > 0) {
        // 如果目标活跃tab不存在，激活第一个tab
        tabs.value[0].active = true
        activeTabId.value = tabs.value[0].id
      }

      return true
    } catch (error) {
      console.error('❌ 恢复Tab状态失败:', error)
      return false
    } finally {
      isRestoringState.value = false
    }
  }

  /**
   * 清除保存的Tab状态
   */
  const clearTabsState = async () => {
    await tabPersistence.clearTabsState()
  }

  /**
   * 检查Tab是否可以关闭
   */
  const isTabClosable = (tabId: string): boolean => {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) return false

    const tabType = tabRegistry.getType(tab.type)
    if (!tabType) return true // 如果类型未注册，默认可关闭

    return tabType.allowClose !== false
  }

  // ============================================
  // 视图配置相关方法
  // ============================================

  /**
   * 获取Tab的视图配置
   */
  const getTabViewConfig = async (tabId: string): Promise<TabViewConfig | null> => {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) {
      console.warn(`⚠️ Tab ${tabId} not found`)
      return null
    }

    const tabType = tabRegistry.getType(tab.type)
    if (!tabType) {
      console.warn(`⚠️ Tab类型 ${tab.type} 未注册`)
      return null
    }

    if (!tabType.getViewConfig) {
      console.warn(`⚠️ Tab类型 ${tab.type} 未实现getViewConfig方法`)
      return null
    }

    try {
      // 构建Tab上下文
      const context: TabContext = {
        tabId: tab.id,
        libraryId: tab.data?.libraryId,
        tabData: tab.data,
        mediaStore: null, // 这里可以注入mediaStore
        ...tab.data
      }

      // 获取视图配置
      const viewConfig = await tabType.getViewConfig(context)

      return viewConfig
    } catch (error) {
      console.error(`❌ 获取Tab ${tabId} 视图配置失败:`, error)
      return null
    }
  }

  /**
   * 获取当前活跃Tab的视图配置
   */
  const getCurrentTabViewConfig = async (): Promise<TabViewConfig | null> => {
    const currentTab = tabs.value.find(tab => tab.active)
    if (!currentTab) return null

    return await getTabViewConfig(currentTab.id)
  }

  /**
   * 刷新Tab的视图配置
   */
  const refreshTabViewConfig = async (tabId: string): Promise<TabViewConfig | null> => {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) return null

    // 标记需要更新
    tab.needUpdate = true

    return await getTabViewConfig(tabId)
  }

  // ============================================
  // Tab历史相关方法
  // ============================================

  /**
   * 激活上一次的tab
   */
  const activateLastTab = () => {
    const currentActiveTab = getCurrentTab()
    const lastActivatedTab = tabHistory.getLastActivatedTab(currentActiveTab?.id)

    if (!lastActivatedTab) {
      return false
    }

    // 检查该tab是否仍然存在
    const tabExists = tabs.value.find(tab => tab.id === lastActivatedTab.id)
    if (tabExists) {
      switchToTab(lastActivatedTab.id)
      return true
    } else {
      return false
    }
  }

  /**
   * 重新打开最后关闭的tab
   */
  const reopenLastClosedTab = async () => {
    const lastClosedTab = tabHistory.getLastClosedTab()

    if (!lastClosedTab) {
      return null
    }

    // 根据tab类型重新创建tab
    try {
      let newTab: TabItem | null = null

      if (lastClosedTab.type === 'folder' || lastClosedTab.type === 'trash' ||
          lastClosedTab.type === 'uncategorized' || lastClosedTab.type === 'untagged') {
        // 文件夹类型的tab
        newTab = createTabFromFolder(
          {
            id: lastClosedTab.id.replace('folder-', ''),
            ...lastClosedTab.data
          },
          lastClosedTab.data?.libraryId
        )
      } else if (lastClosedTab.type === 'tag') {
        // 标签类型的tab
        newTab = await createTabFromTag(
          lastClosedTab.data,
          lastClosedTab.data?.libraryId
        )
      } else {
        // 使用注册系统创建其他类型的tab
        newTab = await createTabFromRegisteredType(lastClosedTab.type, {
          id: lastClosedTab.id,
          label: lastClosedTab.label,
          data: lastClosedTab.data,
          libraryId: lastClosedTab.data?.libraryId
        })
      }

      if (newTab) {
        return newTab
      }
    } catch (error) {
      console.error('❌ 重新打开Tab失败:', error)
    }

    return null
  }


  // 仅在首次调用时设置 watch 监听器（初始化已在模块级别完成）
  if (!globalHasSetupEffects) {
    globalHasSetupEffects = true

    // 监听tabs变化，自动保存状态
    watch(
      [tabs, activeTabId],
      () => {
        // 防抖保存，避免频繁写入
        if (!isRestoringState.value && tabs.value.length > 0) {
          nextTick(() => {
            saveTabsState()
          })
        }
      },
      { deep: true }
    )
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
    reopenLastClosedTab
  }
}
