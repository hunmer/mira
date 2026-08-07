<template>
  <div
    class="relative bg-white rounded-lg border-2 border-transparent cursor-pointer transition-all duration-200 overflow-hidden hover:border-primary hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
    :class="[
      `media-card--${size}`,
      {
        'media-card--selected': selected,
        'media-card--selectable': selectable
      }
    ]"
    <!-- 选择框 -->
    <div v-if="selected" class="media-card__selection-indicator">
      <div class="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
        <span class="material-icons text-white text-sm">check</span>
      </div>
    </div>
    
    <!-- 媒体内容 -->
    <div class="relative w-full bg-muted media-card__content">
      <!-- 文件夹类型 -->
      <div v-if="getFileType(item) === 'folder'" class="flex flex-col items-center justify-center h-full text-center">
        <span class="material-icons text-primary" style="font-size: 4rem;">folder</span>
        <div class="mt-2 font-semibold text-foreground">{{ item.name }}</div>
        <div v-if="item.metadata?.itemCount" class="mt-1 text-xs text-muted-foreground">
          {{ item.metadata.itemCount }} 项
        </div>
      </div>
      
      <!-- 图片类型 -->
      <div v-else-if="getFileType(item) === 'image'" class="media-card__image">
        <img
          v-lazy="item.thumbnailPath || item.url"
          :alt="item.name"
          class="w-full h-full object-cover"
          @load="handleImageLoad"
          @error="handleImageError"
        />

        <!-- 文件类型标签 -->
        <div class="absolute top-2 right-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-[0.7rem] font-semibold">
          {{ getFileExtension(item.name) }}
        </div>
      </div>
      
      <!-- 视频类型 -->
      <div v-else-if="getFileType(item) === 'video'" class="media-card__video">
        <div
          class="relative w-full h-full"
          @mouseenter="videoPreview.handleMouseEnter(item)"
          @mouseleave="videoPreview.handleMouseLeave()"
          @mousemove="videoPreview.handleMouseMove"
        >
          <!-- 默认缩略图 -->
          <img
            v-if="item.thumbnailPath && !videoPreview.showPreview.value"
            v-lazy="item.thumbnailPath"
            :alt="item.name"
            class="w-full h-full object-cover"
          />

          <!-- 视频预览 -->
          <video
            v-if="videoPreview.showPreview.value"
            :ref="el => videoPreview.videoRef.value = el as HTMLVideoElement"
            :src="item.url"
            class="absolute top-0 left-0 w-full h-full object-cover"
            muted
            preload="metadata"
            @loadedmetadata="videoPreview.handleVideoLoaded"
          />

          <!-- 占位符 -->
          <div v-if="!item.thumbnailPath && !videoPreview.showPreview.value" class="media-card__placeholder">
            <span class="material-icons text-muted-foreground" style="font-size: 2rem;">videocam</span>
          </div>

          <!-- 播放按钮 -->
          <div class="media-card__play-button absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 flex items-center justify-center text-white opacity-0 transition-opacity duration-200" v-if="!videoPreview.showPreview.value">
            <span class="material-icons">play_arrow</span>
          </div>

          <!-- 视频进度条 -->
          <div v-if="videoPreview.showPreview.value && videoPreview.duration.value > 0" class="absolute bottom-0 left-0 right-0 h-[3px] bg-black/30">
            <div
              class="h-full bg-primary transition-[width] duration-100"
              :style="{ width: `${(videoPreview.currentTime.value / videoPreview.duration.value) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- 文件类型标签 -->
        <div class="absolute top-2 right-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-[0.7rem] font-semibold">
          {{ getFileExtension(item.name) }}
        </div>

        <!-- 视频时长 -->
        <div v-if="item.metadata?.duration" class="absolute bottom-2 right-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-[0.7rem]">
          {{ formatDuration(item.metadata.duration) }}
        </div>
      </div>
      
      <!-- 音频类型 -->
      <div v-else-if="getFileType(item) === 'audio'" class="media-card__audio">
        <div class="flex flex-col items-center justify-center h-full text-center">
          <span class="material-icons text-primary" style="font-size: 2rem;">volume_up</span>
        </div>
        <div class="absolute top-2 right-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-[0.7rem] font-semibold">
          {{ getFileExtension(item.name) }}
        </div>
      </div>
      
      <!-- 文档类型 -->
      <div v-else class="media-card__document">
        <div class="flex flex-col items-center justify-center h-full text-center">
          <i :class="getDocumentIcon(item.name)" style="font-size: 2rem;" />
        </div>
        <div class="absolute top-2 right-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-[0.7rem] font-semibold">
          {{ getFileExtension(item.name) }}
        </div>
      </div>
    </div>
    
    <!-- 文件信息 -->
    <div v-if="showDetails" class="p-3">
      <div class="font-semibold text-foreground text-sm leading-5 mb-1 overflow-hidden text-ellipsis whitespace-nowrap" :title="item.name">
        {{ item.name }}
      </div>
      
      <div v-if="item.size" class="text-xs text-muted-foreground mb-0.5">
        {{ formatFileSize(item.size) }}
      </div>
      
      <div v-if="item.createdAt" class="text-xs text-muted-foreground mb-0.5">
        {{ formatDate(item.createdAt) }}
      </div>
      
      <!-- 标签 -->
      <div v-if="item.tags && item.tags.length > 0" class="flex items-center flex-wrap gap-1 mt-2">
        <Badge
          v-for="tag in item.tags.slice(0, 3)"
          :key="tag"
          variant="secondary"
          class="text-xs"
        >{{ tag }}</Badge>
        <span v-if="item.tags.length > 3" class="text-xs text-muted-foreground">
          +{{ item.tags.length - 3 }}
        </span>
      </div>
    </div>
    
    <!-- 悬停操作按钮 -->
    <div class="media-card__actions absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity duration-200">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="sm" class="rounded-full" @click.stop="handlePreview">
              <span class="material-icons">visibility</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">预览</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="sm" class="rounded-full" @click.stop="handleDownload">
              <span class="material-icons">download</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">下载</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="sm" class="rounded-full" @click.stop="handleMore">
              <span class="material-icons">more_vert</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">更多</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useVideoPreview } from '@renderer/composables/useVideoPreview'
