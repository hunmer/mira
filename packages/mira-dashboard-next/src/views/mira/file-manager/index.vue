<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLibrary } from '@/composables/useLibrary'
import { fileManagerApi, fileApi } from '@/api'
import { downloadApi, type DownloadProgress } from '@/api/modules/download'
import PathTreeSelect from '@/components/PathTreeSelect.vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  RiFolderLine, RiFileLine, RiMoreLine, RiHome4Line,
  RiCheckboxBlankLine, RiCheckboxCircleLine, RiDeleteBinLine, RiDragMoveLine,
  RiUploadCloudLine, RiCloseLine, RiRefreshLine, RiDownloadCloud2Line,
} from '@remixicon/vue'
import { toast } from 'vue-sonner'

interface FileItem {
  name: string
  path: string
  isDir: boolean
  size: number
  modified: string
  extension?: string
}

const { t } = useI18n()
const { selectedId: selectedLibraryId, selectedLibrary } = useLibrary()

const items = ref<FileItem[]>([])
const total = ref(0)
const loading = ref(false)
const currentPath = ref('')
const offset = ref(0)
const limit = 50

const selected = ref<Set<string>>(new Set())
const contextMenuTarget = ref<FileItem | null>(null)
const contextMenuPos = ref({ x: 0, y: 0 })
const showContextMenu = ref(false)

// 框选状态
const gridRef = ref<HTMLElement | null>(null)
const isLassoActive = ref(false)
const lassoRect = ref({ left: 0, top: 0, width: 0, height: 0 })
let lassoStartX = 0
let lassoStartY = 0
let lassoBaseSelected = new Set<string>()
let lassoRaf = 0
let lassoPending: MouseEvent | null = null

// 移动对话框
const moveDialogVisible = ref(false)
const moveSource = ref('')
const moveTargetPath = ref('')
const moveLoading = ref(false)

// 删除确认
const deleteDialogVisible = ref(false)
const deletePaths = ref<string[]>([])
const deleteLoading = ref(false)

// 上传对话框
const uploadDialogVisible = ref(false)
const uploadFiles = ref<File[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const dragOver = ref(false)

// 同步
const syncing = ref(false)

// 批量下载
const downloading = ref(false)

// URL 下载
const urlDialogVisible = ref(false)
const urlText = ref('')
const urlDownloading = ref(false)
const urlProgress = ref<DownloadProgress | null>(null)
let urlPollTimer: ReturnType<typeof setInterval> | null = null

function openUrlDialog() {
  if (!selectedLibraryId.value) {
    toast.error(t('fileManager.download.noLibrary'))
    return
  }
  urlText.value = ''
  urlProgress.value = null
  urlDialogVisible.value = true
}

async function startUrlDownload() {
  const urls = urlText.value.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s))
  if (urls.length === 0) {
    toast.error(t('fileManager.download.empty'))
    return
  }
  urlDownloading.value = true
  urlProgress.value = null
  try {
    const res = await downloadApi.start({ libraryId: selectedLibraryId.value, urls })
    const batchId = res.data?.data?.batchId
    if (!batchId) throw new Error('no batchId')
    pollUrlProgress(batchId)
  } catch (e: any) {
    toast.error(e.response?.data?.message || e.message || t('common.failed'))
    urlDownloading.value = false
  }
}

function pollUrlProgress(batchId: string) {
  stopUrlPoll()
  urlPollTimer = setInterval(async () => {
    try {
      const res = await downloadApi.progress(batchId)
      const p = res.data?.data
      if (!p) return
      urlProgress.value = p
      if (p.done) {
        stopUrlPoll()
        urlDownloading.value = false
        const msg = `${t('fileManager.download.completed')}: ${p.completed}/${p.total}` +
          (p.failed ? `, ${t('fileManager.download.failed')} ${p.failed}` : '') +
          (p.skipped ? `, ${t('fileManager.download.skipped')} ${p.skipped}` : '')
        toast.success(msg)
        await loadItems()
      }
    } catch { /* ignore */ }
  }, 1500)
}

function stopUrlPoll() {
  if (urlPollTimer) { clearInterval(urlPollTimer); urlPollTimer = null }
}

const urlPercent = computed(() => {
  const p = urlProgress.value
  if (!p || !p.total) return 0
  return Math.round(((p.completed + p.failed + p.skipped) / p.total) * 100)
})

const canUpload = computed(() => selectedLibraryId.value && uploadFiles.value.length > 0)

