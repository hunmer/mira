<template>
  <div class="video-preview-popover">
    <div
      class="video-preview-container"
      @mousemove="handleMouseMove"
    >
      <!-- 加载中状态 -->
      <div v-if="isLoading" class="video-loading">
        <span class="material-icons animate-spin">hourglass_empty</span>
        <span class="text-sm mt-2">加载中...</span>
      </div>

      <!-- 视频元素 -->
      <video
        v-show="!isLoading"
        ref="localVideoRef"
        :src="videoUrl"
        class="video-preview"
        muted
        preload="metadata"
        @loadedmetadata="handleVideoLoaded"
        @loadeddata="handleVideoLoadedData"
        @error="handleVideoError"
        @click.stop="togglePlayPause"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @timeupdate="handleTimeUpdate"
      />

      <!-- 播放/暂停按钮覆层 -->
      <div
        v-if="!isLoading && !hasError"
        class="video-controls-overlay"
        @click.stop="togglePlayPause"
      >
        <transition name="fade">
          <div v-if="showPlayButton" class="play-pause-button">
            <span class="material-icons">{{ isPlaying ? 'pause' : 'play_arrow' }}</span>
          </div>
        </transition>
      </div>

      <!-- 错误状态 -->
      <div v-if="hasError" class="video-error">
        <span class="material-icons">error_outline</span>
        <span class="text-sm mt-2">视频加载失败</span>
      </div>

      <!-- 视频进度条 -->
      <div v-if="showProgress && duration > 0 && !isLoading" class="video-progress">
        <div
          class="video-progress-bar"
          :style="{ width: `${(currentVideoTime / duration) * 100}%` }"
        ></div>
      </div>

      <!-- 视频时长显示 -->
      <div v-if="duration > 0 && !isLoading" class="video-duration">
        {{ formatDuration(currentVideoTime) }} / {{ formatDuration(duration) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'

interface Props {
  /** 视频 URL */
  videoUrl: string
  /** 当前播放时间 */
  currentTime: number
  /** 视频总时长 */
  duration: number
  /** 是否显示进度条 */
  showProgress?: boolean
  /** 视频预览宽度 */
  width?: number
  /** 视频预览高度 */
  height?: number
  /** 外部视频元素 ref (可选) */
  videoRef?: Ref<HTMLVideoElement | undefined>
}

interface Emits {
  (e: 'video-loaded', duration: number): void
  (e: 'time-update', time: number, event: MouseEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  showProgress: true,
  width: 320,
  height: 180
})

const emit = defineEmits<Emits>()

// 本地状态
const localVideoRef = ref<HTMLVideoElement>()
const isLoading = ref(true)
const hasError = ref(false)
const isPlaying = ref(false)
const showPlayButton = ref(true)
const currentVideoTime = ref(0)
let hideButtonTimeout: NodeJS.Timeout | undefined

// 同步本地 ref 和外部 ref
watch(localVideoRef, (el) => {
  if (props.videoRef && el) {
    props.videoRef.value = el
  }
})

// 获取当前使用的视频元素
const getVideoElement = () => {
  return localVideoRef.value || props.videoRef?.value
}

// 监听 currentTime 变化
watch(
  () => props.currentTime,
  (newTime) => {
    const video = getVideoElement()
    if (video && !isNaN(newTime) && props.duration > 0) {
      video.currentTime = Math.max(0, Math.min(newTime, props.duration))
    }
  }
)

// 处理视频元数据加载完成
const handleVideoLoaded = () => {
  const video = getVideoElement()
  if (video) {
    console.log('视频元数据加载完成:', {
      duration: video.duration,
      videoUrl: props.videoUrl
    })
    emit('video-loaded', video.duration)
  }
}

// 处理视频数据加载完成
const handleVideoLoadedData = async () => {
  const video = getVideoElement()
  if (video) {
    console.log('视频数据加载完成')
    isLoading.value = false
    hasError.value = false
    // 设置视频为第一帧
    video.currentTime = 0

    // 自动播放视频
    try {
      await video.play()
      isPlaying.value = true
      // 播放时，1秒后隐藏按钮
      hideButtonTimeout = setTimeout(() => {
        if (isPlaying.value) {
          showPlayButton.value = false
        }
      }, 1000)
    } catch (error) {
      console.log('自动播放失败（可能被浏览器阻止）:', error)
      // 如果自动播放失败，保持显示播放按钮
      showPlayButton.value = true
    }
  }
}

// 处理视频加载错误
const handleVideoError = (event: Event) => {
  console.error('视频加载失败:', props.videoUrl, event)
  isLoading.value = false
  hasError.value = true
}

// 播放/暂停切换
const togglePlayPause = async () => {
  const video = getVideoElement()
  if (!video) return

  try {
    if (video.paused) {
      await video.play()
      isPlaying.value = true
      // 播放时，1秒后隐藏按钮
      hideButtonTimeout = setTimeout(() => {
        if (isPlaying.value) {
          showPlayButton.value = false
        }
      }, 1000)
    } else {
      video.pause()
      isPlaying.value = false
      showPlayButton.value = true
      if (hideButtonTimeout) {
        clearTimeout(hideButtonTimeout)
      }
    }
  } catch (error) {
    console.error('Error toggling play/pause:', error)
  }
}

// 处理视频时间更新
const handleTimeUpdate = () => {
  const video = getVideoElement()
  if (video) {
    currentVideoTime.value = video.currentTime
  }
}

// 处理鼠标移动（用于时间轴预览和播放控制）
const handleMouseMove = (event: MouseEvent) => {
  const video = getVideoElement()
  if (!video || props.duration === 0) {
    return
  }

  // 如果正在播放，显示控制按钮
  if (isPlaying.value) {
    showPlayButton.value = true
    if (hideButtonTimeout) {
      clearTimeout(hideButtonTimeout)
    }
    hideButtonTimeout = setTimeout(() => {
      if (isPlaying.value) {
        showPlayButton.value = false
      }
    }, 1000)
  }

  // 无论播放还是暂停，都支持鼠标移动控制进度
  const target = event.currentTarget as HTMLElement | null
  if (!target) {
    return
  }

  try {
    const rect = target.getBoundingClientRect()
    const percentage = (event.clientX - rect.left) / rect.width
    const targetTime = percentage * props.duration

    // 直接更新视频时间
    video.currentTime = Math.max(0, Math.min(targetTime, props.duration))

    // 通知父组件时间更新（用于显示当前时间）
    emit('time-update', targetTime, event)
  } catch (error) {
    console.error('Error in VideoPreviewPopover handleMouseMove:', error)
  }
}

// 格式化时长
const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return '0:00'
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 监听 videoUrl 变化，重置状态
watch(
  () => props.videoUrl,
  () => {
    isLoading.value = true
    hasError.value = false
  }
)

// 清理
onUnmounted(() => {
  const video = getVideoElement()
  if (video) {
    video.pause()
    video.currentTime = 0
  }
  if (hideButtonTimeout) {
    clearTimeout(hideButtonTimeout)
  }
})
</script>

<style scoped>
.video-preview-popover {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.video-preview-container {
  position: relative;
  width: v-bind('width + "px"');
  height: v-bind('height + "px"');
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.video-loading,
.video-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  background: #000;
}

.video-loading .material-icons,
.video-error .material-icons {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.video-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
}

.video-progress-bar {
  height: 100%;
  background: rgb(59 130 246);
  transition: width 0.1s ease;
}

.video-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  pointer-events: none;
}

/* 控制覆层 */
.video-controls-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  transition: background 0.2s ease;
}

.video-controls-overlay:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* 播放/暂停按钮 */
.play-pause-button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.play-pause-button:hover {
  background: rgba(0, 0, 0, 0.5);
  transform: scale(1.1);
}

.play-pause-button .material-icons {
  font-size: 2.5rem;
  color: white;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>