import type { MediaCardComponentProps, MediaCardEvents } from '../../types/components'

interface Props extends MediaCardComponentProps {}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  selectable: false,
  size: 'medium',
  showDetails: true
})

const emit = defineEmits<MediaCardEvents>()

// 响应式数据
const isImageLoaded = ref(false)
const isImageError = ref(false)

// 使用视频预览 composable
const videoPreview = useVideoPreview({
  hoverDelay: 300,
  enabled: true
})

// 方法
const handleImageLoad = () => {
  isImageLoaded.value = true
}

const handleImageError = () => {
  isImageError.value = true
}

const handlePreview = () => {
  // 预览逻辑
  emit('double-click', props.item)
}

const handleDownload = () => {
  // 下载逻辑
  console.log('Download item:', props.item)
}

const handleMore = () => {
  // 更多操作逻辑
  console.log('More actions for item:', props.item)
}

const getFileType = (item: any): string => {
  if (!item.mimeType) return 'document'
  
  if (item.mimeType.startsWith('image/')) return 'image'
  if (item.mimeType.startsWith('video/')) return 'video'
  if (item.mimeType.startsWith('audio/')) return 'audio'
  
  // Check if it's a folder (you might need to adjust this logic based on your data structure)
  if (item.mimeType === 'application/x-directory' || item.metadata?.itemCount !== undefined) return 'folder'
  
  return 'document'
}

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toUpperCase() || ''
}

const getDocumentIcon = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    'pdf': 'picture_as_pdf text-destructive',
    'doc': 'description text-primary',
    'docx': 'description text-primary',
    'xls': 'table_chart text-green-500',
    'xlsx': 'table_chart text-green-500',
    'ppt': 'slideshow text-orange-500',
    'pptx': 'slideshow text-orange-500',
    'txt': 'text_snippet text-muted-foreground',
    'zip': 'folder_zip text-yellow-500',
    'rar': 'folder_zip text-yellow-500'
  }
  
  return iconMap[extension || ''] || 'insert_drive_file text-muted-foreground'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.media-card--selectable .media-card__selection-indicator {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
}

.media-card--small .media-card__content {
  height: 120px;
}

.media-card--medium .media-card__content {
  height: 160px;
}

.media-card--large .media-card__content {
  height: 200px;
}

.media-card:hover .media-card__play-button {
  opacity: 1;
}

.media-card:hover .media-card__actions {
  opacity: 1;
}
</style>
