<template>
  <div class="audio-preview">
    <div class="audio-container">
      <div class="audio-info">
        <h3>{{ fileInfo.title || fileInfo.name || '未知音频文件' }}</h3>
        <p v-if="fileInfo.size" class="file-size">文件大小: {{ formatFileSize(fileInfo.size) }}</p>
      </div>
      
      <audio 
        v-if="audioUrl"
        :src="audioUrl" 
        controls
        preload="metadata"
        @error="onAudioError"
        class="preview-audio"
      >
        您的浏览器不支持音频播放
      </audio>
      
      <div v-else class="error">
        <p>无法获取音频文件</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  fileInfo: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  error: [message: string]
}>()

const audioUrl = computed(() => {
  if (!props.fileInfo) return ''
  
  // 如果有直接的URL
  if (props.fileInfo.url) {
    return props.fileInfo.url
  }
  
  // 临时使用文件路径
  if (props.fileInfo.path) {
    return props.fileInfo.path
  }
  
  return ''
})

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

<style scoped>
.audio-preview {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
}

.audio-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
}

.audio-info {
  text-align: center;
}

.audio-info h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.file-size {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.preview-audio {
  width: 100%;
  outline: none;
}

.error {
  color: #e74c3c;
  text-align: center;
}
</style>
