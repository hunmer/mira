<template>
  <div class="video-preview-view bg-muted dark:bg-muted h-screen flex flex-col text-[13px]">
    <!-- 顶部工具栏 -->
    <PreviewHeader :file-info="controller.currentVideo.value || {}">
      <template #left-extra>
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            <span class="material-symbols-outlined text-sm mr-1">folder</span>
            {{ controller.currentVideo.value?.folderId || '/Videos' }}
          </span>
          <span
            v-for="tag in controller.currentVideo.value?.tags"
            :key="tag"
            class="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
          >
            <span class="material-symbols-outlined text-sm mr-1">label</span>
            {{ tag }}
          </span>
        </div>
      </template>
      <template #right-actions>
        <button class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
          <span class="material-symbols-outlined text-muted-foreground">more_horiz</span>
        </button>
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          @click="controller.closePreview"
        >
          <span class="material-icons text-muted-foreground">close</span>
        </button>
      </template>
    </PreviewHeader>

    <!-- 主内容区域 -->
    <div class="flex flex-grow overflow-hidden">
      <!-- 左侧视频缩略图列表 -->
      <VideoThumbnailListComponent
        :videos="controller.videos.value"
        :current-video-id="controller.currentVideoId.value"
        @video-select="controller.handleVideoSelect"
      />

      <!-- 中间视频播放器 -->
      <div class="relative flex flex-grow flex-col bg-white dark:bg-black">
        <VideoPlayerComponent
          :video="controller.currentVideo.value"
          @play="controller.handlePlay"
          @pause="controller.handlePause"
          @ended="controller.handlePause"
          @time-update="controller.handleTimeUpdate"
          @duration-change="controller.handleDurationChange"
          @volume-change="controller.handleVolumeChange"
          @error="(err) => controller.error.value = err"
        />

        <!-- 底部状态栏 -->
        <footer class="flex h-10 flex-shrink-0 items-center justify-between border-t border-border dark:border-border bg-white dark:bg-muted px-6 text-xs text-muted-foreground dark:text-muted-foreground">
          <div class="flex items-center space-x-4">
            <span>分辨率: {{ controller.currentVideo.value?.metadata?.width || 0 }}x{{ controller.currentVideo.value?.metadata?.height || 0 }}</span>
            <span>大小: {{ formatFileSize(controller.currentVideo.value?.size) }}</span>
            <span>格式: {{ getFileFormat(controller.currentVideo.value?.name) }}</span>
            <span>创建时间: {{ formatDate(controller.currentVideo.value?.createdAt) }}</span>
          </div>
          <div class="flex items-center space-x-4">
            <span>{{ controller.currentVideoIndex.value + 1 }} / {{ controller.videos.value.length }}</span>
            <button
              class="rounded-full p-1 hover:bg-muted dark:hover:bg-muted"
              :disabled="controller.currentVideoIndex.value === 0"
              @click="controller.previousVideo"
            >
              <span class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">navigate_before</span>
            </button>
            <button
              class="rounded-full p-1 hover:bg-muted dark:hover:bg-muted"
              :disabled="controller.currentVideoIndex.value === controller.videos.value.length - 1"
              @click="controller.nextVideo"
            >
              <span class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">navigate_next</span>
            </button>
          </div>
        </footer>
      </div>

      <!-- 右侧文件信息面板 -->
      <VideoFileInfoComponent
        :video="controller.currentVideo.value"
        :current-time="controller.currentTime.value"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import VideoThumbnailListComponent from '../business/VideoThumbnailListComponent.vue'
import VideoPlayerComponent from '../business/VideoPlayerComponent.vue'
import VideoFileInfoComponent from '../business/VideoFileInfoComponent.vue'
import PreviewHeader from './PreviewHeader.vue'
import { useVideoPreviewController } from '../../controllers/VideoPreviewController'

// 使用控制器
const controller = useVideoPreviewController()

// 格式化文件大小
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

const getFileFormat = (fileName?: string): string => {
  if (!fileName) return 'Unknown'
  const extension = fileName.split('.').pop()?.toUpperCase()
  return extension || 'Unknown'
}

const formatDate = (date?: Date | string): string => {
  if (!date) return 'Unknown'

  try {
    const dateObj = date instanceof Date ? date : new Date(date)

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date'
    }

    return dateObj.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

// 键盘快捷键支持
const handleKeyPress = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowLeft':
      controller.previousVideo()
      break
    case 'ArrowRight':
      controller.nextVideo()
      break
    case 'Escape':
      controller.closePreview()
      break
    case ' ':
      event.preventDefault()
      controller.togglePlayPause()
      break
    case 'ArrowUp':
      controller.handleVolumeChange(Math.min(controller.volume.value + 0.1, 1))
      break
    case 'ArrowDown':
      controller.handleVolumeChange(Math.max(controller.volume.value - 0.1, 0))
      break
    case 'f':
    case 'F':
      controller.handleToggleFullscreen()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyPress)
  // 初始化视频数据
  controller.initializeVideoData()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress)
  // 清理视频资源
  controller.cleanup()
})
</script>

<style scoped>
.material-icons,
.material-symbols-outlined {
  font-size: 18px;
}

.material-symbols-outlined.text-sm {
  font-size: 16px;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:disabled:hover {
  background-color: inherit;
}
</style>
