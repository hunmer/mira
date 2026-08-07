import { MediaViewTabType } from '../TabTypes'
import type { TabContext } from '../TabRegistry'

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
    const libMatch = String(tabData?.libraryId) !== String(eventData.libraryId)
    const hasField = eventData.recycled != null || eventData.deletedCount != null || eventData.deletedAt != null || eventData.recovered != null
    console.log(`[TrashTabType] shouldUpdate: tabData.libraryId="${tabData?.libraryId}" (${typeof tabData?.libraryId}) eventData.libraryId="${eventData.libraryId}" (${typeof eventData.libraryId}) libMatch=${libMatch} hasField=${hasField} recycled=${eventData.recycled} deletedCount=${eventData.deletedCount} deletedAt=${eventData.deletedAt} recovered=${eventData.recovered}`)
    if (libMatch) return false
    return hasField
  }
}

// 导出单例实例
export const trashTabType = new TrashTabType()