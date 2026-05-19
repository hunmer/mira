<template>
  <div class="w-80 flex-shrink-0 bg-white flex flex-col border-l border-gray-200">
    <!-- 顶部标题 -->
    <div class="border-b border-gray-200 p-4">
      <h2 class="text-lg font-semibold text-gray-900">详细信息</h2>
    </div>

    <!-- 内容区域 -->
    <div class="flex-grow overflow-y-auto p-4">
      <!-- 详细信息内容 -->
      <div class="space-y-4">
        <!-- 图片预览 -->
        <div v-if="image" class="relative">
          <img 
            :alt="image.name"
            :src="image.path || image.url"
            class="rounded-lg object-cover w-full h-48 cursor-pointer"
          />
          <div class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {{ getFileExtension(image) }}
          </div>
        </div>

        <!-- 文件名和路径 -->
        <div>
          <h3 class="font-semibold text-gray-800 mb-2">{{ image?.name || 'Unknown' }}</h3>
          <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            {{ image?.folderId || '/Unknown' }}
          </div>
        </div>

        <!-- 标签管理 -->
        <div>
          <h4 class="font-semibold text-gray-700 mb-2 text-sm">标签</h4>
          <div class="flex flex-wrap gap-2 items-center">
            <span 
              v-for="tag in image?.tags"
              :key="tag"
              class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center"
            >
              {{ tag }}
              <button 
                class="ml-1 text-blue-500 text-xs hover:text-blue-700"
                @click="$emit('tag-remove', tag)"
              >
                ×
              </button>
            </span>
            <button 
              class="text-gray-500 hover:text-gray-700 text-lg px-2 py-1 rounded-full hover:bg-gray-100"
              @click="showAddTag = true"
            >
              +
            </button>
          </div>
          
          <!-- 添加标签输入框 -->
          <div v-if="showAddTag" class="mt-2 flex space-x-2">
            <input 
              v-model="newTag"
              type="text"
              placeholder="输入新标签"
              class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              @keyup.enter="addTag"
              @keyup.escape="cancelAddTag"
            />
            <button 
              class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              @click="addTag"
            >
              添加
            </button>
            <button 
              class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              @click="cancelAddTag"
            >
              取消
            </button>
          </div>
        </div>

        <!-- 基本信息 -->
        <div>
          <h4 class="font-semibold text-gray-700 mb-2 text-sm">基本信息</h4>
          <div class="text-xs space-y-2 text-gray-600">
            <div class="flex justify-between">
              <span>文件大小</span>
              <span>{{ formatFileSize(image?.size) }}</span>
            </div>
            <div class="flex justify-between">
              <span>图片尺寸</span>
              <span>{{ image?.metadata?.width || 0 }} x {{ image?.metadata?.height || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span>创建时间</span>
              <span>{{ formatDate(image?.createdAt) }}</span>
            </div>
            <div class="flex justify-between">
              <span>修改时间</span>
              <span>{{ formatDate(image?.updatedAt || image?.createdAt) }}</span>
            </div>
            <div class="flex justify-between">
              <span>文件格式</span>
              <span>{{ getFileFormat(image?.name) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="pt-4 border-t border-gray-200">
          <div class="grid grid-cols-2 gap-2">
            <button class="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">download</span>
              <span>下载</span>
            </button>
            <button class="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">share</span>
              <span>分享</span>
            </button>
            <button class="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">edit</span>
              <span>编辑</span>
            </button>
            <button class="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">delete</span>
              <span>删除</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileInfo } from '../../../shared/types'

interface Props {
  image?: FileInfo
}

interface Emits {
  (e: 'tag-add', tag: string): void
  (e: 'tag-remove', tag: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const showAddTag = ref(false)
const newTag = ref('')

// 方法
const addTag = () => {
  if (newTag.value.trim()) {
    emit('tag-add', newTag.value.trim())
    newTag.value = ''
    showAddTag.value = false
  }
}

const cancelAddTag = () => {
  newTag.value = ''
  showAddTag.value = false
}

const getFileExtension = (image: FileInfo): string => {
  const extension = image.extension || image.name.split('.').pop()?.toUpperCase()
  return extension || 'Unknown'
}

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

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
