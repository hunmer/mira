<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Copy,
  Folder,
  FolderInput,
  FolderOpen,
  Import,
  LoaderCircle,
  Move,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { FileIcon, FolderIcon } from '@/components/ui/file-icon'
import FileSystemInformation from '@/components/ui/file-system/FileSystemInformation.vue'
import {
  fileKindLabel,
  type FileEntry,
  type FileSystemEntry,
  type FileSystemIndex,
} from '@/components/ui/file-system/fileSystemUtils'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { ExpandableButton } from '@renderer/components/common'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { SelectionBox } from '@hunmer/vue-selection-box'
import FileUploadDialog from '@renderer/components/business/FileUploadDialog.vue'
import LocalPathPickerDialog from '@renderer/components/business/LocalPathPickerDialog.vue'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useTabs } from '@renderer/composables/useTabs'
import type { LocalFileEntry, LocalFsNode } from '@/shared/types'

const props = defineProps<{
  tabId: string
  rootPath: string
  libraryId?: string
  tabData?: Record<string, unknown>
}>()

const { t, locale } = useI18n()
const { tabs } = useTabs()
type ViewMode = 'list' | 'grid' | 'columns' | 'gallery'
type TypeFilter = 'all' | 'folder' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other'
type DateFilter = 'all' | 'today' | 'week' | 'month'
const savedTabData = props.tabData || {}
const savedViewMode = savedTabData.viewMode
const savedTypeFilter = savedTabData.typeFilter
const savedDateFilter = savedTabData.dateFilter
const currentPath = ref(props.rootPath)
const entries = ref<LocalFileEntry[]>([])
const selectedPaths = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const editingPath = ref(false)
const pathInput = ref('')
const pathInputRef = ref<InstanceType<typeof Input> | null>(null)
const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null)
const contentScrollRef = ref<HTMLElement | null>(null)
const galleryScrollRef = ref<HTMLElement | null>(null)
const pickerOpen = ref(false)
const pickerOperation = ref<'copy' | 'move'>('copy')
const pickerSources = ref<string[]>([])
const uploadDialogOpen = ref(false)
const uploadInitialTree = ref<{ rootPath: string, tree: LocalFsNode[] }>()
const viewMode = ref<ViewMode>(savedViewMode === 'list' || savedViewMode === 'grid' || savedViewMode === 'columns' || savedViewMode === 'gallery' ? savedViewMode : 'list')
const searchQuery = ref(typeof savedTabData.searchQuery === 'string' ? savedTabData.searchQuery : '')
const sortKey = ref<'name' | 'modifiedAt' | 'size' | 'type'>(['name', 'modifiedAt', 'size', 'type'].includes(String(savedTabData.sortKey)) ? savedTabData.sortKey as 'name' | 'modifiedAt' | 'size' | 'type' : 'name')
const sortDirection = ref<'asc' | 'desc'>(savedTabData.sortDirection === 'desc' ? 'desc' : 'asc')
const typeFilter = ref<TypeFilter>(['all', 'folder', 'image', 'video', 'audio', 'document', 'archive', 'other'].includes(String(savedTypeFilter)) ? savedTypeFilter as TypeFilter : 'all')
const dateFilter = ref<DateFilter>(['all', 'today', 'week', 'month'].includes(String(savedDateFilter)) ? savedDateFilter as DateFilter : 'all')
const gridItemSize = ref(typeof savedTabData.gridItemSize === 'number' && Number.isFinite(savedTabData.gridItemSize)
  ? Math.min(240, Math.max(96, Math.round(savedTabData.gridItemSize / 8) * 8))
  : 112)
const columnLevels = ref<Array<{ path: string, entries: LocalFileEntry[] }>>([])
const loadingColumnPath = ref('')
const galleryEntry = ref<LocalFileEntry | null>(null)
const galleryPreviewUrl = ref('')
const pageLimits = ref<Record<string, number>>({})
const thumbnailUrls = ref<Record<string, string>>({})
const thumbnailCacheKeys = ref<Record<string, string>>({})
const thumbnailRequests = new Map<string, string>()
let galleryPreviewRequestId = 0
const PAGE_SIZE = 500
const LOAD_MORE_THRESHOLD = 160
const api = computed(() => window.electronAPI?.fs)
const gridIconSize = computed(() => Math.min(96, Math.max(40, Math.round(gridItemSize.value * 0.45))))

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

