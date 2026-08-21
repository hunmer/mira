<template>
  <div class="video-player">
    <Empty v-if="!video" class="player-empty">
      <EmptyMedia><VideoIcon style="width: 24px; height: 24px" /></EmptyMedia>
      <EmptyTitle>请从左侧选择一个视频</EmptyTitle>
      <EmptyDescription>选择后即可播放、标记片段</EmptyDescription>
    </Empty>

    <div v-else class="player-container">
      <!-- Plyr 视频播放器 -->
      <video
        ref="videoElement"
        class="plyr-video"
        :src="videoSrc"
        controls
        playsinline
        @loadedmetadata="handleLoadedMetadata"
        @durationchange="handleDurationChange"
        @timeupdate="handleTimeUpdate"
      >
        您的浏览器不支持视频播放。
      </video>


      <!-- 预览模式指示器 -->
      <div v-if="isPreviewMode && previewClip" class="preview-indicator">
        <div class="preview-info">
          <span class="preview-icon"><EyeOpenIcon style="width: 16px; height: 16px" /></span>
          <span class="preview-text">预览模式: {{ previewClip.desc || '片段' }}</span>
          <span class="preview-time">
            {{ formatTime(previewClip.start) }} - {{ formatTime(previewClip.end) }}
          </span>
        </div>
        <button @click="stopPreview" class="icon-btn preview-exit-btn" title="退出预览">
          <ExitIcon style="width: 14px; height: 14px" />
        </button>
      </div>

      <!-- 水印遮罩层已移除，改用 WatermarkTab 中的截图选择方式 -->

      <!-- 快捷标记工具 -->
      <div class="quick-markers">
        <button @click="markIn" class="marker-btn marker-time-btn" title="标记入点 (I)">
          <ArrowLeftIcon style="width: 12px; height: 12px" />{{ formatTime(clipStartTime) }}
        </button>
        <button @click="markOut" class="marker-btn marker-time-btn" title="标记出点 (O)">
          {{ formatTime(clipEndTime) }} <ArrowRightIcon style="width: 12px; height: 12px" />
        </button>
        <button
          @click="createClipFromMarkers"
          :disabled="clipStartTime >= clipEndTime"
          class="marker-btn icon-btn primary"
          title="创建片段 (C)"
        >
          <PlusIcon style="width: 14px; height: 14px" />
        </button>
        <button @click="clearMarkers" class="marker-btn icon-btn" title="清除标记">
          <Cross1Icon style="width: 14px; height: 14px" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from 'mira-plugin-ui/src/components/ui/empty'
