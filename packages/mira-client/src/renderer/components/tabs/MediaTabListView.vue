<template>
  <div ref="mediaTabListViewRef"
    class="p-2 media-list-view flex-1 flex flex-col w-full bg-transparent overflow-hidden relative h-full text-[13px]"
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
    <div class="flex space-x-3 " style="align-items: baseline">
      <div class="flex-1 min-w-0">
        <FilterBar :filters="filterRules" :is-all-selected="isAllSelected" :folder-tree-items="folderTreeItems"
          :tag-tree-items="tagTreeItems" :sort="sortField" :order="sortOrder" @select-all="handleSelectAll"
          @filter-change="handleFilterChange" @filter-clear="handleFilterClear" @sort-change="handleSortChange"
          @apply-saved-filter="handleApplySavedFilter" />
      </div>
      <div class="flex-shrink-0 flex items-center space-x-2">
        <!-- 视图切换下拉菜单 -->
        <Dropdown :offset="{ x: 0, y: 4 }" placement="bottom-start" min-width="120px">
          <template #trigger>
            <button
              class="flex items-center space-x-1 rounded-lg border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur shadow-sm hover:bg-white/60 dark:hover:bg-muted transition-colors"
              :title="getViewModeTitle(viewMode)" style="padding: 6px;">
              <span class="material-icons text-sm text-muted-foreground dark:text-muted-foreground">{{
                getViewModeIcon(viewMode) }}</span>
              <span class="material-icons text-sm text-muted-foreground">keyboard_arrow_down</span>
            </button>
          </template>

          <template #content="{ close }">
            <div class="py-1">
              <button v-for="mode in viewModes" :key="mode.value" :class="[
                'w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/5 transition-colors',
                viewMode === mode.value ? 'bg-primary/10 text-primary' : 'text-foreground dark:text-muted-foreground'
              ]" @click="handleViewModeChange(mode.value as 'grid' | 'list' | 'waterfall'); close()">
                <span class="material-icons text-sm">{{ mode.icon }}</span>
                <span>{{ mode.label }}</span>
                <span v-if="viewMode === mode.value" class="material-icons text-sm ml-auto text-primary">
                  check
                </span>
              </button>
            </div>
          </template>
        </Dropdown>

        <!-- 刷新按钮 -->
        <button
          class="flex items-center space-x-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur shadow-sm transition-colors"
          @click="handleManualRefresh" :title="$t('tabs.mediaTabListView.refreshData')">
          <span class="material-icons text-base" :class="{ 'animate-spin': isLoading }">refresh</span>
        </button>

      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden relative">
      <div class="flex-1 flex flex-col min-w-0">
        <!-- 媒体内容 - files 和 trash 都使用统一的视图 -->
        <div class="flex-1 overflow-y-auto w-full min-w-0" @wheel="handleCtrlWheel">
          <!-- 顶部的子文件夹 -->
          <section v-if="props.viewType !== 'trash'">
            <header class="flex items-center justify-between px-5 pt-3 pb-1">
              <h3 class="text-sm font-medium text-foreground">{{ $t('views.sidebarModuleList.folders') }}</h3>
              <div class="flex items-center gap-2">
                <span class="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{{ childFolderItems.length }}</span>
                <button class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary" :title="$t('views.sidebarModuleList.addFolder')" @click="showFolderDialog = true"><span class="material-icons text-base leading-none">add</span></button>
              </div>
            </header>
          <div v-if="childFolderItems.length > 0">
            <div class="folder-card-grid" :style="{ '--folder-grid-item-size': `${folderGridItemSize}px` }">
              <FolderContextMenu v-for="item in childFolderItems" :key="String(item.raw.id)" :folder="item.raw as any" :folders="availableFolders as any" @refresh="handleRefresh(true)">
              <div class="folder-card-button" role="button"
                tabindex="0" :title="item.label" @click="handleChildFolderSelect(item.raw, $event)"
                @keydown.enter.prevent="handleChildFolderSelect(item.raw, $event)"
                @keydown.space.prevent="handleChildFolderSelect(item.raw, $event)">
                <Folder :size="folderCardUiSize" :label="item.label"
                  :badge="item.count ?? 0"
                  :thumbnail="folderCoverUrls[String(item.raw.id)]"
                  :custom-color="getFolderColor(item.raw.color)" />
              </div>
              </FolderContextMenu>
            </div>
          </div>

          </section>
          <div>
          <header class="flex items-center justify-between px-5 pt-3 pb-1">
            <h3 class="text-sm font-medium text-foreground">{{ $t('views.sidebarModuleList.media') }}</h3>
            <div class="flex items-center gap-2">
              <span class="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{{ filteredMediaItems.length }}</span>
              <ImportDropdown @upload="handleListUpload" />
            </div>
          </header>

          <!-- 网格视图 -->
          <MediaGridComponent v-if="viewMode === 'grid'" :key="`grid-${viewMode}`" class="p-5"
            :items="paginatedMediaItems" :selected-items="selectedItems" :card-size="cardSize"
            :columns-per-row="columnsPerRow" :is-trash="viewType === 'trash'" @media-click="handleMediaClick"
            @media-double-click="handleMediaDoubleClick" @media-select="handleMediaSelect"
            @media-context-menu="handleMediaContextMenu" @media-info="handleMediaInfo"
            @media-set-folder="handleMediaSetFolder" @media-set-tags="handleMediaSetTags"
            @media-delete="handleMediaDelete" @media-restore="handleMediaRestore" />

          <!-- 列表视图 -->
          <MediaListComponent v-if="viewMode === 'list'" :key="`list-${viewMode}`" class="p-5"
            :items="paginatedMediaItems" :selected-items="selectedItems" :is-trash="viewType === 'trash'"
            @click="handleMediaClick" @dblclick="handleMediaDoubleClick" @media-context-menu="handleMediaContextMenu"
            @media-info="handleMediaInfo" @media-set-folder="handleMediaSetFolder" @media-set-tags="handleMediaSetTags"
            @media-select="handleMediaSelect" @media-delete="handleMediaDelete" @media-restore="handleMediaRestore" />

          <!-- 瀑布流视图 -->
          <div v-if="viewMode === 'waterfall'" class="w-full h-full min-h-96">
            <WaterfallComponent ref="waterfallRef" :key="`waterfall-${viewMode}`" class="p-5"
              :items="paginatedMediaItems" :selected-items="selectedItems" :is-trash="viewType === 'trash'"
              :column-width="dynamicColumnWidth" :columns-per-row="columnsPerRow" :gap="16" @click="handleMediaClick"
              @dblclick="handleMediaDoubleClick" @media-context-menu="handleMediaContextMenu"
              @media-info="handleMediaInfo" @media-set-folder="handleMediaSetFolder"
              @media-set-tags="handleMediaSetTags" @media-select="handleMediaSelect" @media-delete="handleMediaDelete"
              @media-restore="handleMediaRestore" />
          </div>

          <!-- 如果没有匹配的视图模式 -->
          <div v-if="!['grid', 'list', 'waterfall'].includes(viewMode)"
            class="flex items-center justify-center h-40 text-muted-foreground dark:text-muted-foreground">
            {{ $t('tabs.mediaTabListView.unknownViewMode', { mode: viewMode }) }}
          </div>
          </div>
        </div>

        <!-- 浮动操作栏 -->
        <div class="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-30">
          <Transition name="toolbar-zoom" appear>
            <div v-if="showFloatingToolbar" ref="toolbarRef"
              class="pointer-events-auto flex items-center space-x-4 bg-white/60 dark:bg-muted/80 backdrop-blur-xl shadow-[0_12px_36px_rgba(99,102,241,0.15)] rounded-full p-1.5 border border-white/60 dark:border-border"
              style="transform-origin: center;">
              <!-- 操作按钮 - 仅在选中文件时显示 -->
              <div v-if="selectedItems.length > 0" class="flex items-center space-x-2">
                <!-- 反选 -->
                <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  :title="$t('tabs.mediaTabListView.invertSelection')" @click="handleInvertSelection">
                  <span
                    class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">swap_horiz</span>
                </button>
                <!-- 取消选择 -->
                <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  :title="$t('tabs.mediaTabListView.clearSelection')" @click="handleClearSelection">
                  <span
                    class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">deselect</span>
                </button>
                <div class="h-6 border-l border-border dark:border-border"></div>

                <!-- 回收站：恢复文件 / 彻底删除 -->
                <template v-if="isTrash">
                  <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    :title="$t('tabs.mediaTabListView.restoreFiles', { count: selectedItems.length })"
                    @click="handleToolbarAction('restore')">
                    <span
                      class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">restore</span>
                  </button>
                  <button class="p-2 rounded-full hover:bg-destructive/10 group transition-colors"
                    :title="$t('tabs.mediaTabListView.purgeFiles', { count: selectedItems.length })"
                    @click="handleToolbarAction('purge')">
                    <span
                      class="material-symbols-outlined text-muted-foreground dark:text-muted-foreground group-hover:text-destructive dark:group-hover:text-destructive">delete_forever</span>
                  </button>
                </template>

                <!-- 普通视图：复制 / 打开 / 删除 -->
                <template v-else>
                  <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    :title="$t('common.copy')" @click="handleToolbarAction('copy')">
                    <span class="material-icons text-muted-foreground dark:text-muted-foreground">content_copy</span>
                  </button>
                  <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    :title="$t('tabs.mediaTabListView.open')" @click="handleToolbarAction('open')">
                    <span class="material-icons text-muted-foreground dark:text-muted-foreground">open_in_new</span>
                  </button>
                  <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    :title="$t('tabs.mediaTabListView.deleteFiles', { count: selectedItems.length })"
                    @click="handleToolbarAction('delete')">
                    <span class="material-icons text-muted-foreground dark:text-muted-foreground">delete</span>
                  </button>
                </template>
                <div class="h-6 border-l border-border dark:border-border"></div>
              </div>

              <!-- 分页控件 - 只有多页时显示 -->
              <div v-if="totalPages > 1"
                class="flex items-center space-x-1 text-muted-foreground dark:text-muted-foreground text-xs">
                <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  :disabled="currentPage === 1" @click="handlePreviousPage">
                  <span class="material-symbols-outlined text-sm">chevron_left</span>
                </button>

                <template v-for="page in paginationPages" :key="page.number">
                  <!-- 省略号 -->
                  <span v-if="page.number === -1" class="px-1">...</span>
                  <!-- 页码按钮 -->
                  <button v-else :class="[
                    'px-2 py-1 rounded-full hover:bg-primary/10 min-w-[28px] transition-colors',
                    page.active ? 'bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary' : ''
                  ]" @click="handlePageChange(page.number)">
                    {{ page.number }}
                  </button>
                </template>

                <button class="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  :disabled="currentPage === totalPages" @click="handleNextPage">
                  <span class="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <footer
      class="flex items-center justify-between px-2 pt-2 shrink-0 text-xs border-t border-white/60 dark:border-border">
      <div class="flex-1 flex items-center space-x-6 min-w-0">
        <!-- 路由状态 / 面包屑导航 -->
        <Breadcrumb :items="breadcrumbItems" @select="handleBreadcrumbClick" />

        <!-- 当前路径和文件数 -->
        <div v-if="filteredMediaItems.length > 0" class="flex items-center space-x-1 flex-shrink-0 me-2">
          <span class="text-muted-foreground dark:text-muted-foreground">
            {{ $t('tabs.mediaTabListView.fileCount', { count: filteredMediaItems.length }) }}
          </span>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <!-- 已选择素材 - 仅在有选择时显示 -->
        <div v-if="selectedItems.length > 0" class="flex items-center space-x-1">
          <span class="text-primary font-medium">
            {{ $t('tabs.mediaTabListView.selectedCount', { count: selectedItems.length }) }}
          </span>
        </div>

        <!-- 分页信息 - 只有多页时显示 -->
        <div v-if="totalPages > 1" class="flex items-center space-x-1">
          <span class="text-muted-foreground dark:text-muted-foreground">
            {{ $t('tabs.mediaTabListView.pageInfo', { current: currentPage, total: totalPages }) }}
          </span>
        </div>

        <!-- 列数调整滑块 -->
        <div v-if="viewMode === 'grid' || viewMode === 'waterfall'" class="flex items-center space-x-2">
          <input class="w-24 h-1 bg-accent dark:bg-muted rounded-lg appearance-none cursor-pointer" type="range" min="2"
            max="8" :value="columnsPerRow" @input="handleColumnsChange"
            :title="$t('tabs.mediaTabListView.adjustColumns')" />
        </div>

        <!-- 展示字段开关：控制三个视图下媒体项展示哪些信息 -->
        <Dropdown :offset="{ x: 0, y: 8 }" placement="top-end">
          <template #trigger>
            <button
              class="flex items-center rounded-lg border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur shadow-sm hover:bg-white/60 dark:hover:bg-muted transition-colors cursor-pointer"
              :title="$t('tabs.mediaTabListView.fieldSettingsTitle')" style="padding: 6px;">
              <span class="material-icons text-sm text-muted-foreground dark:text-muted-foreground">visibility</span>
            </button>
          </template>

          <template #content>
            <div class="min-w-[160px] rounded-2xl bg-popover p-2">
              <h3 class="font-medium text-foreground text-sm mb-2 px-1">{{ $t('tabs.mediaTabListView.displayFields') }}
              </h3>
              <label v-for="col in itemFieldOptions" :key="col.key"
                class="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer">
                <Checkbox :model-value="isItemFieldVisible(col.key)"
                  @update:model-value="val => toggleItemField(col.key, val === true)" />
                <span class="text-sm text-foreground">{{ col.label }}</span>
              </label>
            </div>
          </template>
        </Dropdown>
      </div>
    </footer>

    <!-- 批量删除确认对话框 -->
    <AlertDialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <AlertDialogContent class="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('tabs.mediaTabListView.confirmDeleteTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('tabs.mediaTabListView.confirmDeleteDesc', { count: selectedItems.length }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
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
      :initial-folder-id="uploadFolderId" :initial-tag-ids="uploadTagIds" />
    <FolderEditDialog :visible="showFolderDialog" :available-folders="availableFolders" item-type="folder"
      @close="showFolderDialog = false" @save="handleFolderSave" />
  </div>
