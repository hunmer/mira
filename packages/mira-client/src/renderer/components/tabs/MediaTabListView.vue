<template>
  <div
    class="media-list-view flex-1 flex flex-col w-full bg-gray-100 dark:bg-gray-900 overflow-hidden relative"
    @dragover.prevent="canUpload && handleDragOver($event)"
    @dragleave.prevent="canUpload && handleDragLeave($event)"
    @drop.prevent="canUpload && handleDrop($event)"
  >
    <!-- 拖拽上传覆盖层 -->
    <Transition name="fade">
      <div
        v-if="isDragOver && canUpload"
        class="absolute inset-0 z-50 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center pointer-events-none"
      >
        <div class="text-center">
          <span class="material-icons text-5xl text-blue-500 mb-2">cloud_upload</span>
          <p class="text-blue-600 font-medium text-lg">释放文件以上传</p>
        </div>
      </div>
    </Transition>

    <!-- 顶部筛选栏和工具按钮 -->
    <div class="flex space-x-3 " style="align-items: baseline">
      <div class="flex-1 min-w-0">
        <FilterBar
          :filters="filterRules"
          :is-all-selected="isAllSelected"
          :folder-tree-items="folderTreeItems"
          :tag-tree-items="tagTreeItems"
          :sort="sortField"
          :order="sortOrder"
          @select-all="handleSelectAll"
          @filter-change="handleFilterChange"
          @filter-clear="handleFilterClear"
          @sort-change="handleSortChange"
        />
      </div>
      <div class="flex-shrink-0 flex items-center space-x-2">
        <!-- 视图切换下拉菜单 -->
        <Dropdown
          :offset="{ x: 0, y: 4 }"
          placement="bottom-start"
          min-width="120px"
        >
          <template #trigger>
            <button
              class="flex items-center space-x-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :title="getViewModeTitle(viewMode)"
              style="padding: 6px;"
            >
              <span class="material-icons text-sm text-gray-600 dark:text-gray-400">{{ getViewModeIcon(viewMode) }}</span>
              <span class="material-icons text-sm text-gray-400">keyboard_arrow_down</span>
            </button>
          </template>

          <template #content="{ close }">
            <div class="py-1">
              <button
                v-for="mode in viewModes"
                :key="mode.value"
                :class="[
                  'w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                  viewMode === mode.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                ]"
                @click="handleViewModeChange(mode.value as 'grid' | 'list' | 'waterfall'); close()"
              >
                <span class="material-icons text-sm">{{ mode.icon }}</span>
                <span>{{ mode.label }}</span>
                <span
                  v-if="viewMode === mode.value"
                  class="material-icons text-sm ml-auto text-blue-600"
                >
                  check
                </span>
              </button>
            </div>
          </template>
        </Dropdown>

        <!-- 刷新按钮 -->
        <button
          class="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-700 transition-colors"
          @click="handleRefresh"
          title="刷新数据"
        >
          <span class="material-icons text-base" :class="{ 'animate-spin': isLoading }">refresh</span>
        </button>

        <!-- 切换详情面板按钮 -->
        <button
          @click="toggleDetailSidebar"
          :class="[
            'flex items-center space-x-1 px-3 py-1.5 text-sm rounded-md border transition-colors',
            showDetailSidebar
              ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
              : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
          ]"
          :title="showDetailSidebar ? '隐藏详情面板' : '显示详情面板'"
        >
          <span class="material-icons text-base">
            {{ showDetailSidebar ? 'visibility_off' : 'info' }}
          </span>
        </button>
        
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden relative">
      <div class="flex-1 flex flex-col min-w-0">
        <!-- 媒体内容 - files 和 trash 都使用统一的视图 -->
        <div class="flex-1 overflow-y-auto w-full min-w-0" @wheel="handleCtrlWheel">
          <!-- 网格视图 -->
          <MediaGridComponent
            v-if="viewMode === 'grid'"
            :key="`grid-${viewMode}`"
            :items="paginatedMediaItems"
            :selected-items="selectedItems"
            :card-size="cardSize"
            :columns-per-row="columnsPerRow"
            @media-click="handleMediaClick"
            @media-double-click="handleMediaDoubleClick"
            @media-select="handleMediaSelect"
            @media-context-menu="handleMediaContextMenu"
            @media-info="handleMediaInfo"
            @media-set-folder="handleMediaSetFolder"
            @media-set-tags="handleMediaSetTags"
            @media-delete="handleMediaDelete"
          />

          <!-- 列表视图 -->
          <MediaListComponent
            v-if="viewMode === 'list'"
            :key="`list-${viewMode}`"
            :items="paginatedMediaItems"
            :selected-items="selectedItems"
            @click="handleMediaClick"
            @dblclick="handleMediaDoubleClick"
            @contextmenu="handleMediaContextMenu"
            @preview="handleMediaInfo"
            @download="() => {}"
            @media-select="handleMediaSelect"
            @media-delete="handleMediaDelete"
          />

          <!-- 瀑布流视图 -->
          <div v-if="viewMode === 'waterfall'" class="w-full h-full min-h-96">
            <WaterfallComponent
              :key="`waterfall-${viewMode}`"
              :items="paginatedMediaItems"
              :selected-items="selectedItems"
              :column-width="dynamicColumnWidth"
              :columns-per-row="columnsPerRow"
              :gap="16"
              @click="handleMediaClick"
              @dblclick="handleMediaDoubleClick"
              @contextmenu="handleMediaContextMenu"
              @media-select="handleMediaSelect"
              @media-delete="handleMediaDelete"
              @after-render="() => {}"
            />
          </div>

          <!-- 如果没有匹配的视图模式 -->
          <div v-if="!['grid', 'list', 'waterfall'].includes(viewMode)" class="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
            未知的视图模式: {{ viewMode }}
          </div>
        </div>

        <!-- 浮动操作栏 -->
        <div
          class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-white dark:bg-gray-800 shadow-lg dark:shadow-black/30 rounded-full p-1 border border-gray-200 dark:border-gray-700"
        >
          <!-- 操作按钮 - 仅在选中文件时显示 -->
          <div
            v-if="selectedItems.length > 0"
            class="flex items-center space-x-2"
          >
            <button
              class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="handleToolbarAction('copy')"
            >
              <span class="material-icons text-gray-600 dark:text-gray-400">content_copy</span>
            </button>
            <button
              class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="handleToolbarAction('open')"
            >
              <span class="material-icons text-gray-600 dark:text-gray-400">open_in_new</span>
            </button>
            <button
              class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="handleToolbarAction('delete')"
            >
              <span class="material-icons text-gray-600 dark:text-gray-400">delete</span>
            </button>
            <div class="h-6 border-l border-gray-200 dark:border-gray-700"></div>
          </div>

          <!-- 分页控件 - 始终显示 -->
          <div class="flex items-center space-x-1 text-gray-600 dark:text-gray-400 text-xs">
            <button
              class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              :disabled="currentPage === 1"
              @click="handlePreviousPage"
            >
              <span class="material-symbols-outlined text-sm">chevron_left</span>
            </button>

            <template v-for="page in paginationPages" :key="page.number">
              <!-- 省略号 -->
              <span v-if="page.number === -1" class="px-1">...</span>
              <!-- 页码按钮 -->
              <button
                v-else
                :class="[
                  'px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[28px]',
                  page.active ? 'bg-blue-100 text-blue-600 font-semibold' : ''
                ]"
                @click="handlePageChange(page.number)"
              >
                {{ page.number }}
              </button>
            </template>

            <button
              class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              :disabled="currentPage === totalPages"
              @click="handleNextPage"
            >
              <span class="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧信息面板 -->
      <div
        v-if="showDetailSidebar"
        class="w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col ml-2"
      >
        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav aria-label="Tabs" class="flex -mb-px">
            <a
              class="w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm text-blue-600 border-blue-500"
              href="#"
            >
              信息
            </a>
            <a
              class="w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              href="#"
            >
              分享
            </a>
          </nav>
        </div>

        <!-- 详情内容 -->
        <div class="p-4 space-y-4 flex-grow overflow-y-auto">
          <!-- 有选中文件时显示文件详情 -->
          <MediaDetailComponent
            :item="sidebarMediaItems.length === 1 ? sidebarMediaItems[0] : undefined"
            :items="sidebarMediaItems.length > 1 ? sidebarMediaItems : undefined"
            :library-id="libraryId || 'default'"
            @tag-add="handleTagAdd"
            @tag-remove="handleTagRemove"
            @folder-change="handleFolderChange"
          />
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <footer class="flex justify-center p-2 bg-gray-100 dark:bg-gray-900">
      <!-- 状态信息 -->
      <div class="w-[100%] flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
        <div class="flex-1 flex items-center space-x-6">
          <!-- 路由状态 -->
          <div class="flex items-center space-x-1">
            <span class="material-icons text-sm" :style="{ color: currentTabContent.iconColor }">
              {{ currentTabContent.icon }}
            </span>
            <span class="text-xs text-gray-700 dark:text-gray-300 font-medium">
              {{ currentTabContent.label }}
            </span>
          </div>

          <!-- 当前路径和文件数 -->
          <div class="flex items-center space-x-1">
            <span class="material-icons text-sm text-gray-500 dark:text-gray-400">folder_open</span>
            <span class="text-xs text-gray-600 dark:text-gray-400">
              {{ filteredMediaItems.length }} 个文件
            </span>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <!-- 已选择素材 - 仅在有选择时显示 -->
          <div v-if="selectedItems.length > 0" class="flex items-center space-x-1">
            <span class="material-icons text-sm text-blue-600">check_circle</span>
            <span class="text-xs text-blue-700 font-medium">
              已选择 {{ selectedItems.length }} 个素材
            </span>
          </div>

          <!-- 分页信息 -->
          <div class="flex items-center space-x-1">
            <span class="text-xs text-gray-600 dark:text-gray-400">
              第 {{ currentPage }} / {{ totalPages }} 页
            </span>
          </div>

          <!-- 列数调整滑块 -->
          <div v-if="viewMode === 'grid' || viewMode === 'waterfall'" class="flex items-center space-x-2">
            <input
              class="w-24 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              type="range"
              min="2"
              max="8"
              :value="columnsPerRow"
              @input="handleColumnsChange"
              title="调整列数"
            />
          </div>
        </div>
      </div>
    </footer>

    <!-- 文件上传对话框 -->
    <FileUploadDialog
      v-model:visible="showUploadDialog"
      :initial-files="droppedFiles"
      :initial-folder-id="uploadFolderId"
      :initial-tag-ids="uploadTagIds"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, toRef } from 'vue'