function handleDrop(e: DragEvent) {
  dragOver.value = false
  if (e.dataTransfer?.files) {
    uploadFiles.value.push(...Array.from(e.dataTransfer.files))
  }
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) uploadFiles.value.push(...Array.from(input.files))
}

function removeUploadFile(index: number) {
  uploadFiles.value.splice(index, 1)
}

function openUploadDialog() {
  uploadFiles.value = []
  uploadProgress.value = 0
  uploading.value = false
  uploadDialogVisible.value = true
}

async function handleUpload() {
  if (!selectedLibraryId.value || !uploadFiles.value.length) return
  uploading.value = true
  uploadProgress.value = 0
  try {
    for (const file of uploadFiles.value) {
      const fd = new FormData()
      fd.append('files', file)
      fd.append('libraryId', selectedLibraryId.value)
      fd.append('payload', JSON.stringify({ data: { tags: [], folder_id: null } }))
      await fileApi.uploadProgress(selectedLibraryId.value, fd, (p) => { uploadProgress.value = p })
    }
    toast.success(t('fileUpload.uploadSuccess'))
    uploadFiles.value = []
    uploadDialogVisible.value = false
    loadItems()
  } catch {
    toast.error(t('fileUpload.uploadFailed'))
  } finally {
    uploading.value = false
  }
}

const breadcrumbs = computed(() => {
  if (!currentPath.value) return []
  return currentPath.value.split(/[/\\]/).filter(Boolean)
})

const hasMore = computed(() => offset.value + limit < total.value)

const allSelected = computed(() =>
  items.value.length > 0 && items.value.every(item => selected.value.has(item.path)),
)

function formatSize(bytes: number) {
  if (bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function fileIconClass(item: FileItem) {
  if (item.isDir) return 'text-blue-500'
  const ext = item.extension?.toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext || '')) return 'text-green-500'
  if (['.mp4', '.avi', '.mkv', '.mov', '.wmv'].includes(ext || '')) return 'text-purple-500'
  if (['.mp3', '.wav', '.flac', '.aac', '.ogg'].includes(ext || '')) return 'text-orange-500'
  return 'text-muted-foreground'
}

async function loadItems(append = false) {
  if (!selectedLibraryId.value) return
  loading.value = true
  try {
    const res = await fileManagerApi.list({
      libraryId: selectedLibraryId.value,
      path: currentPath.value || undefined,
      offset: append ? offset.value : 0,
      limit,
    })
    const data = res.data
    if (append) {
      items.value.push(...data.items)
    } else {
      items.value = data.items
    }
    total.value = data.total
    offset.value = append ? offset.value + data.items.length : data.items.length
  } catch (e: any) {
    toast.error(e.response?.data?.error || t('fileManager.loadFailed'))
  } finally {
    loading.value = false
  }
}

function navigateTo(dirPath: string) {
  currentPath.value = dirPath
  offset.value = 0
  selected.value.clear()
  loadItems()
}

function navigateBreadcrumb(index: number) {
  const parts = currentPath.value.split(/[/\\]/).filter(Boolean)
  navigateTo(parts.slice(0, index + 1).join('/'))
}

function openItem(item: FileItem) {
  if (item.isDir) {
    navigateTo(item.path)
  }
}

function toggleSelect(item: FileItem) {
  if (selected.value.has(item.path)) {
    selected.value.delete(item.path)
  } else {
    selected.value.add(item.path)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selected.value.clear()
  } else {
    items.value.forEach(item => selected.value.add(item.path))
  }
}

// 右键菜单
function onContextMenu(e: MouseEvent, item: FileItem) {
  e.preventDefault()
  contextMenuTarget.value = item
  contextMenuPos.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
  // 点击其他地方关闭
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu, { once: true })
  }, 0)
}

function closeContextMenu() {
  showContextMenu.value = false
  contextMenuTarget.value = null
}

function openMoveDialog(source: string) {
  moveSource.value = source
  moveTargetPath.value = ''
  moveDialogVisible.value = true
  closeContextMenu()
}

function openDeleteDialog(paths: string[]) {
  deletePaths.value = paths
  deleteDialogVisible.value = true
  closeContextMenu()
}

async function handleMove(destPath: string) {
  if (!destPath || !selectedLibraryId.value) return
  moveLoading.value = true
  try {
    await fileManagerApi.move({
      libraryId: selectedLibraryId.value,
      source: moveSource.value,
      destination: destPath,
    })
    toast.success(t('fileManager.moveSuccess'))
    moveDialogVisible.value = false
    loadItems()
  } catch (e: any) {
    toast.error(e.response?.data?.error || t('fileManager.moveFailed'))
  } finally {
    moveLoading.value = false
  }
}

