import { BaseTabType } from '../TabTypes'
import type { TabContext, TabViewConfig } from '../TabRegistry'
import i18n from '../../i18n'
import { useSettingsStore } from '../../stores/settings'

export class WebviewTabType extends BaseTabType {
  name = 'webview'
  get displayName() { return i18n.global.t('composables.webviewTab.displayName', 'Webview') }
  icon = 'language'
  iconColor = '#6B7280'

  getViewConfig(context: TabContext): TabViewConfig {
    const settings = useSettingsStore()
    const originalUrl = context.tabData?.url || ''
    const url = settings.settings.rememberWebviewPage
      ? context.tabData?.lastUrl || originalUrl
      : originalUrl
    return {
      component: 'WebviewTabView',
      props: {
        url,
        // 收藏夹传入的会话隔离（persist:xxx）与静音设置
        partition: context.tabData?.partition || '',
        muted: context.tabData?.muted === true,
        // 本地 file:// 插件入口需关闭 webSecurity，页面才能 fetch 相对路径资源
        disableWebSecurity: context.tabData?.disableWebSecurity === true,
      },
      key: `${this.name}-${context.tabId}`
    }
  }
}

export const webviewTabType = new WebviewTabType()
