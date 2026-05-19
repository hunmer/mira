import { useRouter } from 'vue-router'
import { electronService } from '@renderer/services'
import { environment } from '@renderer/utils'
import { computed } from 'vue'

/**
 * 窗口控制和导航功能 Composable
 */
export function useWindowAndNavigation() {
  const router = useRouter()
  
  // ============================================
  // 计算属性
  // ============================================
  const isDesktop = computed(() => environment.isElectron)

  // ============================================
  // 窗口控制方法
  // ============================================
  
  /**
   * 关闭窗口
   */
  const handleWindowClose = async () => {
    if (isDesktop.value) {
      await electronService.closeWindow()
    }
  }

  /**
   * 最小化窗口
   */
  const handleWindowMinimize = async () => {
    if (isDesktop.value) {
      await electronService.minimizeWindow()
    }
  }

  /**
   * 最大化窗口
   */
  const handleWindowMaximize = async () => {
    if (isDesktop.value) {
      await electronService.maximizeWindow()
    }
  }

  // ============================================
  // 导航方法
  // ============================================
  
  /**
   * 导航到文件上传
   */
  const navigateToFileUpload = () => {
    router.push({ name: 'FileUpload' })
  }

  /**
   * 导航到本地插件
   */
  const navigateToLocalPlugins = () => {
    router.push({ name: 'LocalPlugins' })
  }

  /**
   * 导航到插件市场
   */
  const navigateToPluginMarketplace = () => {
    router.push({ name: 'PluginMarketplace' })
  }

  /**
   * 导航到设置
   */
  const navigateToSettings = () => {
    router.push({ name: 'Settings' })
  }

  // ============================================
  // 返回接口
  // ============================================
  return {
    // 计算属性
    isDesktop,
    
    // 窗口控制方法
    handleWindowClose,
    handleWindowMinimize,
    handleWindowMaximize,
    
    // 导航方法
    navigateToFileUpload,
    navigateToLocalPlugins,
    navigateToPluginMarketplace,
    navigateToSettings
  }
}