import { useMediaStore } from '@renderer/stores/media'
import { useLibraryStore } from '@renderer/stores/library'
import { useSettingsStore } from '@renderer/stores/settings'
import { useToast } from '@renderer/composables/useToast'
import { appService } from '@renderer/services'
import { useTagStore } from '@renderer/stores/tag'
import { useHomeController } from '@renderer/controllers/HomeController'
import { useMediaOperations, useFilters, useViewModeConfig } from '@renderer/composables'
// import { useTabPagination } from '@renderer/composables/useTabPagination' // 已替换为MediaTabData
import { useMediaTabData } from '@renderer/composables/useMediaTabData'
import MediaGridComponent from '@renderer/components/business/MediaGridComponent.vue'
import MediaListComponent from '@renderer/components/business/MediaListComponent.vue'
import WaterfallComponent from '@renderer/components/business/WaterfallComponent.vue'
import MediaDetailComponent from '@renderer/components/business/MediaDetailComponent.vue'
import FileUploadDialog from '@renderer/components/business/FileUploadDialog.vue'
import FilterBar from '@/components/ui/volt/FilterBar.vue'
import Dropdown from '@/components/ui/volt/Dropdown.vue'
import type { FileInfo } from '../../../shared/types'
import type { FilterRule } from '@/components/ui/volt/FilterBar.vue'

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
  emptyMessage: '暂无文件'
})

