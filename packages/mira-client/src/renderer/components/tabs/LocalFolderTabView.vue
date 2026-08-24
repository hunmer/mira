<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { RefreshCw, LoaderCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { SelectionBox } from '@hunmer/vue-selection-box'
import FileUploadDialog from '@renderer/components/business/FileUploadDialog.vue'
import LocalPathPickerDialog from '@renderer/components/business/LocalPathPickerDialog.vue'
import { useTabs } from '@renderer/composables/useTabs'
import type { LocalFileEntry } from '@/shared/types'
import {
  getFolderName,
  getParentPath,
  normalizePath,
  pathFromInput,
  supportsNativeThumbnail,
  toFileSystemEntry,
  type FileEntry,
  type FileSystemEntry,
  type FileSystemIndex,
  type LocalFolderEntryActions,
  type ViewMode,
} from './LocalFolderTabView/localFolderUtils'
import { useLocalEntryFilters } from './LocalFolderTabView/useLocalEntryFilters'
import { LOAD_MORE_THRESHOLD, useLocalPagination } from './LocalFolderTabView/useLocalPagination'
import { useLocalThumbnails } from './LocalFolderTabView/useLocalThumbnails'
import { useLocalGallery } from './LocalFolderTabView/useLocalGallery'
import { useLocalFileActions } from './LocalFolderTabView/useLocalFileActions'
import LocalFolderHeader from './LocalFolderTabView/LocalFolderHeader.vue'
import LocalFolderToolbar from './LocalFolderTabView/LocalFolderToolbar.vue'
import LocalFolderListGridView from './LocalFolderTabView/LocalFolderListGridView.vue'
import LocalFolderColumnsView from './LocalFolderTabView/LocalFolderColumnsView.vue'
import LocalFolderGalleryView from './LocalFolderTabView/LocalFolderGalleryView.vue'
import LocalFolderSelectionBar from './LocalFolderTabView/LocalFolderSelectionBar.vue'

const props = defineProps<{
  tabId: string
  rootPath: string
  libraryId?: string
  tabData?: Record<string, unknown>
}>()

const { t } = useI18n()
const { tabs } = useTabs()

const savedTabData = props.tabData || {}
const savedViewMode = savedTabData.viewMode
const currentPath = ref(props.rootPath)
const entries = ref<LocalFileEntry[]>([])
const selectedPaths = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const editingPath = ref(false)
const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null)
const contentScrollRef = ref<HTMLElement | null>(null)
const galleryViewRef = ref<InstanceType<typeof LocalFolderGalleryView> | null>(null)
const columnLevels = ref<Array<{ path: string, entries: LocalFileEntry[] }>>([])
const loadingColumnPath = ref('')
const viewMode = ref<ViewMode>(savedViewMode === 'list' || savedViewMode === 'grid' || savedViewMode === 'columns' || savedViewMode === 'gallery' ? savedViewMode : 'list')
const gridItemSize = ref(typeof savedTabData.gridItemSize === 'number' && Number.isFinite(savedTabData.gridItemSize)
  ? Math.min(240, Math.max(96, Math.round(savedTabData.gridItemSize / 8) * 8))
  : 112)

const { searchQuery, typeFilter, dateFilter, sortKey, sortDirection, filterAndSortEntries } = useLocalEntryFilters(savedTabData)
const { PAGE_SIZE, paginateEntries, loadNextPage, handleVerticalScroll, clearPageLimit, clearPageLimits } = useLocalPagination()
const { thumbnailUrls, loadNativeThumbnail, resetThumbnails } = useLocalThumbnails()
const { galleryEntry, galleryPreviewUrl } = useLocalGallery()

const api = computed(() => window.electronAPI?.fs)
const gridIconSize = computed(() => Math.min(96, Math.max(40, Math.round(gridItemSize.value * 0.45))))

async function loadDirectory(targetPath = currentPath.value) {
  if (!api.value?.listDirectory) {
    error.value = t('views.localFolder.electronOnly')
    return false
  }
  loading.value = true
  error.value = ''
  const result = await api.value.listDirectory(targetPath)
  let loaded = false
  if (result.success) {
    currentPath.value = targetPath
    syncTabTitle(targetPath)
    entries.value = result.data || []
    resetPagination()
    resetThumbnails()
    selectedPaths.value = []
    columnLevels.value = []
    galleryEntry.value = null
    loaded = true
  } else {
    error.value = result.message || t('views.localFolder.loadFailed')
  }
  loading.value = false
  return loaded
}

