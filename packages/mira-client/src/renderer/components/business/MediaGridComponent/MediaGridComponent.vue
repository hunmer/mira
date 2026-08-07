<template>
  <SelectionBox
    ref="selectionBoxRef"
    v-model="selectedIds"
    :multiple="true"
    :double-click-to-clear="true"
    :realtime-selection="true"
    :min-selection-size="8"
    class="flex-1 overflow-y-auto pb-16 relative"
    tabindex="0"
    @selection-update="handleSelectionUpdate"
    @item-click="handleItemClick"
    @clear-selection="handleClearSelection"
    @pointerdown.capture="focusSelectionBox"
  >
    <!-- 右键菜单 -->
    <ContextMenu>
      <ContextMenuTrigger as-child>
      <div>
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
            @context-menu="handleContextMenu"
            @mouse-enter="handleMouseEnter"
            @mouse-leave="handleMouseLeave"
            @mouse-move="handleMouseMove"
            @pointer-down="handlePointerDown"
            @toggle-mute="toggleVideoMute"
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
        <div
          v-if="props.items.length === 0"
          class="absolute inset-0 flex flex-col items-center justify-center h-64 text-muted-foreground"
        >
          <span class="material-icons text-6xl mb-4">folder_open</span>
          <h3 class="text-lg font-medium mb-2">暂无文件</h3>
          <p class="text-sm">拖拽文件到此处或点击上传按钮添加文件</p>
        </div>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent class="w-52">
      <template v-for="(item, i) in contextMenuItems" :key="i">
        <ContextMenuSeparator v-if="item.separator" />
        <ContextMenuSub v-else-if="item.items?.length">
          <ContextMenuSubTrigger :disabled="item.disabled">
            <span v-if="item.icon" class="material-icons text-base mr-2">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent class="w-max min-w-44 max-w-[min(24rem,calc(100vw-1rem))]">
            <template v-for="(sub, j) in item.items" :key="j">
              <ContextMenuSub v-if="sub.items?.length">
                <ContextMenuSubTrigger :disabled="sub.disabled">
                  <span v-if="sub.icon" class="material-icons text-base mr-2">{{ sub.icon }}</span>
                  <span class="whitespace-normal break-words">{{ sub.label }}</span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent class="w-max min-w-44 max-w-[min(24rem,calc(100vw-1rem))]">
                  <ContextMenuItem
                    v-for="(leaf, k) in sub.items"
                    :key="k"
                    :disabled="leaf.disabled"
                    @select="executeMenuCommand(leaf)"
                  >
                    <span v-if="leaf.icon" class="material-icons text-base mr-2">{{ leaf.icon }}</span>
                    <span class="whitespace-normal break-words">{{ leaf.label }}</span>
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuItem
                v-else
                :disabled="sub.disabled"
                @select="executeMenuCommand(sub)"
              >
                <span v-if="sub.icon" class="material-icons text-base mr-2">{{ sub.icon }}</span>
                <span class="whitespace-normal break-words">{{ sub.label }}</span>
              </ContextMenuItem>
            </template>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem v-else :disabled="item.disabled" @select="executeMenuCommand(item)">
          <span v-if="item.icon" class="material-icons text-base mr-2">{{ item.icon }}</span>
          <span class="flex-1">{{ item.label }}</span>
          <span v-if="item.shortcut" class="ml-auto text-xs text-muted-foreground">{{ item.shortcut }}</span>
        </ContextMenuItem>
      </template>
    </ContextMenuContent>
  </ContextMenu>

    <!-- 文件夹选择 Popover -->
    <Popover v-model:open="folderPopoverOpen">
      <PopoverTrigger as-child>
        <div :style="{ position: 'fixed', left: popoverPosition.x + 'px', top: popoverPosition.y + 'px', width: '1px', height: '1px' }"></div>
      </PopoverTrigger>
      <PopoverContent class="w-80 p-2">
        <FolderTreeComponent
          item-type="folder"
          :folders="folderTreeNodes"
          :show-base-categories="false"
          :default-show-search="true"
          @select="handleFolderSelect"
        />
      </PopoverContent>
    </Popover>

    <!-- 标签选择 Popover -->
    <Popover v-model:open="tagPopoverOpen">
      <PopoverTrigger as-child>
        <div :style="{ position: 'fixed', left: popoverPosition.x + 'px', top: popoverPosition.y + 'px', width: '1px', height: '1px' }"></div>
      </PopoverTrigger>
      <PopoverContent class="w-80 p-2">
        <FolderTreeComponent
          item-type="tag"
          :tags="tagStore.tags"
:default-show-search="true"
          @select="handleTagSelect"
        />
      </PopoverContent>
    </Popover>
  </SelectionBox>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { throttle } from 'throttle-debounce'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import SelectionBox from '../../common/SelectionBox.vue'
import FolderTreeComponent from '../FolderTreeComponent/FolderTreeComponent.vue'
import MediaItem from './MediaGridItem.vue'
import VideoPreviewContainer from './VideoPreviewContainer.vue'
import type { FileInfo } from '../../../../shared/types'
import { useSettingsStore } from '../../../stores/settings'
import { useSelection } from './composables/useSelection'
import { useContextMenu } from './composables/useContextMenu'
import { useDragDrop } from './composables/useDragDrop'
import { useVideoHover } from './composables/useVideoHover'
import { useDeleteSelectedItems } from './composables/useDeleteSelectedItems'
import { useFocusedSelectAll } from './composables/useFocusedSelectAll'
import type { MenuItem } from '@/renderer/types/menu'

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

const {
  contextMenuItems,
  handleContextMenu: contextMenuHandler,
  folderPopoverOpen,
  tagPopoverOpen,
  popoverPosition,
  folderTreeNodes,
  handleFolderSelect,
  handleTagSelect,
  tagStore,
} = useContextMenu(props, emit)

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

const handleContextMenu = (item: FileInfo, event: MouseEvent) => {
  contextMenuHandler(item, event)
}

const { handleDeleteKeyDown, handleEditAction } = useDeleteSelectedItems(props, emit, {
  isActive: isSelectionBoxFocused
})

const executeMenuCommand = async (item: MenuItem) => {
  if (item.disabled || !item.command) return

  try {
    await item.command()
  } catch (error) {
    console.error('Failed to execute media context menu command:', item.label, error)
  }
}

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