</template>

<style scoped>
.folder-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--folder-grid-item-size, 128px));
  gap: 1rem;
  align-items: start;
  justify-items: start;
  justify-content: start;
  padding: 1.25rem 1.25rem 0;
  box-shadow: none;
}

.folder-card-button {
  display: flex;
  width: auto;
  min-width: 0;
  padding: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.folder-card-button:focus,
.folder-card-button:focus-visible,
.folder-card-button:active {
  outline: none;
  box-shadow: none;
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaStore } from '@renderer/stores/media'
import { useLibraryStore } from '@renderer/stores/library'
import { useFolderStore } from '@renderer/stores/folder'
import { useSettingsStore } from '@renderer/stores/settings'
import { useUrlImportStore } from '@renderer/stores/urlImport'
import { useToast } from '@renderer/composables/useToast'
import { appService } from '@renderer/services'
import { useTagStore } from '@renderer/stores/tag'
import { useHomeController } from '@renderer/controllers/HomeController'
import type { BreadcrumbItem } from '@renderer/controllers/HomeController'
import { useMediaOperations, useFilters, useViewModeConfig } from '@renderer/composables'
// import { useTabPagination } from '@renderer/composables/useTabPagination' // 已替换为MediaTabData
import { useMediaTabData } from '@renderer/composables/useMediaTabData'
import { getLibraryPrefs, getSavedFilters } from '@renderer/composables/LibraryPrefs'
import MediaGridComponent from '@renderer/components/business/MediaGridComponent.vue'
import MediaListComponent from '@renderer/components/business/MediaListComponent.vue'
import WaterfallComponent from '@renderer/components/business/WaterfallComponent.vue'
import type { BrowserItem } from '@renderer/components/business/GroupedCardBrowserDialog.vue'
import Folder from '@/components/ui/folder/Folder.vue'
import FileUploadDialog from '@renderer/components/business/FileUploadDialog.vue'
import FolderEditDialog from '@renderer/components/business/FolderEditDialog.vue'
import FolderContextMenu from '@renderer/components/business/FolderContextMenu.vue'
import ImportDropdown from '@renderer/views/HomeView/ImportDropdown.vue'
import FilterBar from '@/renderer/components/business/FilterBar/FilterBar.vue'
import Breadcrumb from '@/renderer/components/common/Breadcrumb.vue'
import { Dropdown } from '@/renderer/components/common/Dropdown'
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
import type { FileInfo } from '../../../shared/types'
import type { FilterRule } from '@/renderer/types/filter'
import type { ItemField } from '@renderer/stores/settings'

const { t } = useI18n()

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
const folderStore = useFolderStore()
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
const sortField = ref<'imported_at' | 'id' | 'name' | 'size' | 'stars' | 'folder_id' | 'tags' | 'custom_fields'>('imported_at')
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
const showFolderDialog = ref(false)
const availableFolders = computed(() => folderStore.folders as any[])

function handleListUpload() {
  const folder = props.filters?.folder
  uploadFolderId.value = folder != null && folder !== '=null' ? String(folder) : undefined
  const tags = props.filters?.tags
  uploadTagIds.value = Array.isArray(tags) ? tags.map(String) : []
  droppedFiles.value = []
  showUploadDialog.value = true
}

async function handleFolderSave(data: { title: string; parentId?: number; color?: number; description?: string }) {
  const libraryId = props.libraryId || libraryStore.currentLibrary?.id
  if (!libraryId) return
  const result = await folderStore.createFolder(libraryId, data.title, data.parentId, data.color, data.description)
  if (result.success) {
    showFolderDialog.value = false
    await handleRefresh(true)
  }
}

const settingsStore = useSettingsStore()
const urlImportStore = useUrlImportStore()
const toast = useToast()

const handleDragOver = (_e: DragEvent) => {
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

  // 优先识别 http(s) 链接拖入（来自浏览器地址栏/链接的 text/uri-list 或 text/plain）
  if (!e.dataTransfer?.files?.length) {
    const uriList = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || ''
    const urls = uriList.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s))
    if (urls.length > 0) {
      const folder = props.filters?.folder
      const folderIdNum = folder != null && Number.isFinite(Number(folder)) ? Number(folder) : null
      urlImportStore.open({ urls, folderId: folderIdNum })
      return
    }
    return
  }

  const files = Array.from(e.dataTransfer.files)
  const folder = props.filters?.folder
  const folderId = folder != null && Number.isFinite(Number(folder)) ? String(folder) : undefined
  const tags = props.filters?.tags
  const tagIds = Array.isArray(tags) ? tags.map(String) : []

  if (settingsStore.settings.directImportMode) {
    const libraryId = libraryStore.currentLibrary?.id
    if (!libraryId) {
      toast.add({ severity: 'error', summary: t('tabs.mediaTabListView.errorSummary'), detail: t('tabs.mediaTabListView.noLibraryDetail'), life: 3000 })
      return
    }
    const metadata: Record<string, any> = {}
    if (folderId) metadata.folderId = folderId
    if (tagIds.length > 0) metadata.tags = tagIds
    for (const file of files) {
      mediaStore.uploadFile(file, libraryId, Object.keys(metadata).length > 0 ? metadata : undefined)
    }
    toast.add({ severity: 'success', summary: t('tabs.mediaTabListView.directImportSummary'), detail: t('tabs.mediaTabListView.uploadingFilesDetail', { count: files.length }), life: 2000 })
    return
  }

  droppedFiles.value = files
  uploadFolderId.value = folderId
  uploadTagIds.value = tagIds
  showUploadDialog.value = true
}