const {
  pickerOpen,
  uploadDialogOpen,
  uploadInitialTree,
  importFiles,
  openImportTo,
  showPicker,
  handlePickerConfirm,
  removeEntries,
  locate,
  dragPathsFor,
  handleDragStart,
  handleDragEnd,
  handleFolderDrop,
} = useLocalFileActions({
  libraryId: () => props.libraryId,
  currentPath: () => currentPath.value,
  selectedPaths: () => selectedPaths.value,
  setSelectedPaths: (paths) => { selectedPaths.value = paths },
  loadDirectory,
})

const entryMap = computed(() => {
  const map = new Map<string, LocalFileEntry>()
  for (const entry of entries.value) map.set(entry.path, entry)
  for (const level of columnLevels.value) {
    for (const entry of level.entries) map.set(entry.path, entry)
  }
  return map
})
const selectedEntries = computed(() => {
  return selectedPaths.value
    .map((path) => entryMap.value.get(path))
    .filter((entry): entry is LocalFileEntry => !!entry)
})
const selectedFiles = computed(() => selectedEntries.value.filter((entry) => !entry.isDirectory))
const selectedDetailEntry = computed(() => selectedEntries.value.length === 1 ? selectedEntries.value[0] : null)
const isAtRoot = computed(() => normalizePath(currentPath.value) === normalizePath(props.rootPath))

const fileSystemInfoIndex = computed<FileSystemIndex>(() => {
  const children = new Map<string, FileSystemEntry[]>()
  const files = new Map<string, FileEntry>()
  const folders = new Map<string, Extract<FileSystemEntry, { kind: 'folder' }>>()
  const levels = [{ path: currentPath.value, entries: entries.value }, ...columnLevels.value]
  for (const level of levels) {
    const levelEntries = level.entries.map(toFileSystemEntry)
    children.set(level.path, levelEntries)
    for (const entry of levelEntries) {
      if (entry.kind === 'file') files.set(entry.path, entry)
      else folders.set(entry.path, entry)
    }
  }
  return { children, files, folders }
})

const selectedFileInfoEntry = computed<FileEntry | null>(() => {
  const entry = selectedDetailEntry.value
  if (!entry || entry.isDirectory) return null
  return toFileSystemEntry(entry) as FileEntry
})

const galleryInfoEntry = computed<FileSystemEntry | null>(() => (
  galleryEntry.value ? toFileSystemEntry(galleryEntry.value) : null
))

const visibleEntries = computed(() => filterAndSortEntries(entries.value))
const visibleColumnLevels = computed(() => columnLevels.value.map((level) => ({
  ...level,
  entries: filterAndSortEntries(level.entries),
})))
const paginatedVisibleEntries = computed(() => paginateEntries(currentPath.value, visibleEntries.value))
const columnViewLevels = computed(() => [
  { path: currentPath.value, entries: visibleEntries.value },
  ...visibleColumnLevels.value,
])
const paginatedColumnViewLevels = computed(() => columnViewLevels.value.map((level) => ({
  ...level,
  entries: paginateEntries(level.path, level.entries),
})))
const levelTotals = computed(() => columnViewLevels.value.map((level) => level.entries.length))
const allVisibleEntries = computed(() => [
  ...visibleEntries.value,
  ...visibleColumnLevels.value.flatMap((level) => level.entries),
])

const breadcrumbs = computed(() => {
  const pathValue = currentPath.value
  const windowsMatch = pathValue.match(/^([A-Za-z]:)[\\/]?(.*)$/)
  if (windowsMatch) {
    const root = `${windowsMatch[1]}\\`
    const parts = windowsMatch[2].split(/[\\/]/).filter(Boolean)
    return [{ label: windowsMatch[1], path: root }, ...parts.map((part, index) => ({
      label: part,
      path: `${root}${parts.slice(0, index + 1).join('\\')}`,
    }))]
  }
  const parts = pathValue.split('/').filter(Boolean)
  return [{ label: '/', path: '/' }, ...parts.map((part, index) => ({
    label: part,
    path: `/${parts.slice(0, index + 1).join('/')}`,
  }))]
})

function syncTabTitle(targetPath: string) {
  const tab = tabs.value.find((item) => item.id === props.tabId)
  if (tab) tab.label = getFolderName(targetPath)
}

