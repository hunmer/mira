<template>
  <SelectionBox
    ref="selectionBoxRef"
    v-model="selectedIds"
    :multiple="true"
    :double-click-to-clear="true"
    :realtime-selection="true"
    :min-selection-size="8"
    :enable-select-all-shortcut="true"
    class="flex-1 overflow-y-auto pb-16 relative"
    tabindex="0"
    @selection-update="handleSelectionUpdate"
    @item-click="handleItemClick"
    @clear-selection="handleClearSelection"
    @pointerdown.capture="focusSelectionBox"
  >
    <!-- 右键菜单（与列表/瀑布流共用 MediaContextMenu） -->
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
      <div class="h-full flex flex-col">
        <div
          class="grid gap-6"
          :style="{
            gridTemplateColumns: `repeat(${props.columnsPerRow}, 1fr)`,
            gridAutoRows: '200px'
          }"
        >
          <MediaItem
            v-for="item in props.items"
            :key="item.id"
            :item="item"
            :is-selected="props.selectedItems.includes(item.id)"
            :is-video-playing="currentVideoItem?.id === item.id"
            :is-muted="settingsStore.settings.videoPreviewMuted"
            :progress="videoProgress[item.id] || 0"
            @click="handleMediaItemClick"
            @double-click="handleDoubleClick"
            @mouse-enter="handleMouseEnter"
            @mouse-leave="handleMouseLeave"
            @mouse-move="handleMouseMove"
            @pointer-down="handlePointerDown"
            @toggle-mute="toggleVideoMute"
            @preview-enter="stopVideoPreview(item.id)"
          >
            <template #video-preview="{ item: videoItem, isPlaying }">
              <VideoPreviewContainer
                v-if="isPlaying"
                :current-video-item="videoItem"
                :is-muted="settingsStore.settings.videoPreviewMuted"
                class="pointer-events-none"
                @video-loaded="onVideoPreviewLoaded"
                @video-time-update="onVideoPreviewTimeUpdate"
                @video-play="onVideoPreviewPlay"
                @video-pause="onVideoPreviewPause"
                @video-error="onVideoPreviewError"
                @update-progress="updateVideoProgress"
              />
            </template>
          </MediaItem>
        </div>

        <!-- 空状态 -->
        <Empty
          v-if="props.items.length === 0"
          class="min-h-full"
        >
          <EmptyMedia>
            <StatusImage name="empty" size="large" />
          </EmptyMedia>
          <EmptyTitle>{{ $t('business.mediaGridComponent.emptyTitle') }}</EmptyTitle>
          <EmptyDescription>{{ $t('business.mediaGridComponent.emptyDesc') }}</EmptyDescription>
        </Empty>
      </div>
    </MediaContextMenu>
  </SelectionBox>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { throttle } from 'throttle-debounce'
import SelectionBox from '../../common/SelectionBox.vue'
import MediaContextMenu from '../MediaContextMenu.vue'
import MediaItem from './MediaGridItem.vue'
import VideoPreviewContainer from './VideoPreviewContainer.vue'
import StatusImage from '@renderer/components/common/StatusImage.vue'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import type { FileInfo } from '../../../../shared/types'
import { useSettingsStore } from '../../../stores/settings'
import { useSelection } from './composables/useSelection'
import { useDragDrop } from './composables/useDragDrop'
import { useVideoHover } from './composables/useVideoHover'
import { useDeleteSelectedItems } from './composables/useDeleteSelectedItems'
import { useFocusedSelectAll } from './composables/useFocusedSelectAll'

interface Props {
  items: FileInfo[]
  selectedItems: string[]
  cardSize: 'small' | 'medium' | 'large'
  columnsPerRow?: number
  isTrash?: boolean
}

interface Emits {
  (e: 'media-click', item: FileInfo): void
  (e: 'media-double-click', item: FileInfo): void
  (e: 'media-select', item: FileInfo, selected: boolean): void
  (e: 'media-context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'media-info', item: FileInfo): void
  (e: 'media-set-folder', item: FileInfo): void
  (e: 'media-set-tags', item: FileInfo): void
  (e: 'media-delete', item: FileInfo): void
  (e: 'media-restore', item: FileInfo): void
}

const props = withDefaults(defineProps<Props>(), {
  columnsPerRow: 4,
  isTrash: false
})
const emit = defineEmits<Emits>()

const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null)
const settingsStore = useSettingsStore()
const { focusSelectionBox, isSelectionBoxFocused } = useFocusedSelectAll(selectionBoxRef, props, emit)

// 使用各种composables
const {
  selectedIds,
  handleSelectionUpdate,
  handleItemClick,
  handleClearSelection,
  handleMediaItemClick
} = useSelection(props, emit)

const { handlePointerDown } = useDragDrop(props)

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

const handleDoubleClick = (item: FileInfo) => {
  emit('media-double-click', item)
}

const { handleDeleteKeyDown, handleEditAction } = useDeleteSelectedItems(props, emit, {
  isActive: isSelectionBoxFocused
})

const seekVideo = throttle(100, (item: FileInfo, event: MouseEvent) => {
  if (!currentVideoItem.value || currentVideoItem.value.id !== item.id) return

  const target = event.target as HTMLElement
  const container = target.closest(`[data-selectable-id="${item.id}"]`)
  if (!container) return

  const video = container.querySelector('video')
  if (!video) return

  const duration = video.duration
  if (!duration || duration <= 0) return

  const rect = container.getBoundingClientRect()
  const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width))
  video.currentTime = (x / rect.width) * duration
})

const handleMouseMove = (item: FileInfo, event: MouseEvent) => {
  seekVideo(item, event)
}

const toggleVideoMute = async () => {
  const newMutedState = !settingsStore.settings.videoPreviewMuted
  await settingsStore.updateSetting('videoPreviewMuted', newMutedState)
}

// Video preview event handlers
const onVideoPreviewLoaded = () => {
  // console.log('Video loaded with duration:', payload.duration)
}

const onVideoPreviewTimeUpdate = () => {
  // 这个事件已经通过 updateVideoProgress 处理了
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
.material-icons {
  font-size: 18px;
}

:deep(.selection-area) {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.6);
  border-radius: 4px;
}
</style>
