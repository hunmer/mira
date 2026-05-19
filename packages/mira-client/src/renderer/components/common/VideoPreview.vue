<template>
  <div class="video-preview-wrapper">
    <video
      ref="videoRef"
      :src="src"
      class="rounded-lg object-cover w-full h-full"
      :muted="muted"
      loop
      preload="auto"
      playsinline
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, toRefs } from 'vue'
import { throttle } from 'throttle-debounce'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

interface Props {
  src?: string
  muted?: boolean
}

interface Emits {
  (e: 'loaded', payload: { duration: number }): void
  (e: 'timeupdate', payload: { currentTime: number, progress: number }): void
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'error', error: Event): void
}

const props = withDefaults(defineProps<Props>(), {
  muted: true,
})

const emit = defineEmits<Emits>()

const { src, muted } = toRefs(props)
const videoRef = ref<HTMLVideoElement | null>(null)
const plyrInstance = ref<Plyr | null>(null)

// Plyr 初始化
const initPlyr = () => {
  if (videoRef.value && !plyrInstance.value) {
    plyrInstance.value = new Plyr(videoRef.value, {
      controls: [], // 隐藏控制栏
      clickToPlay: false, // 禁用点击播放
      keyboard: { global: false }, // 禁用键盘控制
      tooltips: { controls: false, seek: false }, // 禁用工具提示
      captions: { active: false, language: 'auto' },
      fullscreen: { enabled: false }, // 禁用全屏
      hideControls: true, // 隐藏控制栏
      resetOnEnd: false, // 结束时不重置
      seekTime: 1, // 跳跃时间间隔
      volume: 1, // 默认音量
      muted: muted.value, // 静音状态
      autoplay: false, // 不自动播放
      loop: { active: true }, // 循环播放
      ratio: null, // 不设置固定比例，让容器决定
      displayDuration: false, // 不显示时长
      invertTime: false, // 不反转时间显示
      toggleInvert: false // 禁用时间反转切换
    })

    // 绑定事件监听器
    plyrInstance.value.on('loadedmetadata', onVideoLoaded)
    plyrInstance.value.on('timeupdate', onTimeUpdate)
    plyrInstance.value.on('play', onPlay)
    plyrInstance.value.on('pause', onPause)
    plyrInstance.value.on('error', onError)

    // Plyr instance initialized
  }
}

// 视频控制API
const videoAPI = {
  // 播放控制
  play() {
    return plyrInstance.value?.play()
  },

  pause() {
    plyrInstance.value?.pause()
  },

  // 时间控制 - 使用 Plyr 的平滑 seeking
  setTime(time: number) {
    if (plyrInstance.value && plyrInstance.value.duration) {
      const clampedTime = Math.max(0, Math.min(time, plyrInstance.value.duration))

      // Plyr 的 currentTime 设置更平滑，不会引起重新播放
      plyrInstance.value.currentTime = clampedTime

      // Plyr setTime applied
    } else {
      // Plyr setTime skipped, no duration available
    }
  },

  getCurrentTime(): number {
    if (plyrInstance.value && typeof plyrInstance.value.currentTime === 'number') {
      return plyrInstance.value.currentTime
    }
    return 0
  },

  getDuration(): number {
    if (plyrInstance.value && typeof plyrInstance.value.duration === 'number' && !isNaN(plyrInstance.value.duration)) {
      return plyrInstance.value.duration
    }
    return 0
  },

  // 设置源
  setSrc(src: string) {
    if (plyrInstance.value) {
      // 对本地文件路径进行编码处理
      let encodedSrc = src
      // 如果是本地文件路径（包含盘符或以/开头），需要对路径部分进行编码
      if (src && (src.match(/^[A-Za-z]:/) || src.startsWith('/'))) {
        try {
          // 分离协议和路径
          const protocolMatch = src.match(/^(\w+:\/\/?)/)
          const protocol = protocolMatch ? protocolMatch[1] : ''
          const pathPart = protocol ? src.slice(protocol.length) : src

          // 对路径的每一部分进行编码，保留分隔符
          encodedSrc = protocol + pathPart
            .split(/([\\/])/)
            .map(part => {
              if (part === '/' || part === '\\') return part
              // 编码特殊字符，但保留已编码的部分
              try {
                // 先解码再编码，避免重复编码
                return encodeURIComponent(decodeURIComponent(part))
              } catch {
                return encodeURIComponent(part)
              }
            })
            .join('')
        } catch (e) {
          console.warn('URL encoding failed, using original:', e)
          encodedSrc = src.replaceAll('#', '%23')
        }
      } else if (src) {
        // 非本地路径，只处理 # 字符
        encodedSrc = src.replaceAll('#', '%23')
      }

      plyrInstance.value.source = {
        type: 'video',
        sources: [{
          src: encodedSrc,
          type: 'video/mp4'
        }]
      }
    }
  },

  // 静音控制
  setMuted(muted: boolean) {
    if (plyrInstance.value) {
      plyrInstance.value.muted = muted
    }
  },

  // 智能时间跳跃 - 使用 Plyr 的平滑跳跃
  jumpTime(seconds: number) {
    if (plyrInstance.value && plyrInstance.value.duration) {
      // Plyr 的 currentTime 设置更平滑
      plyrInstance.value.currentTime = seconds
    }
  }
}

