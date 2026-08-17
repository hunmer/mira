<template>
  <SelectionBox
    ref="selectionBoxRef"
    v-model="selectedIds"
    :multiple="true"
    :double-click-to-clear="true"
    :realtime-selection="true"
    :min-selection-size="8"
    :enable-select-all-shortcut="true"
    :enable-clear-selection-shortcut="true"
    class="waterfall-wrapper w-full min-h-full"
    tabindex="0"
    @selection-update="handleSelectionUpdate"
    @item-click="handleSelectionItemClick"
    @clear-selection="handleClearSelection"
    @pointerdown.capture="focusSelectionBox"
  >
    <MediaContextMenu
      :items="props.items"
      :selected-items="props.selectedItems"
      :is-trash="props.isTrash"
      @media-context-menu="(item, event) => emit('media-context-menu', item, event)"
      @media-info="(item) => emit('media-info', item)"
      @media-set-folder="(item) => emit('media-set-folder', item)"
      @media-set-tags="(item) => emit('media-set-tags', item)"
      @media-delete="(item) => emit('media-delete', item)"
      @media-restore="(item) => emit('media-restore', item)"
    >
    <Masonry
      ref="masonryRef"
      :data="waterfallItems"
      :get-key="getKey"
      :get-meta="getMeta"
      :columns="columns"
      :gap="gap"
      :class="waterfallClass"
      :enter-animation="initialEnterAnimation"
      :layout-transition="layoutTransition"
      :layout-mode="layoutMode"
      :lazy-root-margin="lazyRootMargin"
      @after-render="handleAfterRender"
      @layout-order="handleLayoutOrder"
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
          @mouse-enter="handleMouseEnter"
          @mouse-leave="handleMouseLeave"
          @mouse-move="handleMouseMove"
          @pointer-down="handlePointerDown"
          @image-error="handleImageError"
          @toggle-mute="toggleVideoMute"
          @preview-enter="stopVideoPreview(item.id)"
        >
          <template #video-preview="{ item: videoItem, isPlaying }">
            <VideoPreviewContainer
              v-if="isPlaying"
              :current-video-item="videoItem"
              :is-muted="settingsStore.settings.videoPreviewMuted"
              fit="contain"
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

    <!-- 空状态 -->
    <Empty
      v-if="props.items.length === 0"
      class="min-h-full"
    >
      <EmptyMedia>
        <StatusImage name="empty" size="large" />
      </EmptyMedia>
      <EmptyTitle>{{ $t('business.waterfallComponent.emptyTitle') }}</EmptyTitle>
      <EmptyDescription>{{ $t('business.waterfallComponent.emptyDesc') }}</EmptyDescription>
    </Empty>
    </MediaContextMenu>
  </SelectionBox>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import SelectionBox from '../common/SelectionBox.vue'
import MediaContextMenu from './MediaContextMenu.vue'
import MediaWaterfallItem from './WaterfallComponent/MediaWaterfallItem.vue'
import VideoPreviewContainer from './MediaGridComponent/VideoPreviewContainer.vue'
import StatusImage from '../common/StatusImage.vue'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Masonry, type MasonryColumns, type MasonryItemMeta } from '@hunmer/vue-masonry'
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
import { miraSDKService } from '../../services/MiraSDKService'

interface Props {
  items: FileInfo[]
  /** 仅用于定位多分组布局问题的调试标识 */
  debugLabel?: string
  selectedItems?: string[]
  isTrash?: boolean
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
  (e: 'media-context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'after-render'): void
  (e: 'media-select', item: FileInfo, selected: boolean, event?: MouseEvent): void
  (e: 'media-delete', item: FileInfo): void
  (e: 'media-info', item: FileInfo): void
  (e: 'media-set-folder', item: FileInfo): void
  (e: 'media-set-tags', item: FileInfo): void
  (e: 'media-restore', item: FileInfo): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedItems: () => [],
  debugLabel: '',
  isTrash: false,
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
  lazyRootMargin: '1500px 0px'
})

const emit = defineEmits<Emits>()

const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null)
const masonryRef = ref<InstanceType<typeof Masonry> | null>(null)
const thumbnailRatios = ref<Record<string, number>>({})
const metadataRatios = ref<Record<string, number>>({})
const thumbnailRatiosReady = ref(false)
const initialEnterAnimation = ref(true)
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
  get items() { return props.items },
  get selectedItems() { return props.selectedItems }
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

const getMetadataRatio = (item: FileInfo): number | null => {
  const width = Number(item.metadata?.width)
  const height = Number(item.metadata?.height)
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    ? width / height
    : metadataRatios.value[item.id] || null
}

