<script setup lang="ts">
/**
 * 画廊视图（由 React 版 FileSystemGalleryView 移植）
 *
 * 底部胶片条（窗口化）+ 中央预览舞台 + 右侧信息栏。方向键扫过胶片条时
 * 中央只显示 spinner；选择落定 200ms 后才解析 URL、渲染重预览，
 * 每次按键保持轻量。舞台为内联渲染（原版的 portal 保活池已省略）。
 */
import { computed, ref, watch } from "vue"
import { LoaderCircle } from "@lucide/vue"
import { cn } from "@/lib/utils"
import { createEntryTypeAhead, useSettledValue, useVirtualWindow } from "./composables"
import FileSystemFileVisual from "./FileSystemFileVisual.vue"
import FileSystemFolderGlyph from "./FileSystemFolderGlyph.vue"
import FileSystemGalleryStage from "./FileSystemGalleryStage.vue"
import FileSystemInformation from "./FileSystemInformation.vue"
import {
  fileKindLabel,
  formatByteSize,
  scrollIndexIntoView,
  type FileEntry,
  type FileSystemEntry,
  type FileSystemFileItem,
  type FileSystemIndex,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemGalleryView" })

const props = defineProps<{
  entries: FileSystemEntry[]
  index: FileSystemIndex
  selectedEntry: FileSystemEntry | null
  selectedPath: string | null
  getFileUrl?: (file: FileSystemFileItem) => string | Promise<string>
  loadPreviewImageUrl?: (
    file: FileSystemFileItem,
    pageIndex: number
  ) => Promise<string | null>
  pageUrlCache: Map<string, string>
  urlCache: Map<string, string>
}>()

const emit = defineEmits<{
  (e: "select", entry: FileSystemEntry | null): void
  (e: "open", entry: FileSystemEntry): void
}>()

// 胶片条几何（默认 16px 根字号下的像素值）。
const GALLERY_STRIP_PADDING = 8
const GALLERY_TILE_SIZE = 56
const GALLERY_TILE_GAP = 6
const GALLERY_TILE_STRIDE = GALLERY_TILE_SIZE + GALLERY_TILE_GAP

const stripRefs = new Map<string, HTMLButtonElement>()
const stripViewportRef = ref<HTMLDivElement | null>(null)
const typeAhead = createEntryTypeAhead<FileSystemEntry>()

const activeEntry = computed(() => {
  const selected = props.selectedEntry

  return selected && props.entries.some((entry) => entry.path === selected.path)
    ? selected
    : (props.entries[0] ?? null)
})
const activeFile = computed<FileEntry | null>(() => {
  const entry = activeEntry.value

  return entry?.kind === "file" ? entry : null
})

// 方向键扫过时只在选择落定后加载预览。
const settledPath = useSettledValue(
  () => activeEntry.value?.path ?? null,
  200
)
const isStageSettled = computed(
  () => settledPath.value === (activeEntry.value?.path ?? null)
)

const activeFileSize = computed(() =>
  activeFile.value ? formatByteSize(activeFile.value.size) : null
)

function handleKeyDown(event: KeyboardEvent) {
  if (props.entries.length === 0) return

  const currentIndex = activeEntry.value
    ? props.entries.findIndex((entry) => entry.path === activeEntry.value?.path)
    : -1

  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    const match = typeAhead(event, props.entries, currentIndex)

    if (match) {
      emit("select", match)
      // 匹配的平铺可能在胶片条的虚拟窗口外；激活平铺效果会把它滚入，
      // 挂载后焦点跟上。
      requestAnimationFrame(() => stripRefs.get(match.path)?.focus())
    }
    return
  }

  const nextEntry =
    props.entries[
      currentIndex === -1
        ? 0
        : currentIndex + (event.key === "ArrowLeft" ? -1 : 1)
    ]

  if (!nextEntry) return

  emit("select", nextEntry)
  stripRefs.get(nextEntry.path)?.focus()
  event.preventDefault()
}

const { start: stripStart, end: stripEnd } = useVirtualWindow({
  count: () => props.entries.length,
  horizontal: true,
  itemStride: () => GALLERY_TILE_STRIDE,
  leadingPx: GALLERY_STRIP_PADDING,
  overscan: 8,
  viewport: stripViewportRef,
})

const visibleEntries = computed(() =>
  props.entries.slice(stripStart.value, stripEnd.value)
)

