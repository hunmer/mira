import { MediaViewTabType } from '../TabTypes'
import type { TabContext } from '../TabRegistry'
import i18n from '../../i18n'

export class UncategorizedTabType extends MediaViewTabType {
  name = 'uncategorized'
  get displayName() {
    return i18n.global.t('composables.uncategorizedTab.displayName')
  }
  icon = 'folder_special'
  allowMultipleInstances = false // 只允许一个未分类tab
  cacheable = true

  protected getLabel(_context: TabContext): string {
    return i18n.global.t('composables.uncategorizedTab.label')
  }

  protected getTabFilters(_context: TabContext): Record<string, any> {
    // 未分类：folder 为 null 的文件
    return { folder: '=null', type: 'files' }
  }

  protected getViewType(): string {
    // 使用 'files' 而不是 'uncategorized'，通过 filter 来区分
    return 'files'
  }

  protected generateTabId(_context: TabContext): string {
    return 'folder-uncategorized'
  }

  async onInit(_context: TabContext) {
    console.log('📁 UncategorizedTabType 初始化:', _context)
    return { success: true }
  }

  async onActive(_context: TabContext) {
    console.log('▶️ UncategorizedTabType 激活:', _context)
    return { success: true }
  }

  async onInactive(_context: TabContext) {
    console.log('⏸️ UncategorizedTabType 失活:', _context)
    return { success: true }
  }

  async onClose(_context: TabContext) {
    console.log('🔚 UncategorizedTabType 关闭:', _context)
    return { success: true }
  }

  shouldUpdateForEvent(tabData: any, eventData: any): boolean {
    if (tabData?.libraryId !== eventData.libraryId) return false
    // 文件的 folder_id 为空/null → 未分类文件发生了变化
    return eventData.folder_id == null || eventData.folder_id === 0 || eventData.folder_id === ''
  }
}

// 导出单例实例
export const uncategorizedTabType = new UncategorizedTabType()