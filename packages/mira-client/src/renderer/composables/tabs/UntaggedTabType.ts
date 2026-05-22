import { MediaViewTabType } from '../TabTypes'
import type { TabContext, TabViewConfig } from '../TabRegistry'

export class UntaggedTabType extends MediaViewTabType {
  name = 'untagged'
  displayName = '未标签'
  icon = 'label_off'
  allowMultipleInstances = false // 只允许一个未标签tab
  cacheable = true

  protected getLabel(_context: TabContext): string {
    return '未标签'
  }

  protected getTabFilters(_context: TabContext): Record<string, any> {
    // 未标签：tags 为 null 的文件
    return { tags: '= null', type: 'files' }
  }

  protected getViewType(): string {
    // 使用 'files' 而不是 'untagged'，通过 filter 来区分
    return 'files'
  }

  protected generateTabId(_context: TabContext): string {
    return 'folder-untagged'
  }

  async onInit(_context: TabContext) {
    console.log('🏷️ UntaggedTabType 初始化:', _context)
    return { success: true }
  }

  async onActive(_context: TabContext) {
    console.log('▶️ UntaggedTabType 激活:', _context)
    return { success: true }
  }

  async onInactive(_context: TabContext) {
    console.log('⏸️ UntaggedTabType 失活:', _context)
    return { success: true }
  }

  async onClose(_context: TabContext) {
    console.log('🔚 UntaggedTabType 关闭:', _context)
    return { success: true }
  }

  shouldUpdateForEvent(tabData: any, eventData: any): boolean {
    if (tabData?.libraryId !== eventData.libraryId) return false
    // 事件带 tags 信息且为空 → 未标签文件受影响
    if (eventData.tags && Array.isArray(eventData.tags)) {
      return eventData.tags.length === 0
    }
    return false
  }
}

// 导出单例实例
export const untaggedTabType = new UntaggedTabType()