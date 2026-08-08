<template>
  <div class="relative flex flex-grow flex-col bg-muted overflow-hidden">
    <!-- 视频容器 -->
    <div class="flex flex-grow items-center justify-center w-full h-full overflow-hidden">
      <div class="relative w-full h-full rounded-lg overflow-hidden shadow-2xl">
        <video
          ref="videoElement"
          class="w-full h-full object-contain bg-black"
          playsinline
        ></video>
        
        <!-- 视频不存在时的占位符 -->
        <div
          v-if="!video"
          class="w-full h-full bg-accent flex items-center justify-center absolute inset-0 z-5"
        >
          <div class="text-center">
            <span class="material-icons text-muted-foreground text-8xl mb-4 block">videocam_off</span>
            <p class="text-muted-foreground text-lg">无可用视频</p>
          </div>
        </div>
        
        <!-- 错误状态 -->
        <div 
          v-if="error"
          class="absolute inset-0 bg-black/50 flex items-center justify-center z-10"
        >
          <div class="flex flex-col items-center space-y-2 text-white">
            <span class="material-icons text-destructive text-6xl">error</span>
            <span class="text-sm">视频加载失败</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
// @ts-ignore
import Plyr from 'plyr'
import Hls from 'hls.js'
import 'plyr/dist/plyr.css'
import type { FileInfo } from '../../../shared/types'
import { getMediaPreviewSource } from '@renderer/utils/fileUtils'

interface Props {
  video?: FileInfo
}

interface Emits {
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'ended'): void
  (e: 'time-update', currentTime: number): void
  (e: 'duration-change', duration: number): void
  (e: 'volume-change', volume: number): void
  (e: 'error', error: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const videoElement = ref<HTMLVideoElement>()
const loading = ref(false)
const error = ref(false)
let player: Plyr | null = null
let loadVersion = 0
let cleanupLoadListeners: (() => void) | null = null
let initializingPlayer = false
let hls: Hls | null = null

// Plyr 配置选项
const plyrOptions = {
  controls: [
    'play-large',
    'restart', 
    'rewind',
    'play', 
    'fast-forward',
    'progress', 
    'current-time',
    'duration',
    'mute', 
    'volume',
    'captions',
    'settings', 
    'pip',
    'airplay',
    'fullscreen'
  ],
  settings: ['captions', 'quality', 'speed'],
  keyboard: { 
    focused: true, 
    global: false 
  },
  tooltips: { 
    controls: true, 
    seek: true 
  },
  captions: { 
    active: false, 
    language: 'auto' 
  },
  fullscreen: { 
    enabled: true, 
    fallback: true,
    iosNative: false 
  },
  speed: { 
    selected: 1, 
    options: [0.5, 0.75, 1, 1.25, 1.5, 2] 
  },
  quality: {
    default: 720,
    options: [1080, 720, 480, 360]
  },
  ratio: '16:9', // 强制设置宽高比，覆盖原始比例
  autoplay: true,
  clickToPlay: true,
  hideControls: true,
  resetOnEnd: false,
  i18n: {
    restart: '重新开始',
    rewind: '快退 {seektime} 秒',
    play: '播放',
    pause: '暂停',
    fastForward: '快进 {seektime} 秒',
    seek: '跳转',
    seekLabel: '{currentTime} / {duration}',
    played: '已播放',
    buffered: '已缓冲',
    currentTime: '当前时间',
    duration: '总时长',
    volume: '音量',
    mute: '静音',
    unmute: '取消静音',
    enableCaptions: '启用字幕',
    disableCaptions: '禁用字幕',
    download: '下载',
    enterFullscreen: '进入全屏',
    exitFullscreen: '退出全屏',
    frameTitle: '{title} 播放器',
    captions: '字幕',
    settings: '设置',
    pip: '画中画',
    menuBack: '返回上级菜单',
    speed: '播放速度',
    normal: '正常',
    quality: '画质',
    loop: '循环',
    start: '开始',
    end: '结束',
    all: '全部',
    reset: '重置',
    disabled: '禁用',
    enabled: '启用',
    advertisement: '广告'
  }
}

// 绑定 Plyr 事件（只调用一次）
const getVideoSrc = getMediaPreviewSource

const removeLoadListeners = () => {
  cleanupLoadListeners?.()
  cleanupLoadListeners = null
}

const playCurrentVideo = async () => {
  if (!player) return

  try {
    await player.play()
  } catch (err) {
    console.warn('Video autoplay was blocked or interrupted:', err)
  }
}

const bindLoadEvents = (video: HTMLVideoElement, version: number) => {
  removeLoadListeners()

  const finishLoading = () => {
    if (version !== loadVersion) return

    loading.value = false
    removeLoadListeners()
    playCurrentVideo()
  }

  const onLoadedMetadata = () => {
    if (version !== loadVersion) return
    emit('duration-change', Number.isFinite(video.duration) ? video.duration : 0)
  }

  const onLoadError = (event: Event) => {
    if (version !== loadVersion) return

    console.error('Native video error:', event)
    error.value = true
    loading.value = false
    removeLoadListeners()
    emit('error', event)
  }

  video.addEventListener('loadedmetadata', onLoadedMetadata)
  video.addEventListener('loadeddata', finishLoading)
  video.addEventListener('canplay', finishLoading)
  video.addEventListener('error', onLoadError)

  cleanupLoadListeners = () => {
    video.removeEventListener('loadedmetadata', onLoadedMetadata)
    video.removeEventListener('loadeddata', finishLoading)
    video.removeEventListener('canplay', finishLoading)
    video.removeEventListener('error', onLoadError)
  }
}

const beginLoad = (video: HTMLVideoElement, currentVideo: FileInfo): boolean => {
  const src = getVideoSrc(currentVideo)

  loadVersion++
  loading.value = true
  error.value = false

  if (!src) {
    const sourceError = new Error('Video source is empty')
    console.error(sourceError)
    error.value = true
    loading.value = false
    removeLoadListeners()
    emit('error', sourceError)
    return false
  }

  bindLoadEvents(video, loadVersion)
  return true
}

const applySource = (video: HTMLVideoElement, currentVideo: FileInfo) => {
  hls?.destroy()
  hls = null
  video.poster = currentVideo.thumbnailPath || ''
  const src = getVideoSrc(currentVideo)
  if (src.includes('.m3u8') && Hls.isSupported()) {
    video.removeAttribute('src')
    hls = new Hls({ enableWorker: true, lowLatencyMode: false })
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return
      error.value = true
      loading.value = false
      emit('error', data)
    })
    hls.loadSource(src)
    hls.attachMedia(video)
    return
  }
  video.src = src
  video.load()
}