function persistTabViewState() {
  const tab = tabs.value.find((item) => item.id === props.tabId)
  if (!tab) return
  tab.data = {
    ...(tab.data || {}),
    searchQuery: searchQuery.value,
    typeFilter: typeFilter.value,
    dateFilter: dateFilter.value,
    sortKey: sortKey.value,
    sortDirection: sortDirection.value,
    viewMode: viewMode.value,
    gridItemSize: gridItemSize.value,
  }
}

function handleGridWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  const delta = event.deltaY > 0 ? -8 : 8
  gridItemSize.value = Math.min(240, Math.max(96, gridItemSize.value + delta))
}

function resetPagination() {
  clearPageLimits()
  void nextTick(() => {
    contentScrollRef.value?.scrollTo({ top: 0, left: 0 })
    galleryViewRef.value?.galleryScrollRef?.scrollTo({ left: 0 })
  })
}

async function submitPathEdit(rawPath: string) {
  const targetPath = pathFromInput(rawPath)
  if (!targetPath) return
  if (await loadDirectory(targetPath)) editingPath.value = false
}

function handleItemClick(entry: LocalFileEntry, event: MouseEvent) {
  if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
    selectionBoxRef.value?.clearSelection()
  }
  selectionBoxRef.value?.handleItemClick(entry.path, event)
}

async function handleColumnItemClick(entry: LocalFileEntry, levelIndex: number, event: MouseEvent) {
  handleItemClick(entry, event)
  if (!entry.isDirectory) {
    columnLevels.value = columnLevels.value.slice(0, levelIndex)
    return
  }

  loadingColumnPath.value = entry.path
  const result = await api.value?.listDirectory(entry.path)
  loadingColumnPath.value = ''
  if (!result?.success) {
    toast.error(result?.message || t('views.localFolder.loadFailed'))
    return
  }
  clearPageLimit(entry.path)
  columnLevels.value = [
    ...columnLevels.value.slice(0, levelIndex),
    { path: entry.path, entries: result.data || [] },
  ]
}

function handleGalleryItemClick(entry: LocalFileEntry, event: MouseEvent) {
  galleryEntry.value = entry
  handleItemClick(entry, event)
}

function handleContextMenu(entry: LocalFileEntry) {
  if (!selectedPaths.value.includes(entry.path)) selectedPaths.value = [entry.path]
}

async function openEntry(entry: LocalFileEntry) {
  if (entry.isDirectory) {
    await loadDirectory(entry.path)
    return
  }
  const result = await api.value?.openPath(entry.path)
  if (result && !result.success) toast.error(result.message || t('views.localFolder.openFailed'))
}

function goUp() {
  if (!isAtRoot.value) loadDirectory(getParentPath(currentPath.value))
}

function handleContentScroll(event: Event) {
  if (viewMode.value === 'list' || viewMode.value === 'grid') {
    handleVerticalScroll(event, currentPath.value, visibleEntries.value.length)
  }
}

function handleGalleryScroll(event: Event) {
  const element = event.currentTarget as HTMLElement
  const remaining = element.scrollWidth - element.scrollLeft - element.clientWidth
  if (remaining <= LOAD_MORE_THRESHOLD) loadNextPage(currentPath.value, visibleEntries.value.length)
}

const actions: LocalFolderEntryActions = {
  onItemClick: handleItemClick,
  onColumnItemClick: handleColumnItemClick,
  onGalleryItemClick: handleGalleryItemClick,
  onContextMenu: handleContextMenu,
  onGridWheel: handleGridWheel,
  onDragStart: handleDragStart,
  onDragEnd: handleDragEnd,
  onFolderDrop: handleFolderDrop,
  onColumnScroll: handleVerticalScroll,
  onGalleryScroll: handleGalleryScroll,
  openEntry,
  importFiles,
  openImportTo,
  locate,
  showPicker,
  removeEntries,
  dragPathsFor,
}

watch(viewMode, (mode) => {
  if (mode !== 'columns') columnLevels.value = []
  if (mode === 'gallery' && !galleryEntry.value) galleryEntry.value = visibleEntries.value[0] || null
})

watch(allVisibleEntries, (visible) => {
  const paths = new Set(visible.map((entry) => entry.path))
  selectedPaths.value = selectedPaths.value.filter((path) => paths.has(path))
  if (galleryEntry.value && !paths.has(galleryEntry.value.path)) {
    galleryEntry.value = visibleEntries.value[0] || null
  }
})

watch([searchQuery, typeFilter, dateFilter, sortKey, sortDirection, viewMode], resetPagination)

