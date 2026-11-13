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
    if (String(tabData?.libraryId ?? '') !== String(eventData?.libraryId ?? '')) return false
    const isEmptyFolder = (v: any) => v == null || v === 0 || v === ''
    // updated（带 old_data）：folder 归属在空↔非空间切换（进入/离开未分类集合）才影响成员构成
    if (eventData.old_data) {
      return isEmptyFolder(eventData.folder_id) !== isEmptyFolder(eventData.old_data.folder_id)
    }
    // created/deleted/recovered 等：文件属于未分类即受影响
    return isEmptyFolder(eventData.folder_id)
  }
}

// 导出单例实例
export const uncategorizedTabType = new UncategorizedTabType()