// 使用 tab 独立的 viewMode（从 MediaTabData 获取）
const viewMode = computed(() => mediaTabData.viewMode.value)
const isTrash = computed(() => props.viewType === 'trash')
const selectedItems = computed(() => [...new Set(homeController.selectedItems?.value || [])])

// 文件更新刷新链路中可能重复写入同一 ID，统一在状态入口去重
watch(() => homeController.selectedItems?.value, (ids) => {
  if (!ids) return
  const unique = [...new Set(ids)]
  if (unique.length !== ids.length) homeController.selectedItems.value = unique
}, { deep: true })
const cardSize = computed(() => homeController.cardSize?.value || 'medium')
const columnsPerRow = computed(() => homeController.columnsPerRow?.value || 6)
const dynamicColumnWidth = computed(() => homeController.dynamicColumnWidth?.value || 200)
const waterfallRef = ref<InstanceType<typeof WaterfallComponent> | null>(null)

// 使用MediaTabData的分页状态
const currentPage = computed(() => mediaTabData.currentPage.value)

const totalPages = computed(() => mediaTabData.totalPages.value)

// 浮动操作栏：FLIP 宽度过渡 + 显示/隐藏缩放
const toolbarRef = ref<HTMLElement | null>(null)
// 浮动栏可见条件：有选中项 或 存在分页
const showFloatingToolbar = computed(() => selectedItems.value.length > 0 || totalPages.value > 1)
// 记录宽度变化前的值，用于 FLIP 反转
let prevToolbarWidth = 0