const preloadMetadataRatios = async (items: FileInfo[]) => {
  const groups = new Map<string, FileInfo[]>()
  for (const item of items) {
    if (!item.libraryId) continue
    const group = groups.get(item.libraryId) || []
    group.push(item)
    groups.set(item.libraryId, group)
  }

  await Promise.all([...groups].map(async ([libraryId, group]) => {
    try {
      const entries = await miraSDKService.getFileMetadataByIds(libraryId, group.map(item => item.id))
      const next = { ...metadataRatios.value }
      for (const entry of entries) {
        const width = Number(entry.width)
        const height = Number(entry.height)
        if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
          next[entry.id] = width / height
        }
      }
      metadataRatios.value = next
    } catch {
      // metadata unavailable: the existing thumbnail ratio loader remains the fallback.
    }
  }))
}

const preloadThumbnailRatios = async (items: FileInfo[]) => {
  const currentVersion = ++preloadVersion
  await preloadMetadataRatios(items)
  if (currentVersion !== preloadVersion) return
  // 首屏前 N 个：同步预加载，等真实比例再渲染（避免首屏布局抖动）。
  const headEntries = await Promise.all(items.slice(0, initialRatioPreloadCount.value).filter(item => !getMetadataRatio(item)).map(async (item) => {
    const itemId = String(item.id)
    const ratio = await loadThumbnailRatio(itemId, getItemUrl(item))
    return ratio ? [itemId, ratio] as const : null
  }))

  if (currentVersion !== preloadVersion) return

  const publishedRatios = headEntries.reduce<Record<string, number>>((ratios, entry) => {
    if (entry) {
      ratios[entry[0]] = entry[1]
    }

    return ratios
  }, {})

  for (const item of items) {
    const ratio = getMetadataRatio(item)
    if (ratio) publishedRatios[item.id] = ratio
  }

  // 同时使用之前实例已缓存的比例。
  for (const item of items) {
    const ratio = getCachedThumbnailRatio(String(item.id), getItemUrl(item))
    if (ratio) publishedRatios[item.id] = ratio
  }

  thumbnailRatios.value = publishedRatios
  thumbnailRatiosReady.value = true
  // 首屏外比例加载完成后一次性发布，触发新增项重新布局，避免逐张图片抖动。
  void loadRemainingRatios(items, currentVersion)
}

// 异步加载其余比例（限并发），整批完成后统一更新当前布局。
const RATIO_CONCURRENCY = 12
const loadRemainingRatios = async (items: FileInfo[], currentVersion: number) => {
  const pending = items.filter(item => (
    !getMetadataRatio(item) &&
    !getCachedThumbnailRatio(String(item.id), getItemUrl(item))
  ))
  let cursor = 0
  const runWorker = async () => {
    while (cursor < pending.length) {
      const item = pending[cursor++]
      await loadThumbnailRatio(String(item.id), getItemUrl(item))
    }
  }
  await Promise.all(Array.from({ length: Math.min(RATIO_CONCURRENCY, pending.length) }, runWorker))

  if (currentVersion !== preloadVersion) return
  const next = { ...thumbnailRatios.value }
  for (const item of items) {
    const ratio = getCachedThumbnailRatio(String(item.id), getItemUrl(item))
    if (ratio) next[item.id] = ratio
  }
  thumbnailRatios.value = next
}

watch(
  () => props.items.map(item => `${item.id}:${getItemUrl(item)}`),
  () => {
    void preloadThumbnailRatios(props.items)
  },
  { immediate: true }
)

// hash fallback：真实比例就绪前给一个稳定占位比例，避免新增项全部显示成同一高度。
// 占位值范围压在 [0.8, 1.3]，真实比例整批发布后再统一重排。
const fallbackRatio = (item: FileInfo): number => {
  const itemId = String(item.id)
  let seed = 0
  for (let i = 0; i < itemId.length; i++) seed = ((seed << 5) - seed + itemId.charCodeAt(i)) | 0
  return (Math.abs(seed) % 50) / 100 + 0.8
}

