import { BaseTabType } from '../TabTypes'
import type { TabContext, TabViewConfig } from '../TabRegistry'
import i18n from '../../i18n'

export class WebviewTabType extends BaseTabType {
  name = 'webview'
  get displayName() { return i18n.global.t('composables.webviewTab.displayName', 'Webview') }
  icon = 'language'
  iconColor = '#6B7280'

  getViewConfig(context: TabContext): TabViewConfig {
    return {
      component: 'WebviewTabView',
      props: { url: context.tabData?.url || '' },
      key: `${this.name}-${context.tabId}`
    }
  }
}

export const webviewTabType = new WebviewTabType()
