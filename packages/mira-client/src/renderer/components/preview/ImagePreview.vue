<template>
  <div class="image-preview-view bg-muted h-screen flex flex-col text-[13px]">
    <!-- 顶部工具栏 -->
    <PreviewHeader :file-info="controller.currentImage.value || {}">
      <template #left-extra>
        <div class="flex items-center space-x-2">
          <span class="hidden items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground md:inline-flex">
            <span class="material-symbols-outlined text-sm mr-1">folder</span>
            {{ controller.currentImage.value?.folderId || '/Pictures' }}
          </span>
          <span
            v-for="tag in controller.currentImage.value?.tags"
            :key="tag"
            class="hidden items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary md:inline-flex"
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
      </template>
    </PreviewHeader>

    <!-- 主内容区域 -->
    <div class="flex flex-grow overflow-hidden">
      <!-- 桌面端：三列可拖拽布局 -->
      <ResizablePanelGroup v-if="!isMobile" direction="horizontal" auto-save-id="image-preview-layout" class="flex-1 min-w-0">
        <!-- 左侧缩略图列表（可折叠） -->
        <ResizablePanel
          ref="leftPanelRef"
          :default-size="leftPanelDefaultSize"
          :min-size="12"
          :max-size="30"
          :collapsed-size="0"
          collapsible
          @collapse="isLeftCollapsed = true"
          @expand="isLeftCollapsed = false"
        >
          <ImageThumbnailListComponent v-bind="thumbnailBindings" class="h-full" />
        </ResizablePanel>

        <!-- 分隔描边：点击（非拖拽）切换左侧栏 -->
        <ResizableHandle v-on="leftHandleToggle" class="group/handle relative w-3 cursor-pointer bg-transparent transition-colors hover:bg-primary/5 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent hover:after:bg-primary/40" />

        <!-- 中间图片查看器 -->
        <ResizablePanel :default-size="56" :min-size="30" class="relative flex flex-col">
          <!-- 左侧栏切换按钮（垂直居中） -->
          <button
            class="absolute left-0 top-1/2 z-20 flex h-[50px] w-8 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background hover:text-primary"
            :class="showLeftSidebar ? 'opacity-60 hover:opacity-100' : 'opacity-100'"
            :title="$t('preview.toggleSidebar')"
            @click="toggleLeftSidebar"
          >
            <span class="material-icons">{{ showLeftSidebar ? 'chevron_left' : 'chevron_right' }}</span>
          </button>

          <ImageViewerComponent v-bind="viewerBindings" />

          <!-- 右侧栏切换按钮（垂直居中） -->
          <button
            class="absolute right-0 top-1/2 z-20 flex h-[50px] w-8 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background hover:text-primary"
            :title="$t('preview.toggleSidebar')"
            @click="toggleRightSidebar"
          >
            <span class="material-icons">{{ showRightSidebar ? 'chevron_right' : 'chevron_left' }}</span>
          </button>

          <!-- 底部状态栏 -->
          <footer class="flex h-10 flex-shrink-0 items-center justify-between border-t border-border bg-background px-6 text-xs text-muted-foreground">
            <div class="flex items-center space-x-4">
              <span>{{ $t('preview.imagePreview.dimensions') }}: {{ controller.currentImage.value?.metadata?.width || 0 }}x{{ controller.currentImage.value?.metadata?.height || 0 }}</span>
              <span>{{ $t('preview.imagePreview.size') }}: {{ formatFileSize(controller.currentImage.value?.size) }}</span>
            </div>
            <div class="flex items-center space-x-4">
              <span>{{ $t('preview.imagePreview.format') }}: {{ getFileFormat(controller.currentImage.value?.name) }}</span>
              <span>{{ $t('preview.imagePreview.createdAt') }}: {{ formatDate(controller.currentImage.value?.createdAt) }}</span>
            </div>
            <div class="flex items-center space-x-4">
              <span>{{ controller.currentImageIndex.value + 1 }} / {{ controller.imageItems.value.length }}</span>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                :disabled="controller.currentImageIndex.value === 0"
                @click="controller.previousImage"
              >
                <span class="material-symbols-outlined text-muted-foreground">navigate_before</span>
              </button>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                :disabled="controller.currentImageIndex.value === controller.imageItems.value.length - 1"
                @click="controller.nextImage"
              >
                <span class="material-symbols-outlined text-muted-foreground">navigate_next</span>
              </button>
            </div>
          </footer>
        </ResizablePanel>

        <!-- 分隔描边：点击（非拖拽）切换右侧栏 -->
        <ResizableHandle v-on="rightHandleToggle" class="group/handle relative w-3 cursor-pointer bg-transparent transition-colors hover:bg-primary/5 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent hover:after:bg-primary/40" />

        <!-- 右侧信息面板（可折叠） -->
        <ResizablePanel
          ref="rightPanelRef"
          :default-size="rightPanelDefaultSize"
          :min-size="18"
          :max-size="35"
          :collapsed-size="0"
          collapsible
          @collapse="isRightCollapsed = true"
          @expand="isRightCollapsed = false"
        >
          <ImageInfoComponent v-bind="infoBindings" class="h-full" />
        </ResizablePanel>
      </ResizablePanelGroup>

      <!-- 移动端：仅中间查看器（侧栏改抽屉，左右浮动按钮切换） -->
      <div v-else class="relative flex flex-grow flex-col">
        <!-- 左侧栏切换按钮（垂直居中） -->
        <button
          class="absolute left-0 top-1/2 z-20 flex h-[50px] w-8 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background hover:text-primary"
          :class="showLeftSidebar ? 'opacity-60 hover:opacity-100' : 'opacity-100'"
          :title="$t('preview.toggleSidebar')"
          @click="toggleLeftSidebar"
        >
          <span class="material-icons">{{ showLeftSidebar ? 'chevron_left' : 'chevron_right' }}</span>
        </button>

        <ImageViewerComponent v-bind="viewerBindings" />

        <!-- 右侧栏切换按钮（垂直居中） -->
        <button
          class="absolute right-0 top-1/2 z-20 flex h-[50px] w-8 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background hover:text-primary"
          :class="showRightSidebar ? 'opacity-60 hover:opacity-100' : 'opacity-100'"
          :title="$t('preview.toggleSidebar')"
          @click="toggleRightSidebar"
        >
          <span class="material-icons">{{ showRightSidebar ? 'chevron_right' : 'chevron_left' }}</span>
        </button>

        <!-- 底部状态栏（移动端精简） -->
        <footer class="flex h-10 flex-shrink-0 items-center justify-between border-t border-border bg-background px-4 text-xs text-muted-foreground">
          <span>{{ controller.currentImageIndex.value + 1 }} / {{ controller.imageItems.value.length }}</span>
          <div class="flex items-center space-x-2">
            <button
              class="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
              :disabled="controller.currentImageIndex.value === 0"
              @click="controller.previousImage"
            >
              <span class="material-symbols-outlined text-muted-foreground">navigate_before</span>
            </button>
            <button
              class="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
              :disabled="controller.currentImageIndex.value === controller.imageItems.value.length - 1"
              @click="controller.nextImage"
            >
              <span class="material-symbols-outlined text-muted-foreground">navigate_next</span>
            </button>
          </div>
        </footer>
      </div>

      <!-- 移动端：左侧缩略图抽屉（宽度自适应内容） -->
      <Sheet v-if="isMobile" v-model:open="leftDrawerOpen">
        <SheetContent side="left" class="w-auto gap-0 p-0">
          <SheetTitle class="sr-only">{{ $t('preview.toggleSidebar') }}</SheetTitle>
          <ImageThumbnailListComponent v-bind="thumbnailBindings" class="h-full" />
        </SheetContent>
      </Sheet>

      <!-- 移动端：右侧信息抽屉 -->
      <Sheet v-if="isMobile" v-model:open="rightDrawerOpen">
        <SheetContent side="right" class="w-[85%] max-w-[340px] gap-0 p-0">
          <SheetTitle class="sr-only">{{ $t('preview.toggleSidebar') }}</SheetTitle>
          <ImageInfoComponent v-bind="infoBindings" class="h-full" />
        </SheetContent>
      </Sheet>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import ImageThumbnailListComponent from '../business/ImageThumbnailListComponent.vue'
