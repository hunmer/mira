<template>
  <div class="image-preview-view bg-gray-100 h-screen flex flex-col text-sm">
    <!-- 顶部工具栏 -->
    <header class="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div class="flex items-center space-x-4">
        <button 
          class="rounded-full p-2 hover:bg-gray-100"
          @click="controller.goBack"
        >
          <span class="material-icons text-gray-600">arrow_back</span>
        </button>
        <div class="flex items-center space-x-2">
          <span class="text-lg font-semibold text-gray-800">{{ controller.currentImage.value?.name || 'Loading...' }}</span>
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
              <span class="material-symbols-outlined text-sm mr-1">folder</span>
              {{ controller.currentImage.value?.folderId || '/Pictures' }}
            </span>
            <span 
              v-for="tag in controller.currentImage.value?.tags"
              :key="tag"
              class="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
            >
              <span class="material-symbols-outlined text-sm mr-1">label</span>
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <button class="rounded-full p-2 hover:bg-gray-100">
          <span class="material-symbols-outlined text-gray-600">more_horiz</span>
        </button>
        <button 
          class="rounded-full p-2 hover:bg-gray-100"
          @click="controller.closePreview"
        >
          <span class="material-icons text-gray-600">close</span>
        </button>
      </div>
    </header>

    <!-- 主内容区域 -->
    <div class="flex flex-grow overflow-hidden">
      <!-- 左侧缩略图列表 -->
      <ImageThumbnailListComponent
        :images="controller.imageItems.value"
        :current-image-index="controller.currentImageIndex.value"
        :cache-key="controller.imageCacheKey.value"
        @image-select="controller.handleImageSelect"
      />

      <!-- 中间图片查看器 -->
      <div class="relative flex flex-grow flex-col">
        <ImageViewerComponent
          :image="controller.currentImage.value"
          :cache-key="controller.imageCacheKey.value"
          :zoom="controller.zoom.value"
          :rotation="controller.rotation.value"
          @zoom-in="controller.handleZoomIn"
          @zoom-out="controller.handleZoomOut"
          @zoom-reset="controller.handleZoomReset"
          @rotate-left="controller.handleRotateLeft"
          @rotate-right="controller.handleRotateRight"
          @toggle-fullscreen="controller.handleToggleFullscreen"
        />

        <!-- 底部状态栏 -->
        <footer class="flex h-10 flex-shrink-0 items-center justify-between border-t border-gray-200 bg-white px-6 text-xs text-gray-600">
          <div class="flex items-center space-x-4">
            <span>尺寸: {{ controller.currentImage.value?.metadata?.width || 0 }}x{{ controller.currentImage.value?.metadata?.height || 0 }}</span>
            <span>大小: {{ formatFileSize(controller.currentImage.value?.size) }}</span>
          </div>
          <div class="flex items-center space-x-4">
            <span>格式: {{ getFileFormat(controller.currentImage.value?.name) }}</span>
            <span>创建时间: {{ formatDate(controller.currentImage.value?.createdAt) }}</span>
          </div>
          <div class="flex items-center space-x-4">
            <span>{{ controller.currentImageIndex.value + 1 }} / {{ controller.imageItems.value.length }}</span>
            <button 
              class="rounded-full p-1 hover:bg-gray-100"
              :disabled="controller.currentImageIndex.value === 0"
              @click="controller.previousImage"
            >
              <span class="material-symbols-outlined text-gray-500">navigate_before</span>
            </button>
            <button 
              class="rounded-full p-1 hover:bg-gray-100"
              :disabled="controller.currentImageIndex.value === controller.imageItems.value.length - 1"
              @click="controller.nextImage"
            >
              <span class="material-symbols-outlined text-gray-500">navigate_next</span>
            </button>
          </div>
        </footer>
      </div>

      <!-- 右侧信息面板 -->
      <ImageInfoComponent
        :image="controller.currentImage.value"
        :cache-key="controller.imageCacheKey.value"
        :similar-images="controller.similarImages.value"
        @search-similar="controller.handleSearchSimilar"
        @tag-add="controller.handleTagAdd"
        @tag-remove="controller.handleTagRemove"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import ImageThumbnailListComponent from '../business/ImageThumbnailListComponent.vue'
import ImageViewerComponent from '../business/ImageViewerComponent.vue'
import ImageInfoComponent from '../business/ImageInfoComponent.vue'
import { useImagePreviewController } from '../../controllers/ImagePreviewController'
import { getPreviewImageSource } from '../../utils/fileUtils'

// 使用控制器
const controller = useImagePreviewController()

watch(
  [
    () => controller.currentImageId.value,
    () => controller.currentImage.value,
    () => controller.imageCacheKey.value
  ],
  ([currentImageId, currentImage, cacheKey]) => {
    console.debug('[ImagePreviewDebug][Page] state', {
      currentImageId,
      cacheKey,
      imageIndex: controller.currentImageIndex.value,
      imageCount: controller.imageItems.value.length,
      image: currentImage
        ? {
            id: currentImage.id,
            name: currentImage.name,
            localFile: currentImage.localFile,
            path: currentImage.path,
            url: currentImage.url,
            thumbnailPath: currentImage.thumbnailPath,
            previewSource: getPreviewImageSource(currentImage),
            updatedAt: currentImage.updatedAt
          }
        : null
    })
  },
  { immediate: true }
)

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
   const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 键盘快捷键支持
const handleKeyPress = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowLeft':
      controller.previousImage()
      break
    case 'ArrowRight':
      controller.nextImage()
      break
    case 'Escape':
      controller.closePreview()
      break
    case '+':
    case '=':
      controller.handleZoomIn()
      break
    case '-':
      controller.handleZoomOut()
      break
    case '0':
      controller.handleZoomReset()
      break
    case 'f':
    case 'F':
      controller.handleToggleFullscreen()
      break
  }
}

onMounted(() => {
  console.debug('[ImagePreviewDebug][Page] mounted', {
    currentImageId: controller.currentImageId.value,
    cacheKey: controller.imageCacheKey.value,
    imageCount: controller.imageItems.value.length,
    currentImage: controller.currentImage.value
      ? {
          id: controller.currentImage.value.id,
          name: controller.currentImage.value.name,
          localFile: controller.currentImage.value.localFile,
          path: controller.currentImage.value.path,
          url: controller.currentImage.value.url,
          thumbnailPath: controller.currentImage.value.thumbnailPath,
          previewSource: getPreviewImageSource(controller.currentImage.value)
        }
      : null
  })
  document.addEventListener('keydown', handleKeyPress)
  // 初始化相似图片搜索
  controller.handleSearchSimilar()
  // 预加载相邻图片
  controller.preloadAdjacentImages()
  
  // 注释掉自动打开v-viewer，现在使用内嵌的ImageViewerComponent
  // setTimeout(() => {
  //   controller.openWithViewer()
  // }, 300) // 延迟300ms确保组件完全加载
})

onUnmounted(() => {
  console.debug('[ImagePreviewDebug][Page] unmounted', {
    currentImageId: controller.currentImageId.value,
    cacheKey: controller.imageCacheKey.value
  })
  document.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.image-preview-view {
  font-size: 13px;
}

.material-icons,
.material-symbols-outlined {
  font-size: 18px;
}

.material-symbols-outlined.text-sm {
  font-size: 16px;
}

/* 禁用按钮样式 */
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:disabled:hover {
  background-color: inherit;
}

/* 过渡动画 */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* 工具栏背景模糊效果 */
.backdrop-blur-md {
  backdrop-filter: blur(12px);
}
</style>