watch(showFloatingToolbar, (visible) => {
  // 浮动栏即将显示：清除历史宽度，避免首次进入时出现错误的 scaleX
  if (visible) prevToolbarWidth = 0
})

// 监听内部内容变化（选中态 / 分页），在 DOM 更新前后用 FLIP 实现丝滑宽度过渡
watch([() => selectedItems.value.length, totalPages], () => {
  const el = toolbarRef.value
  // First：记录变化前的宽度
  if (el && el.offsetWidth > 0) {
    prevToolbarWidth = el.offsetWidth
  }
  // Last：DOM 更新后，对比新旧宽度做反转过渡
  nextTick(() => {
    const el = toolbarRef.value
    if (!el || !prevToolbarWidth || prevToolbarWidth === el.offsetWidth) return
    const ratio = prevToolbarWidth / el.offsetWidth
    // Invert：瞬间应用反转 scale（无过渡）
    el.style.transition = 'none'
    el.style.transform = `scaleX(${ratio})`
    // 强制浏览器刷新，使上面的"无过渡"状态生效
    void el.offsetWidth
    // Play：过渡回 1
    el.style.transition = 'transform 240ms cubic-bezier(0.4, 0, 0.2, 1)'
    el.style.transform = 'scaleX(1)'
    prevToolbarWidth = el.offsetWidth
  })
})

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

