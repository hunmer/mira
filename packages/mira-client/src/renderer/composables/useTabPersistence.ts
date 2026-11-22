import { nextTick, watch, type Ref } from 'vue'
import { tabRegistry } from './TabRegistry'
import { tabPersistence } from './TabPersistence'
import { restoreTabViewMode, restoreTabAppliedFilterId, registerViewModeChangeCallback } from './useMediaTabData'
import { loadLibraryPrefs } from './LibraryPrefs'
import type { TabItem } from './useTabs'

/**
 * Tab 持久化子 composable
 *
 * 负责 tab 状态的保存与恢复：
 * - saveTabsState / restoreTabsState / clearTabsState 对接 TabPersistence 存储层
 * - setupPersistenceEffects 注册自动保存副作用（tabs 深度 watch + viewMode 变化回调）
 */
export function useTabPersistence(deps: {
  tabs: Ref<TabItem[]>
  activeTabId: Ref<string>
  isRestoringState: Ref<boolean>
  hasInitialized: Ref<boolean>
  createHomeTab: () => TabItem
}) {
  const { tabs, activeTabId, isRestoringState, hasInitialized, createHomeTab } = deps

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
      const scopeAtStart = tabPersistence.getScopeId()

      await loadLibraryPrefs()
      const savedState = await tabPersistence.loadTabsState()
      if (scopeAtStart !== tabPersistence.getScopeId()) {
        return false
      }
      if (!savedState || savedState.tabs.length === 0) {
        // 目标服务器/素材库没有已保存状态时，必须清空旧作用域的内存 tabs。
        // 仅返回 false 会让服务器切换后继续显示上一个服务器的 tabs。
        tabs.value = [createHomeTab()]
        activeTabId.value = 'home'
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
            needUpdate: true, // 恢复的tab需要重新加载数据
            filters: tabState.filters // 恢复每个 tab 的筛选条件
          }

          // 恢复per-tab viewMode
          if (tabState.viewMode) {
            restoreTabViewMode(tabState.id, tabState.viewMode)
          }
          // 恢复per-tab 已应用过滤器 id
          if (tabState.appliedFilterId !== undefined) {
            restoreTabAppliedFilterId(tabState.id, tabState.appliedFilterId)
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
   * 设置持久化副作用（tabs 深度 watch 自动保存 + viewMode 变化触发保存）。
   * 由组合根在首次调用 useTabs 时注册一次。
   */
  const setupPersistenceEffects = () => {
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

    // 注册viewMode变化回调，触发tab状态保存
    registerViewModeChangeCallback(() => {
      if (!isRestoringState.value && tabs.value.length > 0) {
        nextTick(() => {
          saveTabsState()
        })
      }
    })
  }

  return {
    saveTabsState,
    restoreTabsState,
    clearTabsState,
    setupPersistenceEffects
  }
}
