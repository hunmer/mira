<template>
  <div class="w-full h-full flex justify-center items-center bg-muted">
    <div class="relative flex flex-col items-center gap-8 p-12 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] max-w-[500px] w-[90%]">
      <button @click="goBack" class="absolute top-3 left-3 flex justify-center items-center w-9 h-9 border-none rounded-full cursor-pointer bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" :title="$t('preview.defaultPreview.back')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </button>

      <div class="flex justify-center items-center w-[100px] h-[100px] bg-accent rounded-full">
        <span class="text-5xl">{{ getFileIcon() }}</span>
      </div>

      <div class="text-center w-full">
        <h3 class="m-0 mb-6 text-foreground text-2xl break-words">{{ fileInfo.title || fileInfo.name || $t('preview.defaultPreview.unknownFile') }}</h3>

        <div class="flex flex-col gap-3 mb-8 text-left">
          <div v-if="fileInfo.mimeType" class="detail-item flex justify-between p-2 bg-muted rounded">
            <span class="label font-medium text-muted-foreground min-w-[80px]">{{ $t('preview.defaultPreview.fileType') }}:</span>
            <span class="value text-foreground break-words flex-1 text-right">{{ fileInfo.mimeType }}</span>
          </div>

          <div v-if="fileInfo.size" class="detail-item flex justify-between p-2 bg-muted rounded">
            <span class="label font-medium text-muted-foreground min-w-[80px]">{{ $t('preview.defaultPreview.fileSize') }}:</span>
            <span class="value text-foreground break-words flex-1 text-right">{{ formatFileSize(fileInfo.size) }}</span>
          </div>

          <div v-if="fileInfo.updatedAt" class="detail-item flex justify-between p-2 bg-muted rounded">
            <span class="label font-medium text-muted-foreground min-w-[80px]">{{ $t('preview.defaultPreview.modifiedAt') }}:</span>
            <span class="value text-foreground break-words flex-1 text-right">{{ formatDate(fileInfo.updatedAt) }}</span>
          </div>

          <div v-if="fileInfo.description" class="detail-item flex justify-between p-2 bg-muted rounded">
            <span class="label font-medium text-muted-foreground min-w-[80px]">{{ $t('preview.defaultPreview.description') }}:</span>
            <span class="value text-foreground break-words flex-1 text-right">{{ fileInfo.description }}</span>
          </div>
        </div>

        <div class="flex gap-4 justify-center flex-wrap">
          <button v-if="downloadUrl" @click="downloadFile" class="px-6 py-3 border-none rounded-md cursor-pointer text-[0.95rem] transition-all duration-200 bg-primary text-white hover:bg-primary">
            {{ $t('preview.defaultPreview.download') }}
          </button>

          <button @click="copyFileInfo" class="px-6 py-3 border-none rounded-md cursor-pointer text-[0.95rem] transition-all duration-200 bg-muted text-white hover:bg-muted">
            {{ $t('preview.defaultPreview.copyInfo') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  fileInfo: any
}

const props = defineProps<Props>()
const { t } = useI18n()

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

const goBack = (): void => {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    window.close()
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
  const unknown = t('preview.defaultPreview.unknown')
  const info = [
    t('preview.defaultPreview.copyFileName', { value: props.fileInfo.title || props.fileInfo.name || unknown }),
    t('preview.defaultPreview.copyType', { value: props.fileInfo.mimeType || unknown }),
    t('preview.defaultPreview.copySize', { value: props.fileInfo.size ? formatFileSize(props.fileInfo.size) : unknown }),
    t('preview.defaultPreview.copyModifiedAt', { value: props.fileInfo.updatedAt ? formatDate(props.fileInfo.updatedAt) : unknown })
  ].join('\n')
  
  navigator.clipboard.writeText(info).then(() => {
    console.log('文件信息已复制到剪贴板')
  }).catch(() => {
    console.error('复制失败')
  })
}
</script>