/**
 * 面包屑导航：显示当前 文件夹/标签 的层级路径。
 * - 文件夹：通过 parent_id 向上回溯，得到 全部文件 / 父文件夹 / 子文件夹
 * - 标签：标签为扁平结构，得到 全部文件 / 标签：xxx
 * - 回收站：单条 回收站
 * 最后一项标记为 active（当前位置，不可点击）。
 */
const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = []

  // 回收站：仅一条
  if (props.viewType === 'trash') {
    items.push({ id: 'trash', label: t('tabs.mediaTabListView.trashBreadcrumb'), icon: 'delete', active: true })
    return items
  }

  // 根节点：全部文件（点击会打开 all 文件夹 Tab）
  items.push({ id: 'all', label: t('tabs.mediaTabListView.allFilesBreadcrumb'), icon: 'folder' })

  // 文件夹：沿 parent_id 向上回溯父级链
  const folderRaw = props.filters?.folder
  if (folderRaw !== undefined && folderRaw !== null && folderRaw !== '=null') {
    const folderId = Number(folderRaw)
    if (Number.isFinite(folderId)) {
      const chain: BreadcrumbItem[] = []
      const seen = new Set<number>() // 防止循环引用
      let current = folderStore.getFolderById(folderId)
      while (current && !seen.has(current.id)) {
        seen.add(current.id)
        chain.unshift({
          id: `folder-${current.id}`,
          label: current.title || String(current.id),
          icon: 'folder'
        })
        const parentId = current.parent_id
        if (parentId == null || parentId === 0) break
        current = folderStore.getFolderById(parentId)
      }
      items.push(...chain)
    }
  }

  // 标签：扁平结构，selectedValues 可能有多个
  const tagsValue = props.filters?.tags
  if (tagsValue && typeof tagsValue === 'object' && 'selectedValues' in tagsValue) {
    const selectedValues = (tagsValue as any).selectedValues as (string | number)[] | undefined
    if (Array.isArray(selectedValues)) {
      selectedValues.forEach(tagId => {
        const numericId = Number(tagId)
        const tag = Number.isFinite(numericId)
          ? tagStore.tags.find(t => t.id === numericId)
          : undefined
        const label = tag?.title || t('tabs.mediaTabListView.tagBreadcrumb', { name: tagId })
        items.push({
          id: `tag-${tagId}`,
          label,
          icon: 'label'
        })
      })
    }
  }

  // 最后一项为当前位置
  if (items.length > 0) {
    items[items.length - 1].active = true
  }
  return items
})

/**
 * 面包屑点击：原地替换当前 Tab 的内容（不新开/切换 Tab）。
 */
const handleBreadcrumbClick = (item: BreadcrumbItem) => {
  let kind: 'folder' | 'tag' | 'all'
  let payload: { id?: string; title?: string } = {}
  if (item.id === 'all') {
    kind = 'all'
  } else if (item.id.startsWith('folder-')) {
    kind = 'folder'
    payload.id = item.id.slice('folder-'.length)
    payload.title = item.label
  } else if (item.id.startsWith('tag-')) {
    kind = 'tag'
    payload.id = item.id.slice('tag-'.length)
    payload.title = item.label
  } else {
    return
  }
  window.dispatchEvent(new CustomEvent('home-tab-replace', { detail: { kind, payload } }))
}

// 选中项变化时同步 FileInfo 到全局 store
watch([selectedItems, () => paginatedMediaItems.value], ([ids, items]) => {
  if (!ids || ids.length === 0) {
    mediaStore.clearDetailSidebar()
    emit('selectionChange', [])
    return
  }
  // 刷新分页数据时可能短暂为空；保留当前选中项和右侧详情，避免面板闪退为 empty
  if (!items || items.length === 0) return
  const matched = items.filter((item: FileInfo) => ids.includes(item.id))
  if (matched.length === 0) return
  mediaStore.setDetailSidebarFiles(matched)
  emit('selectionChange', matched)
}, { deep: true })

const folderTreeItems = computed(() => homeController.folderTree.value || [])
const tagTreeItems = computed(() => tagStore.tags || [])

