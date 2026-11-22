import { computed, type Ref } from 'vue'
import { tabHistory } from './TabHistory'
import type { TabItem } from './useTabs'

/**
 * Tab 激活策略子 composable
 *
 * 负责 tab 激活状态的查询与切换：
 * - switchToTab / switchToTabSimple 切换激活（含懒加载触发与激活历史记录）
 * - activateLastTab / canActivateLastTab 基于 TabHistory 的回退激活
 */

/** switchToTab 的可选回调 */
export interface SwitchTabOptions {
  onSwitchCallback?: (tab: TabItem) => void
  lazyLoadHandler?: (tab: TabItem) => Promise<void>
}

export function useTabActivation(deps: {
  tabs: Ref<TabItem[]>
  activeTabId: Ref<string>
}) {
  const { tabs, activeTabId } = deps

  /**
   * 获取当前活动的tab
   */
  const getCurrentTab = () => {
    return tabs.value.find(tab => tab.active)
  }

  /**
   * 切换到指定的tab，支持懒加载
   */
  const switchToTab = (
    tabId: string,
    options?: SwitchTabOptions
  ) => {
    const { onSwitchCallback, lazyLoadHandler } = options || {}
    // 初始化阶段可能重复切换到已激活的首页，直接短路避免触发响应式重算。
    const currentActiveTab = tabs.value.find(tab => tab.active)
    if (currentActiveTab?.id === tabId && currentActiveTab.type === 'home') {
      currentActiveTab.needUpdate = false
      return
    }

    tabs.value.forEach(tab => {
      tab.active = tab.id === tabId
    })
    activeTabId.value = tabId

    const activeTab = tabs.value.find(tab => tab.id === tabId)
    if (activeTab) {
      const isHomeTab = activeTab.type === 'home'
      // 记录Tab激活历史
      tabHistory.recordTabAction(activeTab, 'activate')

      // 首页由自身视图初始化，不执行媒体 Tab 的切换回调。
      if (onSwitchCallback && !isHomeTab) {
        onSwitchCallback(activeTab)
      }

      // 首页由 HomeTabView 自己初始化，不参与媒体 Tab 的懒加载。
      if (isHomeTab) {
        activeTab.needUpdate = false
      } else if (lazyLoadHandler && activeTab.needUpdate) {
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
   * 是否可以激活上一次的tab（供 UI 显示禁用态）
   * 依赖响应式的 tabs，激活/关闭等操作都会改变 tabs 从而触发重新计算
   */
  const canActivateLastTab = computed(() => {
    const currentActiveTab = getCurrentTab()
    const lastActivatedTab = tabHistory.getLastActivatedTab(currentActiveTab?.id)
    if (!lastActivatedTab) return false
    // 上一次激活的 tab 必须仍然存在
    return tabs.value.some(tab => tab.id === lastActivatedTab.id)
  })

  return {
    getCurrentTab,
    switchToTab,
    switchToTabSimple,
    activateLastTab,
    canActivateLastTab
  }
}
