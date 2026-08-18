import { BaseTabType } from '../TabTypes'
import type { TabContext, TabViewConfig } from '../TabRegistry'
import i18n from '../../i18n'

export class LocalFolderTabType extends BaseTabType {
  name = 'local-folder'
  get displayName() { return i18n.global.t('views.localFolder.title') }
  icon = 'storage'
  iconColor = '#64748B'

  getViewConfig(context: TabContext): TabViewConfig {
    return {
      component: 'LocalFolderTabView',
      props: {
        tabId: context.tabId,
        rootPath: context.tabData?.rootPath || '',
        libraryId: context.tabData?.libraryId,
        tabData: context.tabData,
      },
      key: `${this.name}-${context.tabId}`,
    }
  }
}

export const localFolderTabType = new LocalFolderTabType()
