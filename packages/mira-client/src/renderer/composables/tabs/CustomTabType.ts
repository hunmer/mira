import { BaseTabType } from '../TabTypes'
import type { TabContext, TabViewConfig } from '../TabRegistry'
import i18n from '../../i18n'

export class CustomTabType extends BaseTabType {
  name = 'custom'
  get displayName() { return i18n.global.t('composables.customTab.displayName', 'Custom') }
  icon = 'dashboard_customize'
  iconColor = '#6B7280'

  getViewConfig(context: TabContext): TabViewConfig {
    return {
      component: context.tabData?.component,
      props: context.tabData?.props,
      key: `${this.name}-${context.tabId}`
    }
  }
}

export const customTabType = new CustomTabType()
