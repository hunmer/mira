import { MediaViewTabType } from '../TabTypes'
import type { TabContext, TabViewConfig } from '../TabRegistry'

export class UncategorizedTabType extends MediaViewTabType {
  name = 'uncategorized'
  displayName = '未分类'
  icon = 'folder_special'
  allowMultipleInstances = false // 只允许一个未分类tab
  cacheable = true

  protected getLabel(_context: TabContext): string {
    return '未分类'
  }

  protected getTabFilters(_context: TabContext): Record<string, any> {
    // 未分类：folder 为 null 的文件
    return { folder: null, type: 'files' }
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
}

// 导出单例实例
export const uncategorizedTabType = new UncategorizedTabType()