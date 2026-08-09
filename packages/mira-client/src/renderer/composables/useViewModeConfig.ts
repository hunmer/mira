import i18n from '../i18n'

/**
 * 视图模式配置 Composable
 */
export function useViewModeConfig() {
  // ============================================
  // 视图模式配置
  // ============================================
  const viewModes = [
    { value: 'grid', label: i18n.global.t('composables.useViewModeConfig.gridView'), icon: 'grid_view' },
    { value: 'list', label: i18n.global.t('composables.useViewModeConfig.listView'), icon: 'view_list' },
    { value: 'waterfall', label: i18n.global.t('composables.useViewModeConfig.waterfallView'), icon: 'view_quilt' }
  ]

  // ============================================
  // 视图模式工具方法
  // ============================================

  /**
   * 获取视图模式图标
   */
  const getViewModeIcon = (mode: string) => {
    const modeConfig = viewModes.find(m => m.value === mode)
    return modeConfig?.icon || 'grid_view'
  }

  /**
   * 获取视图模式标题
   */
  const getViewModeTitle = (mode: string) => {
    const modeConfig = viewModes.find(m => m.value === mode)
    return modeConfig?.label || i18n.global.t('composables.useViewModeConfig.gridView')
  }

  // ============================================
  // 返回接口
  // ============================================
  return {
    // 配置
    viewModes,
    
    // 方法
    getViewModeIcon,
    getViewModeTitle
  }
}