// Emits
const emit = defineEmits<{
  itemSelect: [item: any]
  itemDoubleClick: [item: any]
  selectionChange: [items: any[]]
  filterChange: [filters: Record<string, any>]
  refresh: []
}>()

// 获取共享状态和控制器
const tagStore = useTagStore()
const mediaStore = useMediaStore()
const libraryStore = useLibraryStore()
const homeController = useHomeController()

// 使用独立的Tab分页状态管理 (已由MediaTabData替代)
// const tabPagination = useTabPagination(props.tabId)

// 使用专门的MediaTab数据管理
const mediaTabData = useMediaTabData(props.tabId)

// 初始化筛选器
let initialFilters = { ...props.filters }

// 根据 viewType 设置默认状态筛选器
if (props.viewType === 'trash') {
  initialFilters.recycled = 1
}
// files 类型不需要额外的筛选器，folder 和 tag 通过 props.filters 传入

if (Object.keys(initialFilters).length > 0) {
  mediaTabData.setInitialFilters(initialFilters)
}

// 使用 composables
const mediaOperations = useMediaOperations()
const {
  handleMediaClick,
  handleMediaInfo,
  handleMediaSetFolder,
  handleMediaSetTags,
} = mediaOperations

// 详情面板使用全局 store 状态
const showDetailSidebar = toRef(mediaStore, 'showDetailSidebar')
const toggleDetailSidebar = () => mediaStore.toggleDetailSidebar()