watch(PAGE_SIZE, resetPagination)

watch([searchQuery, typeFilter, dateFilter, sortKey, sortDirection, viewMode, gridItemSize], persistTabViewState)

watch([paginatedVisibleEntries, viewMode], ([visible, mode]) => {
  if (mode !== 'grid') return
  visible.filter(supportsNativeThumbnail).forEach((entry) => { void loadNativeThumbnail(entry) })
}, { immediate: true })

watch(() => props.rootPath, (value) => {
  currentPath.value = value
  loadDirectory(value)
}, { immediate: true })
</script>

<template>
  <section class="relative flex h-full min-h-0 flex-col bg-background">
    <LocalFolderHeader
      v-model:editing="editingPath"
      :is-at-root="isAtRoot"
      :current-path="currentPath"
      :breadcrumbs="breadcrumbs"
      @up="goUp"
      @navigate="loadDirectory"
      @refresh="loadDirectory()"
      @submit="submitPathEdit"
    />

    <LocalFolderToolbar
      v-model:search-query="searchQuery"
      v-model:type-filter="typeFilter"
      v-model:date-filter="dateFilter"
      v-model:sort-key="sortKey"
      v-model:sort-direction="sortDirection"
      v-model:view-mode="viewMode"
      v-model:grid-item-size="gridItemSize"
      :item-count="visibleEntries.length"
    />

    <div v-if="viewMode === 'list'" class="grid shrink-0 grid-cols-[minmax(0,1fr)_110px_170px] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
      <span>{{ $t('views.localFolder.name') }}</span>
      <span>{{ $t('views.localFolder.size') }}</span>
      <span>{{ $t('views.localFolder.modifiedAt') }}</span>
    </div>

    <div
      ref="contentScrollRef"
      :class="['min-h-0 flex-1 p-2', viewMode === 'gallery' ? 'overflow-hidden' : 'overflow-auto']"
      @scroll="handleContentScroll"
    >
      <div v-if="loading" class="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle class="animate-spin" />
        {{ $t('views.localFolder.loadingDirectory') }}
      </div>
      <div v-else-if="error" class="flex h-full flex-col items-center justify-center gap-3 text-sm text-destructive">
        <p>{{ error }}</p>
        <Button variant="outline" size="sm" @click="loadDirectory()"><RefreshCw />{{ $t('views.localFolder.retry') }}</Button>
      </div>
      <SelectionBox
        v-else
        :key="viewMode"
        ref="selectionBoxRef"
        v-model="selectedPaths"
        class="min-h-0"
        enable-select-all-shortcut
        enable-delete-selection-shortcut
        @delete-selection="removeEntries"
      >
        <LocalFolderListGridView
          v-if="viewMode === 'list' || viewMode === 'grid'"
          :view-mode="viewMode"
          :entries="paginatedVisibleEntries"
          :total-count="entries.length"
          :filtered-count="visibleEntries.length"
          :selected-paths="selectedPaths"
          :grid-item-size="gridItemSize"
          :grid-icon-size="gridIconSize"
          :thumbnail-urls="thumbnailUrls"
          :actions="actions"
        />

        <LocalFolderColumnsView
          v-else-if="viewMode === 'columns'"
          :levels="paginatedColumnViewLevels"
          :level-totals="levelTotals"
          :loading-column-path="loadingColumnPath"
          :selected-paths="selectedPaths"
          :selected-file-info-entry="selectedFileInfoEntry"
          :info-index="fileSystemInfoIndex"
          :actions="actions"
        />

        <LocalFolderGalleryView
          v-else
          ref="galleryViewRef"
          :entries="paginatedVisibleEntries"
          :gallery-entry="galleryEntry"
          :gallery-preview-url="galleryPreviewUrl"
          :gallery-info-entry="galleryInfoEntry"
          :info-index="fileSystemInfoIndex"
          :selected-paths="selectedPaths"
          :actions="actions"
        />
      </SelectionBox>
    </div>

    <LocalFolderSelectionBar
      v-if="selectedPaths.length"
      :selected-paths="selectedPaths"
      :selected-files="selectedFiles"
      :actions="actions"
    />

    <LocalPathPickerDialog
      v-model="pickerOpen"
      :initial-path="currentPath"
      selection-mode="directory"
      @confirm="handlePickerConfirm"
    />
    <FileUploadDialog
      v-model:visible="uploadDialogOpen"
      :initial-local-tree="uploadInitialTree"
    />
  </section>
</template>