const childFolderItems = computed<BrowserItem[]>(() => {
  if (props.viewType === 'trash') return []
  const rawFolder = props.filters?.folder
  const currentId = rawFolder === undefined || rawFolder === null || rawFolder === '=null'
    ? null
    : Number(rawFolder)
  if (rawFolder !== undefined && rawFolder !== null && rawFolder !== '=null' && !Number.isFinite(currentId)) return []

  return (folderStore.folders || [])
    .filter((folder: any) => {
      const parentId = folder.parent_id == null || folder.parent_id === 0 ? null : Number(folder.parent_id)
      return parentId === currentId
    })
    .map((folder: any) => ({
      raw: folder,
      label: folder.title || folder.name || `Folder ${folder.id}`,
      count: folder.fileCount ?? folder.file_count ?? 0,
      icon: folder.icon || 'folder',
      color: folder.color,
      description: folder.description,
    }))
})

// 与媒体网格列数/卡片模式保持一致，避免文件夹卡片固定尺寸导致布局脱节。
const folderCardSize = computed(() => {
  const modeScale = cardSize.value === 'small' ? 0.82 : cardSize.value === 'large' ? 1.12 : 1
  return Math.round(Math.max(140, Math.min(260, dynamicColumnWidth.value * modeScale)))
})

const folderCardUiSize = computed<'sm' | 'md' | 'lg'>(() => {
  if (folderCardSize.value <= 160) return 'sm'
  if (folderCardSize.value <= 215) return 'md'
  return 'lg'
})

const folderGridItemSize = computed(() => ({ sm: 96, md: 128, lg: 160 }[folderCardUiSize.value]))

const folderCoverUrls = ref<Record<string, string>>({})
let folderCoverLoadToken = 0
const loadFolderCovers = async () => {
  const libraryId = props.libraryId || libraryStore.currentLibrary?.id
  if (!libraryId || childFolderItems.value.length === 0) {
    folderCoverUrls.value = {}
    return
  }
  const token = ++folderCoverLoadToken
  const entries = await Promise.all(childFolderItems.value.map(async item => {
    try {
      const result = await mediaStore.fetchFiles({
        libraryId,
        filters: { folder: Number(item.raw.id), limit: 1, recycled: 0 },
      })
      const file = result.success && Array.isArray(result.data) ? result.data[0] : undefined
      return [String(item.raw.id), file?.thumbnailPath || file?.url || ''] as const
    } catch {
      return [String(item.raw.id), ''] as const
    }
  }))
  if (token === folderCoverLoadToken) folderCoverUrls.value = Object.fromEntries(entries)
}

watch([childFolderItems, () => props.libraryId || libraryStore.currentLibrary?.id], loadFolderCovers, { immediate: true })

function handleChildFolderSelect(folder: any, event?: MouseEvent | KeyboardEvent) {
  const title = folder.title || folder.name
  if (event && (event.ctrlKey || event.metaKey)) {
    window.dispatchEvent(new CustomEvent('home-route-folder', {
      detail: {
        folderId: folder.id,
        libraryId: props.libraryId || libraryStore.currentLibrary?.id,
        title,
      },
    }))
    return
  }

  window.dispatchEvent(new CustomEvent('home-tab-replace', {
    detail: {
      kind: 'folder',
      payload: { id: String(folder.id), title },
    },
  }))
}

function getFolderColor(color: unknown): string | undefined {
  if (typeof color !== 'number' || !Number.isFinite(color)) return undefined
  return `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}`
}

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

const handleRefresh = async (preserveSelection = false) => {
  if (!preserveSelection) homeController.selectedItems.value = []
  await fetchPageData(1)
  emit('refresh')
}

const handleManualRefresh = () => handleRefresh()

// WebSocket 活跃 tab 刷新回调
const handleActiveTabRefresh = (e: Event) => {
  const { tabId } = (e as CustomEvent).detail
  if (tabId === props.tabId) {
    const eventType = (e as CustomEvent).detail?.eventType
    // 文件属性更新可能影响当前排序（例如按名称、星标或更新时间排序）。
    // 重新按当前排序查询，避免局部更新把文件留在列表首位；保留用户选中状态。
    if (eventType === 'updated') {
      void handleRefresh(true)
      return
    }
    void handleRefresh()
  }
}

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

const handleMediaSelect = (item: FileInfo, selected: boolean) => {
  homeController.handleMediaSelect(item, selected)
  emit('itemSelect', item, selected)
}

const handleMediaContextMenu = (item: FileInfo, event: MouseEvent) => {
  homeController.handleMediaContextMenu(item, event)
}

const handleSelectAll = () => {
  // 使用本地的 paginatedMediaItems 而不是 homeController 的
  const items = paginatedMediaItems.value

  if (isAllSelected.value) {
    // 取消全选
    homeController.selectedItems.value = []
  } else {
    // 全选当前页
    homeController.selectedItems.value = items.map(item => item.id)
  }
}

