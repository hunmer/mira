<template>
  <div class="relative flex flex-grow flex-col items-center justify-center p-8">
    <!-- 图片容器 - 使用 VViewer 组件的内嵌模式 -->
    <div class="flex flex-grow items-center justify-center w-full h-full min-h-[400px]">
      <VViewer
        :key="viewerKey"
        ref="viewerRef"
        :options="viewerOptions"
        :trigger="imageUrl"
        class="h-full w-full"
        @inited="onViewerInited"
      >
        <template #default>
          <div class="h-full flex items-center justify-center">
            <img 
              v-if="image"
              :key="viewerKey"
              :src="imageUrl"
              :alt="image.name"
              class="max-h-full max-w-full rounded-lg object-contain hidden opacity-0 transition-opacity duration-300 ease-in-out"
              @load="handleImageLoad"
              @error="handleImageError"
            />
          </div>
        </template>
      </VViewer>
      
      <!-- 无图片时的占位符 -->
      <div 
        v-if="!image"
        class="flex items-center justify-center w-96 h-96 bg-accent rounded-lg"
      >
        <span class="material-icons text-muted-foreground text-6xl">image</span>
      </div>
    </div>

    <!-- 图片加载状态 -->
    <div 
      v-if="loading && !viewerInstance"
      class="absolute inset-0 flex items-center justify-center bg-white/80"
    >
      <div class="flex flex-col items-center space-y-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span class="text-sm text-muted-foreground">加载中...</span>
      </div>
    </div>

    <!-- 错误状态 -->
    <div 
      v-if="error"
      class="absolute inset-0 flex items-center justify-center bg-white/80"
    >
      <div class="flex flex-col items-center space-y-2">
        <span class="material-icons text-muted-foreground text-6xl">broken_image</span>
        <span class="text-sm text-muted-foreground">图片加载失败</span>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div class="absolute bottom-6 flex items-center space-x-2 rounded-full border border-border bg-white/80 p-2 backdrop-blur-md">
      <button 
        class="rounded-full p-2 hover:bg-muted"
        @click="zoomIn"
      >
        <span class="material-symbols-outlined text-muted-foreground">zoom_in</span>
      </button>
      <button 
        class="rounded-full p-2 hover:bg-muted"
        @click="zoomOut"
      >
        <span class="material-symbols-outlined text-muted-foreground">zoom_out</span>
      </button>
      <button 
        class="rounded-full p-2 hover:bg-muted"
        @click="resetZoom"
      >
        <span class="material-symbols-outlined text-muted-foreground">zoom_out_map</span>
      </button>
      <div class="h-6 border-l border-border"></div>
      <button 
        class="rounded-full p-2 hover:bg-muted"
        @click="rotateLeft"
      >
        <span class="material-symbols-outlined text-muted-foreground">rotate_90_degrees_ccw</span>
      </button>
      <button 
        class="rounded-full p-2 hover:bg-muted"
        @click="rotateRight"
      >
        <span class="material-symbols-outlined text-muted-foreground">rotate_90_degrees_cw</span>
      </button>
      <div class="h-6 border-l border-border"></div>
      <button 
        class="rounded-full p-2 hover:bg-muted"
        @click="flipHorizontal"
      >
        <span class="material-symbols-outlined text-muted-foreground">flip</span>
      </button>
      <button 
        class="rounded-full p-2 hover:bg-muted"
        @click="flipVertical"
      >
        <span class="material-symbols-outlined text-muted-foreground" style="transform: rotate(90deg);">flip</span>
      </button>
      <div class="h-6 border-l border-border"></div>
      <button 
        class="rounded-full p-2 hover:bg-muted"
        @click="reset"
      >
        <span class="material-symbols-outlined text-muted-foreground">restart_alt</span>
      </button>
      <button 
        class="rounded-full p-2 hover:bg-muted"
        @click="toggleFullscreen"
      >
        <span class="material-symbols-outlined text-muted-foreground">fullscreen</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { component as VViewer } from 'v-viewer'
import type { FileInfo } from '../../../shared/types'
import { getCacheBustedPreviewImageSource, getPreviewImageSource } from '../../utils/fileUtils'

interface Props {
  image?: FileInfo
  cacheKey?: string | number
}