// 节流的时间设置函数
const throttledSetTime = throttle(100, (time: number) => {
  // console.log('🎯 VideoPreview: throttledSetTime called with:', time)
  videoAPI.setTime(time)
})

// 暴露API给父组件
const exposedAPI = {
  play: videoAPI.play,
  pause: videoAPI.pause,
  setTime: videoAPI.setTime,
  getCurrentTime: videoAPI.getCurrentTime,
  getDuration: videoAPI.getDuration,
  setSrc: videoAPI.setSrc,
  setMuted: videoAPI.setMuted,
  jumpTime: videoAPI.jumpTime,
  setTimeThrottled: throttledSetTime
}

// Component created

defineExpose(exposedAPI)

// 事件处理
let hasInitialized = false

const onVideoLoaded = () => {
  if (plyrInstance.value) {
    // Video loaded

    // 只在首次加载时初始化视频
    if (!hasInitialized) {
      plyrInstance.value.currentTime = 0
      // First time load, reset currentTime to 0, starting playback
      plyrInstance.value.play()
      hasInitialized = true

      // 发送加载完成事件
      emit('loaded', { duration: plyrInstance.value.duration })
    } else {
      // Already initialized, skipping reset
    }
  }
}

const onTimeUpdate = () => {
  if (plyrInstance.value) {
    const currentTime = plyrInstance.value.currentTime
    const duration = plyrInstance.value.duration
    const progress = duration ? currentTime / duration : 0

    emit('timeupdate', { currentTime, progress })
  }
}

const onPlay = () => {
  // Video started playing
  emit('play')
}

const onPause = () => {
  // Video paused
  emit('pause')
}

const onError = (error: Event) => {
  console.error('VideoPreview: Plyr error:', error)
  emit('error', error)
}


// 组件挂载时初始化 Plyr
onMounted(() => {
  // Component mounted, initializing Plyr
  initPlyr()

  // 如果有初始 src，设置它
  if (src.value) {
    videoAPI.setSrc(src.value)
  }
})

// 监听props变化
watch(src, (newSrc, oldSrc) => {
  // src changed
  if (newSrc && plyrInstance.value) {
    videoAPI.setSrc(newSrc)
  }
})

watch(muted, (newMuted) => {
  // Muted state changed
  videoAPI.setMuted(newMuted)
}, { immediate: true })


// 组件卸载时清理
onUnmounted(() => {
  // Component unmounting

  // 销毁 Plyr 实例
  if (plyrInstance.value) {
    plyrInstance.value.destroy()
    plyrInstance.value = null
  }

  hasInitialized = false // 重置初始化标志
})
</script>

<style scoped>
.video-preview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden; /* 防止视频溢出 */
  contain: layout style; /* 优化渲染性能 */
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block; /* 移除默认的inline间距 */
}

/* 隐藏 Plyr 控制栏和元素 */
:deep(.plyr) {
  --plyr-control-spacing: 0;
  width: 100% !important;
  height: 100% !important;
  aspect-ratio: inherit; /* 继承父容器的宽高比 */
}

:deep(.plyr__video-wrapper) {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden;
  aspect-ratio: inherit;
}

:deep(.plyr video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center !important;
  aspect-ratio: inherit;
}

:deep(.plyr__controls) {
  display: none !important;
}

:deep(.plyr__poster) {
  display: none !important;
}

:deep(.plyr__captions) {
  display: none !important;
}

:deep(.plyr__menu) {
  display: none !important;
}

:deep(.plyr--video .plyr__controls) {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}

/* 确保 Plyr 容器不会超出父容器尺寸 */
:deep(.plyr--video) {
  max-width: 100%;
  max-height: 100%;
  border-radius: inherit;
  aspect-ratio: inherit;
}

/* 防止视频元素撑开容器 */
:deep(.plyr__video-embed),
:deep(.plyr__video-wrapper video) {
  max-width: 100% !important;
  max-height: 100% !important;
  border-radius: inherit;
  aspect-ratio: inherit;
}

/* 禁止 Plyr 自动设置尺寸 */
:deep(.plyr--video .plyr__video-wrapper) {
  padding-bottom: 0 !important; /* 移除 Plyr 的 aspect-ratio padding */
}

/* 确保视频填充方式正确 */
:deep(.plyr__video-wrapper video),
:deep(.plyr video) {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center !important;
}
</style>