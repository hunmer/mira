import { ref } from 'vue'
import type { FileInfo } from '../../../../../shared/types'

export function useVideoHover() {
  const hoveredItem = ref<FileInfo | null>(null)
  const currentVideoItem = ref<FileInfo | null>(null)
  const videoProgress = ref<{ [key: string]: number }>({})
  const hoverTimer = ref<NodeJS.Timeout | null>(null)
  const videoStartTime = ref<number>(0) // 记录视频开始播放的时间

  const HOVER_DELAY = 500
  const PROTECTION_PERIOD = 300 // 视频开始播放后的保护期（毫秒）

  const getFileType = (item: FileInfo): 'image' | 'video' | 'audio' | 'document' | 'other' => {
    if (item.mimeType.startsWith('image/')) return 'image'
    if (item.mimeType.startsWith('video/')) return 'video'
    if (item.mimeType.startsWith('audio/')) return 'audio'
    if (item.mimeType.includes('pdf') ||
        item.mimeType.includes('document') ||
        item.mimeType.includes('text/')) return 'document'
    return 'other'
  }

  const handleMouseEnter = (item: FileInfo) => {
    if (getFileType(item) === 'video') {
      hoveredItem.value = item

      if (hoverTimer.value) {
        clearTimeout(hoverTimer.value)
      }

      hoverTimer.value = setTimeout(() => {
        currentVideoItem.value = item
        videoStartTime.value = Date.now() // 记录视频开始时间
      }, HOVER_DELAY)
    }
  }

  const handleMouseLeave = (item: FileInfo) => {
    if (getFileType(item) === 'video') {
      hoveredItem.value = null

      if (hoverTimer.value) {
        clearTimeout(hoverTimer.value)
        hoverTimer.value = null
      }

      // 检查是否在保护期内（刚开始播放）
      const timeSinceStart = Date.now() - videoStartTime.value
      if (currentVideoItem.value?.id === item.id && timeSinceStart < PROTECTION_PERIOD) {
        // 在保护期内，重新设置 mouseenter 状态，但不停止视频
        hoveredItem.value = item
        return
      }

      currentVideoItem.value = null
    }
  }

  const updateVideoProgress = (itemId: string, progress: number) => {
    videoProgress.value[itemId] = progress
  }

  return {
    hoveredItem,
    currentVideoItem,
    videoProgress,
    handleMouseEnter,
    handleMouseLeave,
    updateVideoProgress,
    getFileType
  }
}