interface Emits {
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'zoom-reset'): void
  (e: 'rotate-left'): void
  (e: 'rotate-right'): void
  (e: 'toggle-fullscreen'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地路径转 file:// URL
const imageUrl = computed(() => getCacheBustedPreviewImageSource(props.image, props.cacheKey))
const viewerKey = computed(() => `${props.image?.id || 'empty'}:${imageUrl.value || ''}`)

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

// 响应式数据
const loading = ref(false)
const error = ref(false)
const viewerRef = ref<any>(null)
const viewerInstance = ref<any>(null)
const flipHorizontalState = ref(1) // 1 或 -1
const flipVerticalState = ref(1)   // 1 或 -1

// v-viewer 配置选项
const viewerOptions = ref({
  inline: true,
  button: false,
  navbar: false,
  title: false,
  toolbar: false,
  tooltip: false,
  movable: true,
  zoomable: true,
  rotatable: true,
  scalable: true,
  transition: false,
  fullscreen: true,  // 允许全屏
  keyboard: false,
  backdrop: true,    // 启用背景遮罩
  focus: true,       // 聚焦到viewer
  zIndex: 9999       // 设置高z-index
})

// 方法
const handleImageLoad = async () => {
  loading.value = false
  error.value = false

  console.debug('[ImagePreviewDebug][Viewer] source-image-load', {
    image: describeImage(props.image),
    cacheKey: props.cacheKey,
    imageUrl: imageUrl.value,
    viewerKey: viewerKey.value
  })

  await nextTick()
  viewerInstance.value?.update?.()
  viewerInstance.value?.view?.(0)

  console.debug('[ImagePreviewDebug][Viewer] viewer-updated-after-load', {
    imageId: props.image?.id,
    cacheKey: props.cacheKey,
    imageUrl: imageUrl.value,
    viewerKey: viewerKey.value,
    viewerIndex: viewerInstance.value?.index,
    viewerLength: viewerInstance.value?.length
  })
}

const handleImageError = () => {
  loading.value = false
  error.value = true

  console.debug('[ImagePreviewDebug][Viewer] source-image-error', {
    image: describeImage(props.image),
    cacheKey: props.cacheKey,
    imageUrl: imageUrl.value,
    viewerKey: viewerKey.value
  })
}

// viewer 初始化回调
const onViewerInited = (viewer: any) => {
  viewerInstance.value = viewer
  viewerInstance.value?.view?.(0)

  console.debug('[ImagePreviewDebug][Viewer] inited', {
    image: describeImage(props.image),
    cacheKey: props.cacheKey,
    imageUrl: imageUrl.value,
    viewerKey: viewerKey.value,
    viewerIndex: viewerInstance.value?.index,
    viewerLength: viewerInstance.value?.length
  })
}

// v-viewer 操作方法
const zoomIn = () => {
  if (viewerInstance.value) {
    viewerInstance.value.zoom(0.1)
  }
  emit('zoom-in')
}

const zoomOut = () => {
  if (viewerInstance.value) {
    viewerInstance.value.zoom(-0.1)
  }
  emit('zoom-out')
}

const resetZoom = () => {
  if (viewerInstance.value) {
    viewerInstance.value.reset()
  }
  emit('zoom-reset')
}

const rotateLeft = () => {
  if (viewerInstance.value) {
    viewerInstance.value.rotate(-90)
  }
  emit('rotate-left')
}

const rotateRight = () => {
  if (viewerInstance.value) {
    viewerInstance.value.rotate(90)
  }
  emit('rotate-right')
}

const flipHorizontal = () => {
  if (viewerInstance.value) {
    flipHorizontalState.value *= -1
    viewerInstance.value.scaleX(flipHorizontalState.value)
  }
}

const flipVertical = () => {
  if (viewerInstance.value) {
    flipVerticalState.value *= -1
    viewerInstance.value.scaleY(flipVerticalState.value)
  }
}

const reset = () => {
  if (viewerInstance.value) {
    viewerInstance.value.reset()
    // 重置翻转状态
    flipHorizontalState.value = 1
    flipVerticalState.value = 1
  }
}

const toggleFullscreen = () => {
  if (viewerInstance.value) {
    viewerInstance.value.full()
  }
  emit('toggle-fullscreen')
}

// 监听图片变化，重置状态
watch(() => props.image, (newImage, oldImage) => {
  console.debug('[ImagePreviewDebug][Viewer] props-image-change', {
    oldImage: describeImage(oldImage),
    newImage: describeImage(newImage),
    cacheKey: props.cacheKey,
    imageUrl: imageUrl.value,
    viewerKey: viewerKey.value
  })

  if (newImage && newImage !== oldImage) {
    // 只在真正切换图片时显示加载状态
    if (!oldImage || newImage.id !== oldImage.id) {
      loading.value = true
      error.value = false
      viewerInstance.value = null
      // 重置翻转状态
      flipHorizontalState.value = 1
      flipVerticalState.value = 1
    }
  }
}, { immediate: true })

watch(
  () => props.cacheKey,
  (newCacheKey, oldCacheKey) => {
    console.debug('[ImagePreviewDebug][Viewer] cache-key-change', {
      oldCacheKey,
      newCacheKey,
      image: describeImage(props.image),
      imageUrl: imageUrl.value,
      viewerKey: viewerKey.value
    })
  }
)
</script>

<style scoped>
:deep(.viewer-container) {
  background: transparent !important;
  height: 100% !important;
}

:deep(.viewer-canvas) {
  background: transparent !important;
}

:deep(.viewer-canvas > img) {
  border-radius: 0.5rem;
  object-fit: contain;
  opacity: 1;
  animation: viewer-image-fade-in 0.25s ease-in-out;
}

@keyframes viewer-image-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

:deep(.viewer-backdrop) {
  background: rgba(0, 0, 0, 0.8) !important;
}

:deep(.viewer-container.viewer-fixed) {
  background: rgba(0, 0, 0, 0.9) !important;
}
</style>
