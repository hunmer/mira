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
    <Masonry
      :data="waterfallItems"
      :get-key="getKey"
      :get-meta="getMeta"
      :columns="columns"
      :gap="gap"
      :class="waterfallClass"
      :layout-transition="layoutTransition"
      :layout-mode="layoutMode"
      :lazy-root-margin="lazyRootMargin"
      @after-render="handleAfterRender"
    >
      <template #default="{ item, preload }">
        <MediaWaterfallItem
          :item="item"
          :url="item.url"
          :ratio="item.ratio"
          :is-selected="selectedItems.includes(item.id)"
          :is-video-playing="currentVideoItem?.id === item.id"
          :is-muted="settingsStore.settings.videoPreviewMuted"
          :progress="videoProgress[item.id] || 0"
          :preload="preload"
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
    </Masonry>
  </SelectionBox>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import SelectionBox from '../common/SelectionBox.vue'
import MediaWaterfallItem from './WaterfallComponent/MediaWaterfallItem.vue'
import VideoPreviewContainer from './MediaGridComponent/VideoPreviewContainer.vue'
import { Masonry, type MasonryColumns, type MasonryItemMeta } from '@/components/ui/masonry'
import type { FileInfo } from '../../../shared/types'
import { useSettingsStore } from '../../stores/settings'
import { useDragDrop } from './MediaGridComponent/composables/useDragDrop'
import { useVideoHover } from './MediaGridComponent/composables/useVideoHover'
import { useDeleteSelectedItems } from './MediaGridComponent/composables/useDeleteSelectedItems'
import { useFocusedSelectAll } from './MediaGridComponent/composables/useFocusedSelectAll'
import {
  getCachedThumbnailRatio,
  loadThumbnailRatio
} from './WaterfallComponent/thumbnailRatioCache'

interface Props {
  items: FileInfo[]
  selectedItems?: string[]
  columnWidth?: number
  columnsPerRow?: number
  gap?: number
  rowKey?: string
  /** 以下字段保留以向后兼容（原 vue-waterfall-plugin-next 专用），内部已忽略 */
  imgSelector?: string
  backgroundColor?: string
  animationEffect?: string
  animationDuration?: number
  animationDelay?: number
  lazyload?: boolean
  align?: 'left' | 'center' | 'right'
  /** 宽图占多列阈值（基于缩略图宽高比 width/height）：aspect >= 此值占 2 列 */
  wideAspectThreshold?: number
  /** 超宽图占 3 列阈值：aspect >= 此值占 3 列 */
  ultraWideAspectThreshold?: number
  /** 单个 item 最多占用列数上限 */
  maxColSpan?: number
  /** 排序/列数变化时的 layout 平滑过渡，默认 true；大量 item 卡顿可关闭 */
  layoutTransition?: boolean
  /**
   * 布局模式：
   *  - "fill"（默认）：智能填充。宽图先按序流式定位保序，普通图 best-fit 回填到
   *    最矮列，自动补齐宽图旁的空隙，减少间隙。代价是普通图相对顺序会被打乱。
   *  - "stream"：纯贪心流式，顺序严格保持，但宽图旁易留空隙。
   */
  layoutMode?: 'fill' | 'stream'
  /** 懒加载触发的 IntersectionObserver rootMargin */
  lazyRootMargin?: string
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
  align: 'center',
  wideAspectThreshold: 1.6,
  ultraWideAspectThreshold: 2.4,
  maxColSpan: 3,
  layoutTransition: true,
  layoutMode: 'fill',
  lazyRootMargin: '800px 0px'
})

const emit = defineEmits<Emits>()

const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null)
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

// 加载缩略图真实比例，避免图片进入视口后再改变瀑布流高度。
// 策略：首屏前 N 个同步预加载（等真实比例再渲染，避免布局抖动）；
//       其余项按需异步加载，加载完成后更新比例并触发布局重算。
let preloadVersion = 0

const getItemUrl = (item: FileInfo): string => item.thumbnailPath || item.url || ''

const preloadThumbnailRatios = async (items: FileInfo[]) => {
  const currentVersion = ++preloadVersion
  thumbnailRatiosReady.value = false
  console.debug('[DEBUG-wf-tab] ratio-preload-start', {
    itemCount: items.length,
    headCount: initialRatioPreloadCount.value
  })

  // 首屏前 N 个：同步预加载，等真实比例再渲染（避免首屏布局抖动）。
  const headEntries = await Promise.all(items.slice(0, initialRatioPreloadCount.value).map(async (item) => {
    const ratio = await loadThumbnailRatio(item.id, getItemUrl(item))
    return ratio ? [item.id, ratio] as const : null
  }))

  if (currentVersion !== preloadVersion) return

  const publishedRatios = headEntries.reduce<Record<string, number>>((ratios, entry) => {
    if (entry) {
      ratios[entry[0]] = entry[1]
    }

    return ratios
  }, {})

  // 同时使用之前实例已缓存的比例；发布后本次实例不再修改，避免后台加载导致连续重排。
  for (const item of items) {
    const ratio = getCachedThumbnailRatio(item.id, getItemUrl(item))
    if (ratio) publishedRatios[item.id] = ratio
  }

  thumbnailRatios.value = publishedRatios
  thumbnailRatiosReady.value = true
  console.debug('[DEBUG-wf-tab] ratio-layout-published', {
    itemCount: items.length,
    measuredCount: Object.keys(publishedRatios).length
  })

  // 首屏外比例仅写入跨实例缓存，不能修改当前已发布布局。
  void loadRemainingRatios(items)
}

