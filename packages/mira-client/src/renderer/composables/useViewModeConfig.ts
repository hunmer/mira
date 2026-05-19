/**
 * 视图模式配置 Composable
 */
export function useViewModeConfig() {
  // ============================================
  // 视图模式配置
  // ============================================
  const viewModes = [
    { value: 'grid', label: '网格视图', icon: 'grid_view' },
    { value: 'list', label: '列表视图', icon: 'view_list' },
    { value: 'waterfall', label: '瀑布流视图', icon: 'view_quilt' }
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
    return modeConfig?.label || '网格视图'
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
