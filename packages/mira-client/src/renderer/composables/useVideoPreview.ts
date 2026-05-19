import { ref, type Ref } from 'vue'
import type { FileInfo } from '../../shared/types'

export interface UseVideoPreviewOptions {
  /** 触发视频预览的延迟时间（毫秒） */
  hoverDelay?: number
  /** 是否启用视频预览 */
  enabled?: boolean
}

export interface UseVideoPreviewReturn {
  /** 是否显示视频预览 */
  showPreview: Ref<boolean>
  /** 当前视频时间 */
  currentTime: Ref<number>
  /** 视频总时长 */
  duration: Ref<number>
  /** 视频元素引用 */
  videoRef: Ref<HTMLVideoElement | undefined>
  /** 处理鼠标进入触发容器 */
  handleMouseEnter: (item: FileInfo) => void
  /** 处理鼠标离开触发容器 */
  handleMouseLeave: () => void
  /** 处理鼠标在视频上移动（用于时间轴预览） */
  handleMouseMove: (event: MouseEvent) => void
  /** 处理视频元数据加载完成 */
  handleVideoLoaded: () => void
  /** 获取当前预览的视频项 */
  currentVideoItem: Ref<FileInfo | null>
}

/**
 * 视频预览悬停功能的 composable
 * 支持自定义触发容器和展示容器
 */
export function useVideoPreview(options: UseVideoPreviewOptions = {}): UseVideoPreviewReturn {
  const { hoverDelay = 300, enabled = true } = options

  // 状态
  const showPreview = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const videoRef = ref<HTMLVideoElement>()
  const currentVideoItem = ref<FileInfo | null>(null)

  // 定时器
  let hoverTimeout: NodeJS.Timeout | undefined

  /**
   * 处理鼠标进入触发容器
   */
  const handleMouseEnter = (item: FileInfo) => {
    if (!enabled || !item.url) {
      return
    }

    // 清除之前的定时器
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }

    // 延迟显示视频预览，避免快速移过时触发
    hoverTimeout = setTimeout(() => {
      currentVideoItem.value = item
      showPreview.value = true
    }, hoverDelay)
  }

  /**
   * 处理鼠标离开触发容器
   */
  const handleMouseLeave = () => {
    // 清除延迟定时器
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = undefined
    }

    // 停止视频播放并隐藏预览
    if (videoRef.value) {
      videoRef.value.pause()
      videoRef.value.currentTime = 0
    }

    showPreview.value = false
    currentTime.value = 0
    currentVideoItem.value = null
  }

  /**
   * 处理鼠标在视频上移动（用于时间轴预览）
   */
  const handleMouseMove = (event: MouseEvent) => {
    if (!showPreview.value || !videoRef.value || duration.value === 0) {
      return
    }

    // 检查 currentTarget 是否存在
    const target = event.currentTarget as HTMLElement | null
    if (!target) {
      console.warn('handleMouseMove: currentTarget is null')
      return
    }

    try {
      // 根据鼠标位置计算视频时间点
      const rect = target.getBoundingClientRect()
      const percentage = (event.clientX - rect.left) / rect.width
      const targetTime = percentage * duration.value

      // 更新视频时间
      videoRef.value.currentTime = Math.max(0, Math.min(targetTime, duration.value))
      currentTime.value = targetTime
    } catch (error) {
      console.error('Error in handleMouseMove:', error)
    }
  }

  /**
   * 处理视频元数据加载完成
   */
  const handleVideoLoaded = () => {
    if (videoRef.value) {
      duration.value = videoRef.value.duration
      // 设置视频为第一帧
      videoRef.value.currentTime = 0
    }
  }

  return {
    showPreview,
    currentTime,
    duration,
    videoRef,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    handleVideoLoaded,
    currentVideoItem
  }
}