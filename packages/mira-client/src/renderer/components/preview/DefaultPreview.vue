<template>
  <div class="w-full h-full flex justify-center items-center bg-muted">
    <div class="flex flex-col items-center gap-8 p-12 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] max-w-[500px] w-[90%]">
      <div class="flex justify-center items-center w-[100px] h-[100px] bg-accent rounded-full">
        <span class="text-5xl">{{ getFileIcon() }}</span>
      </div>

      <div class="text-center w-full">
        <h3 class="m-0 mb-6 text-foreground text-2xl break-words">{{ fileInfo.title || fileInfo.name || '未知文件' }}</h3>

        <div class="flex flex-col gap-3 mb-8 text-left">
          <div v-if="fileInfo.mimeType" class="detail-item flex justify-between p-2 bg-muted rounded">
            <span class="label font-medium text-muted-foreground min-w-[80px]">文件类型:</span>
            <span class="value text-foreground break-words flex-1 text-right">{{ fileInfo.mimeType }}</span>
          </div>

          <div v-if="fileInfo.size" class="detail-item flex justify-between p-2 bg-muted rounded">
            <span class="label font-medium text-muted-foreground min-w-[80px]">文件大小:</span>
            <span class="value text-foreground break-words flex-1 text-right">{{ formatFileSize(fileInfo.size) }}</span>
          </div>

          <div v-if="fileInfo.updatedAt" class="detail-item flex justify-between p-2 bg-muted rounded">
            <span class="label font-medium text-muted-foreground min-w-[80px]">修改时间:</span>
            <span class="value text-foreground break-words flex-1 text-right">{{ formatDate(fileInfo.updatedAt) }}</span>
          </div>

          <div v-if="fileInfo.description" class="detail-item flex justify-between p-2 bg-muted rounded">
            <span class="label font-medium text-muted-foreground min-w-[80px]">描述:</span>
            <span class="value text-foreground break-words flex-1 text-right">{{ fileInfo.description }}</span>
          </div>
        </div>

        <div class="flex gap-4 justify-center flex-wrap">
          <button v-if="downloadUrl" @click="downloadFile" class="px-6 py-3 border-none rounded-md cursor-pointer text-[0.95rem] transition-all duration-200 bg-primary text-white hover:bg-primary">
            下载文件
          </button>

          <button @click="copyFileInfo" class="px-6 py-3 border-none rounded-md cursor-pointer text-[0.95rem] transition-all duration-200 bg-muted text-white hover:bg-muted">
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

