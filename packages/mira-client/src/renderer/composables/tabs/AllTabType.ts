import { MediaViewTabType } from '../TabTypes'
import type { TabContext } from '../TabRegistry'
import i18n from '../../i18n'

export class AllTabType extends MediaViewTabType {
  name = 'all'
  get displayName() {
    return i18n.global.t('composables.allTab.displayName')
  }
  icon = 'folder_open'
  iconColor = '#6B7280'
  allowMultipleInstances = false // 全部文件只允许一个实例
  allowClose = true // 允许关闭all tab
  cacheable = true

  protected getLabel(_context: TabContext): string {
    return this.displayName // '全部文件'
  }

  protected getTabFilters(_context: TabContext): Record<string, any> {
    // All类型不需要特定的过滤器，返回空对象
    return {}
  }

  protected getViewType(): string {
    // 使用 'files' 而不是 'all'
    return 'files'
  }

  async onInit(_context: TabContext) {
    return { success: true }
  }

  async onActive(_context: TabContext) {
    return { success: true }
  }

  async onInactive(_context: TabContext) {
    return { success: true }
  }

  async onClose(_context: TabContext) {
    return { success: true }
  }

  shouldUpdateForEvent(tabData: any, eventData: any): boolean {
    return String(tabData?.libraryId ?? '') === String(eventData?.libraryId ?? '')
  }
}

// 导出单例实例
export const allTabType = new AllTabType()
