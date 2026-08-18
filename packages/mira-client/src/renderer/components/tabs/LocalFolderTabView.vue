<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Columns3,
  Copy,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderInput,
  FolderOpen,
  Import,
  Images,
  LayoutGrid,
  List,
  LoaderCircle,
  Move,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
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
import SelectionBox from '@renderer/components/common/SelectionBox.vue'
import LocalPathPickerDialog from '@renderer/components/business/LocalPathPickerDialog.vue'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useTabs } from '@renderer/composables/useTabs'
import type { LocalFileEntry } from '@/shared/types'

const props = defineProps<{
  tabId: string
  rootPath: string
  libraryId?: string
}>()

const { t, locale } = useI18n()
const { tabs } = useTabs()
const currentPath = ref(props.rootPath)
const entries = ref<LocalFileEntry[]>([])
const selectedPaths = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null)
const pickerOpen = ref(false)
const pickerOperation = ref<'copy' | 'move'>('copy')
const pickerSources = ref<string[]>([])
const viewMode = ref<'list' | 'grid' | 'columns' | 'gallery'>('list')
const searchQuery = ref('')
const sortKey = ref<'name' | 'modifiedAt' | 'size' | 'type'>('name')
const sortDirection = ref<'asc' | 'desc'>('asc')
const typeFilter = ref<'all' | 'folder' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other'>('all')
const dateFilter = ref<'all' | 'today' | 'week' | 'month'>('all')
const columnLevels = ref<Array<{ path: string, entries: LocalFileEntry[] }>>([])
const loadingColumnPath = ref('')
const galleryEntry = ref<LocalFileEntry | null>(null)
const galleryPreviewUrl = ref('')
let galleryPreviewRequestId = 0
const api = computed(() => window.electronAPI?.fs)

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
const isAtRoot = computed(() => normalizePath(currentPath.value) === normalizePath(props.rootPath))

function entryType(entry: LocalFileEntry) {
  if (entry.isDirectory) return 'folder' as const
  if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(entry.extension)) return 'image' as const
  if (/\.(mp4|mov|mkv|avi|webm)$/.test(entry.extension)) return 'video' as const
  if (/\.(mp3|wav|flac|aac|ogg)$/.test(entry.extension)) return 'audio' as const
  if (/\.(zip|rar|7z|tar|gz)$/.test(entry.extension)) return 'archive' as const
  if (/\.(txt|md|pdf|docx?|xlsx?|pptx?|json|ya?ml|csv)$/.test(entry.extension)) return 'document' as const
  return 'other' as const
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
const columnViewLevels = computed(() => [
  { path: currentPath.value, entries: visibleEntries.value },
  ...visibleColumnLevels.value,
])
const allVisibleEntries = computed(() => [
  ...visibleEntries.value,
  ...visibleColumnLevels.value.flatMap((level) => level.entries),
])

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
    return
  }
  loading.value = true
  error.value = ''
  const result = await api.value.listDirectory(targetPath)
  if (result.success) {
    currentPath.value = targetPath
    syncTabTitle(targetPath)
    entries.value = result.data || []
    selectedPaths.value = []
    columnLevels.value = []
    galleryEntry.value = null
  } else {
    error.value = result.message || t('views.localFolder.loadFailed')
  }
  loading.value = false
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