import { VideoIcon, EyeOpenIcon, ExitIcon, ArrowLeftIcon, ArrowRightIcon, PlusIcon, Cross1Icon } from '@radix-icons/vue'
import type { VideoData } from '@/types/video-editor'
import { resolveVideoSrc } from '@/lib/host'
// plyr 图标 sprite 本地化：内联为 data URI，规避 CDN 的 CORS 限制，
// 且 file:// 加载产物时 fetch 相对路径文件同样会被拦截，data URI 两种场景都可用
import plyrSvgRaw from '@/assets/plyr.svg?raw'
const plyrIconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(plyrSvgRaw)}`

// Props & Emits
const props = defineProps<{
  video: VideoData | null
  clipStartTime: number
  clipEndTime: number
  autoplay?: boolean
}>()

const emit = defineEmits<{
  'update:clipStartTime': [value: number]
  'update:clipEndTime': [value: number]
  createClip: [start: number, end: number]
  durationLoaded: [duration: number]
  timeUpdate: [currentTime: number]
  focusDescription: []
  triggerCreateClip: []
  metadataLoaded: [metadata: { width: number; height: number }]
}>()

// 预览相关
const isPreviewMode = ref(false)
const previewClip = ref<{ start: number; end: number; desc?: string } | null>(null)

// 暴露预览方法给父组件
defineExpose({
  previewClipSegment: (clip: { start: number; end: number; desc?: string }) => {
    // 先设置入点和出点到父组件的裁剪面板
    emit('update:clipStartTime', clip.start)
    emit('update:clipEndTime', clip.end)

    // 进入预览模式
    previewClip.value = clip
    isPreviewMode.value = true

    // 跳转到片段起点并播放
    if (plyrInstance.value) {
      plyrInstance.value.currentTime = clip.start
      plyrInstance.value.play()
    }
  },
  stopPreview: () => {
    isPreviewMode.value = false
    previewClip.value = null
    if (plyrInstance.value) {
      plyrInstance.value.pause()
    }
  },
  getCurrentTime: () => {
    return currentTime.value
  },
  seek: (time: number) => {
    if (plyrInstance.value) {
      plyrInstance.value.currentTime = time
    }
  }
})

// State
const videoElement = ref<HTMLVideoElement | null>(null)
const plyrInstance = ref<Plyr | null>(null)
const currentTime = ref(0)
const duration = ref(0)
const wheelListener = ref<((e: WheelEvent) => void) | null>(null)

// Computed
const videoSrc = computed(() => {
  if (!props.video) return ''
  const path = props.video.path

  // blob URL / http(s) 直用（转义 #）
  if (path.startsWith('blob:') || path.startsWith('http:') || path.startsWith('https:')) {
    return path.replace(/#/g, '%23')
  }

  // 本地绝对路径（Windows 盘符 / Unix）→ file:// URL
  return resolveVideoSrc(path)
})

// Methods
function initPlyr() {
  if (!videoElement.value) return

  // 销毁现有实例
  if (plyrInstance.value) {
    plyrInstance.value.destroy()
  }

  // 创建新的 Plyr 实例
  plyrInstance.value = new Plyr(videoElement.value, {
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'duration',
      'mute',
      'volume',
      'settings',
      'fullscreen'
    ],
    settings: ['quality', 'speed'],
    iconUrl: plyrIconUrl,
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
    keyboard: { focused: true, global: false },
    tooltips: { controls: true, seek: true }
  })

  // 监听事件
  plyrInstance.value.on('loadedmetadata', handleLoadedMetadata)
  plyrInstance.value.on('durationchange', handleDurationChange)
  plyrInstance.value.on('timeupdate', handleTimeUpdate)
  plyrInstance.value.on('ready', () => {
    console.log('Plyr is ready')
    // 在 Plyr 容器上绑定滚轮事件
    bindWheelEvent()

    // 素材库导入激活时自动播放（Electron 默认免手势；被拦截时静默）
    if (props.autoplay && plyrInstance.value) {
      Promise.resolve(plyrInstance.value.play()).catch(() => {})
    }

    // 初始化时也检查一次 duration（有些视频可能已经加载完成）
    if (videoElement.value && isFinite(videoElement.value.duration) && videoElement.value.duration > 0) {
      handleDurationChange()
    }
  })
}

function handleLoadedMetadata() {
  if (plyrInstance.value && videoElement.value) {
    const videoDuration = videoElement.value.duration

    // 获取视频真实尺寸
    const videoWidth = videoElement.value.videoWidth
    const videoHeight = videoElement.value.videoHeight
    emit('metadataLoaded', { width: videoWidth, height: videoHeight })

    // 检查 duration 是否有效（对于长视频可能是 Infinity）
    if (isFinite(videoDuration) && videoDuration > 0) {
      duration.value = videoDuration
      emit('durationLoaded', videoDuration)
    } else {
      // 对于长视频，需要等待 durationchange 事件
      console.log('Duration is', videoDuration, ', waiting for durationchange event')
    }
  }
}

// 监听 duration 变化（用于长视频）
function handleDurationChange() {
  if (videoElement.value) {
    const videoDuration = videoElement.value.duration
    if (isFinite(videoDuration) && videoDuration > 0 && videoDuration !== duration.value) {
      duration.value = videoDuration
      emit('durationLoaded', videoDuration)
      console.log('Duration updated:', videoDuration)
    }
  }
}

function handleTimeUpdate() {
  if (plyrInstance.value) {
    currentTime.value = plyrInstance.value.currentTime

    // 发射时间更新事件
    emit('timeUpdate', plyrInstance.value.currentTime)

    // 预览模式:当播放到片段结束时,循环播放或停止
    if (isPreviewMode.value && previewClip.value) {
      if (currentTime.value >= previewClip.value.end) {
        // 循环播放片段
        plyrInstance.value.currentTime = previewClip.value.start
      }
    }
  }
}

function markIn() {
  // 直接设置裁剪面板的入点时间
  emit('update:clipStartTime', currentTime.value)
}

function markOut() {
  // 直接设置裁剪面板的出点时间
  emit('update:clipEndTime', currentTime.value)
}

function createClipFromMarkers() {
  // 触发创建片段事件,等同于裁剪面板的"创建片段"按钮
  emit('createClip', props.clipStartTime, props.clipEndTime)
}

function clearMarkers() {
  emit('update:clipStartTime', 0)
  emit('update:clipEndTime', props.video?.duration || 0)
}

function stopPreview() {
  isPreviewMode.value = false
  previewClip.value = null
  if (plyrInstance.value) {
    plyrInstance.value.pause()
  }
}


function formatTime(seconds: number | null): string {
  if (seconds === null) return '--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`
}

