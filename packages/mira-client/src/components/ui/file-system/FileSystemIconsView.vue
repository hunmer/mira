<script setup lang="ts">
/**
 * 图标视图（由 React 版 FileSystemIconsView 移植）
 *
 * 窗口化的自动填充网格：以固定行跨距只挂载与视口相交的行（外加两侧
 * overscan）。列数由 ResizeObserver 按 `repeat(auto-fill, minmax(6.5rem,1fr))`
 * 的结果测量，仅供窗口化计算使用，真实布局仍由 CSS 决定。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { cn } from "@/lib/utils"
import { useVirtualWindow, createEntryTypeAhead } from "./composables"
import FileSystemFileVisual from "./FileSystemFileVisual.vue"
import FileSystemFolderGlyph from "./FileSystemFolderGlyph.vue"
import {
  ARROW_KEYS,
  moveGridSelection,
  scrollIndexIntoView,
  type FileSystemEntry,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemIconsView" })

const props = defineProps<{
  entries: FileSystemEntry[]
  selectedPath: string | null
}>()

const emit = defineEmits<{
  (e: "select", entry: FileSystemEntry | null): void
  (e: "open", entry: FileSystemEntry): void
}>()

// 网格几何（默认 16px 根字号下的像素值）。平铺高度固定——4rem 图形框加
// 预留的两行标签——各行共享同一跨距，网格才能干净地开窗。
const ICON_GRID_PADDING = 12
const ICON_MIN_TILE_WIDTH = 104
const ICON_TILE_GAP_X = 4
const ICON_TILE_HEIGHT = 102
const ICON_ROW_GAP = 12
const ICON_ROW_STRIDE = ICON_TILE_HEIGHT + ICON_ROW_GAP

const itemRefs = new Map<string, HTMLButtonElement>()
const viewportRef = ref<HTMLDivElement | null>(null)
const typeAhead = createEntryTypeAhead<FileSystemEntry>()

const columnCount = ref<number | null>(null)

onMounted(() => {
  const viewport = viewportRef.value

  if (!viewport || typeof ResizeObserver === "undefined") return

  const update = () => {
    const available = viewport.clientWidth - ICON_GRID_PADDING * 2

    columnCount.value = Math.max(
      1,
      Math.floor(
        (available + ICON_TILE_GAP_X) /
          (ICON_MIN_TILE_WIDTH + ICON_TILE_GAP_X)
      )
    )
  }
  const observer = new ResizeObserver(update)

  update()
  observer.observe(viewport)
  onBeforeUnmount(() => observer.disconnect())
})

const resolvedColumnCount = computed(() => columnCount.value ?? 1)
const rowCount = computed(() =>
  Math.ceil(props.entries.length / resolvedColumnCount.value)
)
const { start, end } = useVirtualWindow({
  count: () => rowCount.value,
  itemStride: () => ICON_ROW_STRIDE,
  leadingPx: ICON_GRID_PADDING,
  overscan: 4,
  viewport: viewportRef,
})
const visibleEntries = computed(() =>
  props.entries.slice(
    start.value * resolvedColumnCount.value,
    end.value * resolvedColumnCount.value
  )
)

// 选中项可能落在窗口之外（视图切换、结果收缩）；把所在行滚回视口，
// 让平铺挂载并可获得焦点。
watch(
  [() => props.selectedPath, () => props.entries],
  ([selectedPath]) => {
    if (!selectedPath) return

    const entryIndex = props.entries.findIndex(
      (entry) => entry.path === selectedPath
    )

    if (entryIndex === -1) return

    scrollIndexIntoView({
      index: Math.floor(entryIndex / resolvedColumnCount.value),
      itemSize: ICON_TILE_HEIGHT,
      itemStride: ICON_ROW_STRIDE,
      leadingPx: ICON_GRID_PADDING,
      viewport: viewportRef.value,
    })
  },
  { flush: "post" }
)

// Roving tabindex：网格是唯一的 Tab 停靠点（选中平铺或首个渲染的平铺），
// Shift+Tab 能像列表视图一样返回工具栏。
const tabStopPath = computed(() =>
  visibleEntries.value.some((entry) => entry.path === props.selectedPath)
    ? props.selectedPath
    : (visibleEntries.value[0]?.path ?? null)
)

function setTileRef(entry: FileSystemEntry, el: any) {
  if (el) {
    itemRefs.set(entry.path, el as HTMLButtonElement)
  } else {
    itemRefs.delete(entry.path)
  }
}

function onGridKeydown(event: KeyboardEvent) {
  if (!ARROW_KEYS.has(event.key)) {
    const match = typeAhead(
      event,
      props.entries,
      props.entries.findIndex((entry) => entry.path === props.selectedPath)
    )

    if (match) {
      emit("select", match)
      // 匹配的平铺可能在虚拟窗口外；选中效果会把它滚入，挂载后焦点跟上。
      requestAnimationFrame(() => itemRefs.get(match.path)?.focus())
    }
    return
  }
  if (
    moveGridSelection({
      entries: props.entries,
      itemRefs,
      key: event.key,
      onSelect: (entry) => emit("select", entry),
      selectedPath: props.selectedPath,
    })
  ) {
    event.preventDefault()
  }
}

const spacerStyle = computed(() =>
  columnCount.value !== null && rowCount.value
    ? { height: `${rowCount.value * ICON_ROW_STRIDE - ICON_ROW_GAP}px` }
    : undefined
)
const gridStyle = computed(() => ({
  top: `${start.value * ICON_ROW_STRIDE}px`,
  gridTemplateColumns: "repeat(auto-fill, minmax(6.5rem, 1fr))",
}))
</script>

<template>
  <div
    ref="viewportRef"
    class="size-full overflow-y-auto p-3"
    @click.self="emit('select', null)"
  >
    <div class="relative" :style="spacerStyle">
      <div
        role="listbox"
        aria-label="Files"
        class="absolute inset-x-0 grid gap-x-1 gap-y-3"
        :style="gridStyle"
        @keydown="onGridKeydown"
      >
        <button
          v-for="entry in visibleEntries"
          :key="entry.path"
          type="button"
          role="option"
          :aria-selected="entry.path === props.selectedPath"
          :tabindex="entry.path === tabStopPath ? 0 : -1"
          :ref="(el: any) => setTileRef(entry, el)"
          class="group flex h-[6.375rem] flex-col items-center gap-1.5 outline-none"
          @click="emit('select', entry)"
          @dblclick="emit('open', entry)"
          @keydown.enter="emit('open', entry)"
        >
          <span
            :class="
              cn(
                'flex h-16 w-20 shrink-0 items-center justify-center rounded-lg p-1 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring',
                entry.path === props.selectedPath && 'bg-accent'
              )
            "
          >
            <FileSystemFolderGlyph
              v-if="entry.kind === 'folder'"
              class="h-13 w-auto drop-shadow-sm"
            />
            <FileSystemFileVisual
              v-else
              :file="entry"
              :class="
                cn(
                  'rounded-sm shadow-xs',
                  // 横版缩略图给更宽的宽度，填满平铺而不是窄窄一条。
                  (entry.previewAspectRatio ?? 0.78) > 1.2
                    ? 'w-[4.75rem]'
                    : 'w-12'
                )
              "
              :preview-aspect-ratio="0.78"
            />
          </span>
          <span
            :class="
              cn(
                'max-w-full rounded-sm px-1.5 py-px text-center text-xs leading-tight break-words',
                entry.path === props.selectedPath
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground'
              )
            "
          >
            <span class="line-clamp-2">{{ entry.name }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
