<script setup lang="ts">
/**
 * 分栏视图（由 React 版 FileSystemColumnsView 移植）
 *
 * Finder 式多列浏览：选中文件夹追加子列，选中文件在尾部显示预览面板。
 * 原版的 React.useDeferredValue 延迟挂载在此省略——Vue 的细粒度更新下
 * 每列只在自身行变化时重渲，按键步进的开销本就可控。
 */
import { computed, ref, watch } from "vue"
import { createEntryTypeAhead } from "./composables"
import FileSystemColumn from "./FileSystemColumn.vue"
import FileSystemFileVisual from "./FileSystemFileVisual.vue"
import FileSystemInformation from "./FileSystemInformation.vue"
import {
  ARROW_KEYS,
  fileKindLabel,
  formatByteSize,
  pathParent,
  type FileEntry,
  type FileSystemEntry,
  type FileSystemFileItem,
  type FileSystemIndex,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemColumnsView" })

const props = defineProps<{
  currentPath: string
  index: FileSystemIndex
  selectedEntry: FileSystemEntry | null
  selectedPath: string | null
  loadingFolders: Set<string>
  loadPreviewImageUrl?: (
    file: FileSystemFileItem,
    pageIndex: number
  ) => Promise<string | null>
  pageUrlCache: Map<string, string>
}>()

const emit = defineEmits<{
  (e: "select", entry: FileSystemEntry | null): void
  (e: "open", entry: FileSystemEntry): void
}>()

const scrollContainerRef = ref<HTMLDivElement | null>(null)
const rowRefs = new Map<string, HTMLButtonElement>()
const pendingFocusPath = ref<string | null>(null)
const typeAhead = createEntryTypeAhead<FileSystemEntry>()

function focusRow(entry: FileSystemEntry) {
  const row = rowRefs.get(entry.path)

  if (row) {
    pendingFocusPath.value = null
    row.focus()
  } else {
    // 目标行在尚未挂载的列里；挂载后由行的 ref 回调落地焦点。
    pendingFocusPath.value = entry.path
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const selectedEntry = props.selectedEntry

  if (!ARROW_KEYS.has(event.key)) {
    // 类型快进在当前列的行间移动，与 Finder 一致。
    const siblings =
      selectedEntry && props.selectedPath?.startsWith(props.currentPath)
        ? (props.index.children.get(selectedEntry.parentPath) ?? [])
        : (props.index.children.get(props.currentPath) ?? [])
    const match = typeAhead(
      event,
      siblings,
      siblings.findIndex((sibling) => sibling.path === props.selectedPath)
    )

    if (match) {
      emit("select", match)
      focusRow(match)
    }
    return
  }

  let nextEntry: FileSystemEntry | null | undefined

  if (!selectedEntry || !props.selectedPath?.startsWith(props.currentPath)) {
    nextEntry = props.index.children.get(props.currentPath)?.[0]
  } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    const siblings = props.index.children.get(selectedEntry.parentPath) ?? []
    const currentIndex = siblings.findIndex(
      (sibling) => sibling.path === selectedEntry.path
    )

    nextEntry = siblings[currentIndex + (event.key === "ArrowUp" ? -1 : 1)]
  } else if (event.key === "ArrowLeft") {
    if (selectedEntry.parentPath !== props.currentPath) {
      nextEntry = props.index.folders.get(selectedEntry.parentPath)
    }
  } else if (selectedEntry.kind === "folder") {
    nextEntry = props.index.children.get(selectedEntry.path)?.[0]
  }

  if (!nextEntry) return

  emit("select", nextEntry)
  focusRow(nextEntry)
  event.preventDefault()
}

const columnPaths = computed(() => {
  const paths = [props.currentPath]

  if (!props.selectedPath?.startsWith(props.currentPath)) return paths

  const targetFolder =
    props.selectedEntry?.kind === "folder"
      ? props.selectedEntry.path
      : (props.selectedEntry?.parentPath ?? props.currentPath)
  const relativePath = targetFolder.slice(props.currentPath.length)
  let walkedPath = props.currentPath

  for (const segment of relativePath.split("/")) {
    if (!segment) continue
    walkedPath = `${walkedPath}${segment}/`
    paths.push(walkedPath)
  }
  return paths
})

// Roving tabindex：所有列合起来是唯一的 Tab 停靠点（选中行在其列挂载时
// 为选中行，否则为首行），Shift+Tab 能返回工具栏。
const tabStopPath = computed(() => {
  if (props.selectedPath) {
    for (const columnPath of columnPaths.value) {
      if (
        props.index.children
          .get(columnPath)
          ?.some((entry) => entry.path === props.selectedPath)
      ) {
        return props.selectedPath
      }
    }
  }
  return props.index.children.get(columnPaths.value[0] ?? "")?.[0]?.path ?? null
})

const selectedFile = computed<FileEntry | null>(
  () => (props.selectedEntry?.kind === "file" ? props.selectedEntry : null)
)
const selectedFileSize = computed(() =>
  selectedFile.value ? formatByteSize(selectedFile.value.size) : null
)

// 新列加入后滚动到最右。
watch(
  [() => columnPaths.value.length, () => props.selectedPath],
  () => {
    const container = scrollContainerRef.value

    if (container) container.scrollLeft = container.scrollWidth
  },
  { flush: "post" }
)
</script>

<template>
  <div
    ref="scrollContainerRef"
    class="flex h-full w-max min-w-full overflow-x-auto overscroll-x-contain"
    @keydown="handleKeyDown"
  >
    <FileSystemColumn
      v-for="(columnPath, columnIndex) in columnPaths"
      :key="columnPath || '(root)'"
      :entries="props.index.children.get(columnPath) ?? []"
      :index="props.index"
      :is-loading="props.loadingFolders.has(columnPath)"
      :row-refs="rowRefs"
      :pending-focus-path="pendingFocusPath"
      :selected-child-path="
        props.selectedPath && pathParent(props.selectedPath) === columnPath
          ? props.selectedPath
          : null
      "
      :tab-stop-child-path="
        tabStopPath && pathParent(tabStopPath) === columnPath
          ? tabStopPath
          : null
      "
      :trail-child-path="columnPaths[columnIndex + 1] ?? null"
      @select="(entry: FileSystemEntry | null) => emit('select', entry)"
      @open="(entry: FileSystemEntry) => emit('open', entry)"
      @focus-handled="pendingFocusPath = null"
    />
    <div
      v-if="selectedFile"
      class="flex min-w-60 flex-1 flex-col items-center justify-center overflow-y-auto p-4"
    >
      <div class="flex w-full max-w-lg flex-col items-stretch gap-3">
        <!-- 宽度按宽高比推导，缩略图随面板增长，最高 20rem。 -->
        <div
          class="mx-auto w-full shrink-0"
          :style="{
            maxWidth: `min(100%, ${(selectedFile.previewAspectRatio ?? 0.78) * 20}rem)`,
          }"
        >
          <FileSystemFileVisual
            :file="selectedFile"
            class="w-full"
            :load-preview-image-url="props.loadPreviewImageUrl"
            pageable
            :page-url-cache="props.pageUrlCache"
            :preview-aspect-ratio="0.78"
          />
        </div>
        <div class="text-center">
          <div class="text-sm font-semibold break-words">
            {{ selectedFile.name }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{ fileKindLabel(selectedFile) }}
            <template v-if="selectedFileSize"> - {{ selectedFileSize }}</template>
          </div>
        </div>
        <FileSystemInformation :entry="selectedFile" :index="props.index" />
      </div>
    </div>
  </div>
</template>