const filtersComposable = useFilters()
const {
  filterRules,
  handleFilterChange: baseHandleFilterChange,
  handleFilterClear: baseHandleFilterClear
} = filtersComposable

const viewModeConfig = useViewModeConfig()
const {
  viewModes,
  getViewModeIcon,
  getViewModeTitle
} = viewModeConfig

// 响应式状态
const isLoading = ref(false)
const sortField = ref<string>('imported_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 拖拽上传
const canUpload = computed(() =>
  props.viewType !== 'trash'
  && props.tabId !== 'folder-uncategorized'
  && props.tabId !== 'folder-untagged'
)
const isDragOver = ref(false)
const showUploadDialog = ref(false)
const droppedFiles = ref<File[]>([])
const uploadFolderId = ref<string>()
const uploadTagIds = ref<string[]>([])

const settingsStore = useSettingsStore()
const toast = useToast()

const handleDragOver = (e: DragEvent) => {
  if ((window as any).__miraInternalDrag) return
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
    isDragOver.value = false
  }
}

const handleDrop = async (e: DragEvent) => {
  isDragOver.value = false
  if ((window as any).__miraInternalDrag) return
  if (!e.dataTransfer?.files?.length) return

  const files = Array.from(e.dataTransfer.files)
  const folder = props.filters?.folder
  const folderId = folder != null && Number.isFinite(Number(folder)) ? String(folder) : undefined
  const tags = props.filters?.tags
  const tagIds = Array.isArray(tags) ? tags.map(String) : []

  if (settingsStore.settings.directImportMode) {
    const libraryId = libraryStore.currentLibrary?.id
    if (!libraryId) {
      toast.add({ severity: 'error', summary: '错误', detail: '未选择素材库', life: 3000 })
      return
    }
    const metadata: Record<string, any> = {}
    if (folderId) metadata.folderId = folderId
    if (tagIds.length > 0) metadata.tags = tagIds
    for (const file of files) {
      mediaStore.uploadFile(file, libraryId, Object.keys(metadata).length > 0 ? metadata : undefined)
    }
    toast.add({ severity: 'success', summary: '直接导入', detail: `正在上传 ${files.length} 个文件`, life: 2000 })
    return
  }

  droppedFiles.value = files
  uploadFolderId.value = folderId
  uploadTagIds.value = tagIds
  showUploadDialog.value = true
}

// 使用 tab 独立的 viewMode（从 MediaTabData 获取）
const viewMode = computed(() => mediaTabData.viewMode.value)
const selectedItems = computed(() => homeController.selectedItems?.value || [])
const cardSize = computed(() => homeController.cardSize?.value || 'medium')
const columnsPerRow = computed(() => homeController.columnsPerRow?.value || 6)
const dynamicColumnWidth = computed(() => homeController.dynamicColumnWidth?.value || 200)
// 使用MediaTabData的分页状态
const currentPage = computed(() => mediaTabData.currentPage.value)

const totalPages = computed(() => mediaTabData.totalPages.value)