function fileIcon(entry: LocalFileEntry) {
  const type = entryType(entry)
  if (type === 'folder') return Folder
  if (type === 'image') return FileImage
  if (type === 'video') return FileVideo
  if (type === 'audio') return FileAudio
  if (type === 'archive') return FileArchive
  if (type === 'document') return FileText
  return File
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
      <nav class="flex min-w-0 flex-1 items-center overflow-hidden text-sm" aria-label="Breadcrumb">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
          <span v-if="index" class="px-1 text-muted-foreground">/</span>
          <button class="min-w-0 truncate rounded px-1.5 py-1 hover:bg-accent" @click="loadDirectory(crumb.path)">
            {{ crumb.label }}
          </button>
        </template>
      </nav>
      <Button variant="ghost" size="icon-sm" :title="$t('views.localFolder.refresh')" @click="loadDirectory()">
        <RefreshCw />
      </Button>
    </header>

    <div class="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2">
      <div class="relative min-w-44 flex-1 sm:max-w-64">
        <Search class="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="$t('views.localFolder.searchPlaceholder')"
          class="h-8 w-full rounded-md border bg-background pl-8 pr-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded hover:bg-accent"
          :title="$t('views.localFolder.clearSearch')"
          @click="searchQuery = ''"
        >
          <X class="size-3.5" />
        </button>
      </div>

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

      <Button
        variant="outline"
        size="icon-sm"
        :title="sortDirection === 'asc' ? $t('views.localFolder.sortAscending') : $t('views.localFolder.sortDescending')"
        @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
      >
        <ArrowUp v-if="sortDirection === 'asc'" />
        <ArrowDown v-else />
      </Button>

      <div class="flex h-8 items-center rounded-md border bg-background p-0.5">
        <Button
          size="icon-xs"
          :variant="viewMode === 'list' ? 'secondary' : 'ghost'"
          :title="$t('views.localFolder.listView')"
          @click="viewMode = 'list'"
        >
          <List />
        </Button>
        <Button
          size="icon-xs"
          :variant="viewMode === 'grid' ? 'secondary' : 'ghost'"
          :title="$t('views.localFolder.gridView')"
          @click="viewMode = 'grid'"
        >
          <LayoutGrid />
        </Button>
        <Button
          size="icon-xs"
          :variant="viewMode === 'columns' ? 'secondary' : 'ghost'"
          :title="$t('views.localFolder.columnsView')"
          @click="viewMode = 'columns'"
        >
          <Columns3 />
        </Button>
        <Button
          size="icon-xs"
          :variant="viewMode === 'gallery' ? 'secondary' : 'ghost'"
          :title="$t('views.localFolder.galleryView')"
          @click="viewMode = 'gallery'"
        >
          <Images />
        </Button>
      </div>

      <span class="ml-auto text-xs text-muted-foreground">{{ $t('views.localFolder.itemCount', { count: visibleEntries.length }) }}</span>
    </div>

    <div v-if="viewMode === 'list'" class="grid shrink-0 grid-cols-[minmax(0,1fr)_110px_170px] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
      <span>{{ $t('views.localFolder.name') }}</span>
      <span>{{ $t('views.localFolder.size') }}</span>
      <span>{{ $t('views.localFolder.modifiedAt') }}</span>
    </div>

    <div :class="['min-h-0 flex-1 p-2', viewMode === 'gallery' ? 'overflow-hidden' : 'overflow-auto']">
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
        <div v-if="viewMode === 'list' || viewMode === 'grid'" :class="viewMode === 'grid' ? 'grid min-h-full grid-cols-[repeat(auto-fill,minmax(112px,1fr))] content-start gap-2 p-1' : 'min-h-full space-y-0.5'">
          <ContextMenu v-for="entry in visibleEntries" :key="entry.path">
            <ContextMenuTrigger as-child>
              <button
                type="button"
                draggable="true"
                :data-selectable-id="entry.path"
                :class="[
                  viewMode === 'list'
                    ? 'grid h-10 w-full grid-cols-[minmax(0,1fr)_110px_170px] items-center gap-3 px-2 text-left text-sm'
                    : 'flex h-28 min-w-0 flex-col items-center justify-center gap-2 px-2 text-center text-xs',
                  'rounded hover:bg-accent/60',
                  selectedPaths.includes(entry.path) ? 'bg-primary/10 text-primary' : '',
                ]"
                @click="handleItemClick(entry, $event)"
                @dblclick.stop="openEntry(entry)"
                @contextmenu="handleContextMenu(entry)"
                @dragstart="handleDragStart(entry, $event)"
                @dragend="handleDragEnd"
                @dragover="entry.isDirectory && $event.preventDefault()"
                @drop.stop.prevent="handleFolderDrop(entry, $event)"
              >
                <span :class="viewMode === 'list' ? 'flex min-w-0 items-center gap-2' : 'flex min-w-0 max-w-full flex-col items-center gap-2'">
                  <component
                    :is="fileIcon(entry)"
                    :class="[
                      viewMode === 'list' ? 'size-4' : 'size-10',
                      'shrink-0',
                      entry.isDirectory ? 'text-amber-500' : 'text-muted-foreground',
                    ]"
                  />
                  <span :class="viewMode === 'list' ? 'truncate' : 'line-clamp-2 max-w-full break-all'">{{ entry.name }}</span>
                </span>
                <span v-if="viewMode === 'list'" class="text-xs text-muted-foreground">{{ entry.isDirectory ? '—' : formatSize(entry.size) }}</span>
                <span v-if="viewMode === 'list'" class="text-xs text-muted-foreground">{{ new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(entry.modifiedAt) }}</span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent class="w-48">
              <ContextMenuItem @click="openEntry(entry)"><FolderOpen />{{ $t('views.localFolder.open') }}</ContextMenuItem>
              <ContextMenuItem :disabled="entry.isDirectory" @click="importFiles([entry])"><Import />{{ $t('views.localFolder.import') }}</ContextMenuItem>
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
            v-for="(level, levelIndex) in columnViewLevels"
            :key="level.path"
            class="w-64 shrink-0 overflow-y-auto border-r p-1 last:border-r-0"
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
                  <component :is="fileIcon(entry)" class="size-4 shrink-0" :class="entry.isDirectory ? 'text-amber-500' : 'text-muted-foreground'" />
                  <span class="min-w-0 flex-1 truncate">{{ entry.name }}</span>
                  <ChevronRight v-if="entry.isDirectory" class="size-4 shrink-0 text-muted-foreground" />
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent class="w-48">
                <ContextMenuItem @click="openEntry(entry)"><FolderOpen />{{ $t('views.localFolder.open') }}</ContextMenuItem>
                <ContextMenuItem :disabled="entry.isDirectory" @click="importFiles([entry])"><Import />{{ $t('views.localFolder.import') }}</ContextMenuItem>
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
        </div>

        <div v-else class="flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-background">
          <div class="flex min-h-0 flex-1 items-center justify-center bg-muted/20 p-6">
            <div v-if="galleryEntry" class="flex h-full min-h-0 max-w-full flex-col items-center gap-4 text-center">
              <img
                v-if="galleryPreviewUrl"
                :src="galleryPreviewUrl"
                :alt="galleryEntry.name"
                class="min-h-0 max-h-[calc(100%-4.5rem)] max-w-full rounded-md object-contain shadow-sm"
                @dblclick="openEntry(galleryEntry)"
              />
              <component
                :is="fileIcon(galleryEntry)"
                v-else
                class="size-24 text-muted-foreground"
                :class="galleryEntry.isDirectory ? 'text-amber-500' : ''"
              />
              <div class="max-w-xl">
                <h3 class="break-all text-sm font-medium">{{ galleryEntry.name }}</h3>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ galleryEntry.isDirectory ? $t('views.localFolder.filterFolders') : formatSize(galleryEntry.size) }}
                  · {{ new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(galleryEntry.modifiedAt) }}
                </p>
              </div>
            </div>
            <div v-else class="text-sm text-muted-foreground">{{ $t('views.localFolder.empty') }}</div>
          </div>
          <div class="flex h-28 shrink-0 gap-2 overflow-x-auto overflow-y-hidden border-t bg-background p-2">
            <ContextMenu v-for="entry in visibleEntries" :key="entry.path">
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
                  <component :is="fileIcon(entry)" class="size-8 shrink-0" :class="entry.isDirectory ? 'text-amber-500' : 'text-muted-foreground'" />
                  <span class="line-clamp-2 max-w-full break-all">{{ entry.name }}</span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent class="w-48">
                <ContextMenuItem @click="openEntry(entry)"><FolderOpen />{{ $t('views.localFolder.open') }}</ContextMenuItem>
                <ContextMenuItem :disabled="entry.isDirectory" @click="importFiles([entry])"><Import />{{ $t('views.localFolder.import') }}</ContextMenuItem>
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

    <div v-if="selectedPaths.length" class="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-3">
      <div class="pointer-events-auto flex max-w-full items-center gap-1 rounded-md border bg-background p-1.5 shadow-lg">
        <span class="px-2 text-xs text-muted-foreground">{{ $t('views.localFolder.selectedCount', { count: selectedPaths.length }) }}</span>
        <Button size="sm" variant="ghost" :disabled="selectedFiles.length === 0" @click="importFiles(selectedFiles)"><Import />{{ $t('views.localFolder.batchImport') }}</Button>
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
  </section>
</template>
