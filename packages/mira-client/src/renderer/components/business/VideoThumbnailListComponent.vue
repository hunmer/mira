<template>
  <div class="w-28 flex-shrink-0 bg-white dark:bg-gray-900 p-2 flex flex-col items-center border-r border-gray-200 dark:border-gray-700">
    <div class="flex-grow space-y-3 overflow-y-auto pr-1">
      <div
        v-for="video in videos"
        :key="video.id"
        :class="[
          'relative cursor-pointer rounded-lg',
          video.id === currentVideoId
            ? 'border-2 border-blue-500'
            : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
        ]"
        @click="$emit('video-select', video.id)"
      >
        <img
          :alt="video.name"
          :src="video.thumbnailPath || video.url"
          class="h-24 w-24 rounded-lg object-cover"
          loading="lazy"
        />

        <!-- 播放图标覆盖层 -->
        <div class="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
          <span class="material-icons text-white">play_arrow</span>
        </div>

        <!-- 格式标识 -->
        <span
          class="absolute top-1 right-1 inline-flex items-center rounded-sm bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white"
        >
          {{ getFileFormat(video.name) }}
        </span>

        <!-- 时长显示 -->
        <span
          v-if="video.metadata?.duration"
          class="absolute bottom-1 right-1 inline-flex items-center rounded-sm bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white"
        >
          {{ formatDuration(video.metadata.duration) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileInfo } from '../../../shared/types'

interface Props {
  videos: FileInfo[]
  currentVideoId: string
}

interface Emits {
  (e: 'video-select', videoId: string): void
}

defineProps<Props>()
defineEmits<Emits>()

// 获取文件格式
const getFileFormat = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toUpperCase()
  return extension || 'VIDEO'
}

// 格式化时长
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
</script>

<style scoped>
/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.dark .overflow-y-auto::-webkit-scrollbar-track {
  background: #374151;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* 悬停效果 */
.relative:hover .absolute.inset-0 {
  background-color: rgba(0, 0, 0, 0.4);
}
</style>