const paginationPages = computed(() => {
  // 简单的分页页码计算
  const pages: Array<{ number: number; active: boolean }> = []
  const totalPagesValue = totalPages.value
  const currentPageValue = currentPage.value

  if (totalPagesValue <= 0) return pages

  // 如果总页数小于等于10，显示所有页码
  if (totalPagesValue <= 10) {
    for (let i = 1; i <= totalPagesValue; i++) {
      pages.push({
        number: i,
        active: i === currentPageValue
      })
    }
  } else {
    // 复杂分页逻辑
    let startPage = Math.max(1, currentPageValue - 4)
    let endPage = Math.min(totalPagesValue, startPage + 9)

    if (endPage - startPage < 9) {
      startPage = Math.max(1, endPage - 9)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push({
        number: i,
        active: i === currentPageValue
      })
    }
  }

  return pages
})
// 使用本地的 paginatedMediaItems 计算全选状态
const isAllSelected = computed(() => {
  const items = paginatedMediaItems.value
  const selected = selectedItems.value
  return items.length > 0 &&
         selected.length === items.length &&
         items.every(item => selected.includes(item.id))
})

// 从 MediaTabData 获取数据（优先使用缓存数据）
const paginatedMediaItems = computed(() => {
  const cachedData = mediaTabData.getCachedData()
  if (cachedData.data.length > 0) return cachedData.data
  return homeController.paginatedMediaItems?.value || []
})

const filteredMediaItems = computed(() => {
  // 对于MediaTabListView，filteredMediaItems应该等于缓存的总数据
  const cachedData = mediaTabData.getCachedData()
  if (cachedData.total > 0) {
    // 返回一个模拟的数组表示总数量
    return new Array(cachedData.total).fill(null)
  }
  // 回退到homeController的数据
  return homeController.filteredMediaItems?.value || []
})

// Tab内容信息 - 需要从外部注入或通过props传递
const currentTabContent = computed(() => {
  // viewType 只有 'files' 和 'trash'，直接使用
  // icon 和 iconColor 应该从 props 或其他地方传入，这里提供默认值
  const getIconInfo = () => {
    // 如果有 folder 筛选器，显示文件夹图标
    if (props.filters?.folder) {
      return { icon: 'folder', iconColor: '#6B7280' }
    }
    // 如果有 tags 筛选器，显示标签图标
    if (props.filters?.tags) {
      return { icon: 'label', iconColor: '#10B981' }
    }
    // 默认显示文件图标
    return { icon: 'folder_open', iconColor: '#3B82F6' }
  }

  const iconInfo = getIconInfo()

  return {
    type: props.viewType, // 'files' 或 'trash'
    icon: iconInfo.icon,
    iconColor: iconInfo.iconColor,
    label: props.label || (props.viewType === 'files' ? '全部文件' : '回收站')
  }
})

// 侧边栏文件直接从全局 store 读取
const sidebarMediaItems = computed(() => mediaStore.detailSidebarFiles)

// 选中项变化时同步 FileInfo 到全局 store
watch([selectedItems, () => paginatedMediaItems.value], ([ids, items]) => {
  if (!ids || ids.length === 0) {
    mediaStore.clearDetailSidebar()
    return
  }
  const matched = items.filter((item: FileInfo) => ids.includes(item.id))
  if (matched.length > 0) {
    mediaStore.setDetailSidebarFiles(matched)
  }
}, { deep: true })

const folderTreeItems = computed(() => homeController.folderTree.value || [])
const tagTreeItems = computed(() => tagStore.tags || [])

