<script setup lang="ts">
/**
 * 文件缩略图（由 React 版 FileVisual + shadcn FileThumbnail 移植）
 *
 * 固定宽高比占位框：预览图 → 懒加载页（spinner）→ 通用类型图标预览。
 * 多页文件在悬停/聚焦时显示翻页器，按需通过 `loadPreviewImageUrl` 加载剩余页，
 * `"path#pageIndex"` → URL 缓存由所有翻页器共享。
 */
import { computed, ref, watch } from "vue"
import { ArrowLeft, ArrowRight, LoaderCircle } from "@lucide/vue"
import { cn } from "@/lib/utils"
import FileSystemFileTypeIcon from "./FileSystemFileTypeIcon.vue"
import {
  fileExtension,
  filePreviewUrls,
  type FileEntry,
  type FileSystemFileItem,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemFileVisual" })

const props = withDefaults(
  defineProps<{
    file: FileEntry
    class?: string
    loadPreviewImageUrl?: (
      file: FileSystemFileItem,
      pageIndex: number
    ) => Promise<string | null>
    /** 多页缩略图上显示悬停翻页器。 */
    pageable?: boolean
    /** `"path#pageIndex"` → URL 的共享缓存。 */
    pageUrlCache?: Map<string, string>
    previewAspectRatio?: number
    previewClass?: string
  }>(),
  {
    class: undefined,
    loadPreviewImageUrl: undefined,
    pageable: false,
    pageUrlCache: undefined,
    previewAspectRatio: undefined,
    previewClass: undefined,
  }
)

const previewUrls = computed(() => filePreviewUrls(props.file))
const canLoadLazily = computed(
  () => props.pageable && Boolean(props.loadPreviewImageUrl)
)
const totalPages = computed(() =>
  Math.max(
    previewUrls.value.length,
    canLoadLazily.value ? (props.file.previewPageCount ?? 0) : 0
  )
)

const pageIndex = ref(0)
const lazyPageUrls = ref<Record<number, string>>({})

watch(
  () => props.file.path,
  () => {
    pageIndex.value = 0
    lazyPageUrls.value = {}
  }
)

const clampedPageIndex = computed(() =>
  Math.min(pageIndex.value, Math.max(totalPages.value - 1, 0))
)
const previewUrl = computed(
  () =>
    previewUrls.value[clampedPageIndex.value] ??
    lazyPageUrls.value[clampedPageIndex.value] ??
    props.pageUrlCache?.get(`${props.file.path}#${clampedPageIndex.value}`) ??
    null
)
const resolvedAspectRatio = computed(
  () => props.file.previewAspectRatio ?? props.previewAspectRatio ?? 0.78
)
const isLazyPagePending = computed(
  () =>
    canLoadLazily.value &&
    !previewUrl.value &&
    clampedPageIndex.value < totalPages.value
)

// 按 path 记忆（而非对象身份），清单变化不会重复请求正在加载的页。
watch(
  () =>
    [props.file.path, clampedPageIndex.value, isLazyPagePending.value] as const,
  ([path, index, pending], _previous, onCleanup) => {
    if (!pending || !props.loadPreviewImageUrl) return

    let isCurrent = true

    void props.loadPreviewImageUrl(props.file, index)
      .then((url) => {
        // 翻走后到达也照样缓存：请求已完成，下次访问直接命中。
        if (url) props.pageUrlCache?.set(`${path}#${index}`, url)
        if (isCurrent && url) {
          lazyPageUrls.value = { ...lazyPageUrls.value, [index]: url }
        }
      })
      .catch(() => {})

    onCleanup(() => {
      isCurrent = false
    })
  }
)

const extension = computed(() => fileExtension(props.file.name))
const showPager = computed(() => props.pageable && totalPages.value > 1)

function previousPage(event: MouseEvent) {
  event.stopPropagation()
  pageIndex.value = Math.max(0, pageIndex.value - 1)
}

function nextPage(event: MouseEvent) {
  event.stopPropagation()
  pageIndex.value = Math.min(totalPages.value - 1, pageIndex.value + 1)
}
</script>

<template>
  <div
    :class="
      showPager
        ? cn('group/pager relative', props.class)
        : cn('relative isolate', props.class)
    "
  >
    <div
      :class="
        cn(
          '@container relative isolate w-full overflow-hidden bg-white dark:bg-neutral-100',
          props.previewClass
        )
      "
      :style="{ aspectRatio: String(resolvedAspectRatio) }"
    >
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt=""
        aria-hidden="true"
        draggable="false"
        class="absolute inset-0 size-full object-cover"
      />
      <div
        v-else-if="isLazyPagePending"
        class="absolute inset-0 grid place-items-center bg-white dark:bg-neutral-100"
      >
        <LoaderCircle
          class="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
        />
      </div>
      <div
        v-else
        class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white text-neutral-400 dark:bg-neutral-100"
      >
        <FileSystemFileTypeIcon
          :file-name="props.file.name"
          class="size-1/3 min-h-4 min-w-4"
        />
        <span
          v-if="extension"
          class="text-[min(0.625rem,18cqw)] font-semibold tracking-wide uppercase"
        >
          {{ extension }}
        </span>
      </div>
    </div>
    <div
      v-if="showPager"
      class="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1 opacity-0 transition-opacity group-focus-within/pager:opacity-100 group-hover/pager:opacity-100"
    >
      <button
        type="button"
        aria-label="Previous page"
        tabindex="-1"
        :disabled="clampedPageIndex === 0"
        @click="previousPage"
        @dblclick.stop
        class="flex size-6 items-center justify-center rounded-md bg-background/80 text-foreground shadow-xs backdrop-blur-sm transition-colors outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
      >
        <ArrowLeft class="size-3.5" />
      </button>
      <span
        class="rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums shadow-xs backdrop-blur-sm"
      >
        {{ clampedPageIndex + 1 }}/{{ totalPages }}
      </span>
      <button
        type="button"
        aria-label="Next page"
        tabindex="-1"
        :disabled="clampedPageIndex >= totalPages - 1"
        @click="nextPage"
        @dblclick.stop
        class="flex size-6 items-center justify-center rounded-md bg-background/80 text-foreground shadow-xs backdrop-blur-sm transition-colors outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
      >
        <ArrowRight class="size-3.5" />
      </button>
    </div>
  </div>
</template>
