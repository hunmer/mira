/**
 * Tab状态持久化管理
 *
 * 负责保存和恢复Tab状态到localStorage
 * 按服务器和素材库隔离存储，切换素材库时恢复对应的Tab状态
 */

import type { TabItem } from './useTabs'
import { getTabViewMode, getTabAppliedFilterId } from './useMediaTabData'
import ConfigStorage from '@renderer/utils/ConfigStorage'

const STORAGE_KEY_PREFIX = 'mira-tabs-state'
const ACTIVE_TAB_KEY_PREFIX = 'mira-active-tab-id'
const LAST_VIEW_KEY_PREFIX = 'mira-last-view-mode'

type ViewMode = 'grid' | 'list' | 'waterfall'

export const createTabScopeId = (
  serverIdentity: string | null | undefined,
  libraryId: string | null | undefined
): string | null => {
  if (!libraryId) return null

  // 使用服务器配置的稳定 ID，避免同一地址下的不同服务器账号串用 tabs。
  // 无 ID 时保留传入地址作为兼容回退（本地/旧调用场景）。
  const normalizedIdentity = serverIdentity?.replace(/\/$/, '') || 'local'
  return `${encodeURIComponent(normalizedIdentity)}::${libraryId}`
}

export interface TabState {
  id: string
  label: string
  icon: string
  iconColor?: string
  type: string
  data?: any
  active: boolean
  filters?: Record<string, any>
  viewMode?: 'grid' | 'list' | 'waterfall'
  /** 已应用的保存过滤器 id（恢复后书签图标旁精准展示名称） */
  appliedFilterId?: string | null
}

export interface TabsStateSnapshot {
  tabs: TabState[]
  activeTabId: string
  timestamp: number
}

/**
 * Tab持久化管理器
 */
export class TabPersistence {
  private static instance: TabPersistence
  private currentLibraryId: string | null = null
  // 当前素材库上次使用的视图模式（内存缓存，随保存/恢复快照更新）
  private lastViewMode: ViewMode | null = null

  private constructor() {}

  static getInstance(): TabPersistence {
    if (!TabPersistence.instance) {
      TabPersistence.instance = new TabPersistence()
    }
    return TabPersistence.instance
  }

  private getStorageKey(): string {
    return this.currentLibraryId
      ? `${STORAGE_KEY_PREFIX}-${this.currentLibraryId}`
      : STORAGE_KEY_PREFIX
  }

  private getActiveTabKey(): string {
    return this.currentLibraryId
      ? `${ACTIVE_TAB_KEY_PREFIX}-${this.currentLibraryId}`
      : ACTIVE_TAB_KEY_PREFIX
  }

  private getLastViewKey(): string {
    return this.currentLibraryId
      ? `${LAST_VIEW_KEY_PREFIX}-${this.currentLibraryId}`
      : LAST_VIEW_KEY_PREFIX
  }

  /** 当前库 scope id（serverId::libraryId），供库级偏好等模块复用同一隔离维度 */
  getScopeId(): string | null {
    return this.currentLibraryId
  }

  /** 当前素材库上次使用的视图模式（无记录时返回 null） */
  getLastViewMode(): ViewMode | null {
    return this.lastViewMode
  }

  private setLastViewMode(mode: ViewMode | null | undefined) {
    this.lastViewMode = mode || null
  }

  setCurrentLibraryId(libraryId: string | null) {
    this.currentLibraryId = libraryId
    this.lastViewMode = null
  }

  /**
   * 保存Tab状态到localStorage
   */
  async saveTabsState(tabs: TabItem[], activeTabId: string): Promise<boolean> {
    try {
      const tabsState: TabState[] = tabs.filter(tab => !tab.transient).map(tab => ({
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        iconColor: tab.iconColor,
        type: tab.type,
        data: tab.data,
        active: tab.active,
        filters: tab.filters,
        viewMode: getTabViewMode(tab.id),
        appliedFilterId: getTabAppliedFilterId(tab.id) ?? null
      }))

      const snapshot: TabsStateSnapshot = {
        tabs: tabsState,
        activeTabId,
        timestamp: Date.now()
      }

      await ConfigStorage.setItem(this.getStorageKey(), JSON.stringify(snapshot))
      await ConfigStorage.setItem(this.getActiveTabKey(), activeTabId)

      // 记录当前库上次使用的视图模式（活跃 tab 优先，其次最后一个媒体 tab）
      const lastMode = getTabViewMode(activeTabId)
        || tabs.map(tab => getTabViewMode(tab.id)).filter((mode): mode is ViewMode => !!mode).pop()
      this.setLastViewMode(lastMode)
      if (lastMode) {
        await ConfigStorage.setItem(this.getLastViewKey(), lastMode)
      }

      return true
    } catch (error) {
      console.error('Failed to save tabs state:', error)
      return false
    }
  }

  /**
   * 从localStorage恢复Tab状态
   */
  async loadTabsState(): Promise<TabsStateSnapshot | null> {
    try {
      const savedState = await ConfigStorage.getItem(this.getStorageKey())
      if (!savedState) {
        return null
      }

      const snapshot: TabsStateSnapshot = JSON.parse(savedState)

      if (!snapshot.tabs || !Array.isArray(snapshot.tabs)) {
        return null
      }

      const now = Date.now()
      const maxAge = 7 * 24 * 60 * 60 * 1000
      if (snapshot.timestamp && (now - snapshot.timestamp > maxAge)) {
        await this.clearTabsState()
        return null
      }

      // 从快照恢复当前库的上次视图模式（活跃 tab 优先）
      const activeTabState = snapshot.tabs.find(tab => tab.id === snapshot.activeTabId)
      this.setLastViewMode(
        activeTabState?.viewMode
        || snapshot.tabs.map(tab => tab.viewMode).filter((mode): mode is ViewMode => !!mode).pop()
      )

      return snapshot
    } catch (error) {
      console.error('Failed to load tabs state:', error)
      return null
    }
  }

  /**
   * 清除当前素材库的Tab状态
   */
  async clearTabsState(): Promise<void> {
    try {
      await ConfigStorage.removeItem(this.getStorageKey())
      await ConfigStorage.removeItem(this.getActiveTabKey())
      await ConfigStorage.removeItem(this.getLastViewKey())
      this.setLastViewMode(null)
    } catch (error) {
      console.error('Failed to clear tabs state:', error)
    }
  }

  /**
   * 获取上次活跃的Tab ID
   */
  async getLastActiveTabId(): Promise<string | null> {
    try {
      return await ConfigStorage.getItem(this.getActiveTabKey())
    } catch (error) {
      console.error('Failed to get last active tab:', error)
      return null
    }
  }

  /**
   * 检查是否有保存的Tab状态
   */
  async hasStoredState(): Promise<boolean> {
    try {
      return await ConfigStorage.getItem(this.getStorageKey()) !== null
    } catch (error) {
      return false
    }
  }

  /**
   * 获取存储大小（用于调试）
   */
  async getStorageSize(): Promise<{ tabs: number, total: number }> {
    try {
      const tabsData = await ConfigStorage.getItem(this.getStorageKey()) || ''
      const activeTabData = await ConfigStorage.getItem(this.getActiveTabKey()) || ''

      return {
        tabs: new Blob([tabsData]).size,
        total: new Blob([tabsData + activeTabData]).size
      }
    } catch (error) {
      return { tabs: 0, total: 0 }
    }
  }
}

// 导出单例实例
export const tabPersistence = TabPersistence.getInstance()
