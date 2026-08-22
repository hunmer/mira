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
      props: {
        url: context.tabData?.url || '',
        // 收藏夹传入的会话隔离（persist:xxx）与静音设置
        partition: context.tabData?.partition || '',
        muted: context.tabData?.muted === true,
      },
      key: `${this.name}-${context.tabId}`
    }
  }
}

export const webviewTabType = new WebviewTabType()
