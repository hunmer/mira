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
    class="media-list w-full overflow-auto"
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
    <Table class="w-full">
      <TableHeader>
        <TableRow>
          <TableHead class="w-12 min-w-12 max-w-12">
            <Checkbox :model-value="isAllSelected" @update:model-value="toggleSelectAll" />
          </TableHead>
          <TableHead class="w-20 min-w-20 max-w-20">{{ $t('business.mediaListComponent.colPreview') }}</TableHead>
          <TableHead v-if="showFilename" class="max-w-[200px]">{{ $t('business.mediaListComponent.colFilename') }}</TableHead>
          <TableHead v-if="showFormat" class="w-20 min-w-20 max-w-20">{{ $t('business.mediaListComponent.colFormat') }}</TableHead>
          <TableHead v-if="showSize" class="w-24 min-w-24 max-w-24">{{ $t('business.mediaListComponent.colSize') }}</TableHead>
          <TableHead class="w-28 min-w-28 max-w-28">{{ $t('business.mediaListComponent.colResolution') }}</TableHead>
          <TableHead v-if="showFolder" class="w-32 min-w-32 max-w-32">{{ $t('business.mediaListComponent.colFolder') }}</TableHead>
          <TableHead v-if="showTags" class="w-40 min-w-40 max-w-40">{{ $t('business.mediaListComponent.colTags') }}</TableHead>
          <TableHead class="w-40 min-w-40 max-w-40">{{ $t('business.mediaListComponent.colCreatedAt') }}</TableHead>
          <TableHead class="w-24 min-w-24 max-w-24 text-right">{{ $t('business.mediaListComponent.colActions') }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="items.length === 0">
          <TableCell :colspan="tableColumnCount">
            <div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <StatusImage name="empty" size="medium" container-class="mb-2" />
              <p class="text-lg font-medium">{{ $t('business.mediaListComponent.emptyTitle') }}</p>
              <p class="text-sm">{{ $t('business.mediaListComponent.emptyDesc') }}</p>
            </div>
          </TableCell>
        </TableRow>
        <TableRow
          v-for="item in items"
          :key="item.id"
          :data-selectable-id="item.id"
          :class="{ 'bg-primary/10': isSelected(item.id) }"
          class="cursor-pointer hover:bg-primary/5 transition-colors"
          @click="handleItemClick(item, $event)"
          @dblclick="emit('dblclick', item)"
        >
          <!-- 选择列 -->
          <TableCell>
            <Checkbox :model-value="isSelected(item.id)" @update:model-value="toggleSelect(item)" @click.stop />
          </TableCell>

          <!-- 缩略图列 -->
          <TableCell>
            <div class="group relative inline-flex">
              <PopoverRoot v-model:open="videoPreviewStates[item.id]">
                <PopoverTrigger as-child>
                  <div
                    class="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center cursor-pointer"
                    @mouseenter="handleThumbnailHover(item)"
                    @mouseleave="handleThumbnailLeave(item)"
                  >
                    <MediaThumbnail
                      :file-id="item.id"
                      :file="item"
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

              <!-- 预览放大镜按钮：hover 时显示，悬浮按钮弹出 hovercard 预览 -->
              <MediaPreviewHoverCard
                :item="item"
                button-class="absolute top-0.5 right-0.5 z-10 w-5 h-5 rounded-full bg-black/55 text-white"
                icon-class="text-[12px]"
                side="right"
                align="center"
              />
            </div>
          </TableCell>

          <!-- 文件名列 -->
          <TableCell v-if="showFilename">
            <span class="text-sm font-medium text-foreground truncate">{{ item.name }}</span>
          </TableCell>

          <!-- 格式列 -->
          <TableCell v-if="showFormat">
            <span class="text-xs text-primary px-2 py-0.5 bg-primary/10 rounded-full inline-block w-fit">
              {{ getFileExtension(item.name) }}
            </span>
          </TableCell>

          <!-- 文件大小列 -->
          <TableCell v-if="showSize">
            <span class="text-sm text-foreground">{{ formatFileSize(item.size || 0) }}</span>
          </TableCell>

          <!-- 分辨率列 -->
          <TableCell>
            <span v-if="item.metadata?.width && item.metadata?.height" class="text-sm text-foreground">
              {{ item.metadata.width }}×{{ item.metadata.height }}
            </span>
            <span v-else class="text-sm text-muted-foreground">-</span>
          </TableCell>

          <!-- 文件夹列 -->
          <TableCell v-if="showFolder">
            <span v-if="getFolderName(item.folderId)" class="text-sm text-foreground truncate">{{ getFolderName(item.folderId) }}</span>
            <span v-else class="text-sm text-muted-foreground">-</span>
          </TableCell>

          <!-- 标签列 -->
          <TableCell v-if="showTags">
            <div v-if="getTagNames(item.tags).length > 0" class="flex items-center flex-wrap gap-1">
              <span
                v-for="name in getTagNames(item.tags).slice(0, 3)"
                :key="name"
                class="text-xs text-primary px-2 py-0.5 bg-primary/10 rounded-full inline-block max-w-[100px] truncate"
              >{{ name }}</span>
              <span v-if="getTagNames(item.tags).length > 3" class="text-xs text-muted-foreground">
                +{{ getTagNames(item.tags).length - 3 }}
              </span>
            </div>
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
                :title="$t('business.mediaListComponent.previewTitle')"
              >
                <span class="material-icons text-sm">visibility</span>
              </button>
              <button
                class="p-2 text-muted-foreground hover:text-muted-foreground rounded-full hover:bg-muted"
                @click.stop="emit('download', item)"
                :title="$t('business.mediaListComponent.downloadTitle')"
              >
                <span class="material-icons text-sm">download</span>
              </button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    </MediaContextMenu>
  </SelectionBox>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'radix-vue'
import VideoPreviewPopover from '@renderer/components/common/VideoPreviewPopover.vue'
import { SelectionBox } from '@hunmer/vue-selection-box'
import MediaContextMenu from './MediaContextMenu.vue'
import MediaThumbnail from '@renderer/components/common/MediaThumbnail.vue'
import MediaPreviewHoverCard from '@renderer/components/common/MediaPreviewHoverCard.vue'
import StatusImage from '@renderer/components/common/StatusImage.vue'
import { useVideoPreview } from '@renderer/composables/useVideoPreview'
import type { FileInfo } from '../../../shared/types'
import { getMediaFileUrl } from '@renderer/utils/fileUtils'
import { useDeleteSelectedItems } from './MediaGridComponent/composables/useDeleteSelectedItems'
import { useSettingsStore } from '@renderer/stores/settings'
import { useFolderStore } from '@renderer/stores/folder'
import { useTagStore } from '@renderer/stores/tag'
import { useFocusedSelectAll } from './MediaGridComponent/composables/useFocusedSelectAll'

interface Props {
  items: FileInfo[]
  selectedItems: string[]
  isTrash?: boolean
}

interface Emits {
  (e: 'click', item: FileInfo, event: MouseEvent): void
  (e: 'dblclick', item: FileInfo): void
  (e: 'media-context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'preview', item: FileInfo): void
  (e: 'download', item: FileInfo): void
  (e: 'media-select', item: FileInfo, selected: boolean, event?: MouseEvent): void
  (e: 'media-delete', item: FileInfo): void
  (e: 'media-info', item: FileInfo): void
  (e: 'media-set-folder', item: FileInfo): void
  (e: 'media-set-tags', item: FileInfo): void
  (e: 'media-restore', item: FileInfo): void
}

const props = withDefaults(defineProps<Props>(), {
  isTrash: false
})
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

// ============================================
// 展示字段控制（受全局设置 visibleItemFields 驱动）
// ============================================
const settingsStore = useSettingsStore()
const folderStore = useFolderStore()
const tagStore = useTagStore()

const visibleFields = computed(() => settingsStore.settings.visibleItemFields)
const showFilename = computed(() => visibleFields.value.includes('filename'))
const showFormat = computed(() => visibleFields.value.includes('format'))
const showSize = computed(() => visibleFields.value.includes('size'))
const showFolder = computed(() => visibleFields.value.includes('folder'))
const showTags = computed(() => visibleFields.value.includes('tags'))

// 固定列：选择 / 预览 / 分辨率 / 创建时间 / 操作 = 5 列
const tableColumnCount = computed(() => {
  let count = 5
  if (showFilename.value) count++
  if (showFormat.value) count++
  if (showSize.value) count++
  if (showFolder.value) count++
  if (showTags.value) count++
  return count
})

const getFolderName = (folderId?: string): string => {
  if (folderId === undefined || folderId === null || folderId === '') return ''
  return folderStore.getFolderById(Number(folderId))?.title || ''
}

const getTagNames = (tags?: string[]): string[] => {
  const ids = tags || []
  return ids.map(id => tagStore.tags.find(t => String(t.id) === String(id))?.title || String(id))
}

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
    if (selected) emit('media-select', item, false, event)
    return
  }

  // Shift 范围选择：以当前已选最后一项为锚，选中两者之间的所有项（与 Grid 视图一致）
  if (event.shiftKey && props.selectedItems.length > 0) {
    const lastSelectedId = props.selectedItems[props.selectedItems.length - 1]
    const currentIndex = props.items.findIndex(i => i.id === item.id)
    const lastIndex = props.items.findIndex(i => i.id === lastSelectedId)
    if (currentIndex !== -1 && lastIndex !== -1) {
      const start = Math.min(currentIndex, lastIndex)
      const end = Math.max(currentIndex, lastIndex)
      const rangeIds = new Set<string>()
      for (let i = start; i <= end; i++) {
        const rangeItem = props.items[i]
        if (rangeItem) rangeIds.add(rangeItem.id)
      }
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

// hovercard 预览图：优先原图（带缓存破坏），保证清晰

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
