<template>
  <div class="flex flex-col h-full space-y-4">
    <!-- 无数据占位 -->
    <Empty v-if="displayItems.length === 0" class="flex-1">
      <EmptyMedia variant="icon">
        <span class="material-icons">info_outline</span>
      </EmptyMedia>
      <EmptyTitle>选择文件以查看详情</EmptyTitle>
    </Empty>
    <template v-else>
    <!-- 预览图 - 支持多选相册效果 -->
    <div class="relative">
      <!-- 单选模式 -->
      <div v-if="displayItems.length === 1" class="relative">
        <div class="relative rounded-lg bg-gray-100 overflow-hidden w-full" style="height: 192px;">
          <!-- 加载中占位符 -->
          <div v-if="imageLoadState === 'loading'" class="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div class="flex flex-col items-center text-gray-400">
              <span class="material-icons animate-pulse">image</span>
              <span class="text-xs mt-1">加载中...</span>
            </div>
          </div>

          <!-- 错误占位符 - 使用文件类型图标 -->
          <div v-else-if="imageLoadState === 'error'" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
            <img :src="getExtIconUrl(displayItems[0]?.name || '')" class="w-16 h-16 object-contain opacity-60" />
            <span class="text-xs text-gray-400 mt-2">加载失败</span>
          </div>

          <!-- 正常显示图片 -->
          <img
            v-show="imageLoadState === 'loaded'"
            ref="previewImage"
            :alt="displayItems[0].name"
            :src="displayItems[0].url || displayItems[0].thumbnailPath"
            class="rounded-lg object-contain w-full h-full"
            @load="handleImageLoad"
            @error="handleImageError"
          />
        </div>

        <div class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {{ getFileExtension(displayItems[0]) }}
        </div>
        <!-- 颜色提取结果显示 -->
        <div v-if="extractedColors.length > 0" class="absolute bottom-2 left-2 flex space-x-1">
          <div
            v-for="(color, index) in extractedColors"
            :key="index"
            :style="{ backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})` }"
            class="w-6 h-6 rounded-full border-2 border-white shadow-sm"
            :title="`RGB(${color[0]}, ${color[1]}, ${color[2]})`"
          ></div>
        </div>
      </div>
      
      <!-- 多选模式 - 叠放相册效果 -->
      <div v-else class="relative">
        <div class="image-stack">
          <div
            v-for="(item, index) in displayItems.slice(0, 4)"
            :key="item.id"
            class="stack-container"
            :style="{ zIndex: index, left: `${index * 8}px`, top: `${index * 8}px` }"
          >
            <!-- 加载中占位符 -->
            <div
              v-if="multiImageLoadStates[item.id] === 'loading' || multiImageLoadStates[item.id] === undefined"
              class="stack-placeholder bg-gray-100 rounded-lg flex items-center justify-center"
            >
              <span class="material-icons text-gray-300 text-xl">image</span>
            </div>

            <!-- 错误占位符 -->
            <div
              v-else-if="multiImageLoadStates[item.id] === 'error'"
              class="stack-placeholder bg-red-50 rounded-lg flex items-center justify-center"
            >
              <span class="material-icons text-red-200 text-xl">broken_image</span>
            </div>

            <!-- 正常显示图片 -->
            <img
              v-show="multiImageLoadStates[item.id] === 'loaded'"
              :alt="item.name"
              :src="item.thumbnailPath || item.url"
              class="stack-img"
              @load="handleMultiImageLoad(item.id)"
              @error="handleMultiImageError(item)"
            />
          </div>
          <!-- 更多文件提示 -->
          <div
            v-if="displayItems.length > 4"
            class="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded z-10"
          >
            +{{ displayItems.length - 4 }}
          </div>
          <!-- 文件数量显示 -->
          <div class="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded z-10">
            {{ displayItems.length }} 个文件
          </div>
        </div>
      </div>
    </div>
    <!-- 文件URL - 仅单选模式显示 -->
    <div v-if="!isMultiSelect && displayItems[0]?.url" class="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-2">
      <span class="flex-1 text-xs truncate">{{ displayItems[0].url }}</span>
      <button 
        class="p-1 rounded-md hover:bg-gray-100"
        @click="copyToClipboard(displayItems[0].url)"
      >
        <span class="material-icons text-gray-600 text-sm">link</span>
      </button>
    </div>

    <!-- 标签管理 -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold text-gray-700 text-sm">标签</h3>
        <Popover v-model:open="tagPopoverOpen">
          <PopoverTrigger as-child>
            <button class="text-blue-500 text-xs hover:text-blue-700 flex items-center gap-0.5">
              <span class="material-icons text-sm">{{ hasTags ? 'edit' : 'add' }}</span>
              <span>{{ hasTags ? '编辑' : (isMultiSelect ? '批量设置' : '设置标签') }}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" class="w-80 p-2">
            <FolderTreeComponent
              item-type="tag"
              :tags="tagStore.tags"
              @select="handleTagSelect"
            />
          </PopoverContent>
        </Popover>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <template v-if="!isMultiSelect && displayItems[0]?.tags && displayItems[0].tags.length > 0">
          <span
            v-for="tag in displayItems[0].tags"
            :key="tag"
            class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center"
          >
            {{ getTagName(tag) }}
            <button class="ml-1 text-blue-500 text-xs hover:text-blue-700" @click="handleRemoveTag(tag)">×</button>
          </span>
        </template>
        <template v-else-if="isMultiSelect && mergedInfo && mergedInfo.tags.length > 0">
          <span
            v-for="tag in mergedInfo.tags"
            :key="tag"
            class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center"
          >
            {{ getTagName(tag) }}
            <button class="ml-1 text-blue-500 text-xs hover:text-blue-700" @click="handleRemoveTag(tag)">×</button>
          </span>
        </template>
        <span v-else class="text-gray-400 text-xs">暂无标签</span>
      </div>
    </div>

    <!-- 文件夹信息 -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold text-gray-700 text-sm">文件夹</h3>
        <Popover v-model:open="folderPopoverOpen">
          <PopoverTrigger as-child>
            <button class="text-blue-500 text-xs hover:text-blue-700 flex items-center gap-0.5">
              <span class="material-icons text-sm">{{ displayItems[0]?.folderId ? 'edit' : 'add' }}</span>
              <span>{{ displayItems[0]?.folderId ? '编辑' : (isMultiSelect ? '批量设置' : '设置') }}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" class="w-80 p-2">
            <FolderTreeComponent
              item-type="folder"
              :folders="folderTreeNodes"
              :show-base-categories="false"
              @select="handleFolderSelect"
            />
          </PopoverContent>
        </Popover>
      </div>
      <template v-if="!isMultiSelect">
        <div v-if="displayItems[0]?.folderId" class="bg-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg flex items-center">
          <span class="material-icons mr-2 text-blue-500">folder</span>
          {{ getFolderName(displayItems[0].folderId) }}
        </div>
        <div v-else class="bg-gray-100 text-gray-600 text-xs px-3 py-2 rounded-lg flex items-center">
          <span class="material-icons mr-2 text-gray-400">folder_open</span>
          未分类
        </div>
      </template>
      <template v-else-if="mergedInfo">
        <div v-if="mergedInfo.folders.length > 0" class="space-y-1">
          <div
            v-for="folderId in mergedInfo.folders"
            :key="folderId"
            class="bg-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg flex items-center"
          >
            <span class="material-icons mr-2 text-blue-500">folder</span>
            {{ getFolderName(folderId) }}
          </div>
        </div>
        <div v-else class="bg-gray-100 text-gray-600 text-xs px-3 py-2 rounded-lg flex items-center">
          <span class="material-icons mr-2 text-gray-400">folder_open</span>
          多个文件未分类
        </div>
      </template>
    </div>

    <!-- 基本信息 -->
    <div>
      <h3 class="font-semibold text-gray-700 text-sm mb-2">基本信息</h3>
      <div class="text-xs space-y-2 text-gray-600">
        <!-- 单选模式 -->
        <template v-if="!isMultiSelect && displayItems[0]">
          <div class="flex justify-between">
            <span>大小</span>
            <span>{{ formatFileSize(displayItems[0].size) }}</span>
          </div>
          <div class="flex justify-between">
            <span>修改日期</span>
            <span>{{ formatDate(displayItems[0].updatedAt || displayItems[0].createdAt) }}</span>
          </div>
          <div class="flex justify-between">
            <span>创建日期</span>
            <span>{{ formatDate(displayItems[0].createdAt) }}</span>
          </div>
          <div v-if="isImageFile(displayItems[0]) && displayItems[0].metadata" class="flex justify-between">
            <span>尺寸</span>
            <span>{{ displayItems[0].metadata.width }} x {{ displayItems[0].metadata.height }}</span>
          </div>
          <div v-if="isVideoFile(displayItems[0]) && displayItems[0].metadata" class="flex justify-between">
            <span>时长</span>
            <span>{{ formatDuration(displayItems[0].metadata.duration) }}</span>
          </div>
        </template>
        <!-- 多选模式 -->
        <template v-else-if="isMultiSelect && mergedInfo">
          <div class="flex justify-between">
            <span>选中数量</span>
            <span>{{ mergedInfo.count }} 个文件</span>
          </div>
          <div class="flex justify-between">
            <span>总大小</span>
            <span>{{ formatFileSize(mergedInfo.totalSize) }}</span>
          </div>
        </template>
      </div>
    </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { toRefs, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { FileInfo } from '../../../shared/types'
import ColorThief from 'colorthief'
import FolderTreeComponent from './FolderTreeComponent/FolderTreeComponent.vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTagStore } from '@renderer/stores/tag'
import { useFolderStore } from '@renderer/stores/folder'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { webSocketService } from '@renderer/services/WebSocketService'
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { getExtIconUrl } from '@renderer/utils/extIconHelper'

// 全局图片加载错误状态缓存
const imageLoadErrorCache = new Map<string, boolean>()

interface Props {
  item?: FileInfo
  items?: FileInfo[] // 支持多选文件
  libraryId?: string // 素材库ID
}

interface Emits {
  (e: 'tag-add', tag: string): void
  (e: 'tag-remove', tag: string): void
  (e: 'folder-change', folderId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Access the item from props for use in functions
const { item, items, libraryId } = toRefs(props)
const tagStore = useTagStore()
const folderStore = useFolderStore()

// Popover 控制状态
const tagPopoverOpen = ref(false)
const folderPopoverOpen = ref(false)

// 加载 store 数据
watch(() => [tagPopoverOpen.value, folderPopoverOpen.value], ([tagOpen, folderOpen]) => {
  const libId = libraryId.value || 'default'
  if (tagOpen) tagStore.fetchTags(libId)
  if (folderOpen) folderStore.fetchFolders(libId)
})

// Store 数据映射为 FolderItem 格式
const folderTreeNodes = computed(() =>
  folderStore.folders.map((f: any) => ({
    id: String(f.id),
    label: f.title,
    icon: 'folder',
    count: f.fileCount,
    children: f.children?.map((c: any) => ({
      id: String(c.id),
      label: c.title,
      icon: 'folder',
      count: c.fileCount,
    })),
    originalData: f,
  }))
)

// WebSocket 实时更新覆盖层
const realtimeUpdates = ref<Map<string, Partial<FileInfo>>>(new Map())

// 计算显示的文件列表（合并 WebSocket 实时更新）
const displayItems = computed(() => {
  let base: FileInfo[]
  if (items.value && items.value.length > 0) {
    base = items.value
  } else if (item.value) {
    base = [item.value]
  } else {
    return []
  }
  return base.map(file => {
    const update = realtimeUpdates.value.get(file.id)
    return update ? { ...file, ...update } : file
  })
})

// 是否为多选模式
const isMultiSelect = computed(() => displayItems.value.length > 1)

// 选中文件变化时清除实时更新
watch([item, items], () => {
  realtimeUpdates.value = new Map()
})

// WebSocket: 监听 file::updated 事件，刷新当前展示的文件信息
const handleFileWsUpdate = async (data: any) => {
  const fileId = String(data.fileId)
  const eventLibId = data.libraryId
  const currentLibId = libraryId.value || 'default'

  const baseFiles = items.value?.length ? items.value : (item.value ? [item.value] : [])
  const matched = baseFiles.some(f =>
    String(f.id) === fileId && (f.libraryId === eventLibId || currentLibId === eventLibId)
  )
  if (!matched) return

  try {
    const updatedFile = await miraSDKService.getFile(eventLibId, fileId)
    const updates = new Map(realtimeUpdates.value)
    updates.set(fileId, updatedFile)
    realtimeUpdates.value = updates
  } catch (e) {
    console.warn('Failed to fetch updated file:', e)
  }
}

onMounted(() => {
  webSocketService.addEventListener('file::updated', handleFileWsUpdate)
})

onUnmounted(() => {
  webSocketService.removeEventListener('file::updated', handleFileWsUpdate)
})

// 图片加载状态跟踪
const imageLoadState = ref<'loading' | 'loaded' | 'error'>('loading')
// 多选图片加载状态
const multiImageLoadStates = ref<Record<string, 'loading' | 'loaded' | 'error'>>({})

// 监听显示项变化，重置加载状态
watch(displayItems, (newItems) => {
  // 重置单选模式加载状态
  imageLoadState.value = 'loading'
  // 检查缓存中是否已有错误状态（单选模式）
  if (newItems.length === 1) {
    const imageSrc = newItems[0].url || newItems[0].thumbnailPath
    if (imageSrc && imageLoadErrorCache.has(imageSrc)) {
      imageLoadState.value = 'error'
    }
  }

  // 多选模式：只更新新增项，保留已加载/出错的状态
  const prev = { ...multiImageLoadStates.value }
  const states: Record<string, 'loading' | 'loaded' | 'error'> = {}
  newItems.forEach(item => {
    if (prev[item.id]) {
      // 已存在的项保留之前的状态
      states[item.id] = prev[item.id]
    } else {
      // 新增项：检查是否有缓存的错误状态
      const imageSrc = item.thumbnailPath || item.url
      states[item.id] = (imageSrc && imageLoadErrorCache.has(imageSrc)) ? 'error' : 'loading'
    }
  })
  multiImageLoadStates.value = states
}, { immediate: true, deep: true })

// 多选文件的合并信息
const mergedInfo = computed(() => {
  if (!isMultiSelect.value) return null
  
  const files = displayItems.value
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)
  
  // 合并所有标签（去重）
  const allTags = new Set<string>()
  files.forEach(file => {
    if (file.tags) {
      file.tags.forEach(tag => allTags.add(tag))
    }
  })
  
  // 合并所有文件夹（去重）
  const allFolders = new Set<string>()
  files.forEach(file => {
    if (file.folderId) {
      allFolders.add(file.folderId)
    }
  })
  
  return {
    count: files.length,
    totalSize,
    tags: Array.from(allTags),
    folders: Array.from(allFolders)
  }
})

// 颜色提取相关
const previewImage = ref<HTMLImageElement>()
const extractedColors = ref<number[][]>([])
const colorThief = new ColorThief()



// 图片加载处理
const handleImageLoad = () => {
  imageLoadState.value = 'loaded'
  if (previewImage.value && item.value && isImageFile(item.value)) {
    try {
      // 提取主色调
      const dominantColor = colorThief.getColor(previewImage.value)
      // 提取调色板
      const palette = colorThief.getPalette(previewImage.value, 5)
      extractedColors.value = palette || [dominantColor]
    } catch (error) {
      console.warn('Failed to extract colors:', error)
      extractedColors.value = []
    }
  }
}

const handleImageError = () => {
  const imageSrc = displayItems.value[0]?.url || displayItems.value[0]?.thumbnailPath
  if (imageSrc) {
    imageLoadErrorCache.set(imageSrc, true)
  }
  imageLoadState.value = 'error'
  extractedColors.value = []
}

// 多选图片加载处理
const handleMultiImageLoad = (itemId: string) => {
  if (multiImageLoadStates.value) {
    multiImageLoadStates.value[itemId] = 'loaded'
  }
}

const handleMultiImageError = (item: FileInfo) => {
  const imageSrc = item.thumbnailPath || item.url
  if (imageSrc) {
    imageLoadErrorCache.set(imageSrc, true)
  }
  if (multiImageLoadStates.value) {
    multiImageLoadStates.value[item.id] = 'error'
  }
}

// 获取图片加载状态
const getImageLoadState = (item: FileInfo): 'loading' | 'loaded' | 'error' => {
  const imageSrc = item.thumbnailPath || item.url
  if (imageSrc && imageLoadErrorCache.has(imageSrc)) {
    return 'error'
  }
  return 'loading'
}

const getFolderName = (folderId?: string): string => {
  if (!folderId) return '未分类'
  return folderId === 'default' ? '默认文件夹' : `文件夹 ${folderId}`
}

const hasTags = computed(() => {
  if (isMultiSelect.value) return mergedInfo.value && mergedInfo.value.tags.length > 0
  return displayItems.value[0]?.tags && displayItems.value[0].tags.length > 0
})

const handleFolderSelect = async (folderItem: any) => {
  try {
    const client = (miraSDKService as any).client
    if (!client) return
    for (const file of displayItems.value) {
      const libId = file.libraryId || 'default'
      await client.folders().setFileFolder({ libraryId: libId, fileId: parseInt(file.id), folder: parseInt(folderItem.id) })
      file.folderId = String(folderItem.id)
    }
    emit('folder-change', folderItem.id)
    folderPopoverOpen.value = false
  } catch (error) {
    console.error('Failed to set folder:', error)
  }
}

const handleTagSelect = async (tagData: any) => {
  try {
    const client = (miraSDKService as any).client
    if (!client) return
    const tagName = tagData.title || tagData.name
    for (const file of displayItems.value) {
      const libId = file.libraryId || 'default'
      await client.tags().addTagsToFile(libId, parseInt(file.id), [tagName])
      if (!file.tags) file.tags = []
      if (!file.tags.includes(tagName)) file.tags.push(tagName)
    }
    emit('tag-add', tagName)
    tagPopoverOpen.value = false
  } catch (error) {
    console.error('Failed to add tag:', error)
  }
}

const handleRemoveTag = async (tag: string) => {
  try {
    const client = (miraSDKService as any).client
    if (!client) return
    for (const file of displayItems.value) {
      const libId = file.libraryId || 'default'
      await client.tags().removeTagsFromFile(libId, parseInt(file.id), [tag])
      if (file.tags) {
        const idx = file.tags.indexOf(tag)
        if (idx !== -1) file.tags.splice(idx, 1)
      }
    }
    emit('tag-remove', tag)
  } catch (error) {
    console.error('Failed to remove tag:', error)
  }
}

// 获取标签名称
const getTagName = (tagId: string): string => {
  // 尝试从当前素材库的缓存中获取标签
  const cachedTags = libraryId.value ? tagStore.getCachedTags(libraryId.value) : []
  const tag = cachedTags.find(t => String(t.id) === String(tagId))
  return tag?.title || tagId
}



const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    console.log('URL copied to clipboard')
  })
}

const getFileExtension = (item: FileInfo): string => {
  const ext = item.extension || item.name.split('.').pop()?.toUpperCase() || 'FILE'
  return ext
}

const isImageFile = (item: FileInfo): boolean => {
  return item.mimeType.startsWith('image/')
}

const isVideoFile = (item: FileInfo): boolean => {
  return item.mimeType.startsWith('video/')
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

const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'Unknown'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.material-icons {
  font-size: 16px;
}

/* 叠放相册样式 */
.image-stack {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.stack-container {
  position: absolute;
  width: 100px;
  height: 100px;
  top: 0;
  left: 0;
}

.stack-img {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border: 2px solid white;
}

.stack-placeholder {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border: 2px solid white;
}

/* 加载动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