// 把单个 FilterRule 的当前值写入查询用的 mergedFilters（供 handleFilterChange / 应用已保存过滤器共用）
const mergeFilterInto = (mergedFilters: Record<string, any>, filter: FilterRule) => {
  switch (filter.id) {
    case 'folders':
      if (filter.selectedValues && filter.selectedValues.length > 0) {
        mergedFilters.folders = {
          id: 'folders',
          selectedValues: filter.selectedValues,
          label: t('tabs.mediaTabListView.filterFolders')
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
          label: t('tabs.mediaTabListView.filterTagsLabel')
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
          label: t('tabs.mediaTabListView.filterUrls')
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
          label: t('tabs.mediaTabListView.filterTitle')
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
        label: t('tabs.mediaTabListView.filterSize')
      }
      break
    case 'category':
      if (filter.selectedCategory && filter.selectedCategory !== '') {
        mergedFilters.category = {
          id: 'category',
          selectedCategory: filter.selectedCategory,
          label: t('tabs.mediaTabListView.filterCategory')
        }
      } else {
        delete mergedFilters.category
      }
      break
    case 'metadata': {
      const hasMetaRange = filter.metaDimMin !== undefined || filter.metaDimMax !== undefined
        || filter.metaDurMin !== undefined || filter.metaDurMax !== undefined
      if (hasMetaRange) {
        mergedFilters.metadata = {
          id: 'metadata',
          metaDimMin: filter.metaDimMin,
          metaDimMax: filter.metaDimMax,
          metaDurMin: filter.metaDurMin,
          metaDurMax: filter.metaDurMax,
          label: t('business.filterBar.metadataTitle')
        }
      } else {
        delete mergedFilters.metadata
      }
      break
    }
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
  mergeFilterInto(mergedFilters, filter)

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
    } else if (filter.id === 'metadata') {
      delete mergedFilters.metadata
    }
  }

  // 确保 props.filters 中的简单键值对格式筛选器被保留
  Object.entries(props.filters).forEach(([_key, value]) => {
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

// 应用已保存的过滤器（整套替换当前筛选条件并重新查询）
const handleApplySavedFilter = async (rules: FilterRule[]) => {
  const savedById = new Map(rules.map(rule => [rule.id, rule]))

  // 先重置 FilterBar 显示状态，再同步保存值，避免残留旧条件
  filterRules.value.forEach(rule => {
    const saved = savedById.get(rule.id)
    const snapshot: any = saved ? JSON.parse(JSON.stringify(saved)) : null
    rule.selectedValues = snapshot?.selectedValues || []
    rule.value = snapshot?.value || ''
    rule.selectedPreset = snapshot?.selectedPreset || ''
    rule.customMin = snapshot?.customMin
    rule.customMax = snapshot?.customMax
    rule.sizeMin = snapshot?.sizeMin
    rule.sizeMax = snapshot?.sizeMax
    rule.selectedCategory = snapshot?.selectedCategory || ''
    rule.metaField = snapshot?.metaField || 'dimension'
    rule.selectedMetaPreset = snapshot?.selectedMetaPreset || ''
    rule.metaDimMin = snapshot?.metaDimMin
    rule.metaDimMax = snapshot?.metaDimMax
    rule.metaDurMin = snapshot?.metaDurMin
    rule.metaDurMax = snapshot?.metaDurMax
    rule.customDimMin = snapshot?.customDimMin
    rule.customDimMax = snapshot?.customDimMax
    rule.customDurMin = snapshot?.customDurMin
    rule.customDurMax = snapshot?.customDurMax
    rule.active = snapshot?.active || false
  })

  // 空基础重建查询条件，保留 props.filters 中 tab 固有的简单键值筛选（如 folder / recycled）
  const mergedFilters: Record<string, any> = {}
  Object.entries(props.filters).forEach(([key, value]) => {
    if (value === null || typeof value !== 'object') {
      mergedFilters[key] = value
    }
  })
  filterRules.value.forEach(rule => mergeFilterInto(mergedFilters, rule))

  mediaTabData.updateFilters(mergedFilters)
  await fetchPageData(1)

  // 同步 homeController 的筛选状态
  filterRules.value.forEach(rule => {
    baseHandleFilterChange(rule, () => undefined, null, homeController)
  })
}

const handleSortChange = async (field: string, order: string) => {
  sortField.value = field as 'imported_at' | 'id' | 'name' | 'size' | 'stars' | 'folder_id' | 'tags' | 'custom_fields'
  sortOrder.value = order as 'asc' | 'desc'
  await fetchPageData(1)
}

// 将选中文件按 libraryId 分组，缺少 libraryId 的进入 ungrouped
const groupSelectedByLibrary = () => {
  const cachedFiles = mediaTabData.getCachedData().data
  const groups = new Map<string, string[]>()
  const ungrouped: string[] = []
  for (const id of selectedItems.value) {
    const file = cachedFiles.find((f: FileInfo) => f.id === id)
    const libraryId = file?.libraryId || libraryStore.currentLibrary?.id
    if (!libraryId) { ungrouped.push(id); continue }
    const list = groups.get(libraryId) ?? []
    list.push(id)
    groups.set(libraryId, list)
  }
  return { groups, ungrouped }
}

// 分组执行批量操作（每组只发一次请求），完成后弹 toast，返回失败数
const runGroupedBatchOperation = async (
  label: string,
  operation: (libraryId: string, fileIds: string[]) => Promise<{ failedIds?: unknown[] }>
) => {
  const total = selectedItems.value.length
  const { groups, ungrouped } = groupSelectedByLibrary()
  let failed = ungrouped.length
  let completed = 0
  for (const [libraryId, fileIds] of groups) {
    try {
      const result = await operation(libraryId, fileIds)
      const groupFailed = result?.failedIds?.length ?? 0
      failed += groupFailed
      completed += fileIds.length - groupFailed
    } catch {
      failed += fileIds.length
    }
  }
  toast.add({
    severity: failed === 0 ? 'success' : (completed > 0 ? 'warn' : 'error'),
    summary: label,
    detail: failed === 0
      ? t('composables.useBatchOperation.completedAll', { label, completed, total })
      : t('composables.useBatchOperation.completedWithFailures', { label, completed, failed }),
    life: failed > 0 ? 5000 : 3000
  })
  return failed
}

const handleToolbarAction = async (action: string) => {
  // 回收站：恢复 / 彻底删除
  if (action === 'restore') {
    if (selectedItems.value.length === 0) return
    await runGroupedBatchOperation(
      t('tabs.mediaTabListView.restoreBatchLabel'),
      (libraryId, fileIds) => appService.batchRestoreFiles(libraryId, fileIds)
    )

    homeController.selectedItems.value = []
    await handleRefresh()
    return
  }

  if (action === 'purge') {
    if (selectedItems.value.length === 0) return
    await runGroupedBatchOperation(
      t('tabs.mediaTabListView.purgeBatchLabel'),
      (libraryId, fileIds) => appService.batchDeleteFiles(libraryId, fileIds, false)
    )

    homeController.selectedItems.value = []
    await handleRefresh()
    return
  }

  if (action === 'delete') {
    // 批量删除前需用户确认
    if (selectedItems.value.length === 0) return
    deleteDialogOpen.value = true
    return
  }
  homeController.handleToolbarAction(action)
}

const mediaTabListViewRef = ref<HTMLElement | null>(null)

const handleDeleteKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Delete' || selectedItems.value.length === 0) return

  const activeElement = document.activeElement
  const selectionBox = activeElement instanceof HTMLElement
    ? activeElement.closest('.selection-container')
    : null
  if (!selectionBox || !mediaTabListViewRef.value?.contains(selectionBox)) return

  event.preventDefault()
  event.stopImmediatePropagation()
  void handleToolbarAction('delete')
}

// 批量删除确认弹窗
const deleteDialogOpen = ref(false)

const confirmDelete = async () => {
  deleteDialogOpen.value = false
  if (selectedItems.value.length === 0) return
  const failed = await runGroupedBatchOperation(
    t('tabs.mediaTabListView.deleteBatchLabel'),
    (libraryId, fileIds) => appService.batchDeleteFiles(libraryId, fileIds)
  )
  if (failed > 0) console.error(`删除失败: ${failed} 个文件`)
  homeController.selectedItems.value = []
  await handleRefresh()
}

// 反选当前页
const handleInvertSelection = () => {
  const items = paginatedMediaItems.value
  const selected = new Set(selectedItems.value)
  const inverted = items
    .map(item => item.id)
    .filter(id => !selected.has(id))
  homeController.selectedItems.value = inverted
}

// 取消选择（全部清空）
const handleClearSelection = () => {
  homeController.selectedItems.value = []
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

// ============================================
// 展示字段开关（控制三个视图下媒体项展示哪些信息）
// ============================================
const itemFieldOptions = computed<{ key: ItemField; label: string }[]>(() => [
  { key: 'filename', label: t('tabs.mediaTabListView.fieldFilename') },
  { key: 'format', label: t('tabs.mediaTabListView.fieldFormat') },
  { key: 'size', label: t('tabs.mediaTabListView.fieldSize') },
  { key: 'folder', label: t('tabs.mediaTabListView.fieldFolder') },
  { key: 'tags', label: t('tabs.mediaTabListView.fieldTags') },
  { key: 'videoPlayIcon', label: t('tabs.mediaTabListView.fieldVideoPlayIcon') }
])

const isItemFieldVisible = (field: ItemField) => {
  return settingsStore.settings.visibleItemFields.includes(field)
}

const toggleItemField = async (field: ItemField, checked: boolean) => {
  const current = settingsStore.settings.visibleItemFields
  const next = checked
    ? [...current, field]
    : current.filter(f => f !== field)
  await settingsStore.updateSetting('visibleItemFields', next)
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

  if (mode === 'waterfall') {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    waterfallRef.value?.refresh()
  }
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
        tagsFilter.active = (tagsFilter.selectedValues || []).length > 0
      } else if (Array.isArray(tagsValue)) {
        // 如果是数组格式
        tagsFilter.selectedValues = tagsValue
        tagsFilter.active = tagsValue.length > 0
      }
    }
  }
}