// 方法
// 获取指定页面的数据
const fetchPageData = async (page: number) => {
  // 检查并获取 libraryId
  let libraryId = props.libraryId
  if (!libraryId) {
    // 尝试从当前素材库获取 libraryId
    try {
      if (libraryStore.currentLibrary?.id) {
        libraryId = libraryStore.currentLibrary.id
      } else {
        console.warn('缺少 libraryId，无法获取分页数据')
        return
      }
    } catch (error) {
      console.error('❌ 获取当前素材库失败:', error)
      return
    }
  }

  isLoading.value = true

  try {
    // 更新分页状态
    mediaTabData.setCurrentPage(page)

    // 计算offset
    const itemsPerPage = mediaTabData.itemsPerPage.value
    const offset = (page - 1) * itemsPerPage

    // 清理 null/undefined 值
    const rawFilters = mediaTabData.filters.value
    const currentFilters: Record<string, any> = {}
    Object.entries(rawFilters).forEach(([key, value]) => {
      if (value !== undefined && !(typeof value === 'number' && Number.isNaN(value))) {
        currentFilters[key] = value
      }
    })

    const tabInfo = {
      id: props.tabId,
      type: props.viewType || 'all',
      libraryId: libraryId, // 将 libraryId 放在顶层，确保 fetchFilesForTab 能正确获取
      data: {},
      filters: currentFilters, // 将筛选器放在正确的位置
      sort: sortField.value as 'imported_at' | 'id' | 'size' | 'stars' | 'folder_id' | 'tags' | 'name' | 'custom_fields',
      order: sortOrder.value
    }

    // 调用mediaStore的fetchFilesForTab获取数据
    const result = await mediaStore.fetchFilesForTab(tabInfo, {
      limit: itemsPerPage,
      offset: offset
    })

    if (result.success && result.data) {
      // 缓存数据到MediaTabData
      mediaTabData.cacheData(result.data, result.total || 0)

      // 更新分页信息
      if (result.total !== undefined) {
        mediaTabData.updatePagination({
          totalRecords: result.total,
          isServerPagination: true
        })
      }
    } else {
      console.error('❌ 分页数据加载失败:', (result as any).error || '未知错误')
    }
  } catch (error) {
    console.error('❌ 分页数据获取异常:', error)
  } finally {
    isLoading.value = false
  }
}

const handleRefresh = async () => {
  homeController.selectedItems.value = []
  await fetchPageData(1)
  emit('refresh')
}

// WebSocket 活跃 tab 刷新回调
const handleActiveTabRefresh = (e: Event) => {
  const { tabId } = (e as CustomEvent).detail
  if (tabId === props.tabId) {
    handleRefresh()
  }
}

const handleMediaDelete = async (_item: FileInfo) => {
  await handleRefresh()
}

const handleMediaDoubleClick = (item: FileInfo) => {
  mediaStore.setImagePreviewItems(paginatedMediaItems.value)
  homeController.handleMediaDoubleClick(item)
  emit('itemDoubleClick', item)
}

const handleMediaSelect = (item: FileInfo, selected: boolean) => {
  homeController.handleMediaSelect(item, selected)
  emit('itemSelect', item)
}

const handleMediaContextMenu = (item: FileInfo, event: MouseEvent) => {
  homeController.handleMediaContextMenu(item, event)
}

const handleSelectAll = () => {
  // 使用本地的 paginatedMediaItems 而不是 homeController 的
  const items = paginatedMediaItems.value
  const currentSelected = selectedItems.value

  if (isAllSelected.value) {
    // 取消全选
    homeController.selectedItems.value = []
  } else {
    // 全选当前页
    homeController.selectedItems.value = items.map(item => item.id)
  }
}

