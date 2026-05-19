/**
 * Tab 历史记录管理
 *
 * 负责保存和管理 Tab 的历史记录（最多100条）
 * 包括激活历史、关闭历史等
 */

import type { TabItem } from './useTabs'
import ConfigStorage from '@renderer/utils/ConfigStorage'

const HISTORY_STORAGE_KEY = 'mira-tabs-history'
const MAX_HISTORY_SIZE = 100

/**
 * Tab历史记录项
 */
export interface TabHistoryItem {
  /** Tab ID */
  id: string
  /** Tab标签 */
  label: string
  /** Tab图标 */
  icon: string
  /** 图标颜色 */
  iconColor?: string
  /** Tab类型 */
  type: string
  /** Tab数据 */
  data?: any
  /** 操作类型: open-打开, close-关闭, activate-激活 */
  action: 'open' | 'close' | 'activate'
  /** 时间戳 */
  timestamp: number
}

/**
 * Tab历史记录管理类
 */
export class TabHistory {
  private static instance: TabHistory
  private storageKey: string
  private history: TabHistoryItem[] = []
  private maxSize: number

  private constructor() {
    this.storageKey = HISTORY_STORAGE_KEY
    this.maxSize = MAX_HISTORY_SIZE
  }

  static getInstance(): TabHistory {
    if (!TabHistory.instance) {
      TabHistory.instance = new TabHistory()
    }
    return TabHistory.instance
  }

  /**
   * 初始化历史记录（从存储加载）
   */
  async initialize(): Promise<void> {
    try {
      const stored = await ConfigStorage.getItem(this.storageKey)
      if (stored) {
        this.history = JSON.parse(stored)
        console.log(`📜 加载Tab历史记录: ${this.history.length}条`)
      }
    } catch (error) {
      console.error('❌ 加载Tab历史记录失败:', error)
      this.history = []
    }
  }

  /**
   * 记录Tab操作
   */
  async recordTabAction(
    tab: TabItem,
    action: 'open' | 'close' | 'activate'
  ): Promise<void> {
    const historyItem: TabHistoryItem = {
      id: tab.id,
      label: tab.label,
      icon: tab.icon,
      iconColor: tab.iconColor,
      type: tab.type,
      data: tab.data,
      action,
      timestamp: Date.now()
    }

    // 添加到历史记录开头
    this.history.unshift(historyItem)

    // 限制历史记录数量
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(0, this.maxSize)
    }

    // 保存到存储
    await this.saveHistory()

    console.log(`📝 记录Tab${action}: ${tab.label} (总计${this.history.length}条)`)
  }

  /**
   * 获取最后一次激活的Tab（排除当前活跃的Tab）
   */
  getLastActivatedTab(excludeTabId?: string): TabHistoryItem | null {
    const activateHistory = this.history.filter(
      item => item.action === 'activate' && item.id !== excludeTabId
    )

    return activateHistory.length > 0 ? activateHistory[0] : null
  }

  /**
   * 获取最后一次关闭的Tab
   */
  getLastClosedTab(): TabHistoryItem | null {
    const closeHistory = this.history.filter(item => item.action === 'close')
    return closeHistory.length > 0 ? closeHistory[0] : null
  }

  /**
   * 获取指定Tab的历史记录
   */
  getTabHistory(tabId: string): TabHistoryItem[] {
    return this.history.filter(item => item.id === tabId)
  }

  /**
   * 获取所有历史记录
   */
  getAllHistory(): TabHistoryItem[] {
    return [...this.history]
  }

  /**
   * 清除历史记录
   */
  async clearHistory(): Promise<void> {
    this.history = []
    await ConfigStorage.removeItem(this.storageKey)
    console.log('🗑️ 清除Tab历史记录')
  }

  /**
   * 保存历史记录到存储
   */
  private async saveHistory(): Promise<void> {
    try {
      await ConfigStorage.setItem(this.storageKey, JSON.stringify(this.history))
    } catch (error) {
      console.error('❌ 保存Tab历史记录失败:', error)
    }
  }

  /**
   * 获取历史记录统计信息
   */
  getStatistics(): {
    total: number
    openCount: number
    closeCount: number
    activateCount: number
  } {
    return {
      total: this.history.length,
      openCount: this.history.filter(item => item.action === 'open').length,
      closeCount: this.history.filter(item => item.action === 'close').length,
      activateCount: this.history.filter(item => item.action === 'activate').length
    }
  }

  /**
   * 删除指定Tab的历史记录
   */
  async removeTabHistory(tabId: string): Promise<void> {
    const beforeLength = this.history.length
    this.history = this.history.filter(item => item.id !== tabId)

    if (this.history.length !== beforeLength) {
      await this.saveHistory()
      console.log(`🗑️ 删除Tab ${tabId} 的历史记录 (删除${beforeLength - this.history.length}条)`)
    }
  }
}

// 导出单例实例
export const tabHistory = TabHistory.getInstance()