function toFileSystemEntry(entry: LocalFileEntry): FileSystemEntry {
  const parentPath = getParentPath(entry.path)
  const updatedAt = new Date(entry.modifiedAt).toISOString()
  if (entry.isDirectory) {
    return {
      kind: 'folder',
      name: entry.name,
      path: entry.path,
      parentPath,
      updatedAt,
    }
  }
  return {
    kind: 'file',
    key: entry.path,
    name: entry.name,
    path: entry.path,
    parentPath,
    contentType: mimeTypeForEntry(entry),
    size: entry.size,
    updatedAt,
  }
}

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

function informationKindLabel(entry: FileSystemEntry) {
  return entry.kind === 'folder' ? t('views.localFolder.filterFolders') : fileKindLabel(entry)
}

function entryType(entry: LocalFileEntry) {
  if (entry.isDirectory) return 'folder' as const
  if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(entry.extension)) return 'image' as const
  if (/\.(mp4|mov|mkv|avi|webm)$/.test(entry.extension)) return 'video' as const
  if (/\.(mp3|wav|flac|aac|ogg)$/.test(entry.extension)) return 'audio' as const
  if (/\.(zip|rar|7z|tar|gz)$/.test(entry.extension)) return 'archive' as const
  if (/\.(txt|md|pdf|docx?|xlsx?|pptx?|json|ya?ml|csv)$/.test(entry.extension)) return 'document' as const
  return 'other' as const
}

function supportsNativeThumbnail(entry: LocalFileEntry) {
  return !entry.isDirectory && (entryType(entry) === 'image' || entryType(entry) === 'video')
}

async function loadNativeThumbnail(entry: LocalFileEntry) {
  if (!supportsNativeThumbnail(entry) || !api.value?.getThumbnail) return
  const cacheKey = `${entry.modifiedAt}:${entry.size}`
  if (thumbnailCacheKeys.value[entry.path] === cacheKey || thumbnailRequests.get(entry.path) === cacheKey) return
  thumbnailRequests.set(entry.path, cacheKey)
  const result = await api.value.getThumbnail(entry.path, { width: 96, height: 96 })
  if (thumbnailRequests.get(entry.path) !== cacheKey) return
  thumbnailRequests.delete(entry.path)
  if (!result.success || !result.data) return
  thumbnailCacheKeys.value = { ...thumbnailCacheKeys.value, [entry.path]: cacheKey }
  thumbnailUrls.value = { ...thumbnailUrls.value, [entry.path]: result.data }
}

function filterAndSortEntries(source: LocalFileEntry[]) {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  const now = Date.now()
  const dateThreshold = dateFilter.value === 'today'
    ? new Date().setHours(0, 0, 0, 0)
    : dateFilter.value === 'week'
      ? now - 7 * 24 * 60 * 60 * 1000
      : dateFilter.value === 'month'
        ? now - 30 * 24 * 60 * 60 * 1000
        : 0

  return [...source]
    .filter((entry) => !query || entry.name.toLocaleLowerCase().includes(query))
    .filter((entry) => typeFilter.value === 'all' || entryType(entry) === typeFilter.value)
    .filter((entry) => !dateThreshold || entry.modifiedAt >= dateThreshold)
    .sort((left, right) => {
      const directoryOrder = Number(right.isDirectory) - Number(left.isDirectory)
      if (directoryOrder) return directoryOrder

      let comparison = 0
      if (sortKey.value === 'name') comparison = left.name.localeCompare(right.name)
      else if (sortKey.value === 'modifiedAt') comparison = left.modifiedAt - right.modifiedAt
      else if (sortKey.value === 'size') comparison = left.size - right.size
      else comparison = entryType(left).localeCompare(entryType(right)) || left.name.localeCompare(right.name)
      return sortDirection.value === 'asc' ? comparison : -comparison
    })
}

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
const allVisibleEntries = computed(() => [
  ...visibleEntries.value,
  ...visibleColumnLevels.value.flatMap((level) => level.entries),
])

function pageLimit(path: string) {
  return pageLimits.value[path] ?? PAGE_SIZE
}

function paginateEntries(path: string, source: LocalFileEntry[]) {
  return source.slice(0, pageLimit(path))
}

function loadNextPage(path: string, total: number) {
  const currentLimit = pageLimit(path)
  if (currentLimit >= total) return
  pageLimits.value = {
    ...pageLimits.value,
    [path]: Math.min(currentLimit + PAGE_SIZE, total),
  }
}

