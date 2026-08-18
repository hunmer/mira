<script setup lang="ts">
/**
 * FileSystem —— macOS Finder 风格文件浏览器（由 React 版 file-system.tsx 移植）
 *
 * 图标 / 列表 / 分栏 / 画廊四种视图，导航历史、工具栏搜索、排序、
 * 文件类型与日期过滤、懒加载子项、类型快进与完整的键盘导航。
 *
 * 与原版的差异（依赖库内无对应物或 Vue 侧成本更低）：
 * - 列表视图不再依赖 @pierre/trees，改为原生 Vue 树（见 FileSystemListView）
 * - 文件类型图标复用库内 file-icon 的 vscode-file-icons 彩色 SVG
 * - 画廊/对话框的 keep-alive 预览池（portal 重挂载）省略——PDF/DOCX/XLSX
 *   本就是轻量占位面板，重挂载成本可忽略；共享 URL 缓存保留
 * - onFileOpen 回调改为 fileOpen 事件且不再拦截默认打开行为（仅通知）
 * - 渲染自定义 renderFilePreview 回调未移植，无缩略图的文件始终显示通用预览
 *
 * 用法：
 *   <FileSystem :items="items" title="Files" @selection-change="..." @file-open="..." />
 */
import {
  computed,
  markRaw,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
} from "vue"
import {
  ArrowLeft,
  ArrowRight,
  Columns3,
  Images,
  LayoutGrid,
  List,
} from "@lucide/vue"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FileSystemColumnsView from "./FileSystemColumnsView.vue"
import FileSystemDateRangeDialog from "./FileSystemDateRangeDialog.vue"
import FileSystemFilterMenu from "./FileSystemFilterMenu.vue"
import FileSystemFilterPill from "./FileSystemFilterPill.vue"
import FileSystemGalleryStage from "./FileSystemGalleryStage.vue"
import FileSystemGalleryView from "./FileSystemGalleryView.vue"
import FileSystemIconsView from "./FileSystemIconsView.vue"
import FileSystemListView from "./FileSystemListView.vue"
import FileSystemSearchField from "./FileSystemSearchField.vue"
import FileSystemSortSelect from "./FileSystemSortSelect.vue"
import {
  DEFAULT_SORT,
  MIME_TYPE_LABELS,
  VIEWER_DIALOG_CLASSNAMES,
  buildFileSystemIndex,
  compareEntriesBySort,
  defaultSortDirection,
  fileTypeFilterGroup,
  fileMatchesFilter,
  isCustomDateRangeValue,
  mimeTypeForFile,
  normalizeFolderPath,
  normalizeSearchQuery,
  pathName,
  pathParent,
  viewerKindForFile,
  type FileEntry,
  type FileSystemDateFilterType,
  type FileSystemEntry,
  type FileSystemFileItem,
  type FileSystemFilter,
  type FileSystemFilterOperator,
  type FileSystemIndex,
  type FileSystemItem,
  type FileSystemLoadChildrenResult,
  type FileSystemSortKey,
  type FileSystemSortState,
  type FileSystemView,
  type FileSystemViewerKind,
  type FileTypeFilterOption,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystem" })

const props = withDefaults(
  defineProps<{
    /** 平铺清单。文件夹可选；缺失的前缀会从文件路径推断。 */
    items: FileSystemItem[]
    class?: string
    /** 根文件夹标签。 */
    title?: string
    defaultView?: FileSystemView
    view?: FileSystemView
    /** 初始打开的文件夹前缀，如 `"invoices/"`。 */
    defaultPath?: string
    /** 为没有 URL 的文件解析（如预签名）URL。 */
    getFileUrl?: (file: FileSystemFileItem) => string | Promise<string>
    /** 为带 hasChildren 且尚无条目的文件夹懒加载子项。 */
    loadChildren?: (
      args: { path: string, cursor: string | null }
    ) => Promise<FileSystemLoadChildrenResult>
    /** 懒加载 eager 提供之外的页缩略图（翻页器按需调用）。 */
    loadPreviewImageUrl?: (
      file: FileSystemFileItem,
      pageIndex: number
    ) => Promise<string | null>
  }>(),
  {
    class: undefined,
    title: "Files",
    defaultView: "icons",
    view: undefined,
    defaultPath: "",
    getFileUrl: undefined,
    loadChildren: undefined,
    loadPreviewImageUrl: undefined,
  }
)

const emit = defineEmits<{
  (e: "viewChange", view: FileSystemView): void
  (e: "selectionChange", item: FileSystemItem | null): void
  (e: "fileOpen", file: FileSystemFileItem, url: string | null): void
}>()

const IPAD_MIN_WIDTH = 768

const VIEW_OPTIONS: Array<{
  icon: Component
  label: string
  value: FileSystemView
}> = [
  { icon: markRaw(LayoutGrid), label: "Grid", value: "icons" },
  { icon: markRaw(List), label: "List", value: "list" },
  { icon: markRaw(Columns3), label: "Columns", value: "columns" },
  { icon: markRaw(Images), label: "Gallery", value: "gallery" },
]

const internalView = ref(props.defaultView)
const view = () => props.view ?? internalView.value

function setView(nextView: FileSystemView) {
  internalView.value = nextView
  emit("viewChange", nextView)
}

const loadedItems = ref<FileSystemItem[]>([])
const allItems = computed(() =>
  loadedItems.value.length
    ? [...props.items, ...loadedItems.value]
    : props.items
)
const index = computed<FileSystemIndex>(() => buildFileSystemIndex(allItems.value))

const history = ref({
  index: 0,
  stack: [normalizeFolderPath(props.defaultPath)],
})
const currentPath = computed(
  () => history.value.stack[history.value.index] ?? ""
)
const canGoBack = computed(() => history.value.index > 0)
const canGoForward = computed(
  () => history.value.index < history.value.stack.length - 1
)

const selectedPath = ref<string | null>(null)
const selectedEntry = computed<FileSystemEntry | null>(() => {
  if (selectedPath.value === null) return null

  return (
    index.value.files.get(selectedPath.value) ??
    index.value.folders.get(selectedPath.value) ??
    null
  )
})

const searchInput = ref("")
const searchFieldRef = ref<InstanceType<
  typeof FileSystemSearchField
> | null>(null)
const isSearchExpanded = ref(false)
const searchQuery = computed(() => normalizeSearchQuery(searchInput.value))
const isSearching = computed(() => searchQuery.value.length > 0)

const sort = ref<FileSystemSortState>({ ...DEFAULT_SORT })
const filters = ref<FileSystemFilter[]>([])
const hasActiveFilters = computed(() => filters.value.length > 0)

// 搜索/过滤激活时保持可见的路径：当前文件夹下相对路径含查询词的每个文件
// （列表树的隐藏不匹配语义）且通过全部过滤器，加上通向它的祖先文件夹。
// 仅在没有过滤器时文件夹名才参与搜索匹配；有过滤器时文件夹只随其中的
// 文件可见。
const visiblePaths = computed<Set<string> | null>(() => {
  const activeFilters = filters.value
  const query = searchQuery.value
  const searching = query.length > 0

  if (!searching && activeFilters.length === 0) return null

  const fileFilter =
    activeFilters.length === 0
      ? null
      : (file: FileEntry) =>
          activeFilters.every((filter) => fileMatchesFilter(file, filter))
  const visible = new Set<string>()
  const markVisible = (path: string) => {
    while (path && path !== currentPath.value && !visible.has(path)) {
      visible.add(path)
      path = pathParent(path)
    }
  }
  const matchesQuery = (path: string) =>
    !searching ||
    path.slice(currentPath.value.length).toLowerCase().includes(query)

  for (const [path, file] of index.value.files) {
    if (path === currentPath.value) continue
    if (currentPath.value && !path.startsWith(currentPath.value)) continue
    if (!matchesQuery(path)) continue
    if (fileFilter && !fileFilter(file)) continue
    markVisible(path)
  }
  if (!fileFilter) {
    for (const path of index.value.folders.keys()) {
      if (path === currentPath.value) continue
      if (currentPath.value && !path.startsWith(currentPath.value)) continue
      if (matchesQuery(path)) markVisible(path)
    }
  }
  return visible
})

const visibleIndex = computed<FileSystemIndex>(() => {
  const paths = visiblePaths.value

  if (!paths) return index.value

  const children = new Map<string, FileSystemEntry[]>()

  for (const [parentPath, parentChildren] of index.value.children) {
    const visibleChildren = parentChildren.filter((entry) =>
      paths.has(entry.path)
    )

    if (visibleChildren.length) children.set(parentPath, visibleChildren)
  }
  return { ...index.value, children }
})

// 子项按激活排序重排；默认（名称升序）直接复用索引的预排序数组。
const sortedIndex = computed<FileSystemIndex>(() => {
  if (
    sort.value.key === DEFAULT_SORT.key &&
    sort.value.direction === DEFAULT_SORT.direction
  ) {
    return visibleIndex.value
  }

  const children = new Map<string, FileSystemEntry[]>()

  for (const [parentPath, parentChildren] of visibleIndex.value.children) {
    children.set(
      parentPath,
      [...parentChildren].sort((left, right) =>
        compareEntriesBySort(left, right, sort.value)
      )
    )
  }
  return { ...visibleIndex.value, children }
})

// ref 镜像选中路径，重复选中同一条目（如分栏视图每次按压发出的
// pointerdown + click 对）保持无操作。
let selectedPathMirror: string | null = null

function selectEntry(entry: FileSystemEntry | null) {
  const path = entry?.path ?? null

  if (selectedPathMirror === path) return
  selectedPathMirror = path
  selectedPath.value = path
  emit("selectionChange", entry)
}

// 查询或过滤变化可能把选中条目藏起来。
watch([visiblePaths, selectedPath], ([paths, selected]) => {
  if (!paths || !selected) return
  if (!paths.has(selected)) selectEntry(null)
})

function applySortKey(key: FileSystemSortKey) {
  if (sort.value.key === key) return
  sort.value = { direction: defaultSortDirection(key), key }
}

// 列头点击已激活列时切换方向，与 Finder 一致。
function toggleSortColumn(key: FileSystemSortKey) {
  sort.value =
    sort.value.key === key
      ? {
          direction: sort.value.direction === "asc" ? "desc" : "asc",
          key,
        }
      : { direction: defaultSortDirection(key), key }
}

// 已加载清单中的去重 MIME 类型，供过滤菜单展示；每类型第一个文件借出
// 选项图标的文件名。
const fileTypeOptions = computed<FileTypeFilterOption[]>(() => {
  const byMime = new Map<string, FileTypeFilterOption>()

  for (const file of index.value.files.values()) {
    const mime = mimeTypeForFile(file)

    if (!byMime.has(mime)) {
      // 前导点检查让点文件（.gitignore）保持完整。
      const dotIndex = file.name.lastIndexOf(".")
      const extension =
        dotIndex > 0 ? file.name.slice(dotIndex + 1).toLowerCase() : ""

      byMime.set(mime, {
        group: fileTypeFilterGroup(mime),
        // 合成通用名，带品牌图标的文件（biome.json 等）不会把它借给整个类型。
        iconFileName: extension ? `file.${extension}` : file.name,
        label: MIME_TYPE_LABELS[mime] ?? mime,
        mime,
      })
    }
  }
  return [...byMime.values()].sort((left, right) =>
    left.label.localeCompare(right.label)
  )
})

let filterIdCounter = 0
const dateRangeDialog = ref<{
  initialRange?: { from: Date, to: Date }
  type: FileSystemDateFilterType
} | null>(null)

function toggleFileTypeFilterValue(mime: string, checked: boolean) {
  const id = `filter-${++filterIdCounter}`
  const previous = filters.value
  const existing = previous.find((filter) => filter.type === "fileType")

  if (!existing) {
    if (!checked) return
    filters.value = [
      ...previous,
      { id, operator: "is" as const, type: "fileType" as const, value: [mime] },
    ]
    return
  }

  const value = checked
    ? [...new Set([...existing.value, mime])]
    : existing.value.filter((entry) => entry !== mime)

  if (value.length === 0) {
    filters.value = previous.filter((filter) => filter !== existing)
    return
  }

  // is / is any of 跟随值的数量；is not 不受影响。
  const operator =
    existing.operator === "is" || existing.operator === "is-any-of"
      ? ((value.length > 1 ? "is-any-of" : "is") as FileSystemFilterOperator)
      : existing.operator

  filters.value = previous.map((filter) =>
    filter === existing ? { ...filter, operator, value } : filter
  )
}

function setDatePresetFilter(
  type: FileSystemDateFilterType,
  preset: string
) {
  const id = `filter-${++filterIdCounter}`

  filters.value = [
    ...filters.value.filter((filter) => filter.type !== type),
    { id, operator: "after" as const, type, value: [preset] },
  ]
}

// 编辑已有自定义区间时用其边界种下对话框。
function openDateRangeDialog(type: FileSystemDateFilterType) {
  const existing = filters.value.find((filter) => filter.type === type)

  dateRangeDialog.value = {
    initialRange:
      existing && isCustomDateRangeValue(existing.value)
        ? {
            from: new Date(existing.value[0]),
            to: new Date(existing.value[1]),
          }
        : undefined,
    type,
  }
}

function applyCustomDateRange(
  type: FileSystemDateFilterType,
  from: Date,
  to: Date
) {
  const id = `filter-${++filterIdCounter}`
  const existing = filters.value.find((filter) => filter.type === type)

  filters.value = [
    ...filters.value.filter((filter) => filter.type !== type),
    {
      id,
      operator:
        existing?.operator === "not-in-range"
          ? ("not-in-range" as const)
          : ("in-range" as const),
      type,
      value: [from.toISOString(), to.toISOString()],
    },
  ]
}

function setFilterOperator(filterId: string, operator: FileSystemFilterOperator) {
  filters.value = filters.value.map((entry) =>
    entry.id === filterId ? { ...entry, operator } : entry
  )
}

function removeFilter(filterId: string) {
  filters.value = filters.value.filter((entry) => entry.id !== filterId)
}

function setFilterDatePreset(filterId: string, preset: string) {
  filters.value = filters.value.map((entry) =>
    entry.id === filterId
      ? {
          ...entry,
          operator:
            entry.operator === "before" || entry.operator === "after"
              ? entry.operator
              : "after",
          value: [preset],
        }
      : entry
  )
}

// 宽度低于 iPad 时视图切换折叠为下拉、排序下拉去掉标签；低于 560px 搜索
// 折叠进气泡；低于 360px 连文件夹名也隐藏。
const rootRef = ref<HTMLDivElement | null>(null)
const headerLayout = ref<"full" | "compact" | "minimal">("full")
const isBelowIpadWidth = ref(false)

onMounted(() => {
  const root = rootRef.value

  if (!root || typeof ResizeObserver === "undefined") return

  const applyWidth = (width: number | undefined) => {
    if (width === undefined) return

    headerLayout.value = width < 360 ? "minimal" : width < 560 ? "compact" : "full"
    isBelowIpadWidth.value = width < IPAD_MIN_WIDTH
  }
  const observer = new ResizeObserver((observerEntries) =>
    applyWidth(observerEntries[0]?.contentRect.width)
  )

  // 同步测量让首帧布局即正确；观察器随后跟踪尺寸变化。
  applyWidth(root.clientWidth)
  observer.observe(root)
  onBeforeUnmount(() => observer.disconnect())
})

const requestedFolders = new Set<string>()
const loadingFolders = ref<Set<string>>(new Set())

function ensureChildren(folderPath: string) {
  if (!props.loadChildren) return

  const folder = index.value.folders.get(folderPath)

  if (!folder?.hasChildren) return
  if (index.value.children.get(folderPath)?.length) return
  if (requestedFolders.has(folderPath)) return

  requestedFolders.add(folderPath)
  loadingFolders.value = new Set(loadingFolders.value).add(folderPath)

  void (async () => {
    try {
      let cursor: string | null = null

      do {
        const result = await props.loadChildren!({ cursor, path: folderPath })

        if (result.items.length) {
          loadedItems.value = [...loadedItems.value, ...result.items]
        }
        cursor = result.nextCursor ?? null
      } while (cursor)
    } catch {
      requestedFolders.delete(folderPath)
    } finally {
      const next = new Set(loadingFolders.value)

      next.delete(folderPath)
      loadingFolders.value = next
    }
  })()
}

function navigateTo(folderPath: string) {
  const path = normalizeFolderPath(folderPath)
  const previous = history.value

  if (previous.stack[previous.index] !== path) {
    const stack = [...previous.stack.slice(0, previous.index + 1), path]

    history.value = { index: stack.length - 1, stack }
  }
  // 导航退出搜索，与 Finder 一致。
  searchInput.value = ""
  selectEntry(null)
  ensureChildren(path)
}

// 导航卸载聚焦的行，焦点落回 <body> 会打断快捷键；此时把焦点收回组件根。
let lastNavigatedPath: string | null = null

watch(
  currentPath,
  (path) => {
    const navigated = lastNavigatedPath !== null && lastNavigatedPath !== path

    lastNavigatedPath = path
    ensureChildren(path)
    if (!navigated) return

    const root = rootRef.value

    if (root && document.activeElement === document.body) {
      root.focus({ preventScroll: true })
    }
  },
  { immediate: true }
)

interface OpenedFile {
  file: FileEntry
  kind: FileSystemViewerKind
  url: string
}

const openedFile = ref<OpenedFile | null>(null)

// 组件生命周期内所有视图与打开对话框共享的缓存：按 path 的已解析（如
// 预签名）URL，按 "path#pageIndex" 的懒加载页缩略图。每次解析只发生一次，
// 稳定的 URL 也让浏览器的 HTTP 缓存对已取内容保持有效。
const resolvedUrlCache = new Map<string, string>()
const pageUrlCache = new Map<string, string>()

// 列表视图的展开状态存储：视图切换/导航卸载树时保存，回来时恢复。
const treeExpansion = new Map<string, string[]>()

function openFile(file: FileEntry) {
  void (async () => {
    let url = file.url ?? resolvedUrlCache.get(file.path) ?? null

    if (!url && props.getFileUrl) {
      try {
        url = await props.getFileUrl(file)
        if (url) resolvedUrlCache.set(file.path, url)
      } catch {
        url = null
      }
    }

    emit("fileOpen", file, url)

    const kind = viewerKindForFile(file)

    if (kind && url) {
      openedFile.value = { file, kind, url }
    } else if (url && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  })()
}

function openEntry(entry: FileSystemEntry) {
  if (entry.kind === "folder") {
    navigateTo(entry.path)
  } else {
    openFile(entry)
  }
}

// 选中懒加载文件夹（分栏视图、键盘导航）时预取子项。
function selectAndPrefetchEntry(entry: FileSystemEntry | null) {
  selectEntry(entry)
  if (entry?.kind === "folder") ensureChildren(entry.path)
}

function goBack() {
  history.value = {
    ...history.value,
    index: Math.max(0, history.value.index - 1),
  }
  searchInput.value = ""
  selectEntry(null)
}

function goForward() {
  history.value = {
    ...history.value,
    index: Math.min(history.value.stack.length - 1, history.value.index + 1),
  }
  searchInput.value = ""
  selectEntry(null)
}

const currentEntries = computed(
  () => sortedIndex.value.children.get(currentPath.value) ?? []
)
const currentFolderName = computed(
  () =>
    (currentPath.value === "" ? props.title : pathName(currentPath.value)) ||
    props.title
)
const isLoadingCurrentFolder = computed(() =>
  loadingFolders.value.has(currentPath.value)
)

const openedFileName = computed(() =>
  openedFile.value
    ? (openedFile.value.file.name ?? openedFile.value.file.path)
    : ""
)
const activeViewOption = computed(() =>
  VIEW_OPTIONS.find((option) => option.value === view())
)

// 焦点在组件内时 ⌘F / Ctrl+F 聚焦工具栏搜索。
function onRootKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === "f") {
    event.preventDefault()
    isSearchExpanded.value = true
    searchFieldRef.value?.focus()
  }
}


