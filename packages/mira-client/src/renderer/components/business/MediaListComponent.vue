<template>
  <SelectionBox
    ref="selectionBoxRef"
    v-model="selectedIds"
    :multiple="true"
    :double-click-to-clear="true"
    :realtime-selection="true"
    :min-selection-size="8"
    class="media-list w-full overflow-auto"
    tabindex="0"
    @selection-update="handleSelectionUpdate"
    @item-click="handleSelectionItemClick"
    @clear-selection="handleClearSelection"
    @pointerdown.capture="focusSelectionBox"
  >
    <Table class="w-full">
      <TableHeader>
        <TableRow>
          <TableHead class="w-12 min-w-12 max-w-12">
            <Checkbox :model-value="isAllSelected" @update:model-value="toggleSelectAll" />
          </TableHead>
          <TableHead class="w-20 min-w-20 max-w-20">预览</TableHead>
          <TableHead class="max-w-[200px]">文件名</TableHead>
          <TableHead class="w-24 min-w-24 max-w-24">大小</TableHead>
          <TableHead class="w-28 min-w-28 max-w-28">分辨率</TableHead>
          <TableHead class="w-40 min-w-40 max-w-40">创建时间</TableHead>
          <TableHead class="w-24 min-w-24 max-w-24 text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="items.length === 0">
          <TableCell colspan="7">
            <div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <span class="material-icons text-4xl mb-2">folder_open</span>
              <p class="text-lg font-medium">暂无文件</p>
              <p class="text-sm">选择不同的筛选条件查看文件</p>
            </div>
          </TableCell>
        </TableRow>
        <TableRow
          v-for="item in items"
          :key="item.id"
          :data-selectable-id="item.id"
          :class="{ 'bg-muted/50': isSelected(item.id) }"
          class="cursor-pointer hover:bg-muted/50"
          @click="handleItemClick(item, $event)"
          @dblclick="emit('dblclick', item)"
          @contextmenu="emit('contextmenu', item, $event)"
        >
          <!-- 选择列 -->
          <TableCell>
            <Checkbox :model-value="isSelected(item.id)" @update:model-value="toggleSelect(item)" @click.stop />
          </TableCell>

          <!-- 缩略图列 -->
          <TableCell>
            <PopoverRoot v-model:open="videoPreviewStates[item.id]">
              <PopoverTrigger as-child>
                <div
                  class="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center cursor-pointer"
                  @mouseenter="handleThumbnailHover(item)"
                  @mouseleave="handleThumbnailLeave(item)"
                >
                  <MediaThumbnail
                    :file-id="item.id"
                    :src="item.thumbnailPath || item.url || ''"
                    :filename="item.name"
                    :alt="item.name"
                    img-class="w-full h-full object-cover"
                  />
                </div>
              </PopoverTrigger>

              <PopoverPortal v-if="getFileType(item) === 'video'">
                <PopoverContent
                  v-if="videoPreviewStates[item.id] && videoPreview.currentVideoItem.value"
                  side="right"
                  :side-offset="10"
                  align="center"
                  class="popover-content"
                  @pointerenter="() => handlePopoverEnter(item.id)"
                  @pointerleave="() => handlePopoverLeave(item.id)"
                >
                  <VideoPreviewPopover
                    :video-url="videoPreview.currentVideoItem.value.url || ''"
                    :current-time="videoPreview.currentTime.value"
                    :duration="videoPreview.duration.value"
                    :video-ref="videoPreview.videoRef"
                    :width="320"
                    :height="180"
                    @video-loaded="videoPreview.handleVideoLoaded"
                    @time-update="(time) => videoPreview.currentTime.value = time"
                  />
                </PopoverContent>
              </PopoverPortal>
            </PopoverRoot>
          </TableCell>

          <!-- 文件名列 -->
          <TableCell>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium text-foreground truncate">{{ item.name }}</span>
              <span class="text-xs text-muted-foreground px-2 py-1 bg-muted rounded inline-block w-fit mt-1">
                {{ getFileExtension(item.name) }}
              </span>
            </div>
          </TableCell>

          <!-- 文件大小列 -->
          <TableCell>
            <span class="text-sm text-foreground">{{ formatFileSize(item.size || 0) }}</span>
          </TableCell>

          <!-- 分辨率列 -->
          <TableCell>
            <span v-if="item.metadata?.width && item.metadata?.height" class="text-sm text-foreground">
              {{ item.metadata.width }}×{{ item.metadata.height }}
            </span>
            <span v-else class="text-sm text-muted-foreground">-</span>
          </TableCell>

          <!-- 创建时间列 -->
          <TableCell>
            <span class="text-sm text-foreground">{{ formatDate(item.createdAt || '') }}</span>
          </TableCell>

          <!-- 操作列 -->
          <TableCell class="text-right">
            <div class="flex space-x-2 justify-end">
              <button
                class="p-2 text-muted-foreground hover:text-muted-foreground rounded-full hover:bg-muted"
                @click.stop="emit('preview', item)"
                title="预览"
              >
                <span class="material-icons text-sm">visibility</span>
              </button>
              <button
                class="p-2 text-muted-foreground hover:text-muted-foreground rounded-full hover:bg-muted"
                @click.stop="emit('download', item)"
                title="下载"
              >
                <span class="material-icons text-sm">download</span>
              </button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </SelectionBox>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'radix-vue'
