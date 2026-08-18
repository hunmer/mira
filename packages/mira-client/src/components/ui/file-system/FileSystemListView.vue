<script setup lang="ts">
/**
 * 列表视图（对应 React 版 FileSystemListView + FileSystemPierreTree）
 *
 * 原版依赖 @pierre/trees 的阴影 DOM 树；此处改为原生 Vue 树：
 * 平铺的可见行列表由"索引 + 展开状态"计算——每层文件夹在前、文件在后，
 * 与原树默认约定一致。搜索/过滤时沿用根组件的 visiblePaths 递归揭示匹配
 * 祖先（隐藏不匹配项语义）；展开状态按文件夹存入根组件的存储，
 * 视图切换与导航后恢复。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { ArrowDown, ArrowUp, ChevronRight } from "@lucide/vue"
import { cn } from "@/lib/utils"
import { createEntryTypeAhead } from "./composables"
import FileSystemFileTypeIcon from "./FileSystemFileTypeIcon.vue"
import FileSystemFolderGlyph from "./FileSystemFolderGlyph.vue"
import {
  filePreviewUrls,
  formatByteSize,
  formatTimestamp,
  type FileSystemEntry,
  type FileSystemIndex,
  type FileSystemSortKey,
  type FileSystemSortState,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemListView" })

const props = defineProps<{
  currentPath: string
  index: FileSystemIndex
  selectedPath: string | null
  sort: FileSystemSortState
  /** 搜索/过滤激活时可见的路径集合；null 表示不过滤。 */
  visiblePaths: Set<string> | null
  loadingFolders: Set<string>
  /** 展开状态存储（根组件持有，跨视图切换/导航存活），按文件夹路径键。 */
  treeExpansion: Map<string, string[]>
}>()

const emit = defineEmits<{
  (e: "select", entry: FileSystemEntry | null): void
  (e: "open", entry: FileSystemEntry): void
  (e: "sortClick", key: FileSystemSortKey): void
}>()

const typeAhead = createEntryTypeAhead<FileSystemEntry>()
const rowRefs = new Map<string, HTMLButtonElement>()
const expanded = ref(new Set<string>())

interface TreeRow {
  entry: FileSystemEntry
  depth: number
  isExpanded: boolean
  date: string
  detail: string
  coverUrl?: string
}

const rows = computed<TreeRow[]>(() => {
  const result: TreeRow[] = []
  const include = (entry: FileSystemEntry) =>
    !props.visiblePaths || props.visiblePaths.has(entry.path)
  const descend = (folder: FileSystemEntry) =>
    props.visiblePaths
      ? props.visiblePaths.has(folder.path)
      : expanded.value.has(folder.path)

  const rowMeta = (entry: FileSystemEntry): Pick<TreeRow, "date" | "detail" | "coverUrl"> => {
    const date = formatTimestamp(entry.updatedAt ?? entry.createdAt) ?? "—"

    if (entry.kind === "folder") {
      const childCount = props.index.children.get(entry.path)?.length

      return {
        date,
        detail:
          childCount === undefined
            ? "—"
            : `${childCount} ${childCount === 1 ? "item" : "items"}`,
      }
    }

    return {
      date,
      detail: formatByteSize(entry.size) ?? "—",
      coverUrl: filePreviewUrls(entry)[0],
    }
  }

  const walk = (folderPath: string, depth: number) => {
    const children = props.index.children.get(folderPath) ?? []

    for (const entry of children) {
      if (entry.kind !== "folder") continue
      if (!include(entry)) continue

      const isExpanded = descend(entry)

      result.push({ entry, depth, isExpanded, ...rowMeta(entry) })
      if (isExpanded) walk(entry.path, depth + 1)
    }
    for (const entry of children) {
      if (entry.kind !== "file") continue
      if (include(entry)) result.push({ entry, depth, isExpanded: false, ...rowMeta(entry) })
    }
  }

  walk(props.currentPath, 0)
  return result
})

