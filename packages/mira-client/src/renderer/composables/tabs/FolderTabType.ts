import { MediaViewTabType } from '../TabTypes'
import type { TabContext } from '../TabRegistry'
import { useFolderStore } from '../../stores/folder'
import i18n from '../../i18n'

export class FolderTabType extends MediaViewTabType {
  name = 'folder'
  get displayName() {
    return i18n.global.t('composables.folderTab.displayName')
  }
  icon = 'folder'
  allowMultipleInstances = true // 允许多个文件夹tab
  cacheable = true

  protected getLabel(context: TabContext): string {
    const folderId = context.id || context.folderId || context.tabData?.id

    if (folderId) {
      // 从 folderStore 获取文件夹信息
      const folderStore = useFolderStore()
      const folder = folderStore.folders.find(f => f.id === parseInt(folderId.toString()))

      if (folder) {
        return folder.title || folder.path || i18n.global.t('composables.folderTab.fallbackLabel', { id: folderId })
      }
    }

    // 回退到 context 中的数据
    return context.tabData?.name || context.tabData?.title || i18n.global.t('composables.folderTab.fallbackLabel', { id: folderId || 'unknown' })
  }

  protected getTabFilters(context: TabContext): Record<string, any> {
    // Folder类型需要根据文件夹ID过滤
    const folderId = context.id || context.folderId || context.tabData?.id
    return folderId ? { folder: parseInt(folderId) } : {}
  }

  protected getViewType(): string {
    // 使用 'files' 而不是 'folder'，通过 filter 来区分
    return 'files'
  }

  protected generateTabId(context: TabContext): string {
    const folderId = context.id || context.folderId || context.tabData?.id || 'unknown'
    return folderId.startsWith('folder-') ? folderId : `folder-${folderId}`
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
    if (tabData?.libraryId !== eventData.libraryId) return false
    const tabFolderId = tabData?.id || tabData?.folderId
    if (!tabFolderId) return false
    if (String(tabFolderId) === String(eventData.folder_id)) return true
    if (eventData.old_data && String(tabFolderId) === String(eventData.old_data.folder_id)) return true
    return false
  }
}

// 导出单例实例
export const folderTabType = new FolderTabType()