async function handleDelete() {
  if (!selectedLibraryId.value) return
  deleteLoading.value = true
  try {
    await fileManagerApi.remove({
      libraryId: selectedLibraryId.value,
      paths: deletePaths.value,
    })
    toast.success(t('fileManager.deleteSuccess'))
    deleteDialogVisible.value = false
    selected.value.clear()
    loadItems()
  } catch (e: any) {
    toast.error(e.response?.data?.error || t('fileManager.deleteFailed'))
  } finally {
    deleteLoading.value = false
  }
}

function batchMove() {
  if (selected.value.size === 1) {
    openMoveDialog([...selected.value][0])
  }
}

function batchDelete() {
  if (selected.value.size > 0) {
    openDeleteDialog([...selected.value])
  }
}

async function batchDownload() {
  if (!selectedLibraryId.value || selected.value.size === 0) return
  downloading.value = true
  try {
    const resp = await fileManagerApi.download({
      libraryId: selectedLibraryId.value,
      paths: [...selected.value],
    })
    // 从 content-disposition 解析文件名（filename*=UTF-8''xxx 优先）
    const cd = resp.headers?.['content-disposition'] || ''
    let fileName = ''
    const star = cd.match(/filename\*=UTF-8''([^;]+)/i)
    if (star) fileName = decodeURIComponent(star[1])
    if (!fileName) {
      const plain = cd.match(/filename="?([^";]+)"?/i)
      if (plain) fileName = plain[1]
    }
    if (!fileName) fileName = selected.value.size === 1 ? [...selected.value][0].split(/[/\\]/).pop() || 'download' : 'download.zip'

    const blob = new Blob([resp.data as BlobPart])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e: any) {
    toast.error(e.response?.data?.error || e.message || t('common.failed'))
  } finally {
    downloading.value = false
  }
}

async function syncFiles() {
  if (!selectedLibraryId.value) return
  syncing.value = true
  try {
    const res = await fileManagerApi.sync(selectedLibraryId.value)
    const { added, removed, scanned } = res.data.data
    toast.success(t('fileManager.syncResult', { scanned, added, removed }))
    loadItems()
  } catch (e: any) {
    toast.error(e.response?.data?.error || t('fileManager.syncFailed'))
  } finally {
    syncing.value = false
  }
}

function loadMore() {
  loadItems(true)
}

// --- 框选 ---
function onLassoMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  if ((e.target as HTMLElement).closest('[data-selectable-item]')) return
  const container = gridRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  lassoStartX = e.clientX - rect.left + container.scrollLeft
  lassoStartY = e.clientY - rect.top + container.scrollTop
  lassoBaseSelected = new Set(selected.value)
  isLassoActive.value = true
  lassoRect.value = { left: lassoStartX, top: lassoStartY, width: 0, height: 0 }
  document.addEventListener('mousemove', onLassoMouseMove)
  document.addEventListener('mouseup', onLassoMouseUp)
}

function onLassoMouseMove(e: MouseEvent) {
  if (!isLassoActive.value) return
  lassoPending = e
  if (lassoRaf) return
  lassoRaf = requestAnimationFrame(doLassoUpdate)
}

function doLassoUpdate() {
  lassoRaf = 0
  const e = lassoPending
  if (!e || !isLassoActive.value) return
  const container = gridRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const x = e.clientX - rect.left + container.scrollLeft
  const y = e.clientY - rect.top + container.scrollTop
  const left = Math.min(lassoStartX, x)
  const top = Math.min(lassoStartY, y)
  const width = Math.abs(x - lassoStartX)
  const height = Math.abs(y - lassoStartY)
  lassoRect.value = { left, top, width, height }

  // 碰撞检测：用 scrollTop 偏移后的坐标
  const scrollLeft = container.scrollLeft
  const scrollTop = container.scrollTop
  const cards = container.querySelectorAll<HTMLElement>('[data-selectable-item]')
  const newSelected = new Set<string>(lassoBaseSelected)
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    const cr = card.getBoundingClientRect()
    const cLeft = cr.left - rect.left + scrollLeft
    const cTop = cr.top - rect.top + scrollTop
    const cRight = cLeft + cr.width
    const cBottom = cTop + cr.height
    if (left < cRight && left + width > cLeft && top < cBottom && top + height > cTop) {
      newSelected.add(card.dataset.path!)
    }
  }
  selected.value = newSelected
}

