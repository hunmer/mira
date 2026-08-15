import type { TabTypeDefinition, TabContext, TabResult, TabViewConfig } from './TabRegistry'
import i18n from '../i18n'

// 抽象基类 - 所有Tab类型的基础
export abstract class BaseTabType implements TabTypeDefinition {
  abstract name: string
  abstract displayName: string
  abstract icon: string
  iconColor?: string
  allowMultipleInstances?: boolean = true
  allowClose?: boolean = true // 默认允许关闭
  cacheable?: boolean = true

  // 默认视图配置 - 子类需要重写此方法
  getViewConfig(_context: TabContext): TabViewConfig {
    return {
      component: 'div',
      props: {
        innerHTML: `<div>${i18n.global.t('composables.tabTypes.undefinedView', { name: this.name })}</div>`
      }
    }
  }

  async onInit(_context: TabContext): Promise<TabResult> {
    return { success: true }
  }

  async onActive(_context: TabContext): Promise<TabResult> {
    return { success: true }
  }

  async onInactive(_context: TabContext): Promise<TabResult> {
    return { success: true }
  }

  async onClose(_context: TabContext): Promise<TabResult> {
    return { success: true }
  }

  // 数据加载钩子变为可选，某些tab可能不需要数据加载
  async onDataLoad?(_context: TabContext, pagination?: { limit?: number; offset?: number }): Promise<TabResult>

  // 默认：不响应任何事件
  shouldUpdateForEvent(_tabData: any, _eventData: any): boolean {
    return false
  }
}

// 媒体视图基类 - 提供通用的媒体文件展示视图
export abstract class MediaViewTabType extends BaseTabType {
  cacheable = true

  // 返回媒体列表视图配置
  getViewConfig(context: TabContext): TabViewConfig {
    return {
      component: 'MediaTabListView',
      props: {
        label: this.getLabel(context),
        tabId: context.tabId,
        libraryId: context.libraryId,
        filters: this.getTabFilters(context),
        viewType: this.getViewType()
      },
      key: `${this.name}-${context.tabId || 'default'}`
    }
  }

  // 抽象方法：获取Tab标签名称
  protected abstract getLabel(context: TabContext): string

  // 子类需要实现的抽象方法
  protected abstract getTabFilters(context: TabContext): Record<string, any>
  protected abstract getViewType(): string

  // 保留数据加载钩子，但现在主要用于缓存和预加载
  async onDataLoad(context: TabContext, pagination?: { limit?: number; offset?: number }): Promise<TabResult> {
    try {
      const { mediaStore, libraryId } = context

      if (!mediaStore || !libraryId) {
        return { success: false, error: 'MediaStore or libraryId not available' }
      }

      // 构建tabInfo对象
      const tabInfo = {
        id: context.tabId || this.generateTabId(context),
        type: this.name,
        data: context.tabData,
        filters: this.getTabFilters(context),
        libraryId
      }

      // 调用MediaStore的fetchFilesForTab方法进行预加载/缓存
      const result = await mediaStore.fetchFilesForTab(tabInfo, pagination || {})

      return {
        success: result.success,
        data: result.data,
        error: result.error
      }
    } catch (error) {
      console.error(`❌ MediaViewTabType.onDataLoad error for ${this.name}:`, error)
      return {
        success: false,
        error: `Failed to load data for ${this.name}: ${String(error)}`
      }
    }
  }

  // 生成tab ID
  protected generateTabId(context: TabContext): string {
    return context.tabId || `${this.name}-${Date.now()}`
  }
}