import ImageViewerComponent from '../business/ImageViewerComponent.vue'
import ImageInfoComponent from '../business/ImageInfoComponent.vue'
import PreviewHeader from './PreviewHeader.vue'
import { useImagePreviewController } from '../../controllers/ImagePreviewController'
import { useCollapsibleSidebar } from '../../composables/useCollapsibleSidebar'

// 使用控制器
const controller = useImagePreviewController()

// 左侧缩略图栏：桌面端 resizable + collapsible + 描边点击切换，移动端抽屉
const {
  isMobile,
  showSidebar: showLeftSidebar,
  toggleSidebar: toggleLeftSidebar,
  panelRef: leftPanelRef,
  isCollapsed: isLeftCollapsed,
  drawerOpen: leftDrawerOpen,
  handleToggle: leftHandleToggle,
  defaultSize: leftPanelDefaultSize,
} = useCollapsibleSidebar(20)

// 右侧信息面板：同样可折叠 + 移动抽屉
const {
  showSidebar: showRightSidebar,
  toggleSidebar: toggleRightSidebar,
  panelRef: rightPanelRef,
  isCollapsed: isRightCollapsed,
  drawerOpen: rightDrawerOpen,
  handleToggle: rightHandleToggle,
  defaultSize: rightPanelDefaultSize,
} = useCollapsibleSidebar(24)

// 子组件绑定对象：桌面 inline 与移动抽屉共用，避免重复
const thumbnailBindings = computed(() => ({
  images: controller.imageItems.value,
  currentImageIndex: controller.currentImageIndex.value,
  cacheKey: controller.imageCacheKey.value,
  onImageSelect: (...args: any[]) => {
    ;(controller.handleImageSelect as (...a: any[]) => void)(...args)
    if (isMobile.value) showLeftSidebar.value = false
  },
}))
const viewerBindings = computed(() => ({
  image: controller.currentImage.value,
  cacheKey: controller.imageCacheKey.value,
  zoom: controller.zoom.value,
  rotation: controller.rotation.value,
  onZoomIn: controller.handleZoomIn,
  onZoomOut: controller.handleZoomOut,
  onZoomReset: controller.handleZoomReset,
  onRotateLeft: controller.handleRotateLeft,
  onRotateRight: controller.handleRotateRight,
  onToggleFullscreen: controller.handleToggleFullscreen,
}))
const infoBindings = computed(() => ({
  image: controller.currentImage.value,
  cacheKey: controller.imageCacheKey.value,
  similarImages: controller.similarImages.value,
  onSearchSimilar: controller.handleSearchSimilar,
  onTagAdd: controller.handleTagAdd,
  onTagRemove: controller.handleTagRemove,
}))


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
  document.removeEventListener('keydown', handleKeyPress)
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
