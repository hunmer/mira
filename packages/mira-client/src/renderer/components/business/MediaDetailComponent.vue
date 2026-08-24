<template>
  <div class="flex flex-col h-full space-y-4">
    <OrderedSectionList
      :title="$t('business.mediaDetailComponent.basicInfo')"
      :customize-label="$t('business.filterBar.sortTitle')"
      customize-icon="sort"
      header-only
      @customize="openSortDialog"
    />
    <SortableLayoutDialog v-model="sortDialogOpen" :enabled="sectionEnabledItems" :disabled="sectionDisabledItems"
      :title="$t('business.filterBar.sortTitle')" :description="$t('business.mediaDetailComponent.sortDescription')"
      :enabled-title="$t('business.mediaDetailComponent.sortEnabled')"
      :disabled-title="$t('business.mediaDetailComponent.sortDisabled')"
      :done-label="$t('common.confirm')" :reset-label="$t('common.resetOrder')"
      @update:enabled="updateSectionOrder" @update:disabled="updateSectionDisabled">
      <template #item="{ item }">
        <span class="material-icons text-muted-foreground">{{ item.icon }}</span>
        <div class="min-w-0 flex-1 truncate text-sm">{{ item.title }}</div>
      </template>
    </SortableLayoutDialog>
    <!-- legacy dialog removed -->
    <!--
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ $t('business.filterBar.sortTitle') }}</DialogTitle>
          <DialogDescription>{{ $t('business.filterBar.sortTitle') }}</DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="mb-1 text-xs font-semibold text-foreground">已启用</div>
            <VueDraggable v-model="sectionDragItems" item-key="id" group="detail-sections" class="flex max-h-80 min-h-24 flex-col gap-1.5 overflow-y-auto rounded-lg border border-dashed border-border/70 p-2" handle=".sort-handle">
              <div v-for="entry in sectionDragItems" :key="entry.id" class="flex items-center gap-2 rounded-md border border-border/60 bg-background p-2">
                <span class="sort-handle material-icons cursor-grab text-muted-foreground">drag_indicator</span>
                <span class="material-icons text-muted-foreground">{{ entry.icon }}</span>
                <span class="truncate text-sm">{{ entry.title }}</span>
              </div>
            </VueDraggable>
          </div>
          <div>
            <div class="mb-1 text-xs font-semibold text-muted-foreground">未启用</div>
            <VueDraggable v-model="sectionDisabledItems" item-key="id" group="detail-sections" class="flex max-h-80 min-h-24 flex-col gap-1.5 overflow-y-auto rounded-lg border border-dashed border-border/70 p-2" handle=".sort-handle">
              <div v-for="entry in sectionDisabledItems" :key="entry.id" class="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 p-2">
                <span class="sort-handle material-icons cursor-grab text-muted-foreground">drag_indicator</span>
                <span class="material-icons text-muted-foreground">{{ entry.icon }}</span>
                <span class="truncate text-sm">{{ entry.title }}</span>
              </div>
            </VueDraggable>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="sortDialogOpen = false">{{ $t('common.cancel') }}</Button>
          <Button type="button" @click="applySortDialog">{{ $t('common.confirm') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>-->
    <!-- 无数据占位 -->
    <Empty v-if="displayItems.length === 0" class="flex-1">
      <EmptyMedia>
        <StatusImage name="empty" size="large" />
      </EmptyMedia>
      <EmptyTitle>{{ $t('business.mediaDetailComponent.emptyTitle') }}</EmptyTitle>
    </Empty>
    <template v-else>
      <!-- 预览图 - 支持多选相册效果 -->
      <div class="relative" :style="sectionStyle('preview')">
        <!-- 单选模式 -->
        <div v-if="displayItems.length === 1" class="relative">
          <div class="relative w-full flex items-center justify-center" style="height: 192px;">

            <!-- 错误占位符 - 使用文件类型图标 -->
            <div v-if="imageLoadState === 'error'" class="absolute inset-0 flex flex-col items-center justify-center">
              <img :src="getExtIconUrl(displayItems[0]?.name || '')" class="w-16 h-16 object-contain opacity-60" />

            </div>

            <!-- 正常显示图片 -->
            <img v-show="imageLoadState === 'loaded'" ref="previewImage" :alt="displayItems[0].name"
              :src="displayItems[0].url || displayItems[0].thumbnailPath"
              class="rounded-xl object-contain max-w-full max-h-full" @load="handleImageLoad"
              @error="handleImageError" />
          </div>

          <div class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {{ getFileExtension(displayItems[0]) }}
          </div>
        </div>

        <!-- 颜色提取结果显示（在图片下方） -->
        <div v-if="displayItems.length === 1 && extractedColors.length > 0" class="flex justify-center space-x-1 mt-2">
          <div v-for="(color, index) in extractedColors" :key="index"
            :style="{ backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})` }"
            class="w-6 h-6 rounded-full shadow-sm" :title="`RGB(${color[0]}, ${color[1]}, ${color[2]})`"></div>
        </div>

        <!-- 多选模式 - 叠放相册效果 -->
        <div v-if="displayItems.length > 1" class="relative">
          <div class="image-stack relative w-[120px] h-[120px] mx-auto">
            <div v-for="(item, index) in displayItems.slice(0, 4)" :key="item.id"
              class="stack-container absolute w-[100px] h-[100px] top-0 left-0"
              :style="{ zIndex: index, left: `${index * 8}px`, top: `${index * 8}px` }">
              <!-- 加载中占位符 -->
              <div v-if="multiImageLoadStates[item.id] === 'loading' || multiImageLoadStates[item.id] === undefined"
                class="stack-placeholder absolute w-full h-full top-0 left-0 rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.1)] border-2 border-white bg-muted rounded-lg flex items-center justify-center">
                <StatusImage name="loading" size="small" :spin="true" />
              </div>

              <!-- 错误占位符 -->
              <div v-else-if="multiImageLoadStates[item.id] === 'error'"
                class="stack-placeholder absolute w-full h-full top-0 left-0 rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.1)] border-2 border-white bg-destructive flex items-center justify-center">
                <StatusImage name="load_failed" size="small" img-class="text-destructive" />
              </div>

              <!-- 正常显示图片 -->
              <img v-show="multiImageLoadStates[item.id] === 'loaded'" :alt="item.name"
                :src="item.thumbnailPath || item.url"
                class="stack-img absolute w-full h-full top-0 left-0 object-cover rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.1)] border-2 border-white"
                @load="handleMultiImageLoad(item.id)" @error="handleMultiImageError(item)" />
            </div>
            <!-- 更多文件提示 -->
            <div v-if="displayItems.length > 4"
              class="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded z-10">
              +{{ displayItems.length - 4 }}
            </div>
            <!-- 文件数量显示 -->
            <div class="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded z-10">
              {{ $t('business.mediaDetailComponent.fileCount', { count: displayItems.length }) }}
            </div>
          </div>
        </div>
      </div>
      <!-- 文件名编辑 - 仅单选模式 -->
      <div v-if="!isMultiSelect && displayItems[0]" :style="sectionStyle('fileName')">
        <label class="block text-xs font-medium text-muted-foreground mb-1">{{
          $t('business.mediaDetailComponent.fileName') }}</label>
        <Input v-model="editName" type="text"
          :class="nameError ? 'border-destructive focus-visible:ring-destructive' : ''" :disabled="nameSaving"
          @blur="handleNameBlur" @keydown.enter="handleNameBlur" />
        <p v-if="nameError" class="text-xs text-destructive mt-1">{{ nameError }}</p>
      </div>

      <!-- Website 编辑 - 仅单选模式 -->
      <div v-if="!isMultiSelect && displayItems[0]" :style="sectionStyle('website')">
        <label class="block text-xs font-medium text-muted-foreground mb-1">{{
          $t('business.mediaDetailComponent.website') }}</label>
        <div class="flex items-center gap-1">
          <Input v-model="editWebsite" type="text" placeholder="https://" :disabled="websiteSaving"
            @blur="handleWebsiteBlur" @keydown.enter="handleWebsiteBlur" />
          <button v-if="editWebsite.trim()" type="button" class="p-1.5 rounded-md hover:bg-muted shrink-0"
            :title="$t('business.mediaDetailComponent.openWebsite')" @click="handleOpenWebsite" @mousedown.prevent>
            <span class="material-icons text-muted-foreground text-base">open_in_new</span>
          </button>
        </div>
      </div>

      <!-- 备注 - 仅单选模式 -->
      <div v-if="!isMultiSelect && displayItems[0]" :style="sectionStyle('notes')">
        <label class="block text-xs font-medium text-muted-foreground mb-1">{{ $t('business.mediaDetailComponent.notes')
          }}</label>
        <textarea v-model="editNotes" rows="3" :placeholder="$t('business.mediaDetailComponent.notesPlaceholder')"
          :disabled="notesSaving"
          class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          @blur="handleNotesBlur"></textarea>
      </div>


      <!-- 评分 - 仅单选模式 -->
      <div v-if="!isMultiSelect && displayItems[0]" :style="sectionStyle('rating')">
        <label class="block text-xs font-medium text-muted-foreground mb-1">{{
          $t('business.mediaDetailComponent.rating') }}</label>
        <div class="flex items-center gap-0.5">
          <button v-for="n in 5" :key="n" type="button" class="p-0.5 rounded hover:bg-muted transition-colors"
            :disabled="starsSaving" @click="handleStarsChange(n)" @mouseenter="hoverStars = n"
            @mouseleave="hoverStars = 0">
            <span class="material-icons text-xl"
              :class="(hoverStars || editStars) >= n ? 'text-amber-400' : 'text-muted-foreground/40'">{{ (hoverStars ||
                editStars) >= n ? 'star' : 'star_border' }}</span>
          </button>
          <button v-if="editStars > 0" type="button" class="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground"
            :disabled="starsSaving" :title="$t('business.mediaDetailComponent.rating')" @click="handleStarsChange(0)">
            <span class="material-icons text-base">close</span>
          </button>
        </div>
      </div>


      <!-- 文件URL - 仅单选模式显示 -->
      <div v-if="!isMultiSelect && displayItems[0]?.url" :style="sectionStyle('url')"
        class="flex items-center bg-muted/60 border border-border/60 rounded-lg p-2">
        <span class="flex-1 text-xs truncate">{{ displayItems[0].url }}</span>
        <button class="p-1 rounded-md hover:bg-muted" @click="copyToClipboard(displayItems[0].url)">
          <span class="material-icons text-muted-foreground text-sm">link</span>
        </button>
      </div>

      <!-- 标签管理 -->
      <div :style="sectionStyle('tags')">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-foreground text-sm">{{ $t('business.mediaDetailComponent.tags') }}</h3>
          <Popover v-model:open="tagPopoverOpen">
            <PopoverTrigger as-child>
              <button class="text-primary text-xs hover:text-primary flex items-center gap-0.5">
                <span class="material-icons text-sm">{{ hasTags ? 'edit' : 'add' }}</span>
                <span>{{ hasTags ? $t('business.mediaDetailComponent.editTags') : (isMultiSelect ?
                  $t('business.mediaDetailComponent.batchSetTags') : $t('business.mediaDetailComponent.setTags'))
                  }}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" class="w-80 p-2">
              <FolderTreeComponent item-type="tag" :tags="tagStore.tags" selection-mode="multi"
                :selected-keys="selectedTagKeys" :default-show-search="true" @select="handleTagSelect" />
            </PopoverContent>
          </Popover>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <template v-if="!isMultiSelect && displayItems[0]?.tags && displayItems[0].tags.length > 0">
            <span v-for="tag in displayItems[0].tags" :key="tag"
              class="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full flex items-center">
              {{ getTagName(tag) }}
              <button class="ml-1 text-primary text-xs hover:text-primary" @click="handleRemoveTag(tag)">×</button>
            </span>
          </template>
          <template v-else-if="isMultiSelect && mergedInfo && mergedInfo.tags.length > 0">
            <span v-for="tag in mergedInfo.tags" :key="tag"
              class="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full flex items-center">
              {{ getTagName(tag) }}
              <button class="ml-1 text-primary text-xs hover:text-primary" @click="handleRemoveTag(tag)">×</button>
            </span>
          </template>
          <span v-else class="text-muted-foreground text-xs">{{ $t('business.mediaDetailComponent.noTags') }}</span>
        </div>
      </div>

      <!-- 文件夹信息 -->
      <div :style="sectionStyle('folder')">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-foreground text-sm">{{ $t('business.mediaDetailComponent.folder') }}</h3>
          <Popover v-model:open="folderPopoverOpen">
            <PopoverTrigger as-child>
              <button class="text-primary text-xs hover:text-primary flex items-center gap-0.5">
                <span class="material-icons text-sm">{{ displayItems[0]?.folderId ? 'edit' : 'add' }}</span>
                <span>{{ displayItems[0]?.folderId ? $t('business.mediaDetailComponent.editFolder') : (isMultiSelect ?
                  $t('business.mediaDetailComponent.batchSetFolder') : $t('business.mediaDetailComponent.setFolder'))
                  }}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" class="w-80 p-2">
              <FolderTreeComponent item-type="folder" selection-mode="single" :selected-keys="selectedFolderKeys"
                :default-show-search="true" :folders="folderTreeNodes" :show-base-categories="false"
                @select="handleFolderSelect" />
            </PopoverContent>
          </Popover>
        </div>
        <template v-if="!isMultiSelect">
          <div v-if="displayItems[0]?.folderId"
            class="bg-primary/10 text-primary text-xs px-3 py-2 rounded-lg flex items-center">
            <span class="material-icons mr-2 text-primary">folder</span>
            {{ getFolderName(displayItems[0].folderId) }}
          </div>
          <div v-else class="bg-muted text-muted-foreground text-xs px-3 py-2 rounded-lg flex items-center">
            <span class="material-icons mr-2 text-muted-foreground">folder_open</span>
            {{ $t('business.mediaDetailComponent.uncategorized') }}
          </div>
        </template>
        <template v-else-if="mergedInfo">
          <div v-if="mergedInfo.folders.length > 0" class="space-y-1">
            <div v-for="folderId in mergedInfo.folders" :key="folderId"
              class="bg-primary/10 text-primary text-xs px-3 py-2 rounded-lg flex items-center">
              <span class="material-icons mr-2 text-primary">folder</span>
              {{ getFolderName(folderId) }}
              <button class="ml-auto pl-2 text-primary hover:opacity-70" @click="handleRemoveFolder(folderId)">×</button>
            </div>
          </div>
          <div v-else class="bg-muted text-muted-foreground text-xs px-3 py-2 rounded-lg flex items-center">
            <span class="material-icons mr-2 text-muted-foreground">folder_open</span>
            {{ $t('business.mediaDetailComponent.multiUncategorized') }}
          </div>
        </template>
      </div>

      <!-- 基本信息 -->
      <div :style="sectionStyle('basicInfo')">
        <h3 class="font-semibold text-foreground text-sm mb-2">{{ $t('business.mediaDetailComponent.basicInfo') }}</h3>
        <div class="text-xs space-y-2 text-muted-foreground">
          <!-- 单选模式 -->
          <template v-if="!isMultiSelect && displayItems[0]">
            <div class="flex justify-between">
              <span>{{ $t('business.mediaDetailComponent.size') }}</span>
              <span>{{ formatFileSize(displayItems[0].size) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('business.mediaDetailComponent.modifiedDate') }}</span>
              <span>{{ formatDate(displayItems[0].updatedAt || displayItems[0].createdAt) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('business.mediaDetailComponent.createdDate') }}</span>
              <span>{{ formatDate(displayItems[0].createdAt) }}</span>
            </div>
            <div v-if="isImageFile(displayItems[0]) && displayItems[0].metadata" class="flex justify-between">
              <span>{{ $t('business.mediaDetailComponent.dimensions') }}</span>
              <span>{{ displayItems[0].metadata.width }} x {{ displayItems[0].metadata.height }}</span>
            </div>
            <div v-if="isVideoFile(displayItems[0]) && displayItems[0].metadata" class="flex justify-between">
              <span>{{ $t('business.mediaDetailComponent.duration') }}</span>
              <span>{{ formatDuration(displayItems[0].metadata.duration) }}</span>
            </div>
          </template>
          <!-- 多选模式 -->
          <template v-else-if="isMultiSelect && mergedInfo">
            <div class="flex justify-between">
              <span>{{ $t('business.mediaDetailComponent.selectedCount') }}</span>
              <span>{{ $t('business.mediaDetailComponent.fileCountWithTotal', { count: mergedInfo.count }) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('business.mediaDetailComponent.totalSize') }}</span>
              <span>{{ formatFileSize(mergedInfo.totalSize) }}</span>
            </div>
          </template>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { toRefs, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FileInfo } from '../../../shared/types'
import ColorThief from 'colorthief'
import FolderTreeComponent from './FolderTreeComponent/FolderTreeComponent.vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTagStore } from '@renderer/stores/tag'
import { useFolderStore } from '@renderer/stores/folder'
import { useSettingsStore } from '@renderer/stores/settings'
import { useTabs } from '@renderer/composables/useTabs'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { webSocketService } from '@renderer/services/WebSocketService'
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import StatusImage from '@renderer/components/common/StatusImage.vue'
import { getExtIconUrl } from '@renderer/utils/extIconHelper'
import { runBatchOperation } from '@renderer/composables/useBatchOperation'
import OrderedSectionList from '@/renderer/components/common/OrderedSectionList.vue'
import SortableLayoutDialog from '@/renderer/components/common/SortableLayoutDialog.vue'

// 全局图片加载错误状态缓存
const imageLoadErrorCache = new Map<string, boolean>()

interface Props {
  item?: FileInfo
  items?: FileInfo[] // 支持多选文件
  libraryId?: string // 素材库ID
  /** 多选详情中的条目排序；未提供时保持传入顺序 */
  sortItems?: (a: FileInfo, b: FileInfo) => number
  sortable?: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()
const manualOrder = ref<string[]>([])
const dragItems = ref<FileInfo[]>([])
const sortDialogOpen = ref(false)
const detailSections = [
  { id: 'preview', title: t('business.mediaDetailComponent.preview'), icon: 'image' },
  { id: 'fileName', title: t('business.mediaDetailComponent.fileName'), icon: 'drive_file_rename_outline' },
  { id: 'website', title: t('business.mediaDetailComponent.website'), icon: 'language' },
  { id: 'notes', title: t('business.mediaDetailComponent.notes'), icon: 'notes' },
  { id: 'rating', title: t('business.mediaDetailComponent.rating'), icon: 'star' },
  { id: 'url', title: 'URL', icon: 'link' },
  { id: 'tags', title: t('business.mediaDetailComponent.tags'), icon: 'sell' },
  { id: 'folder', title: t('business.mediaDetailComponent.folder'), icon: 'folder' },
  { id: 'basicInfo', title: t('business.mediaDetailComponent.basicInfo'), icon: 'info' },
]
const sectionOrder = ref(detailSections.map(section => section.id))
const sectionEnabledItems = ref([...detailSections])
const sectionDisabledItems = ref<typeof detailSections>([])
const sectionStyle = (id: string) => sectionDisabledItems.value.some(section => section.id === id)
  ? { display: 'none' }
  : { order: sectionOrder.value.indexOf(id) }

// Access the item from props for use in functions
const { item, items, libraryId } = toRefs(props)
const tagStore = useTagStore()
const folderStore = useFolderStore()
const settingsStore = useSettingsStore()
const { createWebviewTab } = useTabs()

// Popover 控制状态
const tagPopoverOpen = ref(false)
const folderPopoverOpen = ref(false)

// 加载 store 数据
watch(() => [tagPopoverOpen.value, folderPopoverOpen.value], ([tagOpen, folderOpen]) => {
  const libId = libraryId.value || 'default'
  if (tagOpen) tagStore.fetchTags(libId)
  if (folderOpen) folderStore.fetchFolders(libId)
})

// Store 数据映射为 FolderItem 格式
const folderTreeNodes = computed(() =>
  folderStore.folders.map((f: any) => ({
    id: String(f.id),
    label: f.title,
    icon: 'folder',
    count: f.fileCount,
    children: f.children?.map((c: any) => ({
      id: String(c.id),
      label: c.title,
      icon: 'folder',
      count: c.fileCount,
    })),
    originalData: f,
  }))
)

// WebSocket 实时更新覆盖层
const realtimeUpdates = ref<Map<string, Partial<FileInfo>>>(new Map())
const localFieldOverrides = ref<Map<string, Partial<FileInfo>>>(new Map())

// 文件名/website/评分/备注 编辑状态
const editName = ref('')
const editWebsite = ref('')
const editStars = ref(0)
const editNotes = ref('')
const hoverStars = ref(0)
const nameError = ref('')
const nameSaving = ref(false)
const websiteSaving = ref(false)
const starsSaving = ref(false)
const notesSaving = ref(false)

// 计算显示的文件列表（合并 WebSocket 实时更新）
const displayItems = computed(() => {
  let base: FileInfo[]
  if (items.value && items.value.length > 0) {
    base = items.value
  } else if (item.value) {
    base = [item.value]
  } else {
    return []
  }
  const ordered = props.sortItems ? [...base].sort(props.sortItems) : [...base]
  if (manualOrder.value.length) {
    const rank = new Map(manualOrder.value.map((id, index) => [id, index]))
    ordered.sort((a, b) => (rank.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER) - (rank.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER))
  }
  return ordered.map(file => {
    const update = realtimeUpdates.value.get(file.id)
    if (!update) return file
    return {
      ...file,
      ...update,
      // 详情补读仅用于元数据，媒体地址始终沿用列表中的可展示地址
      url: file.url,
      thumbnailPath: file.thumbnailPath,
    }
  })
})

watch(() => displayItems.value.map(file => String(file.id)), ids => {
  const nextOrder = manualOrder.value.filter(id => ids.includes(id))
  ids.forEach(id => { if (!nextOrder.includes(id)) nextOrder.push(id) })
  if (nextOrder.length !== manualOrder.value.length || nextOrder.some((id, index) => id !== manualOrder.value[index])) {
    manualOrder.value = nextOrder
  }
}, { immediate: true })
watch(displayItems, value => {
  const next = [...value]
  if (next.length !== dragItems.value.length || next.some((item, index) => item.id !== dragItems.value[index]?.id)) {
    dragItems.value = next
  }
}, { immediate: true, deep: true })
const openSortDialog = () => {
  sectionEnabledItems.value = sectionOrder.value.map(id => detailSections.find(section => section.id === id)!).filter(Boolean)
  sectionDisabledItems.value = detailSections.filter(section => !sectionOrder.value.includes(section.id))
  sortDialogOpen.value = true
}
const updateSectionOrder = (items: typeof detailSections) => {
  sectionOrder.value = items.map(section => section.id)
  sectionEnabledItems.value = [...items]
}
const updateSectionDisabled = (items: typeof detailSections) => { sectionDisabledItems.value = [...items] }

// 是否为多选模式
const isMultiSelect = computed(() => displayItems.value.length > 1)

// 选中文件变化时清除实时更新
watch([item, items], ([newItem, newItems]) => {
  const currentIds = new Set((newItems?.length ? newItems : (newItem ? [newItem] : [])).map(file => String(file.id)))
  const next = new Map<string, Partial<FileInfo>>()
  realtimeUpdates.value.forEach((value, id) => {
    if (currentIds.has(String(id))) next.set(String(id), value)
  })
  realtimeUpdates.value = next
})

// WebSocket: 监听 file::updated 事件，刷新当前展示的文件信息
const handleFileWsUpdate = async (data: any) => {
  const fileId = String(data.fileId)
  const eventLibId = data.libraryId
  const currentLibId = libraryId.value || 'default'

  const baseFiles = items.value?.length ? items.value : (item.value ? [item.value] : [])
  const matched = baseFiles.some(f =>
    String(f.id) === fileId && (f.libraryId === eventLibId || currentLibId === eventLibId)
  )
  if (!matched) return

  try {
    const updatedFile = await miraSDKService.getFile(eventLibId, fileId)
    const updates = new Map(realtimeUpdates.value)
    const override = localFieldOverrides.value.get(fileId)
    updates.set(fileId, override ? { ...updatedFile, ...override } : updatedFile)
    realtimeUpdates.value = updates
  } catch (e) {
    console.warn('Failed to fetch updated file:', e)
  }
}

onMounted(() => {
  webSocketService.addEventListener('file::updated', handleFileWsUpdate)
})

onUnmounted(() => {
  webSocketService.removeEventListener('file::updated', handleFileWsUpdate)
})

// 文件切换时同步编辑值
watch(displayItems, (items) => {
  // 保存期间忽略 WebSocket 回推，避免服务端旧值覆盖用户正在编辑的表单
  if (items.length === 1 && !nameSaving.value && !websiteSaving.value && !starsSaving.value && !notesSaving.value) {
    editName.value = items[0].name || ''
    editWebsite.value = (items[0] as any).website || ''
    editStars.value = Number((items[0] as any).stars) || 0
    editNotes.value = (items[0] as any).notes || ''
    hoverStars.value = 0
    nameError.value = ''
  }
}, { immediate: true, deep: true })

// 列表缓存可能只含基础字段；单文件详情打开时补读服务端完整字段，避免评分/备注回退为默认值
watch(() => displayItems.value[0]?.id, async (fileId) => {
  if (!fileId || isMultiSelect.value) return
  const file = displayItems.value[0]
  const libId = file?.libraryId || libraryId.value || 'default'
  try {
    const fresh = await miraSDKService.getFile(libId, fileId)
    if (String(displayItems.value[0]?.id) !== String(fileId)) return
    const updates = new Map(realtimeUpdates.value)
    const override = localFieldOverrides.value.get(String(fileId))
    updates.set(String(fileId), override ? { ...fresh, ...override } : fresh)
    realtimeUpdates.value = updates
  } catch {
    // 详情字段拉取失败时忽略，等待下次刷新重试
  }
}, { immediate: true })

const setLocalFieldOverride = (fileId: string, patch: Partial<FileInfo>) => {
  const id = String(fileId)
  const overrides = new Map(localFieldOverrides.value)
  overrides.set(id, { ...(overrides.get(id) || {}), ...patch })
  localFieldOverrides.value = overrides
  const updates = new Map(realtimeUpdates.value)
  updates.set(id, { ...(updates.get(id) || {}), ...patch })
  realtimeUpdates.value = updates
}

// 文件名更新（blur/enter 触发）
const handleNameBlur = async () => {
  const file = displayItems.value[0]
  if (!file || !editName.value.trim() || editName.value.trim() === file.name) {
    editName.value = file?.name || ''
    nameError.value = ''
    return
  }
  const newName = editName.value.trim()
  nameSaving.value = true
  nameError.value = ''
  try {
    const libId = file.libraryId || libraryId?.value || 'default'
    await miraSDKService.renameFile(libId, file.id, newName)
  } catch (e: any) {
    if (e?.response?.status === 409 || e?.response?.data?.code === 409) {
      nameError.value = t('business.mediaDetailComponent.nameConflict')
    } else {
      nameError.value = t('business.mediaDetailComponent.renameFailed')
      editName.value = file.name
    }
  } finally {
    nameSaving.value = false
  }
}

// website 更新（blur/enter 触发）
const handleWebsiteBlur = async () => {
  const file = displayItems.value[0]
  if (!file) return
  const newWebsite = editWebsite.value.trim()
  const oldWebsite = (file as any).website || ''
  if (newWebsite === oldWebsite) return
  websiteSaving.value = true
  try {
    const libId = file.libraryId || libraryId?.value || 'default'
    await miraSDKService.updateFile(libId, file.id, { website: newWebsite })
    setLocalFieldOverride(file.id, { website: newWebsite })
  } catch {
    editWebsite.value = oldWebsite
  } finally {
    websiteSaving.value = false
  }
}

// 打开网页：按设置的「打开网页方式」（系统默认 / 应用内tab / 新窗口）打开
const handleOpenWebsite = async () => {
  const raw = editWebsite.value.trim()
  if (!raw) return
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let host = url
  try { host = new URL(url).hostname } catch { /* 非法 URL 时用原文做标题 */ }
  const action = settingsStore.settings.openWebAction
  if (action === 'tab') {
    await createWebviewTab(url, { label: host })
  } else if (action === 'window') {
    if (window.electronAPI) {
      const result = await window.electronAPI.invoke('window:open-url', url, { title: host })
      if (result && !result.success) console.warn('[mediaDetail] 新窗口打开失败:', result.message)
    } else {
      window.open(url, '_blank', 'noopener')
    }
  } else {
    // Electron 主进程会把 window.open 拦截为系统默认浏览器打开；Web 下即新标签页
    window.open(url, '_blank', 'noopener')
  }
}

// 评分更新（点击触发）
const handleStarsChange = async (value: number) => {
  const file = displayItems.value[0]
  if (!file) return
  const newStars = value
  const oldStars = Number((file as any).stars) || 0
  if (newStars === oldStars) return
  editStars.value = newStars
  starsSaving.value = true
  try {
    const libId = file.libraryId || libraryId?.value || 'default'
    await miraSDKService.updateFile(libId, file.id, { stars: newStars })
    setLocalFieldOverride(file.id, { stars: newStars })
  } catch {
    editStars.value = oldStars
  } finally {
    starsSaving.value = false
  }
}

// 备注更新（blur 触发）
const handleNotesBlur = async () => {
  const file = displayItems.value[0]
  if (!file) return
  const newNotes = editNotes.value
  const oldNotes = (file as any).notes || ''
  if (newNotes === oldNotes) return
  notesSaving.value = true
  try {
    const libId = file.libraryId || libraryId?.value || 'default'
    await miraSDKService.updateFile(libId, file.id, { notes: newNotes })
    setLocalFieldOverride(file.id, { notes: newNotes })
  } catch {
    editNotes.value = oldNotes
  } finally {
    notesSaving.value = false
  }
}

// 图片加载状态跟踪
const imageLoadState = ref<'loading' | 'loaded' | 'error'>('loading')
// 多选图片加载状态
const multiImageLoadStates = ref<Record<string, 'loading' | 'loaded' | 'error'>>({})

// 监听显示项变化，重置加载状态
watch(() => displayItems.value
  .map(item => `${item.id}:${item.thumbnailPath || item.url || ''}`)
  .join('|'), () => {
    const newItems = displayItems.value.map(item => ({
      id: item.id,
      src: item.thumbnailPath || item.url,
    }))
    // 重置单选模式加载状态
    imageLoadState.value = 'loading'
    // 检查缓存中是否已有错误状态（单选模式）
    if (newItems.length === 1) {
      const imageSrc = newItems[0].src
      if (imageSrc && imageLoadErrorCache.has(imageSrc)) {
        imageLoadState.value = 'error'
      }
    }

    // 多选模式：只更新新增项，保留已加载/出错的状态
    const prev = { ...multiImageLoadStates.value }
    const states: Record<string, 'loading' | 'loaded' | 'error'> = {}
    newItems.forEach(item => {
      if (prev[item.id]) {
        // 已存在的项保留之前的状态
        states[item.id] = prev[item.id]
      } else {
        // 新增项：检查是否有缓存的错误状态
        const imageSrc = item.src
        states[item.id] = (imageSrc && imageLoadErrorCache.has(imageSrc)) ? 'error' : 'loading'
      }
    })
    multiImageLoadStates.value = states
  }, { immediate: true })

// 多选文件的合并信息
const mergedInfo = computed(() => {
  if (!isMultiSelect.value) return null

  const files = displayItems.value
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)

  // 合并所有标签（去重）
  const allTags = new Set<string>()
  files.forEach(file => {
    if (file.tags) {
      file.tags.forEach(tag => allTags.add(tag))
    }
  })

  // 合并所有文件夹（去重）
  const allFolders = new Set<string>()
  files.forEach(file => {
    if (file.folderId) {
      allFolders.add(file.folderId)
    }
  })

  return {
    count: files.length,
    totalSize,
    tags: Array.from(allTags),
    folders: Array.from(allFolders)
  }
})

// 颜色提取相关
const previewImage = ref<HTMLImageElement>()
const extractedColors = ref<number[][]>([])
const colorThief = new ColorThief()



// 图片加载处理
const handleImageLoad = () => {
  imageLoadState.value = 'loaded'
  if (previewImage.value && item.value && isImageFile(item.value)) {
    try {
      // 提取主色调
      const dominantColor = colorThief.getColor(previewImage.value)
      // 提取调色板
      const palette = colorThief.getPalette(previewImage.value, 5)
      extractedColors.value = palette || [dominantColor]
    } catch (error) {
      console.warn('Failed to extract colors:', error)
      extractedColors.value = []
    }
  }
}

const handleImageError = () => {
  const imageSrc = displayItems.value[0]?.url || displayItems.value[0]?.thumbnailPath
  if (imageSrc) {
    imageLoadErrorCache.set(imageSrc, true)
  }
  imageLoadState.value = 'error'
  extractedColors.value = []
}

// 多选图片加载处理
const handleMultiImageLoad = (itemId: string) => {
  if (multiImageLoadStates.value) {
    multiImageLoadStates.value[itemId] = 'loaded'
  }
}

const handleMultiImageError = (item: FileInfo) => {
  const imageSrc = item.thumbnailPath || item.url
  if (imageSrc) {
    imageLoadErrorCache.set(imageSrc, true)
  }
  if (multiImageLoadStates.value) {
    multiImageLoadStates.value[item.id] = 'error'
  }
}

const getFolderName = (folderId?: string): string => {
  if (!folderId) return t('business.mediaDetailComponent.uncategorized')
  if (folderId === 'default') return t('business.mediaDetailComponent.defaultFolder')
  const folder = folderStore.getFolderById(Number(folderId))
  return folder?.title || t('business.mediaDetailComponent.folderIdLabel', { id: folderId })
}

const hasTags = computed(() => {
  if (isMultiSelect.value) return mergedInfo.value && mergedInfo.value.tags.length > 0
  return displayItems.value[0]?.tags && displayItems.value[0].tags.length > 0
})

const selectedFolderKeys = computed(() => {
  const folders = isMultiSelect.value ? (mergedInfo.value?.folders || []) : (displayItems.value[0]?.folderId ? [displayItems.value[0].folderId] : [])
  return folders.map(String)
})

const selectedTagKeys = computed(() => {
  const tags = isMultiSelect.value ? (mergedInfo.value?.tags || []) : (displayItems.value[0]?.tags || [])
  const cached = libraryId.value ? tagStore.getCachedTags(libraryId.value) : []
  return tags.map(tag => {
    const match = cached.find(t => String(t.id) === String(tag) || t.title === tag || (t as any).name === tag)
    return `tag-${match?.id ?? tag}`
  })
})

const handleFolderSelect = async (folderItem: any) => {
  const client = (miraSDKService as any).client
  if (!client) return
  const files = displayItems.value
  await runBatchOperation(files, async (file) => {
    const libId = file.libraryId || 'default'
    await client.folders().setFileFolder({ libraryId: libId, fileId: parseInt(file.id), folder: parseInt(folderItem.id) })
    file.folderId = String(folderItem.id)
  }, { label: t('business.mediaDetailComponent.setFolderAction') })
}

const handleRemoveFolder = async (folderId: string) => {
  const client = (miraSDKService as any).client
  if (!client) return
  const files = displayItems.value.filter(file => String(file.folderId) === String(folderId))
  await runBatchOperation(files, async (file) => {
    const libId = file.libraryId || 'default'
    await client.folders().removeFileFromFolder(libId, parseInt(file.id))
    file.folderId = undefined
  }, { label: t('business.mediaDetailComponent.removeFolderAction') })
}

const handleTagSelect = async (tagData: any) => {
  const client = (miraSDKService as any).client
  if (!client) return
  const tagName = tagData.title || tagData.name || tagData.label
  if (!tagName) return
  const files = displayItems.value
  if (tagData.selected === false) {
    await handleRemoveTag(tagName)
    return
  }
  await runBatchOperation(files, async (file) => {
    const libId = file.libraryId || 'default'
    await client.tags().addTagsToFile(libId, parseInt(file.id), [tagName])
    if (!file.tags) file.tags = []
    if (!file.tags.includes(tagName)) file.tags.push(tagName)
  }, { label: t('business.mediaDetailComponent.setTagAction') })
  await tagStore.refreshTags(libraryId.value || 'default')
}

const handleRemoveTag = async (tag: string) => {
  const client = (miraSDKService as any).client
  if (!client) return
  const files = displayItems.value
  await runBatchOperation(files, async (file) => {
    const libId = file.libraryId || 'default'
    const currentTags = file.tags || []
    // 标签值可能是 ID 或标题，按两种形式匹配后通过 setFileTags 覆盖保存。
    const remainingTags = currentTags.filter(currentTag =>
      String(currentTag) !== String(tag) && getTagName(currentTag) !== getTagName(tag)
    )
    await client.tags().setFileTags({
      libraryId: libId,
      fileId: parseInt(file.id),
      tags: remainingTags,
    })
    setLocalFieldOverride(file.id, { tags: remainingTags })
  }, { label: t('business.mediaDetailComponent.removeTagAction') })
  await tagStore.refreshTags(libraryId.value || 'default')
}

// 获取标签名称
const getTagName = (tagId: string): string => {
  // 尝试从当前素材库的缓存中获取标签
  const cachedTags = libraryId.value ? tagStore.getCachedTags(libraryId.value) : []
  const tag = cachedTags.find(t => String(t.id) === String(tagId))
  return tag?.title || tagId
}



const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
  })
}

const getFileExtension = (item: FileInfo): string => {
  const ext = item.extension || item.name.split('.').pop()?.toUpperCase() || 'FILE'
  return ext
}

const isImageFile = (item: FileInfo): boolean => {
  return item.mimeType.startsWith('image/')
}

const isVideoFile = (item: FileInfo): boolean => {
  return item.mimeType.startsWith('video/')
}

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

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'Unknown'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.material-icons {
  font-size: 16px;
}

/* 加载动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
