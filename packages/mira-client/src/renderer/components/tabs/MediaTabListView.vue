<template>
  <div ref="mediaTabListViewRef"
    class="media-list-view flex-1 flex flex-col w-full bg-transparent overflow-hidden relative h-full text-[13px]"
    @keydown.capture="handleDeleteKeyDown" @dragover.prevent="canUpload && handleDragOver($event)"
    @dragleave.prevent="canUpload && handleDragLeave($event)" @drop.prevent="canUpload && handleDrop($event)">
    <!-- 拖拽上传覆盖层 -->
    <Transition name="fade">
      <div v-if="isDragOver && canUpload"
        class="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
        <div class="text-center">
          <span class="material-icons text-5xl text-primary mb-2">cloud_upload</span>
          <p class="text-primary font-medium text-lg">{{ $t('tabs.mediaTabListView.releaseToUpload') }}</p>
        </div>
      </div>
    </Transition>

    <!-- 顶部筛选栏和工具按钮 -->
    <MediaTabTopBar :filter-rules="filterRules" :is-all-selected="isAllSelected" :folder-tree-items="folderTreeItems"
      :tag-tree-items="tagTreeItems" :sort-field="sortField" :sort-order="sortOrder"
      :applied-filter-id="appliedFilterId" :view-modes="viewModes" :view-mode="viewMode" :is-loading="isLoading"
      @select-all="handleSelectAll" @filter-change="handleFilterChange" @filter-clear="handleFilterClear"
      @sort-change="handleSortChange" @apply-saved-filter="handleApplySavedFilter"
      @clear-filters="handleClearAllFilters" @view-mode-change="handleViewModeChange"
      @manual-refresh="handleManualRefresh" @customize-sections="sectionLayoutDialogOpen = true" />

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden relative">
      <div class="flex-1 flex flex-col min-w-0 min-h-0">
        <!-- 媒体内容 - files 和 trash 都使用统一的视图 -->
        <div ref="scrollContainerRef" class="flex-1 min-h-0 overflow-y-auto w-full min-w-0" @wheel="handleCtrlWheel">
          <OrderedSectionList :items="enabledSections" headerless>
            <template #default="{ item: section }">
              <!-- 顶部的子文件夹 -->
              <MediaTabFoldersSection v-if="section.id === 'folders'" :items="childFolderItems"
                :available-folders="availableFolders" :folder-cover-urls="folderCoverUrls"
                :folder-card-ui-size="folderCardUiSize" :folder-grid-item-size="folderGridItemSize"
                :get-folder-color="getFolderColor" :can-upload="canUpload" @add-folder="showFolderDialog = true"
                @select="handleChildFolderSelect" @refresh="handleRefresh(true)" @drop="handleDrop"
                @card-drag-over="handleFolderCardDragOver" @card-drag-leave="handleFolderCardDragLeave" />

              <MediaTabMediaSection v-else-if="section.id === 'media'" ref="mediaSectionRef"
                :total-count="filteredMediaItems.length" :grouping-options="groupingOptions"
                :grouping-mode="groupingMode" :group-chapters="groupChapters" :media-groups="mediaGroups"
                :view-mode="viewMode" :selected-items="selectedItems" :card-size="cardSize"
                :columns-per-row="columnsPerRow" :dynamic-column-width="dynamicColumnWidth"
                :compact-waterfall="compactWaterfall" :is-trash="isTrash" :import-target="importTarget"
                @grouping-change="handleGroupingChange" @chapter-select="handleGroupChapterSelect"
                @upload="handleListUpload" @import-folder="handleImportFolder" @media-click="handleMediaClick"
                @media-double-click="handleMediaDoubleClick" @media-select="handleMediaSelect"
                @media-context-menu="handleMediaContextMenu" @media-info="handleMediaInfo"
                @media-set-folder="handleMediaSetFolder" @media-set-tags="handleMediaSetTags"
                @media-delete="handleMediaDelete" @media-restore="handleMediaRestore" />

              <!-- 外部注册的自定义区块 -->
              <MediaTabSectionHost v-else-if="registeredSectionById(section.id)"
                :def="registeredSectionById(section.id)" />
            </template>
          </OrderedSectionList>
        </div>

        <!-- 浮动操作栏 -->
        <MediaTabFloatingToolbar :selected-items="selectedItems" :selected-images="selectedImages" :is-trash="isTrash"
          :current-page="currentPage" :total-pages="totalPages"
          @invert-selection="handleInvertSelection" @clear-selection="handleClearSelection"
          @toolbar-action="handleToolbarAction" @previous-page="handlePreviousPage"
          @next-page="handleNextPage" @page-change="handlePageChange" />
      </div>
    </div>

    <!-- 底部状态栏 -->
    <MediaTabStatusBar :show-breadcrumb="showMediaBreadcrumb" :breadcrumb-items="breadcrumbItems"
      :file-count="filteredMediaItems.length" :selected-count="selectedItems.length" :current-page="currentPage"
      :total-pages="totalPages" :view-mode="viewMode" :columns-per-row="columnsPerRow"
      :compact-waterfall="compactWaterfall" @breadcrumb-select="handleBreadcrumbClick"
      @columns-change="handleColumnsChange" @update:compact-waterfall="handleCompactWaterfallChange" />

    <!-- 批量删除确认对话框 -->
    <AlertDialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <AlertDialogContent class="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('tabs.mediaTabListView.confirmDeleteTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('tabs.mediaTabListView.confirmDeleteDesc', { count: selectedItems.length }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label class="flex items-center space-x-2 px-1 pt-1 cursor-pointer select-none">
          <Checkbox :model-value="rememberDeleteChoice"
            @update:model-value="val => rememberDeleteChoice = val === true" />
          <span class="text-sm text-muted-foreground dark:text-muted-foreground">
            {{ $t('tabs.mediaTabListView.rememberDeleteChoice') }}
          </span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="confirmDelete">
            {{ $t('common.delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 文件上传对话框 -->
    <FileUploadDialog v-model:visible="showUploadDialog" :initial-files="droppedFiles"
      :initial-folder-id="uploadFolderId" :initial-tag-ids="uploadTagIds" :initial-local-tree="uploadInitialTree" />
    <FolderEditDialog :visible="showFolderDialog" :parent-folder="currentFolder" :available-folders="folderEditAvailableFolders" item-type="folder"
      @close="showFolderDialog = false" @save="handleFolderSave" />

    <!-- 区块排序 / 隐藏设置对话框 -->
    <SortableLayoutDialog v-model="sectionLayoutDialogOpen" :enabled="enabledSections" :disabled="disabledSections"
      :title="$t('tabs.mediaTabListView.sectionLayoutTitle')"
      :description="$t('tabs.mediaTabListView.sectionLayoutDescription')"
      :enabled-title="$t('tabs.mediaTabListView.sectionLayoutEnabled')"
      :disabled-title="$t('tabs.mediaTabListView.sectionLayoutDisabled')"
      :done-label="$t('common.confirm')" :reset-label="$t('common.resetOrder')"
      :empty-disabled-label="$t('tabs.mediaTabListView.sectionLayoutAllEnabled')"
      @update:enabled="updateSectionLayout" @update:disabled="() => {}">
      <template #item="{ item }">
        <span class="material-icons text-base text-muted-foreground">{{ item.icon }}</span>
        <div class="min-w-0 flex-1 truncate text-xs">{{ item.title }}</div>
      </template>
    </SortableLayoutDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useMediaStore } from '@renderer/stores/media'
import { useTagStore } from '@renderer/stores/tag'
import { useSettingsStore } from '@renderer/stores/settings'
import { useHomeController } from '@renderer/controllers/HomeController'
import { useMediaOperations, useFilters, useViewModeConfig } from '@renderer/composables'
import { useMediaTabData } from '@renderer/composables/useMediaTabData'
import { getLibraryPrefs, getSavedFilters } from '@renderer/composables/LibraryPrefs'
import FileUploadDialog from '@renderer/components/business/FileUploadDialog.vue'
import FolderEditDialog from '@renderer/components/business/FolderEditDialog.vue'
import OrderedSectionList from '@/renderer/components/common/OrderedSectionList.vue'
import SortableLayoutDialog from '@/renderer/components/common/SortableLayoutDialog.vue'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'
import type { FileInfo } from '@/shared/types'
import type { BadgeImage } from '@/components/ui/images-badge'
import { useMediaTabFetch } from './MediaTabListView/useMediaTabFetch'
import { useMediaTabSelection } from './MediaTabListView/useMediaTabSelection'
import { useMediaTabFilters } from './MediaTabListView/useMediaTabFilters'
import { useMediaTabGrouping } from './MediaTabListView/useMediaTabGrouping'
import { useMediaTabBreadcrumb } from './MediaTabListView/useMediaTabBreadcrumb'
import { useMediaTabFolders } from './MediaTabListView/useMediaTabFolders'
import { useMediaTabUpload } from './MediaTabListView/useMediaTabUpload'
import { useMediaTabBatchOps } from './MediaTabListView/useMediaTabBatchOps'
import { useMediaTabPagination } from './MediaTabListView/useMediaTabPagination'
import { useMediaTabSections } from './MediaTabListView/useMediaTabSections'
import { MediaTabSectionHost } from './MediaTabListView/tabSections'
import { resolveMediaTabItems } from './MediaTabListView/mediaTabRuntime'
import MediaTabTopBar from './MediaTabListView/MediaTabTopBar.vue'
import MediaTabFoldersSection from './MediaTabListView/MediaTabFoldersSection.vue'
import MediaTabMediaSection from './MediaTabListView/MediaTabMediaSection.vue'
import MediaTabFloatingToolbar from './MediaTabListView/MediaTabFloatingToolbar.vue'
import MediaTabStatusBar from './MediaTabListView/MediaTabStatusBar.vue'
import { miraEventBus } from '@renderer/services/EventBus'

// Props
interface Props {
  tabId: string
  libraryId?: string
  label?: string // Tab显示的标签名称
  viewType?: 'files' | 'trash' // 只有 'files' 和 'trash' 两种状态类型
  filters?: Record<string, any> // folder 和 tag 通过这里的 filter 传入
  showFilters?: boolean
  showPagination?: boolean
  pageSize?: number
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  viewType: 'files',
  filters: () => ({}),
  showFilters: true,
  showPagination: true,
  pageSize: 999,
  emptyMessage: ''
})

// Emits
const emit = defineEmits<{
  itemSelect: [item: FileInfo, selected: boolean]
  itemDoubleClick: [item: any]
  selectionChange: [items: any[]]
  filterChange: [filters: Record<string, any>]
  refresh: []
}>()

// 获取共享状态和控制器
const tagStore = useTagStore()
const mediaStore = useMediaStore()
const homeController = useHomeController()

// 使用专门的MediaTab数据管理
const mediaTabData = useMediaTabData(props.tabId)

// 使用 composables
const mediaOperations = useMediaOperations()
const {
  handleMediaClick,
  handleMediaInfo,
  handleMediaSetFolder,
  handleMediaSetTags,
} = mediaOperations

const filtersComposable = useFilters()
const {
  filterRules,
  handleFilterChange: baseHandleFilterChange,
  handleFilterClear: baseHandleFilterClear
} = filtersComposable

const viewModeConfig = useViewModeConfig()
const {
  viewModes
} = viewModeConfig

// 根元素引用（供分组导航 / 删除键处理使用）
const mediaTabListViewRef = ref<HTMLElement | null>(null)
const mediaSectionRef = ref<InstanceType<typeof MediaTabMediaSection> | null>(null)
// 媒体内容滚动容器（切换视图时重置滚动位置）
const scrollContainerRef = ref<HTMLElement | null>(null)

// 使用 tab 独立的 viewMode（从 MediaTabData 获取）
const viewMode = computed(() => mediaTabData.viewMode.value)
const isTrash = computed(() => props.viewType === 'trash')
const cardSize = computed(() => homeController.cardSize?.value || 'medium')
const columnsPerRow = computed(() => homeController.columnsPerRow?.value || 6)
const dynamicColumnWidth = computed(() => homeController.dynamicColumnWidth?.value || 200)

// 使用MediaTabData的分页状态
const currentPage = computed(() => mediaTabData.currentPage.value)
const totalPages = computed(() => mediaTabData.totalPages.value)

// 从 MediaTabData 获取数据（优先使用缓存数据）
const paginatedMediaItems = computed(() => {
  const cachedData = mediaTabData.getCachedData()
  return resolveMediaTabItems(cachedData, homeController.paginatedMediaItems?.value || [])
})

// ============================================
// 按功能拆分的组合式函数与子组件（实现见 ./MediaTabListView/ 目录）
// ============================================

// 数据加载：分页取数、排序、刷新
const {
  isLoading,
  sortField,
  sortOrder,
  fetchPageData,
  handleRefresh,
  handleManualRefresh,
  handleActiveTabRefresh,
  handleSortChange
} = useMediaTabFetch({ props, mediaTabData, homeController, emit })

// 单页最多展示配置变化时，重新加载第一页使其立即生效
watch(() => mediaTabData.itemsPerPage.value, () => {
  void fetchPageData(1)
})

// 选中逻辑：全选/反选/取消、选中项与详情侧栏同步
const {
  selectedItems,
  isAllSelected,
  handleSelectAll,
  handleMediaSelect,
  handleInvertSelection,
  handleClearSelection
} = useMediaTabSelection({ homeController, paginatedMediaItems, emit })

// 浮动工具栏选中项缩略图（ImagesBadge 堆叠展示）：当前页匹配的选中项，取前 12 张防止极端选中量
const selectedImages = computed<BadgeImage[]>(() => {
  const ids = new Set(selectedItems.value)
  return paginatedMediaItems.value
    .filter((item: FileInfo) => ids.has(item.id) && !!(item.thumbnailPath || item.url))
    .slice(0, 12)
    .map((item: FileInfo) => ({ src: (item.thumbnailPath || item.url) as string, alt: item.name }))
})

// 筛选逻辑：合并/清除/应用已保存过滤器
const {
  initializeFilterRules,
  applySnapshotToRule,
  handleFilterChange,
  handleFilterClear,
  handleApplySavedFilter,
  handleClearAllFilters,
  appliedFilterId
} = useMediaTabFilters({
  props,
  mediaTabData,
  homeController,
  filterRules,
  baseHandleFilterChange,
  baseHandleFilterClear,
  fetchPageData
})

// FilterRule 显示状态和查询条件都以当前 tabId 的 MediaTabData 为准。

// 素材分组：按标签/文件夹/文件类型分组 + 章节导航
const {
  groupingMode,
  groupingOptions,
  handleGroupingChange,
  mediaGroups,
  groupChapters,
  handleGroupChapterSelect
} = useMediaTabGrouping({ tabId: props.tabId, paginatedMediaItems, rootEl: () => mediaTabListViewRef.value })

// 面包屑导航
const { breadcrumbItems, handleBreadcrumbClick } = useMediaTabBreadcrumb({ props })

// 子文件夹区：卡片数据、封面加载、新建文件夹对话框（展示见 MediaTabFoldersSection.vue）
const {
  showFolderDialog,
  availableFolders,
  folderEditAvailableFolders,
  currentFolder,
  handleFolderSave,
  childFolderItems,
  folderCardUiSize,
  folderGridItemSize,
  folderCoverUrls,
  handleChildFolderSelect,
  getFolderColor
} = useMediaTabFolders({ props, homeController, handleRefresh })

// 拖拽上传 / 导入
const {
  canUpload,
  isDragOver,
  showUploadDialog,
  droppedFiles,
  uploadInitialTree,
  uploadFolderId,
  uploadTagIds,
  importTarget,
  handleListUpload,
  handleImportFolder,
  handleDragOver,
  handleFolderCardDragOver,
  handleFolderCardDragLeave,
  handleDragLeave,
  handleDrop
} = useMediaTabUpload({ props })

// 批量操作：恢复/彻底删除/删除 + 确认弹窗
const {
  handleToolbarAction,
  handleDeleteKeyDown,
  deleteDialogOpen,
  rememberDeleteChoice,
  confirmDelete
} = useMediaTabBatchOps({
  selectedItems,
  mediaTabData,
  homeController,
  handleRefresh,
  rootEl: () => mediaTabListViewRef.value
})

// 分页：翻页（页码列表已收进浮动工具栏的 dots dropdown，paginationPages 不再消费）
const {
  handlePreviousPage,
  handleNextPage,
  handlePageChange
} = useMediaTabPagination({ currentPage, totalPages, fetchPageData })

// 区块（内置 folders / media + 外部注册区块）：排序与隐藏
const {
  registeredSectionById,
  enabledSections,
  disabledSections,
  sectionLayoutDialogOpen,
  updateSectionLayout
} = useMediaTabSections({ viewType: () => props.viewType })

// 紧密瀑布流：取消圆角、间距 0、黑色描边（存于全局设置）
const settingsStore = useSettingsStore()
// 底部状态栏面包屑导航开关（设置页可配置）
const showMediaBreadcrumb = computed(() => settingsStore.settings.showMediaBreadcrumb)
const compactWaterfall = computed(() => settingsStore.settings.compactWaterfall)
const handleCompactWaterfallChange = async (val: boolean) => {
  await settingsStore.updateSetting('compactWaterfall', val)
}

const filteredMediaItems = computed(() => {
  // 对于MediaTabListView，filteredMediaItems应该等于缓存的总数据
  const cachedData = mediaTabData.getCachedData()
  if (cachedData.lastUpdated > 0) {
    // 返回一个模拟的数组表示总数量
    return new Array(cachedData.total).fill(null)
  }
  // 回退到homeController的数据
  return homeController.filteredMediaItems?.value || []
})

const folderTreeItems = computed(() => homeController.folderTree.value || [])
const tagTreeItems = computed(() => tagStore.tags || [])

const handleMediaDelete = async (_item: FileInfo) => {
  await handleRefresh()
}

const handleMediaRestore = async (_item: FileInfo) => {
  await handleRefresh()
}

const handleMediaDoubleClick = (item: FileInfo) => {
  mediaStore.setImagePreviewItems(paginatedMediaItems.value)
  homeController.handleMediaDoubleClick(item)
  emit('itemDoubleClick', item)
}

const handleMediaContextMenu = (item: FileInfo, event: MouseEvent) => {
  homeController.handleMediaContextMenu(item, event)
}

const handleColumnsChange = (event: Event) => {
  homeController.handleColumnsChange(event)
}

const handleCtrlWheel = (event: WheelEvent) => {
  if (!event.ctrlKey) return
  if (viewMode.value !== 'grid' && viewMode.value !== 'waterfall') return
  event.preventDefault()
  const delta = event.deltaY > 0 ? 1 : -1
  const next = Math.min(8, Math.max(2, columnsPerRow.value + delta))
  if (next !== columnsPerRow.value) {
    const fake = { target: { value: String(next) } } as unknown as Event
    homeController.handleColumnsChange(fake)
  }
}

// 处理视图模式切换（使用 tab 独立的 viewMode）
const handleViewModeChange = async (mode: 'grid' | 'list' | 'waterfall') => {
  await mediaTabData.setViewMode(mode)
  await nextTick()

  if (scrollContainerRef.value) {
    scrollContainerRef.value.scrollTop = 0
  }

  if (mode === 'waterfall') {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    mediaSectionRef.value?.refreshWaterfalls()
  }
}


// 监听Tab ID变化，初始化MediaTabData
watch(() => props.tabId, async (newTabId, _oldTabId) => {
  if (newTabId && props.libraryId) {
    // 初始化 filterRules
    initializeFilterRules()

    // 从 mediaTabData 恢复筛选显示状态（组件随 tab 切换重建时 filterRules 是空实例，
    // 需同步回来，否则筛选徽标 / 清除图标不显示）
    const storedFilters = mediaTabData.filters.value || {}
    filterRules.value.forEach(rule => {
      const stored = storedFilters[rule.id]
      if (stored && typeof stored === 'object' && stored.id) {
        applySnapshotToRule(rule, JSON.parse(JSON.stringify(stored)))
      }
    })

    // 应用素材库默认过滤器（仅当该 tab 尚无用户筛选、且未从持久化恢复过滤器关联时）
    const current = mediaTabData.filters.value || {}
    const hasRuleFilters = Object.values(current).some((v: any) => v && typeof v === 'object' && v.id)
    const hasRestoredApplied = !!appliedFilterId.value
    if (!hasRestoredApplied && !hasRuleFilters) {
      const prefs = getLibraryPrefs()
      const defaultFilter = prefs.defaultFilterId
        ? getSavedFilters().find(f => f.id === prefs.defaultFilterId)
        : null
      if (defaultFilter) {
        await handleApplySavedFilter(defaultFilter.id, defaultFilter.rules)
      }
    }

    // 检查是否有缓存数据
    const cachedData = mediaTabData.getCachedData()
    if (cachedData.total > 0 && cachedData.data.length > 0) {
      mediaTabData.updatePagination({
        totalRecords: cachedData.total,
        isServerPagination: true
      })
    }
  }
}, { immediate: true })

// 生命周期
onMounted(async () => {
  if (props.libraryId && props.tabId) {
    mediaTabData.getCachedData()
  }

  // 监听 WebSocket 触发的活跃 tab 刷新事件
  miraEventBus.on('active-tab-refresh', handleActiveTabRefresh)
})

// 组件卸载时清理
onUnmounted(() => {
  // mediaTabData.cleanup()
  miraEventBus.off('active-tab-refresh', handleActiveTabRefresh)
})

// 监听器
watch(
  () => [props.tabId, props.libraryId, props.filters],
  ([_newTabId, _newLibraryId, newFilters], [_oldTabId, _oldLibraryId, oldFilters]) => {
    // 如果 filters 变化，重新初始化过滤器
    if (JSON.stringify(newFilters) !== JSON.stringify(oldFilters)) {
      // 重新构建初始过滤器
      const initialFilters: Record<string, any> = { ...((newFilters as Record<string, any>) || {}) }
      if (props.viewType === 'trash') {
        initialFilters.recycled = 1
      }
      // 合并现有用户过滤器
      const currentFilters = mediaTabData.filters.value
      const mergedFilters = { ...initialFilters }
      // 保留用户设置的 FilterRule 格式过滤器
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value.id) {
          mergedFilters[key] = value
        }
      })
      mediaTabData.setInitialFilters(mergedFilters)
    }
    handleRefresh()
  },
  { deep: true }
)

</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.material-icons,
.material-symbols-outlined {
  font-size: 18px;
}

.material-symbols-outlined.text-sm {
  font-size: 16px;
}

/* 自定义滚动条 */
:deep(.overflow-y-auto::-webkit-scrollbar) {
  width: 6px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-track) {
  background: var(--scrollbar-track-bg, #f1f1f1);
  border-radius: 3px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb) {
  background: var(--scrollbar-thumb-bg, #c1c1c1);
  border-radius: 3px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
  background: var(--scrollbar-thumb-hover-bg, #a8a8a8);
}

:global(.dark) {
  --scrollbar-track-bg: #374151;
  --scrollbar-thumb-bg: #4b5563;
  --scrollbar-thumb-hover-bg: #6b7280;
}

/* 悬停效果 */
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}

.group:hover .group-hover\:bg-black\/20 {
  background-color: rgba(0, 0, 0, 0.2);
}

/* 过渡动画 */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>
