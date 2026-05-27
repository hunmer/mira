<template>
  <SelectionBox
    ref="selectionBoxRef"
    v-model="selectedIds"
    :multiple="true"
    :double-click-to-clear="true"
    :realtime-selection="true"
    :min-selection-size="8"
    class="waterfall-wrapper w-full h-full"
    tabindex="0"
    @selection-update="handleSelectionUpdate"
    @item-click="handleSelectionItemClick"
    @clear-selection="handleClearSelection"
    @pointerdown.capture="focusSelectionBox"
  >
    <Waterfall
      ref="waterfallRef"
      :list="waterfallItems"
      :row-key="rowKey"
      :gutter="gap"
      :width="columnWidth"
      :breakpoints="breakpoints"
      :img-selector="imgSelector"
      :background-color="backgroundColor"
      :animation-effect="animationEffect"
      :animation-duration="animationDuration"
      :animation-delay="animationDelay"
      :lazyload="lazyload"
      :load-props="loadProps"
      :align="align"
      @after-render="handleAfterRender"
    >
      <template #default="{ item, url }">
        <MediaWaterfallItem
          :item="item"
          :url="url"
          :is-selected="selectedItems.includes(item.id)"
          :is-video-playing="currentVideoItem?.id === item.id"
          :is-muted="settingsStore.settings.videoPreviewMuted"
          :progress="videoProgress[item.id] || 0"
          @click="handleItemClick"
          @double-click="handleItemDoubleClick"
          @context-menu="handleItemContextMenu"
          @mouse-enter="handleMouseEnter"
          @mouse-leave="handleMouseLeave"
          @mouse-move="handleMouseMove"
          @pointer-down="handlePointerDown"
          @image-load="handleImageLoad"
          @image-error="handleImageError"
          @image-success="handleImageSuccess"
          @toggle-mute="toggleVideoMute"
        >
          <template #video-preview="{ item: videoItem, isPlaying }">
            <VideoPreviewContainer
              v-if="isPlaying"
              :current-video-item="videoItem"
              :is-muted="settingsStore.settings.videoPreviewMuted"
              @video-loaded="onVideoPreviewLoaded"
              @video-time-update="onVideoPreviewTimeUpdate"
              @video-play="onVideoPreviewPlay"
              @video-pause="onVideoPreviewPause"
              @video-error="onVideoPreviewError"
              @update-progress="updateVideoProgress"
            />
          </template>
        </MediaWaterfallItem>
      </template>
    </Waterfall>
  </SelectionBox>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Waterfall } from 'vue-waterfall-plugin-next'
import 'vue-waterfall-plugin-next/dist/style.css'
import SelectionBox from '../common/SelectionBox.vue'
import MediaWaterfallItem from './WaterfallComponent/MediaWaterfallItem.vue'
import VideoPreviewContainer from './MediaGridComponent/VideoPreviewContainer.vue'
import type { FileInfo } from '../../../shared/types'
import { useSettingsStore } from '../../stores/settings'
import { useDragDrop } from './MediaGridComponent/composables/useDragDrop'
import { useVideoHover } from './MediaGridComponent/composables/useVideoHover'
import { useDeleteSelectedItems } from './MediaGridComponent/composables/useDeleteSelectedItems'
import { useFocusedSelectAll } from './MediaGridComponent/composables/useFocusedSelectAll'

interface Props {
  items: FileInfo[]
  selectedItems?: string[]
  columnWidth?: number
  columnsPerRow?: number
  gap?: number
  rowKey?: string
  imgSelector?: string
  backgroundColor?: string
  animationEffect?: string
  animationDuration?: number
  animationDelay?: number
  lazyload?: boolean
  align?: 'left' | 'center' | 'right'
}

interface Emits {
  (e: 'click', item: FileInfo): void
  (e: 'dblclick', item: FileInfo): void
  (e: 'contextmenu', item: FileInfo, event: MouseEvent): void
  (e: 'after-render'): void
  (e: 'media-select', item: FileInfo, selected: boolean): void
  (e: 'media-delete', item: FileInfo): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedItems: () => [],
  columnWidth: 220,
  columnsPerRow: 4,
  gap: 16,
  rowKey: 'id',
  imgSelector: 'url',
  backgroundColor: '#f8fafc',
  animationEffect: 'fadeIn',
  animationDuration: 1000,
  animationDelay: 300,
  lazyload: true,
  align: 'center'
})

const emit = defineEmits<Emits>()

const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null)
const waterfallRef = ref()
const settingsStore = useSettingsStore()
const { focusSelectionBox, isSelectionBoxFocused } = useFocusedSelectAll(selectionBoxRef, props, emit)
const { handleDeleteKeyDown, handleEditAction } = useDeleteSelectedItems(props, emit, {
  isActive: isSelectionBoxFocused
})

const selectedIds = computed({
  get: () => props.selectedItems,
  set: (nextIds: string[]) => {
    syncSelection(nextIds)
  }
})

// 使用拖放功能
const { handlePointerDown } = useDragDrop({
  items: props.items,
  selectedItems: props.selectedItems || []
})

// 使用视频悬浮预览功能
const {
  currentVideoItem,
  videoProgress,
  handleMouseEnter,
  handleMouseLeave,
  updateVideoProgress,
  stopVideoPreview,
  syncVideoPreviewItems
} = useVideoHover()

watch(
  () => props.items.map(item => item.id),
  (items) => syncVideoPreviewItems(items),
  { immediate: true }
)

// 调试：监控当前视频项变化
watch(currentVideoItem, (newItem) => {
  if (newItem) {

  }
})