function onLassoMouseUp() {
  isLassoActive.value = false
  if (lassoRaf) { cancelAnimationFrame(lassoRaf); lassoRaf = 0 }
  lassoPending = null
  document.removeEventListener('mousemove', onLassoMouseMove)
  document.removeEventListener('mouseup', onLassoMouseUp)
}

function onGridDblClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('[data-selectable-item]')) return
  selected.value.clear()
}

onUnmounted(() => {
  if (lassoRaf) cancelAnimationFrame(lassoRaf)
  document.removeEventListener('mousemove', onLassoMouseMove)
  document.removeEventListener('mouseup', onLassoMouseUp)
  stopUrlPoll()
})

watch(selectedLibraryId, () => {
  currentPath.value = ''
  offset.value = 0
  selected.value.clear()
  if (selectedLibraryId.value) loadItems()
})

onMounted(() => {
  if (selectedLibraryId.value) loadItems()
})
</script>

<template>
  <div class="space-y-4" @click="closeContextMenu">
    <!-- 头部 -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-normal">{{ t('fileManager.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('fileManager.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <Button v-if="selected.size === 0" variant="outline" size="sm" :disabled="!selectedLibraryId" @click="openUploadDialog">
          <RiUploadCloudLine class="mr-1 size-4" />
          {{ t('nav.fileUpload') }}
        </Button>
        <Button
          v-if="selected.size > 0"
          variant="outline"
          size="sm"
          :disabled="selected.size !== 1"
          @click="batchMove"
        >
          <RiDragMoveLine class="mr-1 size-4" />
          {{ t('fileManager.move') }}
        </Button>
        <Button
          v-if="selected.size > 0"
          variant="outline"
          size="sm"
          :disabled="downloading"
          @click="batchDownload"
        >
          <span v-if="downloading" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <RiDownloadCloud2Line v-else class="mr-1 size-4" />
          {{ t('fileManager.downloadBatch') }}
        </Button>
        <Button
          v-if="selected.size > 0"
          variant="destructive"
          size="sm"
          @click="batchDelete"
        >
          <RiDeleteBinLine class="mr-1 size-4" />
          {{ t('fileManager.delete') }}
        </Button>
        <Button v-if="selected.size === 0" variant="outline" size="sm" :disabled="!selectedLibraryId" @click="openUrlDialog">
          <RiDownloadCloud2Line class="mr-1 size-4" />
          {{ t('fileManager.download.urlButton') }}
        </Button>
        <Button v-if="selected.size === 0" variant="outline" size="sm" :disabled="!selectedLibraryId || loading" @click="loadItems()">
          {{ t('common.refresh') }}
        </Button>
        <Button v-if="selected.size === 0" variant="outline" size="sm" :disabled="!selectedLibraryId || syncing" @click="syncFiles">
          <span v-if="syncing" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <RiRefreshLine v-else class="mr-1 size-4" />
          {{ syncing ? t('fileManager.syncing') : t('fileManager.sync') }}
        </Button>
      </div>
    </div>

    <!-- 面包屑 -->
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink as-child>
            <button class="inline-flex items-center gap-1" @click="navigateTo('')">
              <RiHome4Line class="size-4" />
              {{ selectedLibrary?.name || 'Root' }}
            </button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <template v-for="(seg, i) in breadcrumbs" :key="i">
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink v-if="i < breadcrumbs.length - 1" as-child>
              <button @click="navigateBreadcrumb(i)">{{ seg }}</button>
            </BreadcrumbLink>
            <BreadcrumbPage v-else>{{ seg }}</BreadcrumbPage>
          </BreadcrumbItem>
        </template>
      </BreadcrumbList>
    </Breadcrumb>

    <!-- 工具栏 -->
    <div v-if="items.length" class="flex items-center gap-2 text-sm text-muted-foreground">
      <button class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent" @click="toggleSelectAll">
        <RiCheckboxCircleLine v-if="allSelected" class="size-4 text-primary" />
        <RiCheckboxBlankLine v-else class="size-4" />
      </button>
      <span v-if="selected.size">{{ t('fileManager.selected', { n: selected.size }) }}</span>
      <span>{{ t('common.total', { n: total }) }}</span>
    </div>

    <!-- 文件网格（固定高度 + 滚动 + 框选） -->
    <div
      ref="gridRef"
      class="h-[calc(100vh-16rem)] overflow-y-auto relative select-none"
      @mousedown="onLassoMouseDown"
      @dblclick="onGridDblClick"
    >
      <div v-if="items.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <div
        v-for="item in items"
        :key="item.path"
        data-selectable-item
        :data-path="item.path"
        class="group relative flex cursor-pointer flex-col items-center rounded-lg border p-3 transition-colors hover:bg-accent/50"
        :class="{ 'border-primary bg-primary/5': selected.has(item.path) }"
        @click.exact="toggleSelect(item)"
        @dblclick="openItem(item)"
        @contextmenu="onContextMenu($event, item)"
      >
        <!-- 右上角 checkbox -->
        <div
          class="absolute right-1.5 top-1.5 z-10"
          @click.stop="toggleSelect(item)"
        >
          <div class="rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100" :class="{ '!opacity-100': selected.has(item.path) }">
            <RiCheckboxCircleLine v-if="selected.has(item.path)" class="size-4 text-primary" />
            <RiCheckboxBlankLine v-else class="size-4 text-muted-foreground" />
          </div>
        </div>

        <component :is="item.isDir ? RiFolderLine : RiFileLine" class="size-10 mb-2" :class="fileIconClass(item)" />

        <span class="w-full truncate text-center text-sm" :title="item.name">{{ item.name }}</span>
        <span class="text-xs text-muted-foreground">
          {{ item.isDir ? t('fileManager.folder') : formatSize(item.size) }}
        </span>

        <!-- 右键菜单触发按钮 -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              class="absolute left-2 bottom-2 rounded p-1 opacity-0 hover:bg-accent group-hover:opacity-100"
              @click.stop
            >
              <RiMoreLine class="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem v-if="item.isDir" @click="navigateTo(item.path)">
              <RiFolderLine class="mr-2 size-4" /> {{ t('fileManager.open') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="openMoveDialog(item.path)">
              <RiDragMoveLine class="mr-2 size-4" /> {{ t('fileManager.move') }}
            </DropdownMenuItem>
            <DropdownMenuItem class="text-destructive" @click="openDeleteDialog([item.path])">
              <RiDeleteBinLine class="mr-2 size-4" /> {{ t('fileManager.delete') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

      <!-- 空状态 -->
      <div v-if="!items.length && !loading" class="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <RiFolderLine class="size-12 mb-3 opacity-50" />
        <p>{{ t('fileManager.empty') }}</p>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="flex justify-center py-8">
        <span class="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore && !loading" class="flex justify-center">
        <Button variant="outline" @click="loadMore">
          {{ t('fileManager.loadMore') }}
        </Button>
      </div>

      <!-- 框选遮罩 -->
      <div
        v-if="isLassoActive && (lassoRect.width > 2 || lassoRect.height > 2)"
        class="absolute pointer-events-none border-2 border-primary/60 bg-primary/10 rounded-sm z-20"
        :style="{
          left: lassoRect.left + 'px',
          top: lassoRect.top + 'px',
          width: lassoRect.width + 'px',
          height: lassoRect.height + 'px',
        }"
      />
    </div>

    <!-- 右键菜单（浮动） -->
    <Teleport to="body">
      <div
        v-if="showContextMenu && contextMenuTarget"
        class="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md"
        :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
      >
        <button
          v-if="contextMenuTarget.isDir"
          class="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
          @click="navigateTo(contextMenuTarget!.path); closeContextMenu()"
        >
          <RiFolderLine class="size-4" /> {{ t('fileManager.open') }}
        </button>
        <button
          class="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
          @click="openMoveDialog(contextMenuTarget!.path)"
        >
          <RiDragMoveLine class="size-4" /> {{ t('fileManager.move') }}
        </button>
        <button
          class="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-destructive hover:bg-accent"
          @click="openDeleteDialog([contextMenuTarget!.path])"
        >
          <RiDeleteBinLine class="size-4" /> {{ t('fileManager.delete') }}
        </button>
      </div>
    </Teleport>

    <!-- 移动对话框 -->
    <Dialog :open="moveDialogVisible" @update:open="moveDialogVisible = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('fileManager.moveTitle') }}</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-muted-foreground">{{ t('fileManager.moveDesc', { name: moveSource.split(/[/\\]/).pop() }) }}</p>
        <PathTreeSelect v-model="moveTargetPath" :placeholder="t('fileManager.selectTarget')" />
        <DialogFooter>
          <Button variant="outline" @click="moveDialogVisible = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="!moveTargetPath || moveLoading" @click="handleMove(moveTargetPath)">
            <span v-if="moveLoading" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {{ t('fileManager.move') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 删除确认对话框 -->
    <Dialog :open="deleteDialogVisible" @update:open="deleteDialogVisible = $event">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ t('fileManager.deleteTitle') }}</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-muted-foreground">
          {{ t('fileManager.deleteConfirm', { n: deletePaths.length }) }}
        </p>
        <DialogFooter>
          <Button variant="outline" @click="deleteDialogVisible = false">{{ t('common.cancel') }}</Button>
          <Button variant="destructive" :disabled="deleteLoading" @click="handleDelete">
            <span v-if="deleteLoading" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {{ t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 上传对话框 -->
    <Dialog :open="uploadDialogVisible" @update:open="uploadDialogVisible = $event">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t('fileUpload.title') }}</DialogTitle>
        </DialogHeader>
        <div
          class="rounded-lg border-2 border-dashed p-8 text-center transition-colors"
          :class="{ 'border-primary bg-primary/5': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="handleDrop"
        >
          <RiUploadCloudLine class="mx-auto size-10 text-muted-foreground" />
          <p class="mt-3 text-sm text-muted-foreground">{{ t('fileUpload.dragHere') }}</p>
          <p class="mt-1 text-xs text-muted-foreground">{{ t('fileUpload.or') }}</p>
          <label class="mt-3 inline-block cursor-pointer">
            <input type="file" multiple class="hidden" @change="handleFileInput" />
            <Button variant="outline" size="sm" as="span">{{ t('fileUpload.browse') }}</Button>
          </label>
        </div>
        <div v-if="uploadFiles.length" class="max-h-48 space-y-2 overflow-y-auto">
          <div v-for="(file, i) in uploadFiles" :key="i" class="flex items-center gap-3 rounded-md border p-2">
            <RiFileLine class="size-4 shrink-0 text-muted-foreground" />
            <span class="flex-1 truncate text-sm">{{ file.name }}</span>
            <span class="shrink-0 text-xs text-muted-foreground">{{ (file.size / 1024).toFixed(1) }} KB</span>
            <Button variant="ghost" size="icon" class="size-6" @click="removeUploadFile(i)">
              <RiCloseLine class="size-3" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="uploadDialogVisible = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="!canUpload || uploading" @click="handleUpload">
            <span v-if="uploading" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {{ uploading ? `${t('fileUpload.uploading')} ${uploadProgress}%` : t('fileUpload.startUpload') }}
          </Button>
        </DialogFooter>
        <div v-if="uploading" class="h-2 rounded-full bg-secondary">
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${uploadProgress}%` }" />
        </div>
      </DialogContent>
    </Dialog>

    <!-- URL 下载对话框 -->
    <Dialog :open="urlDialogVisible" @update:open="urlDialogVisible = $event">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{{ t('fileManager.download.urlButton') }}</DialogTitle>
          <DialogDescription>
            {{ t('fileManager.download.subtitle') }}
            <span v-if="selectedLibrary" class="font-medium text-foreground">{{ selectedLibrary.name }}</span>
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-3 py-2">
          <Textarea
            v-model="urlText"
            :placeholder="t('fileManager.download.placeholder')"
            rows="8"
            class="font-mono text-xs"
            :disabled="urlDownloading"
          />
          <div v-if="urlProgress" class="space-y-2">
            <Progress :model-value="urlPercent" />
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{{ t('fileManager.download.total', { n: urlProgress.total }) }}</span>
              <span class="text-green-600">{{ t('fileManager.download.completed', { n: urlProgress.completed }) }}</span>
              <span v-if="urlProgress.skipped" class="text-yellow-600">{{ t('fileManager.download.skipped', { n: urlProgress.skipped }) }}</span>
              <span v-if="urlProgress.failed" class="text-destructive">{{ t('fileManager.download.failed', { n: urlProgress.failed }) }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground">{{ t('fileManager.download.cookieHint') }}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" :disabled="urlDownloading" @click="urlDialogVisible = false">
            {{ urlProgress?.done ? t('common.confirm') : t('common.cancel') }}
          </Button>
          <Button :disabled="urlDownloading || !urlText.trim()" @click="startUrlDownload">
            <span v-if="urlDownloading" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {{ urlDownloading ? t('common.loading') : t('fileManager.download.start') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