const handleFilterChange = async (filter: FilterRule) => {
  // 获取当前的筛选器状态作为基础
  const mergedFilters: Record<string, any> = { ...mediaTabData.filters.value }

  // 保留 props.filters 中的简单键值对格式筛选器（如 folder, recycled 等）
  // 这些筛选器不是 FilterRule 格式，需要单独保留
  Object.entries(props.filters).forEach(([key, value]) => {
    // 跳过 FilterRule 格式的筛选器，只保留简单键值对
    if (value === null || typeof value !== 'object') {
      mergedFilters[key] = value
    }
  })

  // 更新变化的筛选器
  switch (filter.id) {
    case 'folders':
      if (filter.selectedValues && filter.selectedValues.length > 0) {
        mergedFilters.folders = {
          id: 'folders',
          selectedValues: filter.selectedValues,
          label: '文件夹筛选'
        }
      } else {
        delete mergedFilters.folders
      }
      break
    case 'tags':
      if (filter.selectedValues && filter.selectedValues.length > 0) {
        mergedFilters.tags = {
          id: 'tags',
          selectedValues: filter.selectedValues,
          label: '标签筛选'
        }
      } else {
        delete mergedFilters.tags
      }
      break
    case 'urls':
      // urls 筛选器：检查是否有有效值（非空字符串）
      if (filter.value !== undefined && filter.value !== null && filter.value.trim() !== '') {
        mergedFilters.urls = {
          id: 'urls',
          value: filter.value.trim(),
          label: '网址筛选'
        }
      } else {
        delete mergedFilters.urls
      }
      break
    case 'title':
      if (filter.value !== undefined && filter.value !== null && filter.value.trim() !== '') {
        mergedFilters.title = {
          id: 'title',
          value: filter.value.trim(),
          label: '标题筛选'
        }
      } else {
        delete mergedFilters.title
      }
      break
    case 'size':
      mergedFilters.size = {
        id: 'size',
        selectedPreset: filter.selectedPreset,
        sizeMin: filter.sizeMin,
        sizeMax: filter.sizeMax,
        customMin: filter.customMin,
        customMax: filter.customMax,
        label: '大小筛选'
      }
      break
    case 'category':
      if (filter.selectedCategory && filter.selectedCategory !== '') {
        mergedFilters.category = {
          id: 'category',
          selectedCategory: filter.selectedCategory,
          label: '类别筛选'
        }
      } else {
        delete mergedFilters.category
      }
      break
  }

  // 更新MediaTabData中的筛选器
  mediaTabData.updateFilters(mergedFilters)

  // 筛选器变化时重新加载第一页数据
  await fetchPageData(1)

  // 同时调用原有逻辑以保持兼容性
  baseHandleFilterChange(filter, () => undefined, null, homeController)
}

const handleFilterClear = async (filter: FilterRule) => {
  // 获取当前的筛选器状态作为基础
  const mergedFilters: Record<string, any> = { ...mediaTabData.filters.value }

  // 检查是否是初始筛选器（来自 props.filters 的简单键值对格式）
  const isInitialFilter = (filterId: string) => {
    if (filterId === 'folders' && props.filters?.folder !== undefined) {
      return true
    }
    if (filterId === 'tags' && props.filters?.tags !== undefined) {
      return true
    }
    return false
  }

  // 如果是初始筛选器，恢复为初始值而不是完全清除
  if (isInitialFilter(filter.id)) {
    // 重新初始化 filterRules 显示
    initializeFilterRules()
  } else {
    // 清除非初始筛选器
    if (filter.id === 'folders') {
      delete mergedFilters.folders
    } else if (filter.id === 'tags') {
      delete mergedFilters.tags
    } else if (filter.id === 'category') {
      delete mergedFilters.category
    } else if (filter.id === 'urls') {
      delete mergedFilters.urls
    } else if (filter.id === 'size') {
      delete mergedFilters.size
    }
  }

  // 确保 props.filters 中的简单键值对格式筛选器被保留
  Object.entries(props.filters).forEach(([key, value]) => {
    // 跳过 FilterRule 格式的筛选器，只保留简单键值对
    if (value === null || typeof value !== 'object') {
      // 保留简单格式的初始筛选器
    }
  })

  // 更新MediaTabData中的筛选器
  mediaTabData.updateFilters(mergedFilters)

  // 筛选器清除时重新加载第一页数据
  await fetchPageData(1)

  // 同时调用原有逻辑以保持兼容性
  baseHandleFilterClear(filter, () => undefined, null, homeController)
}

const handleSortChange = async (field: string, order: string) => {
  sortField.value = field
  sortOrder.value = order as 'asc' | 'desc'
  await fetchPageData(1)
}

const handleToolbarAction = async (action: string) => {
  if (action === 'delete') {
    const ids = selectedItems.value
    if (ids.length === 0) return
    const cachedFiles = mediaTabData.getCachedData().data
    let failed = 0
    for (const id of ids) {
      const file = cachedFiles.find((f: FileInfo) => f.id === id)
      const libraryId = file?.libraryId || libraryStore.currentLibrary?.id
      if (!libraryId) { failed++; continue }
      try {
        await appService.deleteFile(libraryId, id)
      } catch {
        failed++
      }
    }
    if (failed > 0) console.error(`删除失败: ${failed} 个文件`)
    homeController.selectedItems.value = []
    await handleRefresh()
    return
  }
  homeController.handleToolbarAction(action)
}