// 扫动或选择来自其他视图时保持激活平铺挂载且可见。
watch(
  [() => props.entries, () => activeEntry.value?.path],
  ([entries, activePath]) => {
    if (!activePath) return

    scrollIndexIntoView({
      horizontal: true,
      index: entries.findIndex((entry) => entry.path === activePath),
      itemSize: GALLERY_TILE_SIZE,
      itemStride: GALLERY_TILE_STRIDE,
      leadingPx: GALLERY_STRIP_PADDING,
      viewport: stripViewportRef.value,
    })
  },
  { flush: "post" }
)

function setStripRef(entry: FileSystemEntry, el: any) {
  if (el) {
    stripRefs.set(entry.path, el as HTMLButtonElement)
  } else {
    stripRefs.delete(entry.path)
  }
}

const stripWidthStyle = computed(() => ({
  width: props.entries.length
    ? `${props.entries.length * GALLERY_TILE_STRIDE - GALLERY_TILE_GAP}px`
    : undefined,
}))
const stripOffsetStyle = computed(() => ({
  left: `${stripStart.value * GALLERY_TILE_STRIDE}px`,
}))
</script>

<template>
  <!-- 胶片条在 DOM 序里最先（视觉上 order-last 在底部），使它成为视图的
      唯一 Tab 停靠点：Shift+Tab 回到工具栏而不是进入内嵌查看器。 -->
  <div class="flex size-full flex-col" @keydown="handleKeyDown">
    <div
      ref="stripViewportRef"
      class="order-last h-auto w-full shrink-0 overflow-x-auto border-t p-2"
    >
      <div class="relative h-14 min-w-full" :style="stripWidthStyle">
        <div
          role="listbox"
          aria-label="Files"
          class="absolute inset-y-0 flex items-center gap-1.5"
          :style="stripOffsetStyle"
        >
          <button
            v-for="entry in visibleEntries"
            :key="entry.path"
            type="button"
            role="option"
            :aria-selected="entry.path === (activeEntry?.path ?? props.selectedPath)"
            :tabindex="entry.path === (activeEntry?.path ?? props.selectedPath) ? 0 : -1"
            :ref="(el: any) => setStripRef(entry, el)"
            :title="entry.name"
            :class="
              cn(
                'flex size-14 shrink-0 items-center justify-center rounded-md border border-transparent p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                entry.path === (activeEntry?.path ?? props.selectedPath) &&
                  'border-ring/40 bg-accent'
              )
            "
            @click="emit('select', entry)"
            @dblclick="emit('open', entry)"
            @keydown.enter="emit('open', entry)"
          >
            <FileSystemFolderGlyph
              v-if="entry.kind === 'folder'"
              class="h-9 w-auto"
            />
            <FileSystemFileVisual
              v-else
              :file="entry"
              class="w-9 rounded-sm"
              :preview-aspect-ratio="0.78"
            />
          </button>
        </div>
      </div>
    </div>
    <div class="flex min-h-0 flex-1">
      <div class="relative flex min-h-0 min-w-0 flex-1 items-center justify-center p-3">
        <FileSystemFolderGlyph
          v-if="activeEntry?.kind === 'folder'"
          class="h-40 max-h-full w-auto drop-shadow-md"
        />
        <LoaderCircle
          v-else-if="activeFile && !isStageSettled"
          class="size-6 animate-spin text-muted-foreground motion-reduce:animate-none"
        />
        <div
          v-else-if="activeFile"
          class="absolute inset-0 flex items-center justify-center p-3"
        >
          <FileSystemGalleryStage
            :file="activeFile"
            :get-file-url="props.getFileUrl"
            :load-preview-image-url="props.loadPreviewImageUrl"
            :page-url-cache="props.pageUrlCache"
            :url-cache="props.urlCache"
          />
        </div>
      </div>
      <div
        v-if="activeEntry"
        class="hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l p-4 sm:flex"
      >
        <div class="flex items-center gap-3">
          <FileSystemFileVisual
            v-if="activeFile"
            :file="activeFile"
            :class="
              cn(
                'shrink-0 rounded-sm',
                (activeFile.previewAspectRatio ?? 0.78) > 1.2 ? 'w-16' : 'w-9'
              )
            "
            :preview-aspect-ratio="0.78"
          />
          <FileSystemFolderGlyph v-else class="h-8 w-auto shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold break-words">
              {{ activeEntry.name }}
            </div>
            <div class="text-xs text-muted-foreground">
              {{ activeFile ? fileKindLabel(activeFile) : "Folder" }}
              <template v-if="activeFileSize"> - {{ activeFileSize }}</template>
            </div>
          </div>
        </div>
        <FileSystemInformation :entry="activeEntry" :index="props.index" />
      </div>
    </div>
  </div>
</template>
