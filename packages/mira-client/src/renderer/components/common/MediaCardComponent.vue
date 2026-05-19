<template>
  <div
    class="media-card"
    :class="[
      `media-card--${size}`,
      { 
        'media-card--selected': selected,
        'media-card--selectable': selectable 
      }
    ]"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- 选择框 -->
    <div v-if="selected" class="media-card__selection-indicator">
      <div class="media-card__selection-icon">
        <span class="material-icons text-white text-sm">check</span>
      </div>
    </div>
    
    <!-- 媒体内容 -->
    <div class="media-card__content">
      <!-- 文件夹类型 -->
      <div v-if="getFileType(item) === 'folder'" class="media-card__folder">
        <span class="material-icons text-blue-500" style="font-size: 4rem;">folder</span>
        <div class="media-card__folder-name">{{ item.name }}</div>
        <div v-if="item.metadata?.itemCount" class="media-card__folder-count">
          {{ item.metadata.itemCount }} 项
        </div>
      </div>
      
      <!-- 图片类型 -->
      <div v-else-if="getFileType(item) === 'image'" class="media-card__image">
        <img
          v-lazy="item.thumbnailPath || item.url"
          :alt="item.name"
          class="media-card__image-content"
          @load="handleImageLoad"
          @error="handleImageError"
        />

        <!-- 文件类型标签 -->
        <div class="media-card__file-type">
          {{ getFileExtension(item.name) }}
        </div>
      </div>
      
      <!-- 视频类型 -->
      <div v-else-if="getFileType(item) === 'video'" class="media-card__video">
        <div
          class="media-card__video-thumbnail"
          @mouseenter="videoPreview.handleMouseEnter(item)"
          @mouseleave="videoPreview.handleMouseLeave()"
          @mousemove="videoPreview.handleMouseMove"
        >
          <!-- 默认缩略图 -->
          <img
            v-if="item.thumbnailPath && !videoPreview.showPreview.value"
            v-lazy="item.thumbnailPath"
            :alt="item.name"
            class="media-card__image-content"
          />

          <!-- 视频预览 -->
          <video
            v-if="videoPreview.showPreview.value"
            :ref="el => videoPreview.videoRef.value = el as HTMLVideoElement"
            :src="item.url"
            class="media-card__video-preview"
            muted
            preload="metadata"
            @loadedmetadata="videoPreview.handleVideoLoaded"
          />

          <!-- 占位符 -->
          <div v-if="!item.thumbnailPath && !videoPreview.showPreview.value" class="media-card__placeholder">
            <span class="material-icons text-gray-400" style="font-size: 2rem;">videocam</span>
          </div>

          <!-- 播放按钮 -->
          <div class="media-card__play-button" v-if="!videoPreview.showPreview.value">
            <span class="material-icons">play_arrow</span>
          </div>

          <!-- 视频进度条 -->
          <div v-if="videoPreview.showPreview.value && videoPreview.duration.value > 0" class="media-card__video-progress">
            <div
              class="media-card__video-progress-bar"
              :style="{ width: `${(videoPreview.currentTime.value / videoPreview.duration.value) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- 文件类型标签 -->
        <div class="media-card__file-type">
          {{ getFileExtension(item.name) }}
        </div>

        <!-- 视频时长 -->
        <div v-if="item.metadata?.duration" class="media-card__duration">
          {{ formatDuration(item.metadata.duration) }}
        </div>
      </div>
      
      <!-- 音频类型 -->
      <div v-else-if="getFileType(item) === 'audio'" class="media-card__audio">
        <div class="media-card__placeholder">
          <span class="material-icons text-blue-500" style="font-size: 2rem;">volume_up</span>
        </div>
        <div class="media-card__file-type">
          {{ getFileExtension(item.name) }}
        </div>
      </div>
      
      <!-- 文档类型 -->
      <div v-else class="media-card__document">
        <div class="media-card__placeholder">
          <i :class="getDocumentIcon(item.name)" style="font-size: 2rem;" />
        </div>
        <div class="media-card__file-type">
          {{ getFileExtension(item.name) }}
        </div>
      </div>
    </div>
    
    <!-- 文件信息 -->
    <div v-if="showDetails" class="media-card__details">
      <div class="media-card__name" :title="item.name">
        {{ item.name }}
      </div>
      
      <div v-if="item.size" class="media-card__size">
        {{ formatFileSize(item.size) }}
      </div>
      
      <div v-if="item.createdAt" class="media-card__date">
        {{ formatDate(item.createdAt) }}
      </div>
      
      <!-- 标签 -->
      <div v-if="item.tags && item.tags.length > 0" class="media-card__tags">
        <Badge
          v-for="tag in item.tags.slice(0, 3)"
          :key="tag"
          variant="secondary"
          class="text-xs"
        >{{ tag }}</Badge>
        <span v-if="item.tags.length > 3" class="media-card__more-tags">
          +{{ item.tags.length - 3 }}
        </span>
      </div>
    </div>
    
    <!-- 悬停操作按钮 -->
    <div class="media-card__actions">
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
const handleClick = () => {
  if (props.selectable) {
    handleSelect(!props.selected)
  }
  emit('click', props.item)
}

const handleDoubleClick = () => {
  emit('double-click', props.item)
}

const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  emit('context-menu', props.item, event)
}

const handleSelect = (selected: boolean) => {
  emit('select', props.item, selected)
}

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
    'pdf': 'picture_as_pdf text-red-500',
    'doc': 'description text-blue-500',
    'docx': 'description text-blue-500',
    'xls': 'table_chart text-green-500',
    'xlsx': 'table_chart text-green-500',
    'ppt': 'slideshow text-orange-500',
    'pptx': 'slideshow text-orange-500',
    'txt': 'text_snippet text-gray-500',
    'zip': 'folder_zip text-yellow-500',
    'rar': 'folder_zip text-yellow-500'
  }
  
  return iconMap[extension || ''] || 'insert_drive_file text-gray-500'
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
.media-card {
  position: relative;
  background: white;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.media-card:hover {
  border-color: rgb(59 130 246);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.media-card--selectable .media-card__selection-indicator {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
}

.media-card__selection-icon {
  width: 24px;
  height: 24px;
  background: rgb(59 130 246);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.media-card__content {
  position: relative;
  width: 100%;
  background: rgb(249 250 251);
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

.media-card__folder,
.media-card__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.media-card__folder-name {
  margin-top: 8px;
  font-weight: 600;
  color: rgb(55 65 81);
}

.media-card__folder-count {
  margin-top: 4px;
  font-size: 0.75rem;
  color: rgb(107 114 128);
}

.media-card__image-content {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-card__video-thumbnail {
  position: relative;
  width: 100%;
  height: 100%;
}

.media-card__video-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-card__video-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.3);
}

.media-card__video-progress-bar {
  height: 100%;
  background: rgb(59 130 246);
  transition: width 0.1s ease;
}

.media-card__play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.media-card:hover .media-card__play-button {
  opacity: 1;
}

.media-card__file-type {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.media-card__duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
}

.media-card__details {
  padding: 12px;
}

.media-card__name {
  font-weight: 600;
  color: rgb(17 24 39);
  font-size: 0.875rem;
  line-height: 1.25rem;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-card__size,
.media-card__date {
  font-size: 0.75rem;
  color: rgb(107 114 128);
  margin-bottom: 2px;
}

.media-card__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.media-card__more-tags {
  font-size: 0.75rem;
  color: rgb(107 114 128);
}

.media-card__actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.media-card:hover .media-card__actions {
  opacity: 1;
}
</style>