const bindPlayerEvents = () => {
  if (!player) return

  player.on('play', () => emit('play'))
  player.on('pause', () => emit('pause'))
  player.on('ended', () => emit('ended'))
  player.on('timeupdate', () => emit('time-update', player?.currentTime || 0))
  player.on('loadedmetadata', () => emit('duration-change', player?.duration || 0))
  player.on('volumechange', () => emit('volume-change', player?.volume || 0))
  player.on('error', (event: any) => {
    console.error('Plyr error:', event)
    error.value = true
    loading.value = false
    emit('error', event)
  })
}

// 切换视频源（复用已有 Plyr 实例）
const updateSource = () => {
  if (!player || !props.video || !videoElement.value) return

  if (!beginLoad(videoElement.value, props.video)) return

  player.pause()
  applySource(videoElement.value, props.video)
}

// 初始化 Plyr 播放器（只调用一次）
const initializePlayer = async () => {
  if (player || initializingPlayer || !props.video) return

  try {
    initializingPlayer = true
    await nextTick()
    if (!videoElement.value || !props.video) return

    if (!beginLoad(videoElement.value, props.video)) return

    applySource(videoElement.value, props.video)
    player = new Plyr(videoElement.value, plyrOptions)
    bindPlayerEvents()
  } catch (err) {
    console.error('Failed to initialize Plyr player:', err)
    error.value = true
    loading.value = false
    emit('error', err)
  } finally {
    initializingPlayer = false
  }
}

// 监听视频变化：有实例就换源，没有就初始化
watch(() => props.video, (newVideo) => {
  if (!newVideo) {
    loadVersion++
    loading.value = false
    error.value = false
    removeLoadListeners()
    player?.pause()
    return
  }

  if (player) {
    updateSource()
  } else {
    initializePlayer()
  }
})

onMounted(() => {
  initializePlayer()
})

onUnmounted(() => {
  loadVersion++
  removeLoadListeners()
  hls?.destroy()
  hls = null

  if (player) {
    player.destroy()
    player = null
  }
})
</script>

<style>
/* 强制 Plyr 容器填满 */
.plyr {
  width: 100% !important;
  height: 100% !important;
}

.plyr--video {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  padding-bottom: 0 !important;
}

/* 视频包装器 */
.plyr__video-wrapper {
  width: 100% !important;
  height: 100% !important;
  flex: 1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #000 !important;
  position: relative !important;
  overflow: hidden !important;
}

/* 强制视频元素尺寸 */
.plyr video {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  display: block !important;
}

/* 海报图片 */
.plyr__poster {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
}

/* 控制栏固定在底部 */
.plyr__controls {
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  flex-shrink: 0 !important;
  background: rgba(0, 0, 0, 0.8) !important;
  border-radius: 0 !important;
  width: 100% !important;
  z-index: 3 !important;
}

/* 全屏模式调整 */
.plyr--fullscreen {
  max-height: 100vh !important;
}

.plyr--fullscreen .plyr__video-wrapper {
  height: calc(100vh - 60px) !important; /* 为全屏控制栏预留空间 */
}

.plyr--fullscreen .plyr__controls {
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 4 !important;
}

/* 移除任何可能的aspect-ratio设置 */
.plyr__video-wrapper::before {
  display: none !important;
}

/* 确保没有padding设置干扰 */
.plyr__video-wrapper,
.plyr__video-wrapper > div {
  padding: 0 !important;
  margin: 0 !important;
}
</style>
