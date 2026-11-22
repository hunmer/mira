import { markRaw, type Component, type Ref } from 'vue'
import { tabRegistry, type TabContext, type TabViewConfig } from './TabRegistry'
import { tabHistory } from './TabHistory'
import i18n from '../i18n'
import type { TabItem, WebviewTabOptions, CustomTabOptions, CustomTabView } from './useTabs'
import type { SwitchTabOptions } from './useTabActivation'

/**
 * Tab 生命周期子 composable
 *
 * 负责 tab 的创建与销毁全流程：
 * - 各类创建入口（createTabFromFolder / createTabFromTag / createTabFromRegisteredType / webview / custom）
 * - 关闭与克隆（closeTab / closeOtherTabs / cloneTab / reopenLastClosedTab）
 * - Tab 类型生命周期钩子执行（executeTabLifecycle）与视图配置读取（getTabViewConfig 族）
 * - needUpdate 更新标记（setTabNeedUpdate / setAllTabsNeedUpdate / markTabsForEvent）
 */

/** 将文件夹/标签的数字颜色转换为可直接用于 CSS 的十六进制颜色。 */
const normalizeTabColor = (color: unknown): string | undefined => {
  if (typeof color === 'number' && color > 0) return `#${color.toString(16).padStart(6, '0')}`
  if (typeof color === 'string') {
    if (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl')) return color
    const numericColor = Number(color)
    if (Number.isFinite(numericColor) && numericColor > 0) return `#${numericColor.toString(16).padStart(6, '0')}`
  }
  return undefined
}

export function useTabLifecycle(deps: {
  tabs: Ref<TabItem[]>
  activeTabId: Ref<string>
  switchToTab: (tabId: string, options?: SwitchTabOptions) => void
}) {
  const { tabs, activeTabId, switchToTab } = deps

  // 创建默认home tab的异步方法
  const createDefaultHomeTab = async () => {
    if (tabs.value.length === 0) {
      try {
        await createTabFromRegisteredType('home', {
          id: 'home',
          label: i18n.global.t('composables.useTabs.homeLabel')
        })
      } catch (error) {
        console.error('❌ 创建默认home tab失败:', error)
      }
    }
  }

  /**
   * 关闭指定的tab
   */
  const closeTab = async (
    tabId: string,
    options?: SwitchTabOptions
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
    const folderId = String(folder.id)
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
      iconColor: normalizeTabColor(folder.iconColor ?? folder.color),
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
    const normalizedTagId = originalTagId.replace(/^tag-/, '')
    const tagName = tag.title || tag.name || tag.label || normalizedTagId
    const tabLabel = i18n.global.t('composables.tagTab.tabLabel', { name: tagName })

    // 确保tab ID不会重复添加前缀
    const tagId = `tag-${normalizedTagId}`
    const tagData = { ...tag, id: normalizedTagId }

    // 使用注册系统创建Tab
    return await createTabFromRegisteredType('tag', {
      id: tagId,
      label: tabLabel,
      data: tagData,
      libraryId,
      context: {
        // 明确传递标签上下文信息
        id: normalizedTagId,
        tagId: normalizedTagId,
        name: tagName,
        tagName,
        title: tag.title,
        color: tag.color,
        fileCount: tag.fileCount,
        tabData: tagData
      },
      iconColor: normalizeTabColor(tag.color)
    })
  }

  /**
   * 克隆 Tab
   */
  const cloneTab = (tab: TabItem) => {
    tabs.value.forEach(t => t.active = false)

    const clonedTab: TabItem = {
      id: `${tab.id}-clone-${Date.now()}`,
      label: `${tab.label} ${i18n.global.t('composables.useTabs.copySuffix')}`,
      icon: tab.icon,
      iconColor: tab.iconColor,
      type: tab.type,
      data: tab.data,
      active: true,
      needUpdate: true,
      transient: tab.transient
    }

    tabs.value.push(clonedTab)
    activeTabId.value = clonedTab.id
    return clonedTab
  }

  /**
   * 关闭其他 Tab
   */
  const closeOtherTabs = (keepTabId: string) => {
    tabs.value = tabs.value.filter(tab => tab.id === keepTabId || tab.id === 'home')
    const keepTab = tabs.value.find(tab => tab.id === keepTabId)
    if (keepTab) {
      tabs.value.forEach(tab => tab.active = tab.id === keepTabId)
      activeTabId.value = keepTabId
    }
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
    // 文件属性更新由详情组件/WebSocket 局部同步，禁止标记 tab 重载，避免列表闪烁
    // 例外1：folder 归属变化影响列表成员构成（FolderTabType 等已按 old_data.folder_id 匹配）
    const folderChanged = !!eventData?.old_data
      && String(eventData.old_data.folder_id ?? '') !== String(eventData.folder_id ?? '')
    // 例外2：tags 变化影响标签类 tab 的列表成员构成（进入/离开/换标签），
    // 由各 TabType.shouldUpdateForEvent 精确匹配新旧 tags，不受影响的 tabType 应自行排除
    const tagsChanged = !!eventData?.old_data
      && String(eventData.old_data.tags ?? '') !== String(eventData.tags ?? '')
    if (_eventType === 'updated' && !folderChanged && !tagsChanged) return markedIds
    for (const tab of tabs.value) {
      const tabType = tabRegistry.getType(tab.type)
      if (!tabType?.shouldUpdateForEvent) continue
      const matched = tabType.shouldUpdateForEvent(tab.data, eventData)
      if (matched) {
        tab.needUpdate = true
        markedIds.push(tab.id)
      }
    }
    return markedIds
  }

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
      transient?: boolean
      icon?: string
      iconColor?: string
    } = {}
  ) => {
    const tabType = tabRegistry.getType(typeName)
    if (!tabType) {
      console.error(`❌ Tab类型 "${typeName}" 未注册`)
      return null
    }

    const { id, label, data, libraryId, context = {} } = options
    const tabId = id || `${typeName}-${Date.now()}`

    // 同 ID 去重：已存在相同 tabId 则直接切换
    const existingTab = tabs.value.find(tab => tab.id === tabId)
    if (existingTab) {
      switchToTab(existingTab.id)
      return existingTab
    }

    // 同类型去重：不允许同类型多实例时，复用已有 tab
    if (!tabType.allowMultipleInstances) {
      const sameTypeTab = tabs.value.find(tab => tab.type === typeName)
      if (sameTypeTab) {
        switchToTab(sameTypeTab.id)
        return sameTypeTab
      }
    }

    tabs.value.forEach(tab => tab.active = false)

    const newTab: TabItem = {
      id: tabId,
      label: label || tabType.displayName,
      icon: options.icon || tabType.icon,
      iconColor: options.iconColor || tabType.iconColor,
      type: typeName,
      data: { ...data, libraryId },
      active: true,
      needUpdate: true, // 新创建的tab需要加载数据
      transient: options.transient
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

  const createWebviewTab = async (url: string, options: WebviewTabOptions = {}) => {
    return await createTabFromRegisteredType('webview', {
      ...options,
      data: { ...options.data, url }
    })
  }

  const createCustomTab = async (component: CustomTabView, options: CustomTabOptions = {}) => {
    return await createTabFromRegisteredType('custom', {
      ...options,
      data: {
        ...options.data,
        component: options.renderMode === 'dom' ? component : markRaw(component as Component),
        props: options.props,
        renderContext: options.context,
        renderMode: options.renderMode
      },
      context: options.context,
      transient: true
    })
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

  return {
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
  }
}