const getItemRatio = (item: FileInfo): number => {
  const metadataRatio = getMetadataRatio(item)
  if (metadataRatio) return metadataRatio
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

watch(
  () => waterfallItems.value.length,
  () => {
    scheduleLayoutRefresh()
  },
  { flush: 'post' }
)

watch(
  () => waterfallItems.value.map(item => `${item.id}:${item.ratio}`),
  () => scheduleLayoutRefresh(),
  { flush: 'post' }
)

// 与网格视图保持一致：相同的列数设置应得到接近的卡片宽度。
const columns = computed<MasonryColumns>(() => {
  const count = Math.max(props.columnsPerRow, 2)
  return {
    base: count,
    sm: count,
    md: count,
    lg: count,
    xl: count
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

// Masonry fill 模式会重排 item 视觉顺序，使其 ≠ props.items 数据源顺序。
// 这里记录 Masonry 实际渲染顺序，用于修正 Shift 范围选择（按视觉顺序而非数据源顺序算区间）。
const layoutOrder = ref<string[]>([])
const handleLayoutOrder = (items: FileInfo[]) => {
  layoutOrder.value = items.map(i => i.id)
}

const selectFromClick = (item: FileInfo, event: MouseEvent) => {
  const selected = props.selectedItems.includes(item.id)

  if (event.altKey) {
    if (selected) emit('media-select', item, false, event)
    return
  }

  // Shift 范围选择：以当前已选最后一项为锚，选中两者之间的所有项（与 Grid 视图一致）。
  // 注意：Masonry fill 模式会重排 item 视觉顺序，使其 ≠ props.items 数据源顺序。
  // 因此按 Masonry 实际渲染顺序（layoutOrder）算区间，而非数据源顺序。
  if (event.shiftKey && props.selectedItems.length > 0) {
    const order = layoutOrder.value.length > 0 ? layoutOrder.value : props.items.map(i => i.id)
    const lastSelectedId = props.selectedItems[props.selectedItems.length - 1]
    const currentIndex = order.indexOf(item.id)
    const lastIndex = order.indexOf(lastSelectedId)
    if (currentIndex !== -1 && lastIndex !== -1) {
      const start = Math.min(currentIndex, lastIndex)
      const end = Math.max(currentIndex, lastIndex)
      const rangeIds = new Set<string>(order.slice(start, end + 1))
      props.items.forEach(currentItem => {
        const inRange = rangeIds.has(currentItem.id)
        const wasSelected = props.selectedItems.includes(currentItem.id)
        if (inRange && !wasSelected) emit('media-select', currentItem, true, event)
        else if (!inRange && wasSelected) emit('media-select', currentItem, false, event)
      })
      return
    }
  }

  if (event.ctrlKey || event.metaKey) {
    emit('media-select', item, !selected, event)
    return
  }

  props.items.forEach(currentItem => {
    if (currentItem.id !== item.id && props.selectedItems.includes(currentItem.id)) {
      emit('media-select', currentItem, false, event)
    }
  })

  if (!selected) {
    emit('media-select', item, true, event)
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

const handleAfterRender = () => {
  if (initialEnterAnimation.value && waterfallItems.value.length > 0) {
    initialEnterAnimation.value = false
  }
  emit('after-render')
}

// 视图切换后重新读取容器宽度并重算布局，不重复加载缩略图比例。
const refresh = () => {
  const selectionRoot = (selectionBoxRef.value as any)?.$el as HTMLElement | null
  const root = selectionRoot?.querySelector('.masonry-container') as HTMLElement | null
  masonryRef.value?.refresh()
}

// 多个瀑布流实例同时挂载时，后续实例可能在首次测量时尚未完成尺寸/比例更新。
// 在 DOM 更新后的连续帧再次测量，避免必须滚动到该分组后才触发布局。
let refreshFrame = 0
const scheduleLayoutRefresh = () => {
  cancelAnimationFrame(refreshFrame)
  void nextTick(() => {
    refresh()
    refreshFrame = requestAnimationFrame(() => refresh())
  })
}

const handleImageError = (url: string) => {
  console.error('Image load error:', url)
}

const handleThumbnailUpdated = async (event: Event) => {
  const { fileId, thumbPath } = (event as CustomEvent).detail || {}
  if (!fileId || !thumbPath) return

  const item = props.items.find(file => String(file.id) === String(fileId))
  if (!item) return

  const ratio = await loadThumbnailRatio(String(item.id), thumbPath)
  if (!ratio || !props.items.some(file => String(file.id) === String(fileId))) return
  thumbnailRatios.value = {
    ...thumbnailRatios.value,
    [item.id]: ratio
  }
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
  window.addEventListener('keydown', handleDeleteKeyDown)
  window.addEventListener('thumbnail-updated', handleThumbnailUpdated)
  document.addEventListener('edit-action', handleEditAction)
  const selectionRoot = (selectionBoxRef.value as any)?.$el as HTMLElement | null
  scheduleLayoutRefresh()
})

onUnmounted(() => {
  cancelAnimationFrame(refreshFrame)
  window.removeEventListener('keydown', handleDeleteKeyDown)
  window.removeEventListener('thumbnail-updated', handleThumbnailUpdated)
  document.removeEventListener('edit-action', handleEditAction)
  stopVideoPreview()
})
</script>

<style scoped>
:deep(.selection-container.waterfall-wrapper) {
  /* 多分组时必须随 Masonry 实际高度增长，不能继承 SelectionBox 的 h-full(40px)。 */
  height: auto !important;
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
