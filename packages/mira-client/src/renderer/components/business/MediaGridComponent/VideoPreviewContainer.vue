<template>
  <VideoPreview
    v-if="currentVideoItem"
    :key="`video-${currentVideoItem.id}`"
    :ref="el => setVideoPreviewRef(el, currentVideoItem.id)"
    :src="currentVideoItem.path"
    :muted="isMuted"
    :auto-jump="false"
    class="absolute inset-0"
    @loaded="onVideoPreviewLoaded"
    @timeupdate="onVideoPreviewTimeUpdate"
    @play="onVideoPreviewPlay"
    @pause="onVideoPreviewPause"
    @error="onVideoPreviewError"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { throttle } from 'throttle-debounce'
import VideoPreview from '../../common/VideoPreview.vue'
import type { FileInfo } from '../../../../shared/types'

interface VideoPreviewAPI {
  play(): Promise<void> | undefined
  pause(): void
  setTime(time: number): void
  getCurrentTime(): number
  getDuration(): number
  setSrc(src: string): void
  setMuted(muted: boolean): void
  jumpTime(seconds: number): void
  setTimeThrottled(time: number): void
}

interface Props {
  currentVideoItem: FileInfo | null
  isMuted: boolean
}

interface Emits {
  (e: 'video-loaded', payload: { duration: number }): void
  (e: 'video-time-update', payload: { currentTime: number, progress: number }): void
  (e: 'video-play'): void
  (e: 'video-pause'): void
  (e: 'video-error', error: Event): void
  (e: 'update-progress', itemId: string, progress: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const videoPreviewComponent = ref<VideoPreviewAPI | null>(null)

const setVideoPreviewRef = (el: any, itemId: string) => {
  if (el && props.currentVideoItem?.id === itemId && videoPreviewComponent.value !== el) {
    videoPreviewComponent.value = el
  } else if (!el && videoPreviewComponent.value) {
    videoPreviewComponent.value = null
  }
}

watch(
  () => props.isMuted,
  (newMutedState) => {
    try {
      if (videoPreviewComponent.value && typeof videoPreviewComponent.value.setMuted === 'function') {
        videoPreviewComponent.value.setMuted(newMutedState)
      }
    } catch (error) {
      console.error('Error setting video mute state:', error)
    }
  }
)

const onVideoPreviewLoaded = (payload: { duration: number }) => {
  emit('video-loaded', payload)
}

const onVideoPreviewTimeUpdate = (payload: { currentTime: number, progress: number }) => {
  if (props.currentVideoItem) {
    emit('update-progress', props.currentVideoItem.id, payload.progress)
  }
  emit('video-time-update', payload)
}

const onVideoPreviewPlay = () => {
  emit('video-play')
}

const onVideoPreviewPause = () => {
  emit('video-pause')
}

const onVideoPreviewError = (error: Event) => {
  console.error('Video preview error:', error)
  emit('video-error', error)
}

const updateVideoTime = throttle(100, (targetTime: number) => {
  if (videoPreviewComponent.value && typeof videoPreviewComponent.value.setTimeThrottled === 'function') {
    videoPreviewComponent.value.setTimeThrottled(targetTime)
  }
})

const handleMouseMove = (event: MouseEvent) => {
  if (!props.currentVideoItem || !videoPreviewComponent.value) {
    return
  }

  try {
    if (typeof videoPreviewComponent.value.getDuration !== 'function') {
      return
    }

    const duration = videoPreviewComponent.value.getDuration()
    if (!duration || duration <= 0) {
      return
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const cardWidth = rect.width
    const x = Math.max(0, Math.min(event.clientX - rect.left, cardWidth))

    const progress = x / cardWidth
    const targetTime = progress * duration

    updateVideoTime(targetTime)
  } catch (error) {
    console.error('Error in handleMouseMove:', error)
  }
}

defineExpose({
  handleMouseMove,
  getVideoComponent: () => videoPreviewComponent.value
})
</script>