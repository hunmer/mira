<template>
  <div class="w-full h-full flex justify-center items-center bg-[#f8f9fa]">
    <div class="flex flex-col items-center gap-8 p-8 bg-white rounded-lg shadow-md max-w-[500px] w-[90%]">
      <div class="text-center">
        <h3 class="m-0 mb-2 text-[#333]">{{ fileInfo.title || fileInfo.name || '未知音频文件' }}</h3>
        <p v-if="fileInfo.size" class="text-[#666] text-[0.9rem] m-0">文件大小: {{ formatFileSize(fileInfo.size) }}</p>
      </div>

      <audio
        v-if="audioUrl"
        ref="audioElement"
        controls
        preload="metadata"
        @error="onAudioError"
        class="w-full outline-none"
      >
        您的浏览器不支持音频播放
      </audio>

      <div v-else class="text-[#e74c3c] text-center">
        <p>无法获取音频文件</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import Hls from 'hls.js'
import { getMediaPreviewSource } from '../../utils/fileUtils'

interface Props {
  fileInfo: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  error: [message: string]
}>()
const audioElement = ref<HTMLAudioElement | null>(null)
let hls: Hls | null = null

const audioUrl = computed(() => {
  return getMediaPreviewSource(props.fileInfo)
})

watch(audioUrl, async (url) => {
  await nextTick()
  const audio = audioElement.value
  if (!audio || !url) return
  hls?.destroy()
  hls = null
  if (url.includes('.m3u8') && Hls.isSupported()) {
    hls = new Hls({ enableWorker: true, lowLatencyMode: false })
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) emit('error', '音频流加载失败')
    })
    hls.loadSource(url)
    hls.attachMedia(audio)
  } else {
    audio.src = url
    audio.load()
  }
}, { immediate: true })

onUnmounted(() => hls?.destroy())

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const onAudioError = (): void => {
  emit('error', '音频加载失败')
}
</script>
