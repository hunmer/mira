<template>
  <div class="default-preview">
    <div class="preview-container">
      <div class="file-icon">
        <span class="icon">{{ getFileIcon() }}</span>
      </div>
      
      <div class="file-info">
        <h3>{{ fileInfo.title || fileInfo.name || '未知文件' }}</h3>
        
        <div class="file-details">
          <div v-if="fileInfo.mimeType" class="detail-item">
            <span class="label">文件类型:</span>
            <span class="value">{{ fileInfo.mimeType }}</span>
          </div>
          
          <div v-if="fileInfo.size" class="detail-item">
            <span class="label">文件大小:</span>
            <span class="value">{{ formatFileSize(fileInfo.size) }}</span>
          </div>
          
          <div v-if="fileInfo.updatedAt" class="detail-item">
            <span class="label">修改时间:</span>
            <span class="value">{{ formatDate(fileInfo.updatedAt) }}</span>
          </div>
          
          <div v-if="fileInfo.description" class="detail-item">
            <span class="label">描述:</span>
            <span class="value">{{ fileInfo.description }}</span>
          </div>
        </div>
        
        <div class="actions">
          <button v-if="downloadUrl" @click="downloadFile" class="download-button">
            下载文件
          </button>
          
          <button @click="copyFileInfo" class="copy-button">
            复制文件信息
          </button>
        </div>
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

const downloadUrl = computed(() => {
  return props.fileInfo?.url || props.fileInfo?.path || ''
})

const getFileIcon = (): string => {
  const fileName = (props.fileInfo?.name || props.fileInfo?.title || '').toLowerCase()
  const mimeType = (props.fileInfo?.mimeType || '').toLowerCase()
  
  // 根据文件类型返回对应的图标
  if (mimeType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/)) {
    return '🖼️'
  }
  
  if (mimeType.startsWith('video/') || fileName.match(/\.(mp4|avi|mov|wmv|flv|mkv|webm)$/)) {
    return '🎥'
  }
  
  if (mimeType.startsWith('audio/') || fileName.match(/\.(mp3|wav|flac|aac|ogg|m4a)$/)) {
    return '🎵'
  }
  
  if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
    return '📄'
  }
  
  if (mimeType.includes('document') || fileName.match(/\.(doc|docx|rtf)$/)) {
    return '📝'
  }
  
  if (mimeType.includes('spreadsheet') || fileName.match(/\.(xls|xlsx|csv)$/)) {
    return '📊'
  }
  
  if (mimeType.includes('presentation') || fileName.match(/\.(ppt|pptx)$/)) {
    return '📋'
  }
  
  if (mimeType.startsWith('text/') || fileName.match(/\.(txt|md|json|xml|log)$/)) {
    return '📃'
  }
  
  if (fileName.match(/\.(zip|rar|7z|tar|gz)$/)) {
    return '📦'
  }
  
  return '📁'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

const downloadFile = (): void => {
  if (downloadUrl.value) {
    const link = document.createElement('a')
    link.href = downloadUrl.value
    link.download = props.fileInfo.name || props.fileInfo.title || 'file'
    link.click()
  }
}

const copyFileInfo = (): void => {
  const info = [
    `文件名: ${props.fileInfo.title || props.fileInfo.name || '未知'}`,
    `类型: ${props.fileInfo.mimeType || '未知'}`,
    `大小: ${props.fileInfo.size ? formatFileSize(props.fileInfo.size) : '未知'}`,
    `修改时间: ${props.fileInfo.updatedAt ? formatDate(props.fileInfo.updatedAt) : '未知'}`
  ].join('\n')
  
  navigator.clipboard.writeText(info).then(() => {
    console.log('文件信息已复制到剪贴板')
  }).catch(() => {
    console.error('复制失败')
  })
}
</script>

<style scoped>
.default-preview {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
}

.file-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100px;
  height: 100px;
  background: #f0f0f0;
  border-radius: 50%;
}

.file-icon .icon {
  font-size: 3rem;
}

.file-info {
  text-align: center;
  width: 100%;
}

.file-info h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.5rem;
  word-break: break-word;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
  text-align: left;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.detail-item .label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
}

.detail-item .value {
  color: #333;
  word-break: break-word;
  flex: 1;
  text-align: right;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.download-button,
.copy-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.download-button {
  background-color: #007bff;
  color: white;
}

.download-button:hover {
  background-color: #0056b3;
}

.copy-button {
  background-color: #6c757d;
  color: white;
}

.copy-button:hover {
  background-color: #545b62;
}
</style>
