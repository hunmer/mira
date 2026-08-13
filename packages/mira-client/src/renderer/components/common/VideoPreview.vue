<template>
  <div class="relative w-full h-full overflow-hidden">
    <video
      ref="videoRef"
      :src="src"
      class="absolute inset-0 w-full h-full block rounded-lg"
      :style="{ objectFit: fit, objectPosition: 'center center' }"
      :muted="muted"
      loop
      preload="auto"
      playsinline
      @loadedmetadata="onVideoLoaded"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs } from 'vue'
import { throttle } from 'throttle-debounce'

interface Props {
  src?: string
  muted?: boolean
  fit?: 'cover' | 'contain'
}

interface Emits {
  (e: 'loaded', payload: { duration: number }): void
  (e: 'timeupdate', payload: { currentTime: number, progress: number }): void
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'error', error: Event): void
}

const props = withDefaults(defineProps<Props>(), { muted: true, fit: 'cover' })
const emit = defineEmits<Emits>()
const { src, muted, fit } = toRefs(props)
const videoRef = ref<HTMLVideoElement | null>(null)
let hasInitialized = false

const play = () => videoRef.value?.play()
const pause = () => videoRef.value?.pause()
const setTime = (time: number) => {
  const video = videoRef.value
  if (video && Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(time, video.duration))
}
const getCurrentTime = () => videoRef.value?.currentTime ?? 0
const getDuration = () => {
  const duration = videoRef.value?.duration ?? 0
  return Number.isFinite(duration) ? duration : 0
}
const setSrc = (value: string) => {
  if (!videoRef.value || !value) return
  // 调用方传入的路径已由 toFileUrl 统一转换；原生 video 直接使用，避免重复编码本地路径。
  videoRef.value.src = value
  videoRef.value.load()
}
const setMuted = (value: boolean) => {
  if (videoRef.value) videoRef.value.muted = value
}
const jumpTime = (seconds: number) => {
  if (videoRef.value) videoRef.value.currentTime = seconds
}
const setTimeThrottled = throttle(100, setTime)

defineExpose({ play, pause, setTime, getCurrentTime, getDuration, setSrc, setMuted, jumpTime, setTimeThrottled })

const onVideoLoaded = () => {
  const video = videoRef.value
  if (!video) return
  if (!hasInitialized) {
    video.currentTime = 0
    void video.play()
    hasInitialized = true
  }
  emit('loaded', { duration: video.duration })
}
const onTimeUpdate = () => {
  const currentTime = getCurrentTime()
  const duration = getDuration()
  emit('timeupdate', { currentTime, progress: duration ? currentTime / duration : 0 })
}
const onPlay = () => emit('play')
const onPause = () => emit('pause')
const onError = (event: Event) => emit('error', event)

watch(src, (value) => {
  hasInitialized = false
  if (value) setSrc(value)
}, { immediate: true })
watch(muted, (value) => setMuted(value), { immediate: true })
</script>