// 转换数据格式以适配插件
const waterfallItems = computed(() => {
  return props.items.map(item => ({
    ...item,
    // 确保有url字段用于图片显示
    url: item.thumbnailPath || item.url || '',
    // 为瀑布流添加随机高度比例
    ratio: Math.random() * 0.5 + 0.8 // 0.8-1.3之间的随机比例
  }))
})

// 响应式断点配置 - 使用固定列数
const breakpoints = computed(() => ({
  1200: {
    rowPerView: props.columnsPerRow
  },
  800: {
    rowPerView: Math.max(Math.floor(props.columnsPerRow * 0.75), 2)
  },
  500: {
    rowPerView: Math.max(Math.floor(props.columnsPerRow * 0.5), 2)
  }
}))

// 懒加载配置
const loadProps = computed(() => ({
  loading: '', // 可以设置loading图片
  error: '', // 可以设置错误图片
  ratioCalculator: (width: number, height: number) => {
    // 控制图片比例，避免过于极端的长宽比
    const minRatio = 0.6
    const maxRatio = 1.8
    const curRatio = width / height

    if (curRatio < minRatio) {
      return minRatio
    } else if (curRatio > maxRatio) {
      return maxRatio
    } else {
      return curRatio
    }
  }
}))

// 事件处理
const handleItemClick = (item: FileInfo, _event: MouseEvent) => {
  selectFromClick(item, _event)
  emit('click', item)
}

const selectFromClick = (item: FileInfo, event: MouseEvent) => {
  const selected = props.selectedItems.includes(item.id)

  if (event.altKey) {
    if (selected) emit('media-select', item, false)
    return
  }

  if (event.ctrlKey || event.metaKey) {
    emit('media-select', item, !selected)
    return
  }

  props.items.forEach(currentItem => {
    if (currentItem.id !== item.id && props.selectedItems.includes(currentItem.id)) {
      emit('media-select', currentItem, false)
    }
  })

  if (!selected) {
    emit('media-select', item, true)
  }
}

const syncSelection = (nextIds: string[]) => {
  const nextSet = new Set(nextIds)

  props.items.forEach(item => {
    const selected = nextSet.has(item.id)
    if (props.selectedItems.includes(item.id) !== selected) {
      emit('media-select', item, selected)
    }
  })
}

const handleSelectionUpdate = (ids: string[]) => {
  syncSelection(ids)
}

const handleSelectionItemClick = (itemId: string, event: MouseEvent) => {
  const item = props.items.find(file => file.id === itemId)
  if (item) {
    selectFromClick(item, event)
    emit('click', item)
  }
}

const handleClearSelection = () => {
  props.items.forEach(item => {
    if (props.selectedItems.includes(item.id)) {
      emit('media-select', item, false)
    }
  })
}

const handleItemDoubleClick = (item: FileInfo) => {
  emit('dblclick', item)
}

const handleItemContextMenu = (item: FileInfo, event: MouseEvent) => {
  emit('contextmenu', item, event)
}

const handleAfterRender = () => {
  emit('after-render')
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null

const handleImageLoad = (_url: string) => {}

const handleImageError = (url: string) => {
  console.error('Image load error:', url)
}

const handleImageSuccess = (_url: string) => {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refresh()
    refreshTimer = null
  }, 100)
}

// 视频静音切换
const toggleVideoMute = async () => {
  const newMutedState = !settingsStore.settings.videoPreviewMuted
  await settingsStore.updateSetting('videoPreviewMuted', newMutedState)
}

// 基本的鼠标移动事件处理
const handleMouseMove = (item: FileInfo, event: MouseEvent) => {
  // 如果当前有视频在播放，处理视频时间跳转
  if (currentVideoItem.value && currentVideoItem.value.id === item.id) {
    try {
      const targetElement = event.currentTarget as HTMLElement
      const videoElement = targetElement.querySelector('video')

      if (videoElement) {
        const duration = videoElement.duration
        if (duration && duration > 0) {
          const rect = targetElement.getBoundingClientRect()
          const containerWidth = rect.width
          const x = Math.max(0, Math.min(event.clientX - rect.left, containerWidth))

          const progress = x / containerWidth
          const targetTime = progress * duration

          videoElement.currentTime = targetTime
        }
      }
    } catch (error) {
      console.error('Error in handleMouseMove:', error)
    }
  }
}

// Video preview event handlers
const onVideoPreviewLoaded = (payload: { duration: number }) => {
  // console.log('Video loaded with duration:', payload.duration)
}

const onVideoPreviewTimeUpdate = (_payload: { currentTime: number, progress: number }) => {
  // 已通过 updateVideoProgress 处理
}

const onVideoPreviewPlay = () => {
  // console.log('Video preview playing')
}

const onVideoPreviewPause = () => {
  // console.log('Video preview paused')
}

const onVideoPreviewError = (error: Event) => {
  console.error('Video preview error:', error)
}

// 暴露重新渲染方法
const refresh = () => {
  if (waterfallRef.value) {
    waterfallRef.value.renderer()
  }
}

defineExpose({
  refresh
})

onMounted(() => {
  window.addEventListener('keydown', handleDeleteKeyDown)
  document.addEventListener('edit-action', handleEditAction)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleDeleteKeyDown)
  document.removeEventListener('edit-action', handleEditAction)
  stopVideoPreview()
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>

<style scoped>
.waterfall-card:hover {
  transform: translateY(-2px);
}

:deep(.animate__animated) {
  animation-fill-mode: both;
  animation-duration: 1s;
}

:deep(.lazy__img[lazy=loading]) {
  padding: 2em 0;
  width: 48px;
  background: #f3f4f6;
}

:deep(.lazy__img[lazy=loaded]) {
  width: 100%;
}

:deep(.lazy__img[lazy=error]) {
  padding: 2em 0;
  width: 48px;
  background: #fef2f2;
}
</style>