// 键盘快捷键
function handleKeydown(event: KeyboardEvent) {
  if (!plyrInstance.value) return

  // Alt+数字快捷键 (全局处理)
  if (event.altKey && /^[1-4]$/.test(event.key)) {
    event.preventDefault()
    switch (event.key) {
      case '1':
        // Alt+1: 设置起点
        markIn()
        break
      case '2':
        // Alt+2: 设置终点
        markOut()
        break
      case '3':
        // Alt+3: 聚焦视频描述输入框
        emit('focusDescription')
        break
      case '4':
        // Alt+4: 添加裁剪/创建片段
        emit('triggerCreateClip')
        break
    }
    return
  }

  // 只在播放器获得焦点时处理自定义快捷键
  const activeElement = document.activeElement
  const isPlayerFocused = activeElement === videoElement.value ||
    videoElement.value?.contains(activeElement as Node)

  if (!isPlayerFocused) return

  switch (event.key.toLowerCase()) {
    case 'i':
      event.preventDefault()
      markIn()
      break
    case 'o':
      event.preventDefault()
      markOut()
      break
    case 'c':
      event.preventDefault()
      if (props.clipStartTime < props.clipEndTime) {
        createClipFromMarkers()
      }
      break
  }
}

// 滚轮控制进度
function handleWheel(event: WheelEvent) {
  if (!plyrInstance.value || duration.value <= 0) return
  // 阻止默认滚动行为
  event.preventDefault()
  event.stopPropagation()

  const delta = event.deltaY > 0 ? -1 : 1 // 向下滚后退，向上滚前进

  if (event.shiftKey) {
    // Shift: +/- 5% 视频时长
    const percentDelta = duration.value * 0.05
    const newTime = plyrInstance.value.currentTime + delta * percentDelta
    plyrInstance.value.currentTime = Math.max(0, Math.min(duration.value, newTime))
  } else if (event.ctrlKey) {
    // Ctrl: +/- 30秒
    const newTime = plyrInstance.value.currentTime + delta * 30
    plyrInstance.value.currentTime = Math.max(0, Math.min(duration.value, newTime))
  } else if (event.altKey) {
    // Alt: +/- 5秒
    const newTime = plyrInstance.value.currentTime + delta * 5
    plyrInstance.value.currentTime = Math.max(0, Math.min(duration.value, newTime))
  } else {
    // 基础: +/- 1秒
    const newTime = plyrInstance.value.currentTime + delta
    plyrInstance.value.currentTime = Math.max(0, Math.min(duration.value, newTime))
  }
}

// 绑定滚轮事件到 Plyr 容器
function bindWheelEvent() {
  if (!plyrInstance.value) return

  // Plyr 会创建一个容器元素
  const container = plyrInstance.value.elements.container
  if (container && !wheelListener.value) {
    wheelListener.value = handleWheel
    container.addEventListener('wheel', wheelListener.value, { passive: false })
  }
}

// 解除滚轮事件绑定
function unbindWheelEvent() {
  if (plyrInstance.value && wheelListener.value) {
    const container = plyrInstance.value.elements.container
    if (container) {
      container.removeEventListener('wheel', wheelListener.value)
    }
    wheelListener.value = null
  }
}

// Computed
const clipStartTime = computed(() => props.clipStartTime)
const clipEndTime = computed(() => props.clipEndTime)

// Watch
watch(() => props.video?.path, async (newPath, oldPath) => {
  // 如果视频路径发生变化,重置状态并重新初始化
  if (newPath && newPath !== oldPath) {
    currentTime.value = 0
    duration.value = 0

    // 解除滚轮事件绑定
    unbindWheelEvent()

    // 销毁现有实例
    if (plyrInstance.value) {
      plyrInstance.value.destroy()
      plyrInstance.value = null
    }

    // 等待 DOM 更新后重新初始化 Plyr
    await nextTick()
    initPlyr()
  }
}, { immediate: false })

// Lifecycle
onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)

  if (props.video) {
    await nextTick()
    initPlyr()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  unbindWheelEvent()
  if (plyrInstance.value) {
    plyrInstance.value.destroy()
  }
})
</script>

<style scoped src="./VideoPlayer.css"></style>
