import { ref } from 'vue'
import { useHomeController } from '@renderer/controllers/HomeController'
import type { FileInfo } from '../../shared/types'

/**
 * 媒体操作相关的 Composable
 */
export function useMediaOperations() {
  // ============================================
  // 获取必要的控制器
  // ============================================
  const homeController = useHomeController()

  // ============================================
  // 状态
  // ============================================
  const selectedMediaItem = ref<FileInfo | null>(null)
  const showDetailSidebar = ref(false)

  // ============================================
  // 媒体操作方法
  // ============================================

  /**
   * 处理媒体点击
   */
  const handleMediaClick = (item: FileInfo) => {
    // 更新选中的媒体项以显示在侧边栏中，但不自动展开侧边栏
    selectedMediaItem.value = item
    // 同时保持原有的选择逻辑
    if (homeController && homeController.handleMediaClick) {
      homeController.handleMediaClick(item)
    }
  }

  /**
   * 处理媒体信息显示
   */
  const handleMediaInfo = (item: FileInfo) => {
    console.log('显示文件信息:', item)
    selectedMediaItem.value = item
    showDetailSidebar.value = true
  }

  /**
   * 处理设置文件夹
   */
  const handleMediaSetFolder = (item: FileInfo) => {
    console.log('设置文件夹:', item)
    selectedMediaItem.value = item
    showDetailSidebar.value = true
  }

  /**
   * 处理设置标签
   */
  const handleMediaSetTags = (item: FileInfo) => {
    console.log('设置标签:', item)
    selectedMediaItem.value = item
    showDetailSidebar.value = true
  }

  /**
   * 处理删除媒体
   */
  const handleMediaDelete = (item: FileInfo) => {
    console.log('删除文件:', item)
  }

  /**
   * 切换详细信息侧边栏
   */
  const toggleDetailSidebar = () => {
    showDetailSidebar.value = !showDetailSidebar.value
  }

  // ============================================
  // 返回接口
  // ============================================
  return {
    // 状态
    selectedMediaItem,
    showDetailSidebar,
    
    // 方法
    handleMediaClick,
    handleMediaInfo,
    handleMediaSetFolder,
    handleMediaSetTags,
    handleMediaDelete,
    toggleDetailSidebar
  }
}
