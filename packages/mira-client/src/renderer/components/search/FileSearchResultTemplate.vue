<template>
  <div class="search-result-item file-result p-2 rounded-md flex items-center space-x-4 hover:bg-gray-600 cursor-pointer transition-colors duration-200">
    <!-- 文件缩略图或图标 -->
    <div class="file-thumbnail flex-shrink-0">
      <img 
        v-if="item.thumbnailPath" 
        :src="item.thumbnailPath" 
        :alt="item.name"
        class="w-12 h-12 rounded-md object-cover"
        @error="handleImageError"
      />
      <div 
        v-else 
        class="w-12 h-12 rounded-md bg-gray-700 flex items-center justify-center"
      >
        <span class="material-icons text-gray-400 text-xl">{{ fileIcon }}</span>
      </div>
    </div>

    <!-- 文件信息 -->
    <div class="file-info flex-1 min-w-0">
      <p class="font-semibold text-white truncate" :title="item.name">
        {{ item.name }}
      </p>
      <div class="flex items-center space-x-2 text-sm text-gray-400">
        <span>{{ formattedFileSize }}</span>
        <span>•</span>
        <span>{{ formattedDate }}</span>
        <span v-if="item.mimeType" class="text-xs bg-gray-700 px-2 py-1 rounded">
          {{ fileType }}
        </span>
      </div>
    </div>

    <!-- 文件标签 -->
    <div v-if="item.tags && item.tags.length > 0" class="file-tags flex-shrink-0">
      <div class="flex space-x-1">
        <span 
          v-for="tag in item.tags.slice(0, 2)" 
          :key="tag"
          class="text-xs bg-blue-600 text-white px-2 py-1 rounded"
        >
          {{ tag }}
        </span>
        <span 
          v-if="item.tags.length > 2"
          class="text-xs text-gray-400"
        >
          +{{ item.tags.length - 2 }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface FileItem {
  id: string
  name: string
  size: number
  mimeType?: string
  thumbnailPath?: string
  createdAt?: string
  tags?: string[]
  [key: string]: any
}

interface Props {
  item: FileItem
}

const props = defineProps<Props>()

/**
 * 计算文件图标（缓存）
 */
const fileIcon = computed((): string => {
  const mimeType = props.item.mimeType || ''
  
  if (mimeType.startsWith('image/')) {
    return 'image'
  } else if (mimeType.startsWith('video/')) {
    return 'video_file'
  } else if (mimeType.startsWith('audio/')) {
    return 'audio_file'
  } else if (mimeType.includes('pdf')) {
    return 'picture_as_pdf'
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return 'description'
  } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return 'table_chart'
  } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return 'slideshow'
  } else if (mimeType.includes('text/')) {
    return 'text_snippet'
  } else if (mimeType.includes('zip') || mimeType.includes('archive')) {
    return 'archive'
  } else {
    return 'insert_drive_file'
  }
})

/**
 * 计算文件类型显示名称（缓存）
 */
const fileType = computed((): string => {
  const mimeType = props.item.mimeType || ''
  
  if (mimeType.startsWith('image/')) {
    return '图片'
  } else if (mimeType.startsWith('video/')) {
    return '视频'
  } else if (mimeType.startsWith('audio/')) {
    return '音频'
  } else if (mimeType.includes('pdf')) {
    return 'PDF'
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return '文档'
  } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return '表格'
  } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return '演示'
  } else if (mimeType.includes('text/')) {
    return '文本'
  } else if (mimeType.includes('zip') || mimeType.includes('archive')) {
    return '压缩包'
  } else {
    return '文件'
  }
})

/**
 * 计算文件大小（缓存）
 */
const formattedFileSize = computed((): string => {
  const bytes = props.item.size
  if (!bytes) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
})

/**
 * 计算格式化日期（缓存）
 */
const formattedDate = computed((): string => {
  const dateString = props.item.createdAt
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return '今天'
  } else if (diffDays === 2) {
    return '昨天'
  } else if (diffDays <= 7) {
    return `${diffDays} 天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
})

/**
 * 处理图片加载错误
 */
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<style scoped>
.search-result-item {
  border: 1px solid transparent;
}

.search-result-item:hover {
  border-color: #374151;
}

.file-thumbnail img {
  transition: transform 0.2s;
}

.search-result-item:hover .file-thumbnail img {
  transform: scale(1.05);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .file-result {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .file-result > * {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
  
  .file-thumbnail {
    align-self: center;
  }
  
  .file-info {
    text-align: center;
  }
  
  .file-tags {
    align-self: center;
  }
}

@media (max-width: 480px) {
  .file-thumbnail img,
  .file-thumbnail div {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  .file-info p {
    font-size: 0.875rem;
  }
  
  .file-info div {
    font-size: 0.75rem;
  }
}
</style>
