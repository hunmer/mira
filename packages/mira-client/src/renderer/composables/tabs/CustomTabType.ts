import { BaseTabType } from '../TabTypes'
import type { TabContext, TabViewConfig } from '../TabRegistry'
import i18n from '../../i18n'

export class CustomTabType extends BaseTabType {
  name = 'custom'
  get displayName() { return i18n.global.t('composables.customTab.displayName', 'Custom') }
  icon = 'dashboard_customize'
  iconColor = '#6B7280'

  getViewConfig(context: TabContext): TabViewConfig {
    const view = context.tabData?.component
    const isDomRenderer = context.tabData?.renderMode === 'dom'
    return {
      component: isDomRenderer ? 'PluginCustomTabView' : view,
      props: isDomRenderer
        ? { render: view, context: { ...(context.tabData?.renderContext || {}), tabId: context.tabId } }
        : context.tabData?.props,
      key: `${this.name}-${context.tabId}`
    }
  }
}

export const customTabType = new CustomTabType()