function handleVerticalScroll(event: Event, path: string, total: number) {
  const element = event.currentTarget as HTMLElement
  const remaining = element.scrollHeight - element.scrollTop - element.clientHeight
  if (remaining <= LOAD_MORE_THRESHOLD) loadNextPage(path, total)
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

function resetPagination() {
  pageLimits.value = {}
  void nextTick(() => {
    contentScrollRef.value?.scrollTo({ top: 0, left: 0 })
    galleryScrollRef.value?.scrollTo({ left: 0 })
  })
}

function normalizePath(value: string) {
  return value.replace(/[\\/]+$/, '').toLowerCase()
}

function getFolderName(targetPath: string) {
  const trimmed = targetPath.replace(/[\\/]+$/, '')
  return trimmed.split(/[\\/]/).filter(Boolean).pop() || targetPath
}

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

function getParentPath(value: string) {
  const normalized = value.replace(/[\\/]+$/, '')
  const parent = normalized.replace(/[\\/][^\\/]+$/, '')
  if (/^[A-Za-z]:$/.test(parent)) return `${parent}\\`
  return parent || '/'
}

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
    thumbnailUrls.value = {}
    thumbnailCacheKeys.value = {}
    thumbnailRequests.clear()
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

function pathFromInput(value: string) {
  let targetPath = value.trim()
  if ((targetPath.startsWith('"') && targetPath.endsWith('"')) || (targetPath.startsWith("'") && targetPath.endsWith("'"))) {
    targetPath = targetPath.slice(1, -1).trim()
  }
  if (/^[A-Za-z]:$/.test(targetPath)) return `${targetPath}\\`
  return targetPath.replace(/[\\/]+$/, '') || '/'
}

async function startPathEditing() {
  pathInput.value = currentPath.value
  editingPath.value = true
  await nextTick()
  const input = pathInputRef.value?.$el as HTMLInputElement | undefined
  input?.focus()
  input?.select()
}

async function submitPathEdit() {
  const targetPath = pathFromInput(pathInput.value)
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
  const nextPageLimits = { ...pageLimits.value }
  delete nextPageLimits[entry.path]
  pageLimits.value = nextPageLimits
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

async function importFiles(files: LocalFileEntry[]) {
  if (!props.libraryId) {
    toast.error(t('views.localFolder.noLibrary'))
    return
  }
  if (!files.length) return
  const id = toast.loading(t('views.localFolder.importing', { count: files.length }))
  let imported = 0
  try {
    for (const entry of files) {
      const result = await api.value?.readFileBytes(entry.path)
      if (!result?.success || !result.data) throw new Error(result?.message || t('views.localFolder.readFailed'))
      const file = new window.File([new Uint8Array(result.data)], entry.name)
      await miraSDKService.uploadFile(file, props.libraryId)
      imported++
    }
    toast.success(t('views.localFolder.importComplete', { count: imported }), { id })
  } catch (reason) {
    toast.error(reason instanceof Error ? reason.message : t('views.localFolder.importFailed'), { id })
  }
}

function openImportTo(entries: LocalFileEntry[]) {
  const files = entries.filter((entry) => !entry.isDirectory)
  if (!files.length) return
  uploadInitialTree.value = {
    rootPath: currentPath.value,
    tree: files.map((entry) => ({
      name: entry.name,
      path: entry.path,
      isDir: false,
      size: entry.size,
      ext: entry.extension,
    })),
  }
  uploadDialogOpen.value = true
}

function showPicker(operation: 'copy' | 'move', paths: string[]) {
  pickerOperation.value = operation
  pickerSources.value = paths
  pickerOpen.value = true
}

async function handlePickerConfirm(paths: string[]) {
  const destination = paths[0]
  if (!destination) return
  const method = pickerOperation.value === 'copy' ? api.value?.copyEntries : api.value?.moveEntries
  const result = await method?.(pickerSources.value, destination)
  if (!result?.success) {
    toast.error(result?.message || t(`views.localFolder.${pickerOperation.value}Failed`))
    return
  }
  toast.success(t(`views.localFolder.${pickerOperation.value}Complete`))
  await loadDirectory()
}

async function removeEntries(paths: string[]) {
  if (!paths.length || !window.confirm(t('views.localFolder.deleteConfirm', { count: paths.length }))) return
  const result = await api.value?.removeEntries(paths)
  if (!result?.success) {
    toast.error(result?.message || t('views.localFolder.deleteFailed'))
    return
  }
  toast.success(t('views.localFolder.deleteComplete'))
  await loadDirectory()
}

function locate(entry: LocalFileEntry) {
  api.value?.showItemInFolder(entry.path)
}

function dragPathsFor(entry: LocalFileEntry) {
  return selectedPaths.value.includes(entry.path) ? [...selectedPaths.value] : [entry.path]
}

function handleDragStart(entry: LocalFileEntry, event: DragEvent) {
  const paths = dragPathsFor(entry)
  selectedPaths.value = paths
  ;(window as any).__miraLocalDragPaths = paths
  event.dataTransfer?.setData('application/x-mira-local-paths', JSON.stringify(paths))
  event.dataTransfer?.setData('text/plain', paths.join('\n'))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove'
  void window.electronAPI?.dragDrop?.startDragMultiple(paths)
}

function handleDragEnd() {
  window.setTimeout(() => { (window as any).__miraLocalDragPaths = [] }, 0)
}

async function handleFolderDrop(folder: LocalFileEntry, event: DragEvent) {
  if (!folder.isDirectory) return
  const raw = event.dataTransfer?.getData('application/x-mira-local-paths')
  let paths = ((window as any).__miraLocalDragPaths || []) as string[]
  if (raw) {
    try { paths = JSON.parse(raw) } catch { /* use renderer drag cache */ }
  }
  if (!paths.length) return
  const result = await api.value?.moveEntries(paths, folder.path)
  if (!result?.success) {
    toast.error(result?.message || t('views.localFolder.moveFailed'))
    return
  }
  toast.success(t('views.localFolder.moveComplete'))
  await loadDirectory()
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

function mimeTypeForEntry(entry: LocalFileEntry) {
  const extension = entry.extension.replace(/^\./, '')
  const types: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
  }
  return types[extension] || 'application/octet-stream'
}

function revokeGalleryPreview() {
  if (galleryPreviewUrl.value) URL.revokeObjectURL(galleryPreviewUrl.value)
  galleryPreviewUrl.value = ''
}

watch(galleryEntry, async (entry) => {
  const requestId = ++galleryPreviewRequestId
  revokeGalleryPreview()
  if (!entry || entryType(entry) !== 'image') return
  const result = await api.value?.readFileBytes(entry.path)
  if (requestId !== galleryPreviewRequestId || !result?.success || !result.data) return
  galleryPreviewUrl.value = URL.createObjectURL(new Blob([new Uint8Array(result.data)], { type: mimeTypeForEntry(entry) }))
})

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

watch([searchQuery, typeFilter, dateFilter, sortKey, sortDirection, viewMode, gridItemSize], persistTabViewState)

watch([paginatedVisibleEntries, viewMode], ([visible, mode]) => {
  if (mode !== 'grid') return
  visible.filter(supportsNativeThumbnail).forEach((entry) => { void loadNativeThumbnail(entry) })
}, { immediate: true })

onBeforeUnmount(revokeGalleryPreview)

watch(() => props.rootPath, (value) => {
  currentPath.value = value
  loadDirectory(value)
}, { immediate: true })
</script>

<template>
  <section class="relative flex h-full min-h-0 flex-col bg-background">
    <header class="flex min-h-12 shrink-0 items-center gap-2 border-b px-3">
      <Button variant="ghost" size="icon-sm" :disabled="isAtRoot" :title="$t('views.localFolder.up')" @click="goUp">
        <ArrowLeft />
      </Button>
      <Input
        v-if="editingPath"
        ref="pathInputRef"
        v-model="pathInput"
        class="h-8 min-w-0 flex-1"
        :aria-label="$t('views.localFolder.pathInput')"
        @keydown.enter.prevent="submitPathEdit"
        @keydown.escape.prevent="editingPath = false"
      />
      <nav v-else class="flex min-w-0 flex-1 items-center overflow-hidden text-sm" aria-label="Breadcrumb">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
          <span v-if="index" class="px-1 text-muted-foreground">/</span>
          <button class="min-w-0 truncate rounded px-1.5 py-1 hover:bg-accent" @click="loadDirectory(crumb.path)">
            {{ crumb.label }}
          </button>
        </template>
      </nav>
      <Button
        v-if="!editingPath"
        variant="ghost"
        size="icon-sm"
        :title="$t('views.localFolder.editPath')"
        @click="startPathEditing"
      >
        <Pencil />
      </Button>
      <Button variant="ghost" size="icon-sm" :title="$t('views.localFolder.refresh')" @click="loadDirectory()">
        <RefreshCw />
      </Button>
    </header>

    <div class="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2">
      <ExpandableButton
        icon="search"
        :expand-tooltip="$t('views.localFolder.searchPlaceholder')"
        :collapse-tooltip="$t('common.close')"
        class="shrink-0"
      >
        <InputGroup class="w-64">
          <InputGroupAddon>
            <span class="material-icons text-sm">search</span>
          </InputGroupAddon>
          <InputGroupInput
            v-model="searchQuery"
            :placeholder="$t('views.localFolder.searchPlaceholder')"
          />
          <InputGroupButton
            v-if="searchQuery"
            :title="$t('views.localFolder.clearSearch')"
            @click="searchQuery = ''"
          >
            <X class="size-3.5" />
          </InputGroupButton>
        </InputGroup>
      </ExpandableButton>

      <Select v-model="typeFilter">
        <SelectTrigger size="sm" class="h-8 w-32" :title="$t('views.localFolder.typeFilter')">
          <SelectValue :placeholder="$t('views.localFolder.typeFilter')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ $t('views.localFolder.filterAll') }}</SelectItem>
          <SelectItem value="folder">{{ $t('views.localFolder.filterFolders') }}</SelectItem>
          <SelectItem value="image">{{ $t('views.localFolder.filterImages') }}</SelectItem>
          <SelectItem value="video">{{ $t('views.localFolder.filterVideos') }}</SelectItem>
          <SelectItem value="audio">{{ $t('views.localFolder.filterAudio') }}</SelectItem>
          <SelectItem value="document">{{ $t('views.localFolder.filterDocuments') }}</SelectItem>
          <SelectItem value="archive">{{ $t('views.localFolder.filterArchives') }}</SelectItem>
          <SelectItem value="other">{{ $t('views.localFolder.filterOther') }}</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="dateFilter">
        <SelectTrigger size="sm" class="h-8 w-32" :title="$t('views.localFolder.dateFilter')">
          <SelectValue :placeholder="$t('views.localFolder.dateFilter')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ $t('views.localFolder.dateAll') }}</SelectItem>
          <SelectItem value="today">{{ $t('views.localFolder.dateToday') }}</SelectItem>
          <SelectItem value="week">{{ $t('views.localFolder.dateWeek') }}</SelectItem>
          <SelectItem value="month">{{ $t('views.localFolder.dateMonth') }}</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="sortKey">
        <SelectTrigger size="sm" class="h-8 w-32" :title="$t('views.localFolder.sortBy')">
          <SelectValue :placeholder="$t('views.localFolder.sortBy')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{{ $t('views.localFolder.sortName') }}</SelectItem>
          <SelectItem value="modifiedAt">{{ $t('views.localFolder.sortModified') }}</SelectItem>
          <SelectItem value="size">{{ $t('views.localFolder.sortSize') }}</SelectItem>
          <SelectItem value="type">{{ $t('views.localFolder.sortType') }}</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="viewMode">
        <SelectTrigger size="sm" class="h-8 w-32" :title="$t('views.localFolder.viewMode')">
          <SelectValue :placeholder="$t('views.localFolder.viewMode')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="list">{{ $t('views.localFolder.listView') }}</SelectItem>
          <SelectItem value="grid">{{ $t('views.localFolder.gridView') }}</SelectItem>
          <SelectItem value="columns">{{ $t('views.localFolder.columnsView') }}</SelectItem>
          <SelectItem value="gallery">{{ $t('views.localFolder.galleryView') }}</SelectItem>
        </SelectContent>
      </Select>

      <div v-if="viewMode === 'grid'" class="flex min-w-36 items-center gap-2" :title="$t('views.localFolder.gridSize')">
        <Slider
          :model-value="[gridItemSize]"
          :min="96"
          :max="240"
          :step="8"
          class="w-28"
          :aria-label="$t('views.localFolder.gridSize')"
          @update:model-value="value => { gridItemSize = value?.[0] ?? gridItemSize }"
        />
        <span class="w-10 text-right text-xs text-muted-foreground">{{ gridItemSize }}px</span>
      </div>

      
      <Button
        variant="outline"
        size="icon-sm"
        :title="sortDirection === 'asc' ? $t('views.localFolder.sortAscending') : $t('views.localFolder.sortDescending')"
        @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
      >
        <ArrowUp v-if="sortDirection === 'asc'" />
        <ArrowDown v-else />
      </Button>

      <span class="ml-auto text-xs text-muted-foreground">{{ $t('views.localFolder.itemCount', { count: visibleEntries.length }) }}</span>
    </div>

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
        <div
          v-if="viewMode === 'list' || viewMode === 'grid'"
          :class="viewMode === 'grid' ? 'grid min-h-full content-start gap-2 p-1' : 'min-h-full space-y-0.5'"
          :style="viewMode === 'grid' ? { gridTemplateColumns: `repeat(auto-fill, minmax(${gridItemSize}px, 1fr))` } : undefined"
          @wheel="viewMode === 'grid' ? handleGridWheel($event) : undefined"
        >
          <ContextMenu v-for="entry in paginatedVisibleEntries" :key="entry.path">
            <ContextMenuTrigger as-child>
              <button
                type="button"
                draggable="true"
                :data-selectable-id="entry.path"
                :class="[
                  viewMode === 'list'
                    ? 'grid h-10 w-full grid-cols-[minmax(0,1fr)_110px_170px] items-center gap-3 px-2 text-left text-sm'
                    : 'flex min-w-0 flex-col items-center justify-center gap-2 px-2 text-center text-xs',
                  'rounded hover:bg-accent/60',
                  selectedPaths.includes(entry.path) ? 'bg-primary/10 text-primary' : '',
                ]"
                :style="viewMode === 'grid' ? { height: `${gridItemSize}px` } : undefined"
                @click="handleItemClick(entry, $event)"
                @dblclick.stop="openEntry(entry)"
                @contextmenu="handleContextMenu(entry)"
                @dragstart="handleDragStart(entry, $event)"
                @dragend="handleDragEnd"
                @dragover="entry.isDirectory && $event.preventDefault()"
                @drop.stop.prevent="handleFolderDrop(entry, $event)"
              >
                <span :class="viewMode === 'list' ? 'flex min-w-0 items-center gap-2' : 'flex min-w-0 max-w-full flex-col items-center gap-2'">
                  <template v-if="viewMode === 'grid'">
                    <img
                      v-if="thumbnailUrls[entry.path]"
                      :src="thumbnailUrls[entry.path]"
                      :alt="entry.name"
                      class="shrink-0 rounded object-contain"
                      :style="{ width: `${gridIconSize}px`, height: `${gridIconSize}px` }"
                    />
                    <FolderIcon v-else-if="entry.isDirectory" :name="entry.name" :style="{ width: `${gridIconSize}px`, height: `${gridIconSize}px` }" />
                    <FileIcon v-else :name="entry.name" :style="{ width: `${gridIconSize}px`, height: `${gridIconSize}px` }" />
                  </template>
                  <template v-else>
                    <FolderIcon v-if="entry.isDirectory" :name="entry.name" />
                    <FileIcon v-else :name="entry.name" />
                  </template>
                  <span :class="viewMode === 'list' ? 'truncate' : 'line-clamp-2 max-w-full break-all'">{{ entry.name }}</span>
                </span>
                <span v-if="viewMode === 'list'" class="text-xs text-muted-foreground">{{ entry.isDirectory ? '—' : formatSize(entry.size) }}</span>
                <span v-if="viewMode === 'list'" class="text-xs text-muted-foreground">{{ new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(entry.modifiedAt) }}</span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent class="w-48">
              <ContextMenuItem @click="openEntry(entry)"><FolderOpen />{{ $t('views.localFolder.open') }}</ContextMenuItem>
              <ContextMenuItem :disabled="entry.isDirectory" @click="importFiles([entry])"><Import />{{ $t('views.localFolder.import') }}</ContextMenuItem>
              <ContextMenuItem :disabled="entry.isDirectory" @click="openImportTo([entry])"><FolderInput />{{ $t('views.localFolder.importTo') }}</ContextMenuItem>
              <ContextMenuItem @click="locate(entry)"><FolderInput />{{ $t('views.localFolder.locate') }}</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem @click="showPicker('copy', dragPathsFor(entry))"><Copy />{{ $t('views.localFolder.copy') }}</ContextMenuItem>
              <ContextMenuItem @click="showPicker('move', dragPathsFor(entry))"><Move />{{ $t('views.localFolder.move') }}</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem class="text-destructive" @click="removeEntries(dragPathsFor(entry))"><Trash2 />{{ $t('views.localFolder.delete') }}</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          <div v-if="visibleEntries.length === 0" class="col-span-full flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Folder class="size-8" />
            {{ entries.length ? $t('views.localFolder.noMatches') : $t('views.localFolder.empty') }}
          </div>
        </div>

        <div v-else-if="viewMode === 'columns'" class="flex h-full min-h-0 overflow-x-auto rounded-md border bg-background">
          <section
            v-for="(level, levelIndex) in paginatedColumnViewLevels"
            :key="level.path"
            class="w-64 shrink-0 overflow-y-auto border-r p-1 last:border-r-0"
            @scroll="handleVerticalScroll($event, level.path, columnViewLevels[levelIndex].entries.length)"
          >
            <ContextMenu v-for="entry in level.entries" :key="entry.path">
              <ContextMenuTrigger as-child>
                <button
                  type="button"
                  draggable="true"
                  :data-selectable-id="entry.path"
                  class="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-accent/60"
                  :class="selectedPaths.includes(entry.path) ? 'bg-primary/10 text-primary' : ''"
                  @click="handleColumnItemClick(entry, levelIndex, $event)"
                  @dblclick.stop="openEntry(entry)"
                  @contextmenu="handleContextMenu(entry)"
                  @dragstart="handleDragStart(entry, $event)"
                  @dragend="handleDragEnd"
                  @dragover="entry.isDirectory && $event.preventDefault()"
                  @drop.stop.prevent="handleFolderDrop(entry, $event)"
                >
                  <FolderIcon v-if="entry.isDirectory" :name="entry.name" />
                  <FileIcon v-else :name="entry.name" />
                  <span class="min-w-0 flex-1 truncate">{{ entry.name }}</span>
                  <ChevronRight v-if="entry.isDirectory" class="size-4 shrink-0 text-muted-foreground" />
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent class="w-48">
                <ContextMenuItem @click="openEntry(entry)"><FolderOpen />{{ $t('views.localFolder.open') }}</ContextMenuItem>
                <ContextMenuItem :disabled="entry.isDirectory" @click="importFiles([entry])"><Import />{{ $t('views.localFolder.import') }}</ContextMenuItem>
                <ContextMenuItem :disabled="entry.isDirectory" @click="openImportTo([entry])"><FolderInput />{{ $t('views.localFolder.importTo') }}</ContextMenuItem>
                <ContextMenuItem @click="locate(entry)"><FolderInput />{{ $t('views.localFolder.locate') }}</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem @click="showPicker('copy', dragPathsFor(entry))"><Copy />{{ $t('views.localFolder.copy') }}</ContextMenuItem>
                <ContextMenuItem @click="showPicker('move', dragPathsFor(entry))"><Move />{{ $t('views.localFolder.move') }}</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem class="text-destructive" @click="removeEntries(dragPathsFor(entry))"><Trash2 />{{ $t('views.localFolder.delete') }}</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <div v-if="loadingColumnPath === level.path" class="flex h-8 items-center gap-2 px-2 text-xs text-muted-foreground">
              <LoaderCircle class="size-3.5 animate-spin" />{{ $t('views.localFolder.loadingDirectory') }}
            </div>
            <div v-if="level.entries.length === 0" class="flex h-24 items-center justify-center text-xs text-muted-foreground">
              {{ $t('views.localFolder.empty') }}
            </div>
          </section>
          <div
            v-if="selectedFileInfoEntry"
            class="flex min-w-60 flex-1 flex-col items-center justify-center overflow-y-auto p-4"
          >
            <div class="flex w-full max-w-lg flex-col items-stretch gap-3">
              <FileIcon :name="selectedFileInfoEntry.name" class="mx-auto size-24" />
              <div class="text-center">
                <div class="break-words text-sm font-semibold">{{ selectedFileInfoEntry.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ informationKindLabel(selectedFileInfoEntry) }}
                  <template v-if="selectedFileInfoEntry.size"> · {{ formatSize(selectedFileInfoEntry.size) }}</template>
                </div>
              </div>
              <FileSystemInformation :entry="selectedFileInfoEntry" :index="fileSystemInfoIndex" />
            </div>
          </div>
        </div>

        <div v-else class="flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-background">
          <div class="flex min-h-0 flex-1 bg-muted/20">
            <div class="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6">
              <div v-if="galleryEntry" class="flex h-full min-h-0 max-w-full flex-col items-center gap-4 text-center">
                <img
                  v-if="galleryPreviewUrl"
                  :src="galleryPreviewUrl"
                  :alt="galleryEntry.name"
                  class="min-h-0 max-h-[calc(100%-4.5rem)] max-w-full rounded-md object-contain shadow-sm"
                  @dblclick="openEntry(galleryEntry)"
                />
                <FolderIcon v-else-if="galleryEntry.isDirectory" :name="galleryEntry.name" class="size-24" />
                <FileIcon v-else :name="galleryEntry.name" class="size-24" />
                <div class="max-w-xl">
                  <h3 class="break-all text-sm font-medium">{{ galleryEntry.name }}</h3>
                </div>
              </div>
              <div v-else class="text-sm text-muted-foreground">{{ $t('views.localFolder.empty') }}</div>
            </div>
            <aside
              v-if="galleryInfoEntry"
              class="hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l bg-background p-4 sm:flex"
            >
              <div class="flex items-center gap-3">
                <FolderIcon v-if="galleryInfoEntry.kind === 'folder'" :name="galleryInfoEntry.name" class="size-8" />
                <FileIcon v-else :name="galleryInfoEntry.name" class="size-8" />
                <div class="min-w-0 flex-1">
                  <div class="break-words text-sm font-semibold">{{ galleryInfoEntry.name }}</div>
                  <div class="text-xs text-muted-foreground">
                    {{ informationKindLabel(galleryInfoEntry) }}
                    <template v-if="galleryInfoEntry.kind === 'file' && galleryInfoEntry.size"> · {{ formatSize(galleryInfoEntry.size) }}</template>
                  </div>
                </div>
              </div>
              <FileSystemInformation :entry="galleryInfoEntry" :index="fileSystemInfoIndex" />
            </aside>
          </div>
          <div
            ref="galleryScrollRef"
            class="flex h-28 shrink-0 gap-2 overflow-x-auto overflow-y-hidden border-t bg-background p-2"
            @scroll="handleGalleryScroll"
          >
            <ContextMenu v-for="entry in paginatedVisibleEntries" :key="entry.path">
              <ContextMenuTrigger as-child>
                <button
                  type="button"
                  draggable="true"
                  :data-selectable-id="entry.path"
                  class="flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded px-1 text-center text-xs hover:bg-accent/60"
                  :class="selectedPaths.includes(entry.path) ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : ''"
                  @click="handleGalleryItemClick(entry, $event)"
                  @dblclick.stop="openEntry(entry)"
                  @contextmenu="handleContextMenu(entry)"
                  @dragstart="handleDragStart(entry, $event)"
                  @dragend="handleDragEnd"
                  @dragover="entry.isDirectory && $event.preventDefault()"
                  @drop.stop.prevent="handleFolderDrop(entry, $event)"
                >
                  <FolderIcon v-if="entry.isDirectory" :name="entry.name" class="size-8" />
                  <FileIcon v-else :name="entry.name" class="size-8" />
                  <span class="line-clamp-2 max-w-full break-all">{{ entry.name }}</span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent class="w-48">
                <ContextMenuItem @click="openEntry(entry)"><FolderOpen />{{ $t('views.localFolder.open') }}</ContextMenuItem>
                <ContextMenuItem :disabled="entry.isDirectory" @click="importFiles([entry])"><Import />{{ $t('views.localFolder.import') }}</ContextMenuItem>
                <ContextMenuItem :disabled="entry.isDirectory" @click="openImportTo([entry])"><FolderInput />{{ $t('views.localFolder.importTo') }}</ContextMenuItem>
                <ContextMenuItem @click="locate(entry)"><FolderInput />{{ $t('views.localFolder.locate') }}</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem @click="showPicker('copy', dragPathsFor(entry))"><Copy />{{ $t('views.localFolder.copy') }}</ContextMenuItem>
                <ContextMenuItem @click="showPicker('move', dragPathsFor(entry))"><Move />{{ $t('views.localFolder.move') }}</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem class="text-destructive" @click="removeEntries(dragPathsFor(entry))"><Trash2 />{{ $t('views.localFolder.delete') }}</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>
      </SelectionBox>
    </div>

    <div v-if="selectedPaths.length" class="flex shrink-0 justify-center overflow-x-auto border-t bg-background px-3 py-2">
      <div class="flex max-w-full items-center gap-1">
        <span class="px-2 text-xs text-muted-foreground">{{ $t('views.localFolder.selectedCount', { count: selectedPaths.length }) }}</span>
        <Button size="sm" variant="ghost" :disabled="selectedFiles.length === 0" @click="importFiles(selectedFiles)"><Import />{{ $t('views.localFolder.batchImport') }}</Button>
        <Button size="sm" variant="ghost" :disabled="selectedFiles.length === 0" @click="openImportTo(selectedFiles)"><FolderInput />{{ $t('views.localFolder.batchImportTo') }}</Button>
        <Button size="sm" variant="ghost" @click="showPicker('copy', selectedPaths)"><Copy />{{ $t('views.localFolder.batchCopy') }}</Button>
        <Button size="sm" variant="ghost" @click="showPicker('move', selectedPaths)"><Move />{{ $t('views.localFolder.batchMove') }}</Button>
        <Button size="sm" variant="ghost" class="text-destructive" @click="removeEntries(selectedPaths)"><Trash2 />{{ $t('views.localFolder.batchDelete') }}</Button>
      </div>
    </div>

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