// 列头排序：点击已激活列切换方向，与 Finder 一致。
function toggleSortColumn(key: FileSystemSortKey) {
  emit("sortClick", key)
}

const columns: Array<{
  key: FileSystemSortKey
  label: string
  class: string
}> = [
  { key: "name", label: "Name", class: "min-w-0 justify-start" },
  { key: "updatedAt", label: "Date Modified", class: "justify-start" },
  { key: "size", label: "Size", class: "justify-end" },
]

function isActiveColumn(key: FileSystemSortKey) {
  return props.sort.key === key
}

function toggleExpanded(folderPath: string) {
  const next = new Set(expanded.value)

  if (next.has(folderPath)) {
    next.delete(folderPath)
  } else {
    next.add(folderPath)
  }
  expanded.value = next
}

function setRowRef(entry: FileSystemEntry, el: any) {
  if (el) {
    rowRefs.set(entry.path, el as HTMLButtonElement)
  } else {
    rowRefs.delete(entry.path)
  }
}

function onRowClick(row: TreeRow) {
  emit("select", row.entry)
  if (row.entry.kind === "folder") toggleExpanded(row.entry.path)
}

function onListKeydown(event: KeyboardEvent) {
  const currentIndex = rows.value.findIndex(
    (row) => row.entry.path === props.selectedPath
  )

  if (
    event.key === "ArrowDown" ||
    event.key === "ArrowUp"
  ) {
    const nextRow =
      rows.value[
        currentIndex === -1
          ? 0
          : currentIndex + (event.key === "ArrowDown" ? 1 : -1)
      ]

    if (!nextRow) return
    event.preventDefault()
    emit("select", nextRow.entry)
    rowRefs.get(nextRow.entry.path)?.focus()
    return
  }

  const focusedRow =
    currentIndex >= 0 ? rows.value[currentIndex] : rows.value[0]

  if (event.key === "ArrowRight" && focusedRow) {
    event.preventDefault()
    if (
      focusedRow.entry.kind === "folder" &&
      !focusedRow.isExpanded
    ) {
      toggleExpanded(focusedRow.entry.path)
    } else {
      const nextRow = rows.value[currentIndex + 1]

      if (nextRow) {
        emit("select", nextRow.entry)
        rowRefs.get(nextRow.entry.path)?.focus()
      }
    }
    return
  }

  if (event.key === "ArrowLeft" && focusedRow) {
    event.preventDefault()
    if (focusedRow.entry.kind === "folder" && focusedRow.isExpanded) {
      toggleExpanded(focusedRow.entry.path)
    } else {
      const parent = props.index.folders.get(focusedRow.entry.parentPath)

      if (parent && parent.path !== props.currentPath) {
        emit("select", parent)
        rowRefs.get(parent.path)?.focus()
      }
    }
    return
  }

  const match = typeAhead(
    event,
    rows.value.map((row) => row.entry),
    currentIndex
  )

  if (match) {
    emit("select", match)
    rowRefs.get(match.path)?.focus()
  }
}

const tabStopPath = computed(() =>
  rows.value.some((row) => row.entry.path === props.selectedPath)
    ? props.selectedPath
    : (rows.value[0]?.entry.path ?? null)
)

// 选中来自其他视图时把行滚进视口。
watch(
  () => props.selectedPath,
  (selectedPath) => {
    if (!selectedPath) return
    rowRefs.get(selectedPath)?.scrollIntoView({ block: "nearest" })
  },
  { flush: "post" }
)

// 展开状态：进入文件夹时保存旧的、恢复新的；卸载（视图切换）时保存。
onMounted(() => {
  expanded.value = new Set(props.treeExpansion.get(props.currentPath) ?? [])
})

watch(
  () => props.currentPath,
  (nextPath, previousPath) => {
    if (previousPath !== undefined) {
      props.treeExpansion.set(previousPath, [...expanded.value])
    }
    expanded.value = new Set(props.treeExpansion.get(nextPath) ?? [])
  }
)

