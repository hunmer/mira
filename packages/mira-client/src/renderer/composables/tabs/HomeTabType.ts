import { BaseTabType } from '../TabTypes'
import type { TabContext, TabResult, TabViewConfig } from '../TabRegistry'

export class HomeTabType extends BaseTabType {
  name = 'home'
  displayName = '首页'
  icon = 'home'
  iconColor = '#3B82F6'
  allowMultipleInstances = false // 首页只允许一个实例
  allowClose = false // 首页不允许关闭，作为默认tab
  cacheable = false // 首页不需要缓存

  // 返回Home视图组件配置
  getViewConfig(_context: TabContext): TabViewConfig {
    return {
      component: 'HomeTabView',
      props: {
        tabId: _context.tabId,
        libraryId: _context.libraryId
      },
      key: 'home-view'
    }
  }

  async onInit(_context: TabContext): Promise<TabResult> {
    console.log('🏠 HomeTabType 初始化')
    return { success: true }
  }

  async onActive(_context: TabContext): Promise<TabResult> {
    console.log('▶️ HomeTabType 激活')
    return { success: true }
  }

  async onInactive(_context: TabContext): Promise<TabResult> {
    console.log('⏸️ HomeTabType 失活')
    return { success: true }
  }

  async onClose(_context: TabContext): Promise<TabResult> {
    console.log('🔚 HomeTabType 关闭')
    return { success: true }
  }

  // Home类型不需要数据加载
}

// 导出单例实例
export const homeTabType = new HomeTabType()