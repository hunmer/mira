import { MediaViewTabType } from '../TabTypes'
import type { TabContext, TabViewConfig } from '../TabRegistry'

export class TrashTabType extends MediaViewTabType {
  name = 'trash'
  displayName = '回收站'
  icon = 'delete'
  allowMultipleInstances = false // 只允许一个回收站tab
  cacheable = true

  protected getLabel(_context: TabContext): string {
    return '回收站'
  }

  protected getTabFilters(_context: TabContext): Record<string, any> {
    // 回收站：recycled 为 1 的文件
    return { recycled: 1, type: 'files' }
  }

  protected getViewType(): string {
    return 'trash'
  }

  protected generateTabId(_context: TabContext): string {
    return 'folder-trash'
  }

  async onInit(_context: TabContext) {
    console.log('🗑️ TrashTabType 初始化:', _context)
    return { success: true }
  }

  async onActive(_context: TabContext) {
    console.log('▶️ TrashTabType 激活:', _context)
    return { success: true }
  }

  async onInactive(_context: TabContext) {
    console.log('⏸️ TrashTabType 失活:', _context)
    return { success: true }
  }

  async onClose(_context: TabContext) {
    console.log('🔚 TrashTabType 关闭:', _context)
    return { success: true }
  }

  shouldUpdateForEvent(tabData: any, eventData: any): boolean {
    // 回收站关心 recycled 状态变更的文件
    if (tabData?.libraryId !== eventData.libraryId) return false
    return eventData.recycled != null
  }
}

// 导出单例实例
export const trashTabType = new TrashTabType()