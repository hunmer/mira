import type { FilterRule } from '@/renderer/types/filter'
import type { Component } from 'vue'
import i18n from '../i18n'

// Tab生命周期返回结果
export interface TabResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Tab上下文 - 提供给Tab类型的依赖注入上下文
export interface TabContext {
  libraryId?: string
  mediaStore?: any
  filters?: Record<string, FilterRule>
  tabId?: string
  tabData?: any
  [key: string]: any
}

// Tab视图配置
export interface TabViewConfig {
  component: Component | string // Vue组件或组件名称
  props?: Record<string, any> // 传递给组件的props
  key?: string // 用于强制重新渲染的key
}

// Tab生命周期接口
export interface TabTypeDefinition {
  // 基本信息
  name: string
  displayName: string
  icon: string
  iconColor?: string

  // 视图配置 - 核心改变：每个tab对应一个视图组件
  getViewConfig?(context: TabContext): Promise<TabViewConfig> | TabViewConfig

  // 生命周期钩子
  onInit?(context: TabContext): Promise<TabResult>
  onActive?(context: TabContext): Promise<TabResult>
  onInactive?(context: TabContext): Promise<TabResult>
  onClose?(context: TabContext): Promise<TabResult>

  // 数据加载钩子（可选，某些tab可能不需要数据加载）
  onDataLoad?(context: TabContext, pagination?: { limit?: number; offset?: number }): Promise<TabResult>

  // 配置选项
  allowMultipleInstances?: boolean
  allowClose?: boolean // 是否允许关闭此tab
  defaultFilters?: Record<string, FilterRule>
  cacheable?: boolean

  // 事件响应：判断该类型 tab 是否需要因 WebSocket 事件而更新
  shouldUpdateForEvent?(tabData: any, eventData: any): boolean
}

// Tab注册系统核心
export class TabRegistry {
  private static instance: TabRegistry
  private registeredTypes = new Map<string, TabTypeDefinition>()

  private constructor() {}

  static getInstance(): TabRegistry {
    if (!TabRegistry.instance) {
      TabRegistry.instance = new TabRegistry()
    }
    return TabRegistry.instance
  }

  /**
   * 注册Tab类型
   */
  register(type: TabTypeDefinition): TabResult {
    try {
      this.registeredTypes.set(type.name, type)

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * 获取Tab类型定义
   */
  getType(typeName: string): TabTypeDefinition | null {
    return this.registeredTypes.get(typeName) || null
  }

  /**
   * 获取所有已注册的Tab类型
   */
  getAllTypes(): TabTypeDefinition[] {
    return Array.from(this.registeredTypes.values())
  }

  /**
   * 检查Tab类型是否已注册
   */
  isRegistered(typeName: string): boolean {
    return this.registeredTypes.has(typeName)
  }

  /**
   * 取消注册Tab类型
   */
  unregister(typeName: string): TabResult {
    try {
      if (this.registeredTypes.has(typeName)) {
        this.registeredTypes.delete(typeName)
        return { success: true }
      } else {
        return { success: false, error: i18n.global.t('composables.tabRegistry.typeNotFound', { name: typeName }) }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * 清空所有已注册的Tab类型
   */
  clear(): void {
    this.registeredTypes.clear()
  }

  /**
   * 验证Tab类型定义
   */
  validateType(type: TabTypeDefinition): TabResult {
    if (!type.name || typeof type.name !== 'string') {
      return { success: false, error: i18n.global.t('composables.tabRegistry.nameRequired') }
    }

    if (!type.displayName || typeof type.displayName !== 'string') {
      return { success: false, error: i18n.global.t('composables.tabRegistry.displayNameRequired') }
    }

    if (!type.icon || typeof type.icon !== 'string') {
      return { success: false, error: i18n.global.t('composables.tabRegistry.iconRequired') }
    }

    return { success: true }
  }
}

// 导出单例实例
export const tabRegistry = TabRegistry.getInstance()