import VideoPreviewPopover from '@renderer/components/common/VideoPreviewPopover.vue'
import SelectionBox from '@renderer/components/common/SelectionBox.vue'
import MediaThumbnail from '@renderer/components/common/MediaThumbnail.vue'
import { useVideoPreview } from '@renderer/composables/useVideoPreview'
import type { FileInfo } from '../../../shared/types'
import { getMediaFileUrl } from '@renderer/utils/fileUtils'
import { useDeleteSelectedItems } from './MediaGridComponent/composables/useDeleteSelectedItems'
import { useFocusedSelectAll } from './MediaGridComponent/composables/useFocusedSelectAll'

interface Props {
  items: FileInfo[]
  selectedItems: string[]
}

interface Emits {
  (e: 'click', item: FileInfo, event: MouseEvent): void
  (e: 'dblclick', item: FileInfo): void
  (e: 'contextmenu', item: FileInfo, event: MouseEvent): void
  (e: 'preview', item: FileInfo): void
  (e: 'download', item: FileInfo): void
  (e: 'media-select', item: FileInfo, selected: boolean): void
  (e: 'media-delete', item: FileInfo): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null)
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

const isSelected = (id: string) => props.selectedItems.includes(id)

const isAllSelected = computed(() => {
  if (props.items.length === 0) return false
  return props.items.every(item => props.selectedItems.includes(item.id))
})

const toggleSelect = (item: FileInfo) => {
  emit('media-select', item, !isSelected(item.id))
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    props.items.forEach(item => {
      if (props.selectedItems.includes(item.id)) {
        emit('media-select', item, false)
      }
    })
  } else {
    props.items.forEach(item => {
      if (!props.selectedItems.includes(item.id)) {
        emit('media-select', item, true)
      }
    })
  }
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

const handleItemClick = (item: FileInfo, event: MouseEvent) => {
  selectFromClick(item, event)
  emit('click', item, event)
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
  if (item) handleItemClick(item, event)
}

const handleClearSelection = () => {
  props.items.forEach(item => {
    if (props.selectedItems.includes(item.id)) {
      emit('media-select', item, false)
    }
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleDeleteKeyDown)
  document.addEventListener('edit-action', handleEditAction)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleDeleteKeyDown)
  document.removeEventListener('edit-action', handleEditAction)
})

// 视频预览状态管理
const videoPreviewStates = reactive<Record<string, boolean>>({})
const popoverMouseStates = reactive<Record<string, boolean>>({})

const videoPreview = useVideoPreview({
  hoverDelay: 300,
  enabled: true
})

// 获取视频 URL
const getVideoUrl = getMediaFileUrl

const handleThumbnailHover = (data: FileInfo) => {
  if (getFileType(data) === 'video') {
    const videoUrl = getVideoUrl(data)
    if (!videoUrl) return
    const itemWithUrl = { ...data, url: videoUrl }
    videoPreview.handleMouseEnter(itemWithUrl)
    videoPreviewStates[data.id] = true
  }
}

const handleThumbnailLeave = (data: FileInfo) => {
  setTimeout(() => {
    if (!popoverMouseStates[data.id]) {
      videoPreviewStates[data.id] = false
      videoPreview.handleMouseLeave()
    }
  }, 100)
}

const handlePopoverEnter = (itemId: string) => {
  popoverMouseStates[itemId] = true
}

const handlePopoverLeave = (itemId: string) => {
  popoverMouseStates[itemId] = false
  videoPreviewStates[itemId] = false
  videoPreview.handleMouseLeave()
}

// 工具函数
const getFileExtension = (filename: string): string => {
  const ext = filename.split('.').pop()
  return ext ? `.${ext.toUpperCase()}` : ''
}

const getFileType = (file: FileInfo): string => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm']
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a']
  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  return 'other'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.media-list :deep(.popover-content) {
  z-index: 50;
  outline: none;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
