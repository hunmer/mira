<template>
  <div class="video-preview-view bg-muted dark:bg-muted h-screen flex flex-col text-[13px]">
    <!-- 顶部工具栏 -->
    <PreviewHeader :file-info="controller.currentVideo.value || {}">
      <template #left-extra>
        <div class="flex items-center space-x-2">
          <span class="hidden items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground md:inline-flex">
            <span class="material-symbols-outlined text-sm mr-1">folder</span>
            {{ controller.currentVideo.value?.folderId || '/Videos' }}
          </span>
          <span
            v-for="tag in controller.currentVideo.value?.tags"
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
      <!-- 桌面端：三列可拖拽布局 -->
      <ResizablePanelGroup v-if="!isMobile" direction="horizontal" auto-save-id="video-preview-layout" class="flex-1 min-w-0">
        <!-- 左侧视频缩略图列表（可折叠） -->
        <ResizablePanel
          ref="leftPanelRef"
          :default-size="leftPanelDefaultSize"
          :min-size="6"
          :max-size="30"
          :collapsed-size="0"
          collapsible
          @collapse="isLeftCollapsed = true"
          @expand="isLeftCollapsed = false"
        >
          <VideoThumbnailListComponent v-bind="thumbnailBindings" class="h-full" />
        </ResizablePanel>

        <!-- 分隔描边：点击（非拖拽）切换左侧栏 -->
        <ResizableHandle v-on="leftHandleToggle" class="group/handle relative w-3 cursor-pointer bg-transparent transition-colors hover:bg-primary/5 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent hover:after:bg-primary/40" />

        <!-- 中间视频播放器 -->
        <ResizablePanel :default-size="56" :min-size="30" class="relative flex flex-col bg-white dark:bg-black">
          <VideoPlayerComponent v-bind="viewerBindings" />

          <!-- 底部状态栏 -->
          <footer class="flex h-10 flex-shrink-0 items-center justify-between border-t border-border dark:border-border bg-white dark:bg-muted px-6 text-xs text-muted-foreground dark:text-muted-foreground">
            <div class="flex items-center space-x-4">
              <span>{{ $t('preview.videoPreview.resolution') }}: {{ controller.currentVideo.value?.metadata?.width || 0 }}x{{ controller.currentVideo.value?.metadata?.height || 0 }}</span>
              <span>{{ $t('preview.videoPreview.size') }}: {{ formatFileSize(controller.currentVideo.value?.size) }}</span>
              <span>{{ $t('preview.videoPreview.format') }}: {{ getFileFormat(controller.currentVideo.value?.name) }}</span>
              <span>{{ $t('preview.videoPreview.createdAt') }}: {{ formatDate(controller.currentVideo.value?.createdAt) }}</span>
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
        </ResizablePanel>

        <!-- 分隔描边：点击（非拖拽）切换右侧栏 -->
        <ResizableHandle v-on="rightHandleToggle" class="group/handle relative w-3 cursor-pointer bg-transparent transition-colors hover:bg-primary/5 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent hover:after:bg-primary/40" />

        <!-- 右侧文件信息面板（可折叠） -->
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
          <VideoFileInfoComponent v-bind="infoBindings" class="h-full" />
        </ResizablePanel>
      </ResizablePanelGroup>

      <!-- 移动端：仅中间播放器（侧栏改抽屉，左右浮动按钮切换） -->
      <div v-else class="relative flex flex-grow flex-col bg-white dark:bg-black">
        <!-- 左侧栏切换按钮（贴边长条，垂直居中） -->
        <button
          class="absolute left-0 top-1/2 z-20 flex h-[50px] w-8 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background hover:text-primary"
          :class="showLeftSidebar ? 'opacity-60 hover:opacity-100' : 'opacity-100'"
          :title="$t('preview.toggleSidebar')"
          @click="toggleLeftSidebar"
        >
          <span class="material-icons">{{ showLeftSidebar ? 'chevron_left' : 'chevron_right' }}</span>
        </button>

        <VideoPlayerComponent v-bind="viewerBindings" />

        <!-- 右侧栏切换按钮（贴边长条，垂直居中） -->
        <button
          class="absolute right-0 top-1/2 z-20 flex h-[50px] w-8 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background hover:text-primary"
          :class="showRightSidebar ? 'opacity-60 hover:opacity-100' : 'opacity-100'"
          :title="$t('preview.toggleSidebar')"
          @click="toggleRightSidebar"
        >
          <span class="material-icons">{{ showRightSidebar ? 'chevron_right' : 'chevron_left' }}</span>
        </button>

        <!-- 底部状态栏（移动端精简） -->
        <footer class="flex h-10 flex-shrink-0 items-center justify-between border-t border-border dark:border-border bg-white dark:bg-muted px-4 text-xs text-muted-foreground dark:text-muted-foreground">
          <span>{{ controller.currentVideoIndex.value + 1 }} / {{ controller.videos.value.length }}</span>
          <div class="flex items-center space-x-2">
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

      <!-- 移动端：左侧缩略图抽屉（宽度自适应内容） -->
      <Sheet v-if="isMobile" v-model:open="leftDrawerOpen">
        <SheetContent side="left" class="w-auto gap-0 p-0">
          <SheetTitle class="sr-only">{{ $t('preview.toggleSidebar') }}</SheetTitle>
          <VideoThumbnailListComponent v-bind="thumbnailBindings" class="h-full" />
        </SheetContent>
      </Sheet>

      <!-- 移动端：右侧信息抽屉 -->
      <Sheet v-if="isMobile" v-model:open="rightDrawerOpen">
        <SheetContent side="right" class="w-[85%] max-w-[340px] gap-0 p-0">
          <SheetTitle class="sr-only">{{ $t('preview.toggleSidebar') }}</SheetTitle>
          <VideoFileInfoComponent v-bind="infoBindings" class="h-full" />
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
import VideoThumbnailListComponent from '../business/VideoThumbnailListComponent.vue'
import VideoPlayerComponent from '../business/VideoPlayerComponent.vue'
import VideoFileInfoComponent from '../business/VideoFileInfoComponent.vue'
import PreviewHeader from './PreviewHeader.vue'
import { useVideoPreviewController } from '../../controllers/VideoPreviewController'
import { useCollapsibleSidebar } from '../../composables/useCollapsibleSidebar'

// 使用控制器
// fileInfo 仅在嵌入 FilePreviewView 时传入：侧边栏/搜索等入口没有 mediaStore
// 列表上下文，靠它提供当前文件，否则标题会显示「未知文件」
const props = defineProps<{ fileInfo?: any }>()
const controller = useVideoPreviewController(() => props.fileInfo)

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
} = useCollapsibleSidebar(20, 128)

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
  videos: controller.videos.value,
  currentVideoId: controller.currentVideoId.value,
  onVideoSelect: (...args: any[]) => {
    ;(controller.handleVideoSelect as (...a: any[]) => void)(...args)
    if (isMobile.value) showLeftSidebar.value = false
  },
}))
const viewerBindings = computed(() => ({
  video: controller.currentVideo.value,
  onPlay: controller.handlePlay,
  onPause: controller.handlePause,
  onEnded: controller.handlePause,
  onTimeUpdate: controller.handleTimeUpdate,
  onDurationChange: controller.handleDurationChange,
  onVolumeChange: controller.handleVolumeChange,
  onError: (err: any) => { controller.error.value = err },
}))
const infoBindings = computed(() => ({
  video: controller.currentVideo.value,
  currentTime: controller.currentTime.value,
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
