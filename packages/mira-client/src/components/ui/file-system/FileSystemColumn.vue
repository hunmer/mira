<script setup lang="ts">
/**
 * 分栏视图的单列（由 React 版 FileSystemColumn 移植）
 *
 * 窗口化的行列表：固定行跨距，只挂载与列视口相交的行。选中/Tab 停靠/
 * 路径尾迹均为标量 prop，让列只在自身行变化时重渲。
 */
import { computed, ref, watch } from "vue"
import { ArrowRight } from "@lucide/vue"
import { cn } from "@/lib/utils"
import { useVirtualWindow } from "./composables"
import FileSystemFileTypeIcon from "./FileSystemFileTypeIcon.vue"
import FileSystemFolderGlyph from "./FileSystemFolderGlyph.vue"
import {
  filePreviewUrls,
  folderHasChildren,
  scrollIndexIntoView,
  type FileSystemEntry,
  type FileSystemIndex,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemColumn" })

const props = defineProps<{
  entries: FileSystemEntry[]
  index: FileSystemIndex
  isLoading: boolean
  rowRefs: Map<string, HTMLButtonElement>
  /** 键盘导航选中了本列尚未挂载的行时暂存，行挂载后立即聚焦。 */
  pendingFocusPath: string | null
  selectedChildPath: string | null
  tabStopChildPath: string | null
  trailChildPath: string | null
}>()

const emit = defineEmits<{
  (e: "select", entry: FileSystemEntry | null): void
  (e: "open", entry: FileSystemEntry): void
  (e: "focusHandled"): void
}>()

// 列行几何（默认 16px 根字号下的像素值）。
const COLUMN_PADDING = 6
const COLUMN_ROW_HEIGHT = 28
const COLUMN_ROW_GAP = 1
const COLUMN_ROW_STRIDE = COLUMN_ROW_HEIGHT + COLUMN_ROW_GAP

const viewportRef = ref<HTMLDivElement | null>(null)
const { start, end } = useVirtualWindow({
  count: () => props.entries.length,
  itemStride: () => COLUMN_ROW_STRIDE,
  leadingPx: COLUMN_PADDING,
  overscan: 10,
  viewport: viewportRef,
})

// 键盘导航可以选中本列未挂载的行；先滚进视口让其挂载，待聚焦效果落地。
watch(
  [() => props.entries, () => props.selectedChildPath],
  ([entries, selectedChildPath]) => {
    if (!selectedChildPath) return

    scrollIndexIntoView({
      index: entries.findIndex((entry) => entry.path === selectedChildPath),
      itemSize: COLUMN_ROW_HEIGHT,
      itemStride: COLUMN_ROW_STRIDE,
      leadingPx: COLUMN_PADDING,
      viewport: viewportRef.value,
    })
  },
  { flush: "post" }
)

const visibleEntries = computed(() => props.entries.slice(start.value, end.value))

const spacerStyle = computed(() => ({
  height: props.entries.length
    ? `${props.entries.length * COLUMN_ROW_STRIDE - COLUMN_ROW_GAP}px`
    : undefined,
}))
const rowsStyle = computed(() => ({ top: `${start.value * COLUMN_ROW_STRIDE}px` }))

function setRowRef(entry: FileSystemEntry, el: any) {
  if (el) {
    props.rowRefs.set(entry.path, el as HTMLButtonElement)
    // 延迟挂载的目标行到位后立即聚焦（键盘导航跨列落地）。
    if (props.pendingFocusPath === entry.path) {
      ;(el as HTMLButtonElement).focus()
      emit("focusHandled")
    }
  } else {
    props.rowRefs.delete(entry.path)
  }
}

// 鼠标按下即选中（仅鼠标左键），让子列在 mouseup 前就开始挂载——
// 与原版行的即时性一致；触摸保持 click 选中，滚动操作不会误选。
function onPointerDown(entry: FileSystemEntry, event: PointerEvent) {
  if (event.pointerType === "mouse" && event.button === 0) {
    emit("select", entry)
  }
}
</script>

<template>
  <div
    ref="viewportRef"
    class="h-full w-60 shrink-0 overflow-y-auto border-r p-1.5"
    role="listbox"
    aria-label="Files"
  >
    <div v-if="props.isLoading && props.entries.length === 0" class="animate-pulse px-2 py-1.5 text-xs text-muted-foreground motion-reduce:animate-none">
      Loading…
    </div>
    <div v-else class="relative" :style="spacerStyle">
      <div class="absolute inset-x-0 flex flex-col gap-px" :style="rowsStyle">
        <button
          v-for="entry in visibleEntries"
          :key="entry.path"
          type="button"
          role="option"
          :aria-selected="entry.path === props.selectedChildPath"
          :tabindex="entry.path === props.tabStopChildPath ? 0 : -1"
          :ref="(el: any) => setRowRef(entry, el)"
          :class="
            cn(
              'flex h-7 shrink-0 items-center gap-2 rounded-md px-2 py-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
              entry.path === props.selectedChildPath
                ? 'bg-primary text-primary-foreground'
                : entry.path === props.trailChildPath
                  ? 'bg-accent'
                  : 'hover:bg-accent/50'
            )
          "
          @pointerdown="onPointerDown(entry, $event)"
          @click="emit('select', entry)"
          @dblclick="emit('open', entry)"
          @keydown.enter="emit('open', entry)"
        >
          <FileSystemFolderGlyph
            v-if="entry.kind === 'folder'"
            class="h-3.5 w-auto shrink-0"
          />
          <img
            v-else-if="filePreviewUrls(entry)[0]"
            :src="filePreviewUrls(entry)[0]"
            alt=""
            draggable="false"
            class="size-4 shrink-0 rounded-[3px] bg-white object-cover"
          />
          <FileSystemFileTypeIcon v-else :file-name="entry.name" class="size-4" />
          <span class="min-w-0 flex-1 truncate">{{ entry.name }}</span>
          <ArrowRight
            v-if="entry.kind === 'folder' && folderHasChildren(props.index, entry)"
            :class="
              cn(
                'size-3.5 shrink-0',
                entry.path !== props.selectedChildPath && 'text-muted-foreground/60'
              )
            "
          />
        </button>
      </div>
    </div>
  </div>
</template>