onBeforeUnmount(() => {
  props.treeExpansion.set(props.currentPath, [...expanded.value])
})
</script>

<template>
  <div class="flex size-full flex-col">
    <!-- 行几何与列头对齐：名称列与日期/大小列共用同一 grid 模板。 -->
    <div
      class="grid shrink-0 grid-cols-[minmax(0,1fr)_11rem_5rem] items-center gap-2 border-b px-4 py-1 text-xs font-medium text-muted-foreground"
    >
      <button
        v-for="column in columns"
        :key="column.key"
        type="button"
        :class="
          cn(
            'flex items-center gap-0.5 rounded-sm py-0.5 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            column.class,
            isActiveColumn(column.key) && 'text-foreground'
          )
        "
        @click="toggleSortColumn(column.key)"
      >
        {{ column.label }}
        <ArrowUp
          v-if="isActiveColumn(column.key) && props.sort.direction === 'asc'"
          class="size-3 shrink-0"
        />
        <ArrowDown
          v-if="isActiveColumn(column.key) && props.sort.direction === 'desc'"
          class="size-3 shrink-0"
        />
      </button>
    </div>
    <div
      class="min-h-0 flex-1 overflow-y-auto p-1"
      @click.self="emit('select', null)"
      @keydown="onListKeydown"
    >
      <button
        v-for="row in rows"
        :key="row.entry.path"
        type="button"
        :ref="(el: any) => setRowRef(row.entry, el)"
        :tabindex="row.entry.path === tabStopPath ? 0 : -1"
        :class="
          cn(
            'grid h-7 w-full grid-cols-[minmax(0,1fr)_11rem_5rem] items-center gap-2 rounded-md pr-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
            row.entry.path === props.selectedPath
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent/50'
          )
        "
        :style="{ paddingLeft: `${8 + row.depth * 14}px` }"
        @click="onRowClick(row)"
        @dblclick="emit('open', row.entry)"
        @keydown.enter.prevent="emit('open', row.entry)"
      >
        <span class="flex min-w-0 items-center gap-1.5">
          <ChevronRight
            v-if="row.entry.kind === 'folder'"
            :class="
              cn(
                'size-3.5 shrink-0 text-muted-foreground transition-transform',
                row.isExpanded && 'rotate-90'
              )
            "
          />
          <span v-else class="size-3.5 shrink-0" />
          <FileSystemFolderGlyph
            v-if="row.entry.kind === 'folder'"
            class="h-3.5 w-auto shrink-0"
          />
          <img
            v-else-if="row.coverUrl"
            :src="row.coverUrl"
            alt=""
            draggable="false"
            class="size-4 shrink-0 rounded-[3px] bg-white object-cover"
          />
          <FileSystemFileTypeIcon
            v-else
            :file-name="row.entry.name"
            class="size-4"
          />
          <span class="min-w-0 flex-1 truncate">{{ row.entry.name }}</span>
        </span>
        <span
          :class="
            cn(
              'truncate text-xs',
              row.entry.path === props.selectedPath
                ? 'text-primary-foreground'
                : 'text-muted-foreground'
            )
          "
        >
          {{ row.date }}
        </span>
        <span
          :class="
            cn(
              'truncate text-right text-xs',
              row.entry.path === props.selectedPath
                ? 'text-primary-foreground'
                : 'text-muted-foreground'
            )
          "
        >
          {{ row.detail }}
        </span>
      </button>
      <div
        v-for="row in rows.filter(
          (entry) =>
            entry.entry.kind === 'folder' &&
            entry.isExpanded &&
            props.loadingFolders.has(entry.entry.path) &&
            !(props.index.children.get(entry.entry.path)?.length)
        )"
        :key="`${row.entry.path}-loading`"
        class="flex h-7 items-center text-xs text-muted-foreground motion-reduce:animate-none animate-pulse"
        :style="{ paddingLeft: `${8 + (row.depth + 1) * 14}px` }"
      >
        Loading…
      </div>
    </div>
  </div>
</template>
