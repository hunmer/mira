<template>
  <div class="w-80 flex-shrink-0 bg-white dark:bg-gray-900 flex flex-col border-l border-gray-200 dark:border-gray-700">
    <!-- 顶部标题 -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <div class="py-4 px-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">文件信息</h2>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-grow overflow-y-auto p-4 space-y-6">

      <!-- 缩略图预览 -->
      <div v-if="video?.thumbnailPath" class="space-y-4">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">缩略图</h3>
        <div class="flex justify-center">
          <img
            :src="video.thumbnailPath"
            :alt="video.name"
            class="max-w-full h-auto rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">基本信息</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">文件名:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100 text-right max-w-48 truncate" :title="video?.name">{{ video?.name || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">格式:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ getFileFormat(video?.name) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">大小:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ formatFileSize(video?.size) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">MIME类型:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ video?.mimeType || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 媒体信息 -->
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">媒体信息</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">分辨率:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">
              {{ video?.metadata?.width || 0 }}x{{ video?.metadata?.height || 0 }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">时长:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ formatDuration(currentTime) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">比特率:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ video?.metadata?.bitrate ? formatBitrate(video.metadata.bitrate) : '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">帧率:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ video?.metadata?.frameRate ? `${video.metadata.frameRate} fps` : '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 文件路径信息 -->
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">位置信息</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">文件夹ID:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ video?.folderId || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">完整路径:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100 text-right max-w-48 truncate" :title="video?.path">{{ video?.path || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 时间信息 -->
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">时间信息</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">创建时间:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ formatDate(video?.createdAt) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">更新时间:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ formatDate(video?.updatedAt) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">文件哈希:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100 text-right max-w-48 truncate" :title="video?.hash">{{ video?.hash || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 标签信息 -->
      <div v-if="video?.tags && video.tags.length > 0" class="space-y-4">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">标签</h3>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="tag in video.tags"
            :key="tag"
            class="inline-flex items-center rounded-md bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400"
          >
            <span class="material-icons text-base mr-1">label</span>
            {{ tag }}
          </span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileInfo } from '../../../shared/types'

interface Props {
  video?: FileInfo
  currentTime: number
}

defineProps<Props>()

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

// 获取文件格式
const getFileFormat = (fileName?: string): string => {
  if (!fileName) return 'Unknown'
  const extension = fileName.split('.').pop()?.toUpperCase()
  return extension || 'Unknown'
}

// 格式化日期
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

// 格式化时长
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds === 0) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// 格式化比特率
const formatBitrate = (bitrate: number): string => {
  if (bitrate >= 1000000) {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`
  } else if (bitrate >= 1000) {
    return `${(bitrate / 1000).toFixed(1)} Kbps`
  }
  return `${bitrate} bps`
}
</script>