// 异步预热其余比例（限并发），供下次实例或数据批次直接复用。
const loadingRatioIds = new Set<string>()
const RATIO_CONCURRENCY = 12
const loadRemainingRatios = async (items: FileInfo[]) => {
  const pending = items.filter(item => (
    !getCachedThumbnailRatio(item.id, getItemUrl(item)) && !loadingRatioIds.has(item.id)
  ))
  let cursor = 0
  const runWorker = async () => {
    while (cursor < pending.length) {
      const item = pending[cursor++]
      loadingRatioIds.add(item.id)
      await loadThumbnailRatio(item.id, getItemUrl(item))
      loadingRatioIds.delete(item.id)
    }
  }
  await Promise.all(Array.from({ length: Math.min(RATIO_CONCURRENCY, pending.length) }, runWorker))
  console.debug('[DEBUG-wf-tab] ratio-cache-warmed', { loadedCount: pending.length })
}

watch(
  () => props.items.map(item => `${item.id}:${getItemUrl(item)}`),
  () => {
    void preloadThumbnailRatios(props.items)
  },
  { immediate: true }
)

// hash fallback：未加载真实比例前给一个稳定占位比例，避免空白布局。
// 占位值范围压在 [0.8, 1.3]，当前实例内保持不变，避免异步比例引发布局重排。
const fallbackRatio = (item: FileInfo): number => {
  let seed = 0
  for (let i = 0; i < item.id.length; i++) seed = ((seed << 5) - seed + item.id.charCodeAt(i)) | 0
  return (Math.abs(seed) % 50) / 100 + 0.8
}

const getItemRatio = (item: FileInfo): number => {
  const thumbnailRatio = thumbnailRatios.value[item.id]
  if (thumbnailRatio) return thumbnailRatio

  return fallbackRatio(item)
}

const waterfallItems = computed(() => {
  if (!thumbnailRatiosReady.value) return []

  return props.items.map(item => ({
    ...item,
    url: getItemUrl(item),
    ratio: getItemRatio(item)
  }))
})

// Masonry 响应式列数：对齐原 breakpoints 行为（移动优先）
// 原断点：1200+ 用 columnsPerRow；800+ 缩到 75%；500+ 缩到 50%；其余最少 2 列
// 映射到 Tailwind 断点（sm640/md768/lg1024/xl1280）
const columns = computed<MasonryColumns>(() => {
  const md = Math.max(Math.floor(props.columnsPerRow * 0.75), 2)
  const sm = Math.max(Math.floor(props.columnsPerRow * 0.5), 2)
  return {
    base: 2,
    sm,
    md,
    lg: md,
    xl: props.columnsPerRow
  }
})

// 计算宽图占列数（基于 aspect = width/height）
// 注意：列数未知时按 columnsPerRow 近似，Masonry 内部会再 Math.min(colSpan, columns) 兜底
const computeColSpan = (ratio: number): number => {
  if (ratio >= props.ultraWideAspectThreshold) return 3
  if (ratio >= props.wideAspectThreshold) return 2
  return 1
}

const getKey = (item: FileInfo & { ratio?: number }, index: number): string | number =>
  item.id ?? index

const getMeta = (item: FileInfo & { ratio?: number }, _index: number): MasonryItemMeta => {
  const ratio = item.ratio ?? 1
  const desired = computeColSpan(ratio)
  // 保证旁边还能放普通项：最多占用 columns-1 列（columnsPerRow 近似）
  const colSpan = Math.min(Math.max(desired, 1), Math.max(props.columnsPerRow - 1, 1), props.maxColSpan)
  return {
    colSpan,
    aspect: `${ratio}:1`, // Masonry 按宽度算高度，多列时高度自动按比例放大
    lazy: props.lazyload
  }
}

const waterfallClass = computed(() => ({
  'justify-center': props.align === 'center'
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

// 暴露重新渲染方法（响应式已自动重算，refresh 作为保险触发一次重新布局）
const forceTick = ref(0)
const refresh = () => {
  forceTick.value++
}
// watch forceTick 触发 thumbnailRatio 重新读取（无副作用，仅触发依赖收集）
watch(forceTick, () => {
  void preloadThumbnailRatios(props.items)
})

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
const onVideoPreviewLoaded = (_payload: { duration: number }) => {
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
  console.debug('[DEBUG-wf-tab] waterfall-mounted', { itemCount: props.items.length })
  window.addEventListener('keydown', handleDeleteKeyDown)
  document.addEventListener('edit-action', handleEditAction)
})

onUnmounted(() => {
  console.debug('[DEBUG-wf-tab] waterfall-unmounted', { itemCount: props.items.length })
  window.removeEventListener('keydown', handleDeleteKeyDown)
  document.removeEventListener('edit-action', handleEditAction)
  stopVideoPreview()
})
</script>

<style scoped>
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