const emptyStateLabel = computed(() => {
  if (isSearching.value) {
    return `No results for “${searchInput.value.trim()}”`
  }
  return hasActiveFilters.value
    ? "No items match the active filters"
    : "This folder is empty"
})

</script>

<template>
  <div
    ref="rootRef"
    tabindex="-1"
    data-slot="file-system"
    :class="
      cn(
        'flex h-[480px] min-h-0 flex-col overflow-hidden rounded-xl border bg-background text-foreground outline-none',
        props.class
      )
    "
    @keydown="onRootKeydown"
  >
    <div
      class="relative grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b bg-muted/40 px-2"
    >
      <div class="flex min-w-0 items-center gap-0.5">
        <button
          type="button"
          aria-label="Back"
          title="Back"
          :disabled="!canGoBack"
          class="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          @click="goBack"
        >
          <ArrowLeft class="size-4.5" />
        </button>
        <button
          type="button"
          aria-label="Forward"
          title="Forward"
          :disabled="!canGoForward"
          class="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          @click="goForward"
        >
          <ArrowRight class="size-4.5" />
        </button>
        <span
          v-if="headerLayout !== 'minimal'"
          class="ml-1.5 truncate text-sm font-semibold"
        >
          {{ currentFolderName }}
        </span>
      </div>

      <Select
        v-if="headerLayout !== 'full' || isBelowIpadWidth"
        :model-value="view()"
        @update:model-value="(value: any) => setView(value as FileSystemView)"
      >
        <SelectTrigger
          size="sm"
          aria-label="View"
          class="h-7 min-h-7 w-auto min-w-0 [&_svg]:size-4"
        >
          <component
            :is="activeViewOption?.icon"
            v-if="activeViewOption"
            class="size-4"
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in VIEW_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            <span class="flex items-center gap-2">
              <component :is="option.icon" class="size-4" />
              {{ option.label }}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <Tabs
        v-else
        :model-value="view()"
        @update:model-value="(value: any) => setView(value as FileSystemView)"
        class="gap-0"
      >
        <TabsList class="h-8 p-0.5">
          <TabsTrigger
            v-for="option in VIEW_OPTIONS"
            :key="option.value"
            :value="option.value"
            :aria-label="`${option.label} view`"
            :title="option.label"
            class="h-7 grow-0 px-2.5 sm:h-7"
          >
            <component :is="option.icon" class="size-4" />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div class="flex min-w-0 items-center justify-end gap-1">
        <FileSystemSortSelect
          :layout="headerLayout"
          :show-label="!isBelowIpadWidth"
          :sort="sort"
          @key-change="applySortKey"
        />
        <FileSystemFilterMenu
          :file-type-options="fileTypeOptions"
          :filters="filters"
          @open-custom-range="openDateRangeDialog"
          @select-date-preset="setDatePresetFilter"
          @toggle-file-type="toggleFileTypeFilterValue"
        />
        <FileSystemSearchField
          ref="searchFieldRef"
          :is-expanded="isSearchExpanded"
          :layout="headerLayout"
          :value="searchInput"
          @update:is-expanded="(value: boolean) => (isSearchExpanded = value)"
          @update:value="(value: string) => (searchInput = value)"
        />
      </div>
    </div>

    <div
      v-if="hasActiveFilters"
      class="flex shrink-0 flex-wrap items-center gap-1 border-b bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground"
    >
      <template v-for="filter in filters" :key="filter.id">
        <FileSystemFilterPill
          :file-type-options="fileTypeOptions"
          :filter="filter"
          @open-custom-range="
            filter.type !== 'fileType' && openDateRangeDialog(filter.type)
          "
          @operator-change="
            (operator: FileSystemFilterOperator) =>
              setFilterOperator(filter.id, operator)
          "
          @remove="removeFilter(filter.id)"
          @select-date-preset="(preset: string) => setFilterDatePreset(filter.id, preset)"
          @toggle-file-type="toggleFileTypeFilterValue"
        />
      </template>
      <button
        type="button"
        class="rounded-md px-1.5 py-0.5 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        @click="filters = []"
      >
        Clear
      </button>
    </div>

    <div class="relative min-h-0 flex-1">
      <div
        v-if="isLoadingCurrentFolder && currentEntries.length === 0"
        class="flex size-full animate-pulse items-center justify-center text-sm text-muted-foreground motion-reduce:animate-none"
      >
        Loading…
      </div>
      <div
        v-else-if="
          currentEntries.length === 0 &&
          (view() !== 'columns' || isSearching || hasActiveFilters)
        "
        class="flex size-full items-center justify-center text-sm text-muted-foreground"
      >
        {{ emptyStateLabel }}
      </div>
      <FileSystemIconsView
        v-else-if="view() === 'icons'"
        :entries="currentEntries"
        :selected-path="selectedPath"
        @select="selectAndPrefetchEntry"
        @open="openEntry"
      />
      <FileSystemListView
        v-else-if="view() === 'list'"
        :current-path="currentPath"
        :index="sortedIndex"
        :selected-path="selectedPath"
        :sort="sort"
        :visible-paths="visiblePaths"
        :loading-folders="loadingFolders"
        :tree-expansion="treeExpansion"
        @select="selectAndPrefetchEntry"
        @open="openEntry"
        @sort-click="toggleSortColumn"
      />
      <FileSystemColumnsView
        v-else-if="view() === 'columns'"
        :current-path="currentPath"
        :index="sortedIndex"
        :selected-entry="selectedEntry"
        :selected-path="selectedPath"
        :loading-folders="loadingFolders"
        :load-preview-image-url="props.loadPreviewImageUrl"
        :page-url-cache="pageUrlCache"
        @select="selectAndPrefetchEntry"
        @open="openEntry"
      />
      <FileSystemGalleryView
        v-else
        :entries="currentEntries"
        :index="sortedIndex"
        :selected-entry="selectedEntry"
        :selected-path="selectedPath"
        :get-file-url="props.getFileUrl"
        :load-preview-image-url="props.loadPreviewImageUrl"
        :page-url-cache="pageUrlCache"
        :url-cache="resolvedUrlCache"
        @select="selectAndPrefetchEntry"
        @open="openEntry"
      />
    </div>

    <div
      aria-live="polite"
      class="flex h-7 shrink-0 items-center justify-center gap-1 border-t bg-muted/40 px-3 text-xs text-muted-foreground"
    >
      <span>
        {{ currentEntries.length }}
        {{
          isSearching
            ? currentEntries.length === 1
              ? "result"
              : "results"
            : currentEntries.length === 1
              ? "item"
              : "items"
        }}
      </span>
      <span v-if="selectedEntry">· “{{ selectedEntry.name }}” selected</span>
    </div>

    <Dialog
      :open="openedFile !== null"
      @update:open="(open: boolean) => !open && (openedFile = null)"
    >
      <DialogContent
        v-if="openedFile"
        :class="
          cn('overflow-hidden p-0', VIEWER_DIALOG_CLASSNAMES[openedFile.kind])
        "
      >
        <DialogTitle class="sr-only">{{ openedFileName }}</DialogTitle>
        <img
          v-if="openedFile.kind === 'image'"
          :src="openedFile.url"
          :alt="openedFileName"
          class="max-h-[88vh] w-auto max-w-full rounded-2xl object-contain"
        />
        <div v-else class="flex h-full min-h-0 flex-1 flex-col">
          <FileSystemGalleryStage
            variant="dialog"
            :file="openedFile.file"
            :get-file-url="props.getFileUrl"
            :load-preview-image-url="props.loadPreviewImageUrl"
            :page-url-cache="pageUrlCache"
            :url-cache="resolvedUrlCache"
          />
        </div>
      </DialogContent>
    </Dialog>

    <FileSystemDateRangeDialog
      v-if="dateRangeDialog"
      :initial-range="dateRangeDialog.initialRange"
      @apply="
        (from: Date, to: Date) => {
          applyCustomDateRange(dateRangeDialog!.type, from, to)
          dateRangeDialog = null
        }
      "
      @close="dateRangeDialog = null"
    />
  </div>
</template>
