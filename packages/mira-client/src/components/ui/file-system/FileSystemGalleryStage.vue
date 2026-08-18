<script setup lang="ts">
/**
 * 单个文件的预览舞台（由 React 版 FileSystemGalleryStage 移植）
 *
 * 图片直接渲染；PDF/DOCX/XLSX 显示轻量占位面板（原独立构建亦是如此，
 * 重型文档查看器由 @extend 系列包提供，未安装时回退）；其余文件显示
 * 可翻页缩略图。`stage` 变体无边框工具栏，`dialog` 变体带完整边框。
 * 原版的 keep-alive 预览池（portal 重挂载保活）在此省略——回退面板与
 * 图片的重新挂载成本可忽略，共享的 URL 缓存仍避免重复预签名。
 */
import { computed } from "vue"
import { LoaderCircle } from "@lucide/vue"
import { cn } from "@/lib/utils"
import { useResolvedFileUrl } from "./composables"
import FileSystemFileVisual from "./FileSystemFileVisual.vue"
import {
  viewerKindForFile,
  type FileEntry,
  type FileSystemFileItem,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemGalleryStage" })

const props = withDefaults(
  defineProps<{
    file: FileEntry
    getFileUrl?: (file: FileSystemFileItem) => string | Promise<string>
    loadPreviewImageUrl?: (
      file: FileSystemFileItem,
      pageIndex: number
    ) => Promise<string | null>
    pageUrlCache?: Map<string, string>
    /** 跨舞台共享的已解析 URL 缓存。 */
    urlCache: Map<string, string>
    variant?: "dialog" | "stage"
  }>(),
  {
    getFileUrl: undefined,
    loadPreviewImageUrl: undefined,
    pageUrlCache: undefined,
    variant: "stage",
  }
)

const viewerKind = computed(() => viewerKindForFile(props.file))
const isDialog = computed(() => props.variant === "dialog")

// 只有查看器类舞台需要 URL；缩略图舞台直接用清单里的预览图，选中即
// 显示、绝不触发预签名。
const targetFile = computed(() => (viewerKind.value ? props.file : null))
const { isResolving, url } = useResolvedFileUrl(
  targetFile,
  props.getFileUrl,
  props.urlCache
)

const viewerFrameClassName = computed(() =>
  cn("size-full", !isDialog.value && "overflow-hidden rounded-lg border")
)
</script>

<template>
  <div v-if="viewerKind && isResolving" class="grid size-full place-items-center">
    <LoaderCircle class="size-6 animate-spin text-muted-foreground motion-reduce:animate-none" />
  </div>

  <img
    v-else-if="viewerKind === 'image' && url"
    :src="url"
    :alt="props.file.name"
    class="max-h-full max-w-full rounded-lg object-contain"
  />

  <div v-else-if="viewerKind && url" :class="viewerFrameClassName">
    <!-- 轻量文档占位：内联预览需 @extend 文档查看器包。 -->
    <div
      :class="
        cn(
          'flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-muted/30 p-8 text-center',
          isDialog && 'rounded-none'
        )
      "
    >
      <span class="text-sm font-medium text-foreground">
        {{ props.file.name }}
      </span>
      <span class="max-w-xs text-xs text-muted-foreground">
        Inline preview is available with the @extend document viewer packages.
      </span>
    </div>
  </div>

  <FileSystemFileVisual
    v-else
    :file="props.file"
    class="w-56 max-w-full"
    :load-preview-image-url="props.loadPreviewImageUrl"
    pageable
    :page-url-cache="props.pageUrlCache"
    :preview-aspect-ratio="0.78"
  />
</template>
