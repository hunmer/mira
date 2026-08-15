<template>
  <div class="w-80 flex-shrink-0 bg-background flex flex-col border-l border-border">
    <!-- 内容区域 -->
    <div class="flex-grow overflow-y-auto p-4">
      <!-- 详细信息内容 -->
      <div class="space-y-4">
        <!-- 图片预览 -->
        <div v-if="image" class="relative">
          <img 
            v-if="!imageLoadError"
            :alt="image.name"
            :src="imageSrc"
            class="rounded-lg object-contain w-full max-h-[300px] cursor-pointer"
            @error="handleImageError"
          />
          <StatusImage v-else name="load_failed" size="medium" />
          <div class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {{ getFileExtension(image) }}
          </div>
        </div>

        <!-- 文件名和路径 -->
        <div>
          <h3 class="font-semibold text-foreground mb-2">{{ image?.name || 'Unknown' }}</h3>
          <div class="text-xs text-muted-foreground bg-muted p-2 rounded">
            {{ folderName }}
          </div>
        </div>

        <!-- 标签管理 -->
        <div>
          <h4 class="font-semibold text-foreground mb-2 text-sm">{{ $t('business.imageInfoComponent.tags') }}</h4>
          <div class="flex flex-wrap gap-2 items-center">
            <span
              v-for="tag in image?.tags"
              :key="tag"
              class="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center"
            >
              {{ tag }}
              <button
                class="ml-1 text-primary-foreground/80 text-xs hover:text-primary-foreground"
                @click="$emit('tag-remove', tag)"
              >
                ×
              </button>
            </span>
            <button 
              class="text-muted-foreground hover:text-foreground text-lg px-2 py-1 rounded-full hover:bg-muted"
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
              :placeholder="$t('business.imageInfoComponent.newTagPlaceholder')"
              class="flex-1 px-2 py-1 text-xs border border-border rounded"
              @keyup.enter="addTag"
              @keyup.escape="cancelAddTag"
            />
            <button 
              class="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary"
              @click="addTag"
            >
              {{ $t('business.imageInfoComponent.add') }}
            </button>
            <button
              class="px-2 py-1 text-xs bg-muted text-white rounded hover:bg-muted"
              @click="cancelAddTag"
            >
              {{ $t('business.imageInfoComponent.cancel') }}
            </button>
          </div>
        </div>

        <!-- 基本信息 -->
        <div>
          <h4 class="font-semibold text-foreground mb-2 text-sm">{{ $t('business.imageInfoComponent.basicInfo') }}</h4>
          <div class="text-xs space-y-2 text-muted-foreground">
            <div class="flex justify-between">
              <span>{{ $t('business.imageInfoComponent.fileSize') }}</span>
              <span>{{ formatFileSize(image?.size) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('business.imageInfoComponent.dimensions') }}</span>
              <span>{{ image?.metadata?.width || 0 }} x {{ image?.metadata?.height || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('business.imageInfoComponent.createdAt') }}</span>
              <span>{{ formatDate(image?.createdAt) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('business.imageInfoComponent.updatedAt') }}</span>
              <span>{{ formatDate(image?.updatedAt || image?.createdAt) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('business.imageInfoComponent.fileFormat') }}</span>
              <span>{{ getFileFormat(image?.name) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="pt-4 border-t border-border">
          <div class="grid grid-cols-2 gap-2">
            <button class="px-3 py-2 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">download</span>
              <span>{{ $t('business.imageInfoComponent.download') }}</span>
            </button>
            <button class="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">share</span>
              <span>{{ $t('business.imageInfoComponent.share') }}</span>
            </button>
            <button class="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">edit</span>
              <span>{{ $t('business.imageInfoComponent.edit') }}</span>
            </button>
            <button class="px-3 py-2 text-sm bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">delete</span>
              <span>{{ $t('business.imageInfoComponent.delete') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FileInfo } from '../../../shared/types'
import { getCacheBustedPreviewImageSource, getPreviewImageSource } from '../../utils/fileUtils'
import { useFolderStore } from '../../stores/folder'
import StatusImage from '@renderer/components/common/StatusImage.vue'

interface Props {
  image?: FileInfo
  cacheKey?: string | number
}

interface Emits {
  (e: 'tag-add', tag: string): void
  (e: 'tag-remove', tag: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const showAddTag = ref(false)
const newTag = ref('')
const imageLoadError = ref(false)
const imageSrc = computed(() => getCacheBustedPreviewImageSource(props.image, props.cacheKey))

const folderStore = useFolderStore()
const folderName = computed(() => {
  const folderId = props.image?.folderId
  if (!folderId) return 'Unknown'
  if (folderId === 'default') return 'Default'
  const folder = folderStore.getFolderById(Number(folderId))
  return folder?.title || String(folderId)
})

const describeImage = (image?: FileInfo): Record<string, unknown> | null => {
  if (!image) return null

  return {
    id: image.id,
    name: image.name,
    localFile: image.localFile,
    path: image.path,
    url: image.url,
    thumbnailPath: image.thumbnailPath,
    previewSource: getPreviewImageSource(image),
    updatedAt: image.updatedAt
  }
}

watch(
  [() => props.image, () => props.cacheKey, imageSrc],
  ([image, cacheKey, src]) => {
    imageLoadError.value = false
      image: describeImage(image),
      cacheKey,
      imageSrc: src
    })
  },
  { immediate: true }
)

const handleImageError = () => {
  imageLoadError.value = true
}

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