const handlePreviousPage = async () => {
  if (currentPage.value > 1) {
    await fetchPageData(currentPage.value - 1)
    scrollToSelectionTop()
  }
}

const handleNextPage = async () => {
  if (currentPage.value < totalPages.value) {
    await fetchPageData(currentPage.value + 1)
    scrollToSelectionTop()
  }
}

const handlePageChange = async (page: number) => {
  if (page !== currentPage.value && page >= 1 && page <= totalPages.value) {
    await fetchPageData(page)
    scrollToSelectionTop()
  }
}

// 滚动 .selection-container 到顶部
const scrollToSelectionTop = () => {
  nextTick(() => {
    const container = document.querySelector('.selection-container') as HTMLElement
    if (container) {
      container.scrollTop = 0
    }

    // 多次滚动以等待懒加载图片渲染完成
    setTimeout(() => {
      const container = document.querySelector('.selection-container') as HTMLElement
      if (container) {
        container.scrollTop = 0
      }
    }, 100)

    setTimeout(() => {
      const container = document.querySelector('.selection-container') as HTMLElement
      if (container) {
        container.scrollTop = 0
      }
    }, 300)
  })
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

const handleTagAdd = (tagName: string) => {
  homeController.handleTagAdd(tagName)
}

const handleTagRemove = (tagName: string) => {
  homeController.handleTagRemove(tagName)
}

const handleFolderChange = (folderId: string) => {
  homeController.handleFolderChange(folderId)
}

// 处理视图模式切换（使用 tab 独立的 viewMode）
const handleViewModeChange = async (mode: 'grid' | 'list' | 'waterfall') => {
  await mediaTabData.setViewMode(mode)
  await nextTick()
}


// 初始化 filterRules，同步 props.filters 中的初始筛选器
const initializeFilterRules = () => {
  // 如果 props.filters 中有 folder，同步到 folders filterRule
  if (props.filters?.folder !== undefined) {
    const foldersFilter = filterRules.value.find(f => f.id === 'folders')
    if (foldersFilter) {
      // folder 可能是数字或 null
      const folderValue = props.filters.folder
      if (folderValue !== null) {
        foldersFilter.selectedValues = [folderValue]
        foldersFilter.active = true
      }
    }
  }

  // 如果 props.filters 中有 tags，同步到 tags filterRule
  if (props.filters?.tags !== undefined) {
    const tagsFilter = filterRules.value.find(f => f.id === 'tags')
    if (tagsFilter) {
      const tagsValue = props.filters.tags
      if (tagsValue && typeof tagsValue === 'object' && 'selectedValues' in tagsValue) {
        // 如果是 FilterRule 格式
        tagsFilter.selectedValues = tagsValue.selectedValues || []
        tagsFilter.active = tagsFilter.selectedValues.length > 0
      } else if (Array.isArray(tagsValue)) {
        // 如果是数组格式
        tagsFilter.selectedValues = tagsValue
        tagsFilter.active = tagsValue.length > 0
      }
    }
  }
}

// 监听Tab ID变化，初始化MediaTabData
watch(() => props.tabId, async (newTabId, oldTabId) => {
  if (newTabId && props.libraryId) {
    // 初始化 filterRules
    initializeFilterRules()

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
  window.addEventListener('active-tab-refresh', handleActiveTabRefresh)
})

// 组件卸载时清理
onUnmounted(() => {
  // mediaTabData.cleanup()
  window.removeEventListener('active-tab-refresh', handleActiveTabRefresh)
})

// 监听器
watch(
  () => [props.tabId, props.libraryId, props.filters],
  ([newTabId, newLibraryId, newFilters], [oldTabId, oldLibraryId, oldFilters]) => {
    // 如果 filters 变化，重新初始化过滤器
    if (JSON.stringify(newFilters) !== JSON.stringify(oldFilters)) {
      // 重新构建初始过滤器
      let initialFilters = { ...newFilters }
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
.media-list-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-size: 13px;
}

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