// 监听Tab ID变化，初始化MediaTabData
watch(() => props.tabId, async (newTabId, _oldTabId) => {
  if (newTabId && props.libraryId) {
    // 初始化 filterRules
    initializeFilterRules()

    // 应用素材库默认过滤器（仅当该 tab 尚无用户筛选条件时）
    const current = mediaTabData.filters.value || {}
    const hasRuleFilters = Object.values(current).some((v: any) => v && typeof v === 'object' && v.id)
    if (!hasRuleFilters) {
      const prefs = getLibraryPrefs()
      const defaultFilter = prefs.defaultFilterId
        ? getSavedFilters().find(f => f.id === prefs.defaultFilterId)
        : null
      if (defaultFilter) {
        await handleApplySavedFilter(defaultFilter.rules)
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
  ([_newTabId, _newLibraryId, newFilters], [_oldTabId, _oldLibraryId, oldFilters]) => {
    // 如果 filters 变化，重新初始化过滤器
    if (JSON.stringify(newFilters) !== JSON.stringify(oldFilters)) {
      // 重新构建初始过滤器
      let initialFilters: Record<string, any> = { ...((newFilters as Record<string, any>) || {}) }
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

/* 浮动操作栏：放大/缩小进入退出 */
.toolbar-zoom-enter-active {
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease;
}

.toolbar-zoom-leave-active {
  transition: transform 150ms ease-in, opacity 150ms ease;
}

.toolbar-zoom-enter-from,
.toolbar-zoom-leave-to {
  transform: scale(0.6);
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
