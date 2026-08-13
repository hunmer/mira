import { ref } from 'vue'
import type { FileInfo } from '../../../../../shared/types'

export function useVideoHover() {
  const hoveredItem = ref<FileInfo | null>(null)
  const currentVideoItem = ref<FileInfo | null>(null)
  const videoProgress = ref<{ [key: string]: number }>({})
  const hoveredElement = ref<HTMLElement | null>(null)
  const hoverTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const videoStartTime = ref<number>(0)

  const HOVER_DELAY = 500

  const clearHoverTimer = () => {
    if (!hoverTimer.value) return

    clearTimeout(hoverTimer.value)
    hoverTimer.value = null
  }

  const resetVideoHover = () => {
    clearHoverTimer()
    hoveredItem.value = null
    hoveredElement.value = null
    currentVideoItem.value = null
    videoStartTime.value = 0
  }

  const getFileType = (item: FileInfo): 'image' | 'video' | 'audio' | 'document' | 'other' => {
    if (item.mimeType.startsWith('image/')) return 'image'
    if (item.mimeType.startsWith('video/')) return 'video'
    if (item.mimeType.startsWith('audio/')) return 'audio'
    if (item.mimeType.includes('pdf') ||
        item.mimeType.includes('document') ||
        item.mimeType.includes('text/')) return 'document'
    return 'other'
  }

  const isStillHovering = (item: FileInfo) => {
    return hoveredItem.value?.id === item.id &&
      (!hoveredElement.value || hoveredElement.value.matches(':hover'))
  }

  const isHoverCardTrigger = (event?: MouseEvent) => {
    if (!event) return false

    return document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('[data-media-preview-hovercard-trigger]') !== null
  }

  const handleMouseEnter = (item: FileInfo, event?: MouseEvent) => {
    if (getFileType(item) !== 'video') return

    if (isHoverCardTrigger(event)) {
      resetVideoHover()
      return
    }

    clearHoverTimer()
    hoveredItem.value = item
    hoveredElement.value = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null

    hoverTimer.value = setTimeout(() => {
      hoverTimer.value = null

      if (!isStillHovering(item)) {
        resetVideoHover()
        return
      }

      currentVideoItem.value = item
      videoStartTime.value = Date.now()
    }, HOVER_DELAY)
  }

  const handleMouseLeave = (item: FileInfo, event?: MouseEvent) => {
    if (getFileType(item) !== 'video') return

    if (
      event?.relatedTarget instanceof Node &&
      event.currentTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return
    }

    resetVideoHover()
  }

  const updateVideoProgress = (itemId: string, progress: number) => {
    videoProgress.value[itemId] = progress
  }

  const stopVideoPreview = (itemId?: string) => {
    if (!itemId) {
      resetVideoHover()
      return
    }

    delete videoProgress.value[itemId]

    if (hoveredItem.value?.id === itemId || currentVideoItem.value?.id === itemId) {
      resetVideoHover()
    }
  }

  const syncVideoPreviewItems = (itemIds: string[]) => {
    const activeItemIds = new Set(itemIds)

    if (
      (hoveredItem.value && !activeItemIds.has(hoveredItem.value.id)) ||
      (currentVideoItem.value && !activeItemIds.has(currentVideoItem.value.id))
    ) {
      resetVideoHover()
    }

    Object.keys(videoProgress.value).forEach(itemId => {
      if (!activeItemIds.has(itemId)) {
        delete videoProgress.value[itemId]
      }
    })
  }

  return {
    hoveredItem,
    currentVideoItem,
    videoProgress,
    handleMouseEnter,
    handleMouseLeave,
    updateVideoProgress,
    stopVideoPreview,
    syncVideoPreviewItems,
    getFileType
  }
}
