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
          :ratio="item.ratio"
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
          @image-error="handleImageError"
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
  animationEffect: '',
  animationDuration: 1000,
  animationDelay: 300,
  lazyload: true,
  align: 'center'
})

const emit = defineEmits<Emits>()

const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null)
const waterfallRef = ref()
const thumbnailRatios = ref<Record<string, number>>({})
const thumbnailRatiosReady = ref(false)
const initialRatioPreloadCount = computed(() => Math.max(props.columnsPerRow * 4, 16))
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

// 预加载缩略图真实比例，避免图片进入视口后再改变瀑布流高度。
let preloadVersion = 0

const getItemUrl = (item: FileInfo): string => item.thumbnailPath || item.url || ''

const readImageRatio = (url: string): Promise<number | null> => {
  if (!url) return Promise.resolve(null)

  return new Promise((resolve) => {
    const image = new Image()

    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve(image.naturalWidth / image.naturalHeight)
        return
      }

      resolve(null)
    }

    image.onerror = () => resolve(null)
    image.src = url
  })
}

const preloadThumbnailRatios = async (items: FileInfo[]) => {
  const currentVersion = ++preloadVersion
  thumbnailRatiosReady.value = false
  thumbnailRatios.value = {}

  const entries = await Promise.all(items.slice(0, initialRatioPreloadCount.value).map(async (item) => {
    const ratio = await readImageRatio(getItemUrl(item))
    return ratio ? [item.id, ratio] as const : null
  }))

  if (currentVersion !== preloadVersion) return

  thumbnailRatios.value = entries.reduce<Record<string, number>>((ratios, entry) => {
    if (entry) {
      ratios[entry[0]] = entry[1]
    }

    return ratios
  }, {})
  thumbnailRatiosReady.value = true
}

watch(
  () => props.items.map(item => `${item.id}:${getItemUrl(item)}`),
  () => {
    void preloadThumbnailRatios(props.items)
  },
  { immediate: true }
)

const getItemRatio = (item: FileInfo): number => {
  const thumbnailRatio = thumbnailRatios.value[item.id]
  if (thumbnailRatio) return thumbnailRatio

  let seed = 0
  for (let i = 0; i < item.id.length; i++) seed = ((seed << 5) - seed + item.id.charCodeAt(i)) | 0
  return (Math.abs(seed) % 50) / 100 + 0.8
}

const waterfallItems = computed(() => {
  if (!thumbnailRatiosReady.value) return []

  return props.items.map(item => ({
    ...item,
    url: getItemUrl(item),
    ratio: getItemRatio(item)
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

// 懒加载配置 - rootMargin 提前加载视口外的图片，避免滚动时重排
const loadProps = computed(() => ({
  loading: '',
  error: '',
  observerOptions: {
    rootMargin: '300px 0px'
  },
  ratioCalculator: (width: number, height: number) => {
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

// 暴露重新渲染方法
const refresh = () => {
  if (waterfallRef.value) {
    waterfallRef.value.renderer()
  }
}

const handleImageError = (url: string) => {
  console.error('Image load error:', url)
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
