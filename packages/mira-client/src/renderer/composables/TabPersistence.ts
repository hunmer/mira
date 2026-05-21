/**
 * Tab状态持久化管理
 *
 * 负责保存和恢复Tab状态到localStorage
 * 按素材库ID隔离存储，切换素材库时恢复对应的Tab状态
 */

import type { TabItem } from './useTabs'
import ConfigStorage from '@renderer/utils/ConfigStorage'

const STORAGE_KEY_PREFIX = 'mira-tabs-state'
const ACTIVE_TAB_KEY_PREFIX = 'mira-active-tab-id'

export interface TabState {
  id: string
  label: string
  icon: string
  iconColor?: string
  type: string
  data?: any
  active: boolean
  filters?: Record<string, any>
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

  setCurrentLibraryId(libraryId: string | null) {
    this.currentLibraryId = libraryId
  }

  /**
   * 保存Tab状态到localStorage
   */
  async saveTabsState(tabs: TabItem[], activeTabId: string): Promise<boolean> {
    try {
      const tabsState: TabState[] = tabs.map(tab => ({
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        iconColor: tab.iconColor,
        type: tab.type,
        data: tab.data,
        active: tab.active,
        filters: tab.filters
      }))

      const snapshot: TabsStateSnapshot = {
        tabs: tabsState,
        activeTabId,
        timestamp: Date.now()
      }

      await ConfigStorage.setItem(this.getStorageKey(), JSON.stringify(snapshot))
      await ConfigStorage.setItem(this.getActiveTabKey(), activeTabId)

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