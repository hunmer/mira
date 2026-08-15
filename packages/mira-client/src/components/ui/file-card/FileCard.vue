<script lang="ts">
export type FormatFile =
  | "doc"
  | "pdf"
  | "md"
  | "mdx"
  | "csv"
  | "xls"
  | "xlsx"
  | "txt"
  | "ppt"
  | "pptx"
  | "zip"
  | "rar"
  | "tar"
  | "gz"
  | "code"
  | "html"
  | "js"
  | "jsx"
  | "tsx"
  | "css"
  | "json"
  | "img"
  | "png"
  | "jpg"
  | "jpeg"
  | "video"
</script>

<script setup lang="ts">
/**
 * 文件格式卡片（复刻自 agent_spaces web 的 file-card-collections.tsx）
 *
 * 按格式渲染对应的骨架占位图（文档行/表格网格/压缩纹/代码标签对等），
 * 右下角叠加该格式的彩色角标。纯展示组件，无交互。
 */
import { computed } from "vue"
import { cn } from "@/lib/utils"

defineOptions({ name: "FileCard" })

const props = defineProps<{
  /** 文件格式，决定占位图样式与角标配色 */
  formatFile: FormatFile
}>()

const colorBannerMap: Record<FormatFile, string> = {
  doc: "bg-blue-500 text-white",
  pdf: "bg-red-500 text-white",
  md: "bg-neutral-600 text-white",
  mdx: "bg-neutral-600 text-white",
  txt: "bg-gray-500 text-white",
  csv: "bg-teal-700 text-white",
  xls: "bg-emerald-600 text-white",
  xlsx: "bg-emerald-600 text-white",
  ppt: "bg-orange-500 text-white",
  pptx: "bg-orange-500 text-white",
  zip: "bg-purple-500 text-white",
  rar: "bg-purple-600 text-white",
  tar: "bg-yellow-600 text-white",
  gz: "bg-yellow-700 text-white",
  html: "bg-orange-600 text-white",
  js: "bg-yellow-600 text-white",
  jsx: "bg-blue-600 text-white",
  css: "bg-blue-600 text-white",
  json: "bg-yellow-500 text-white",
  tsx: "bg-blue-600 text-white",
  code: "bg-orange-600 text-white",
  img: "bg-pink-500 text-white",
  png: "bg-neutral-600 text-white",
  jpg: "bg-green-700 text-white",
  jpeg: "bg-green-700 text-white",
  video: "bg-green-700 text-white",
}

const bannerClass = computed(() => colorBannerMap[props.formatFile])
</script>

<template>
  <div aria-hidden="true" class="relative size-fit">
    <div
      :class="cn(
        'absolute -right-2 bottom-1.5 z-2 rounded px-1.5 py-0.5 text-[8px] font-medium uppercase',
        bannerClass,
      )"
    >
      {{ props.formatFile }}
    </div>
    <div
      :class="cn(
        'bg-card ring-border relative z-1 space-y-3 rounded-md p-2 ring-1',
        'w-14 h-18',
      )"
    >
      <!-- md/mdx：标题 + 段落 -->
      <div v-if="props.formatFile === 'md' || props.formatFile === 'mdx'" class="space-y-1.5">
        <div class="flex items-center gap-1">
          <div class="text-foreground/30 text-[10px] font-bold">#</div>
          <div class="bg-foreground/20 h-0.5 w-6 rounded-full" />
        </div>
        <div class="space-y-1">
          <div class="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
          <div class="bg-foreground/10 h-0.5 w-7 rounded-full" />
        </div>
        <div class="space-y-1">
          <div class="bg-foreground/10 h-0.5 w-8 rounded-full" />
          <div class="bg-foreground/10 h-0.5 w-4 rounded-full" />
          <div class="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
        </div>
      </div>

      <!-- xls/xlsx：表格网格 -->
      <div v-else-if="props.formatFile === 'xls' || props.formatFile === 'xlsx'" class="space-y-0.5">
        <div class="grid grid-cols-3 gap-0.5">
          <div class="bg-foreground/20 h-2" />
          <div class="bg-foreground/20 h-2" />
          <div class="bg-foreground/20 h-2" />
        </div>
        <div class="grid grid-cols-3 gap-0.5">
          <div class="bg-foreground/5 h-2" />
          <div class="bg-foreground/5 h-2" />
          <div class="bg-foreground/5 h-2" />
          <div class="bg-foreground/5 h-2" />
          <div class="bg-foreground/5 h-2" />
          <div class="bg-foreground/5 h-2" />
        </div>
        <div class="grid grid-cols-3 gap-0.5">
          <div class="bg-foreground/5 h-2" />
          <div class="bg-foreground/5 h-2" />
        </div>
        <div class="grid grid-cols-3 gap-0.5">
          <div class="bg-foreground/5 h-2" />
        </div>
      </div>

      <!-- csv：圆角表头 + 行 -->
      <div v-else-if="props.formatFile === 'csv'">
        <div class="mb-2">
          <div class="grid grid-cols-3 gap-0.5">
            <div class="bg-foreground/20 h-1.5 rounded-full" />
            <div class="bg-foreground/20 h-1.5 rounded-full" />
            <div class="bg-foreground/20 h-1.5 rounded-full" />
          </div>
        </div>
        <div class="space-y-1.5">
          <div class="grid grid-cols-3 gap-0.5">
            <div class="bg-foreground/5 h-1 rounded-full" />
            <div class="bg-foreground/5 h-1 rounded-full" />
            <div class="bg-foreground/5 h-1 rounded-full" />
          </div>
          <div class="grid grid-cols-3 gap-0.5">
            <div class="bg-foreground/5 h-1 rounded-full" />
            <div class="bg-foreground/5 h-1 rounded-full" />
            <div class="bg-foreground/5 h-1 rounded-full" />
          </div>
          <div class="grid grid-cols-3 gap-0.5">
            <div class="bg-foreground/5 h-1 rounded-full" />
            <div class="bg-foreground/5 h-1 rounded-full" />
          </div>
          <div class="grid grid-cols-3 gap-0.5">
            <div class="bg-foreground/5 h-1 rounded-full" />
          </div>
        </div>
      </div>

      <!-- zip/rar/tar/gz：双色编织纹 -->
      <div
        v-else-if="props.formatFile === 'zip' || props.formatFile === 'rar' || props.formatFile === 'tar' || props.formatFile === 'gz'"
        class="relative flex h-full flex-col items-center justify-center"
      >
        <div class="space-y-0">
          <div class="flex overflow-hidden rounded-full">
            <div class="bg-foreground/20 size-1.5" />
            <div class="bg-foreground/5 size-1.5" />
          </div>
          <div class="flex overflow-hidden rounded-full">
            <div class="bg-foreground/5 size-1.5" />
            <div class="bg-foreground/20 size-1.5" />
          </div>
          <div class="flex overflow-hidden rounded-full">
            <div class="bg-foreground/20 size-1.5" />
            <div class="bg-foreground/5 size-1.5" />
          </div>
          <div class="flex overflow-hidden rounded-full">
            <div class="bg-foreground/5 size-1.5" />
            <div class="bg-foreground/20 size-1.5" />
          </div>
          <div class="flex overflow-hidden rounded-full">
            <div class="bg-foreground/20 size-1.5" />
            <div class="bg-foreground/5 size-1.5" />
          </div>
          <div class="flex overflow-hidden rounded-full">
            <div class="bg-foreground/5 size-1.5" />
            <div class="bg-foreground/20 size-1.5" />
          </div>
          <div class="flex overflow-hidden rounded-full">
            <div class="bg-foreground/20 size-1.5" />
            <div class="bg-foreground/5 size-1.5" />
          </div>
          <div class="flex overflow-hidden rounded-full">
            <div class="bg-foreground/5 size-1.5" />
            <div class="bg-foreground/20 size-1.5" />
          </div>
          <div class="flex overflow-hidden rounded-full">
            <div class="bg-foreground/20 size-1.5" />
            <div class="bg-foreground/5 size-1.5" />
          </div>
        </div>
      </div>

      <!-- ppt/pptx：幻灯片缩略 -->
      <div v-else-if="props.formatFile === 'ppt' || props.formatFile === 'pptx'">
        <div class="bg-foreground/5 mb-1.5 space-y-1 rounded border p-1">
          <div class="flex justify-center gap-1">
            <div class="size-3 rounded-sm bg-orange-400/40" />
          </div>
          <div class="bg-foreground/15 mx-auto h-0.75 w-8 rounded-full" />
        </div>
        <div class="mb-1 flex justify-center gap-1">
          <div class="bg-foreground/15 h-0.75 w-8 rounded-full" />
          <div class="bg-foreground/15 h-0.75 w-4 rounded-full" />
        </div>
        <div class="space-y-1">
          <div class="bg-foreground/15 h-0.75 w-4 rounded-full" />
          <div class="bg-foreground/15 h-0.75 w-5 rounded-full" />
        </div>
      </div>

      <!-- img/png/jpg/jpeg：图片缩略 -->
      <div
        v-else-if="props.formatFile === 'img' || props.formatFile === 'png' || props.formatFile === 'jpg' || props.formatFile === 'jpeg'"
      >
        <div class="bg-foreground/5 mb-1.5 space-y-1 rounded border p-1">
          <div class="flex justify-center gap-1">
            <div class="size-3 rounded-sm bg-yellow-400/40" />
          </div>
          <div class="bg-foreground/15 mx-auto mt-1 h-0.75 w-4 rounded-full" />
          <div class="bg-foreground/15 mx-auto h-0.75 w-8 rounded-full" />
        </div>
      </div>

      <!-- video：播放三角缩略 -->
      <div v-else-if="props.formatFile === 'video'">
        <div class="bg-foreground/5 mb-1.5 space-y-1 rounded border p-1">
          <div class="flex justify-center gap-1">
            <div class="size-0 border-y-[5px] border-l-8 border-y-transparent border-l-green-400/60" />
          </div>
          <div class="bg-foreground/15 mx-auto mt-1 h-0.75 w-4 rounded-full" />
          <div class="bg-foreground/15 mx-auto h-0.75 w-8 rounded-full" />
        </div>
      </div>

      <!-- html/js/jsx/tsx/code：标签对 -->
      <div
        v-else-if="props.formatFile === 'html' || props.formatFile === 'js' || props.formatFile === 'jsx' || props.formatFile === 'tsx' || props.formatFile === 'code'"
        class="space-y-1"
      >
        <div class="flex items-center gap-0.5">
          <div class="text-foreground/30 font-mono text-[5px]">&lt;</div>
          <div class="h-0.75 w-3 rounded-full bg-emerald-400/60" />
          <div class="text-foreground/30 font-mono text-[5px]">&gt;</div>
        </div>
        <div class="flex items-center gap-0.5 pl-1">
          <div class="text-foreground/30 font-mono text-[5px]">&lt;</div>
          <div class="h-0.75 w-2.5 rounded-full bg-sky-400/60" />
          <div class="text-foreground/30 font-mono text-[5px]">&gt;</div>
        </div>
        <div class="flex items-center gap-0.5 pl-1">
          <div class="text-foreground/30 font-mono text-[5px]">&lt;/</div>
          <div class="h-0.75 w-2.5 rounded-full bg-sky-400/60" />
          <div class="text-foreground/30 font-mono text-[5px]">&gt;</div>
        </div>
        <div class="flex items-center gap-0.5">
          <div class="text-foreground/30 font-mono text-[5px]">&lt;</div>
          <div class="h-0.75 w-1 rounded-full bg-emerald-400/60" />
          <div class="text-foreground/30 font-mono text-[5px]">/&gt;</div>
        </div>
      </div>

      <!-- css：花括号块 -->
      <div v-else-if="props.formatFile === 'css'" class="space-y-1">
        <div class="flex items-center gap-1">
          <div class="text-foreground/40 font-mono text-[6px]">{</div>
        </div>
        <div class="flex items-center gap-1 pl-1.5">
          <div class="h-0.75 w-3 rounded-full bg-sky-400/60" />
          <div class="h-0.75 w-4 rounded-full bg-sky-400/60" />
        </div>
        <div class="flex items-center gap-1 pl-1.5">
          <div class="h-0.75 w-4 rounded-full bg-sky-400/60" />
          <div class="h-0.75 w-2 rounded-full bg-sky-400/60" />
        </div>
        <div class="flex items-center gap-1 pl-1.5">
          <div class="h-0.75 w-3 rounded-full bg-sky-400/60" />
          <div class="h-0.75 w-4 rounded-full bg-sky-400/60" />
        </div>
        <div class="flex items-center gap-1">
          <div class="text-foreground/40 font-mono text-[6px]">}</div>
        </div>
      </div>

      <!-- json：花括号键值 -->
      <div v-else-if="props.formatFile === 'json'" class="space-y-1">
        <div class="flex items-center gap-1">
          <div class="text-foreground/40 font-mono text-[6px]">{</div>
        </div>
        <div class="flex items-center gap-1 pl-1.5">
          <div class="bg-foreground/20 h-0.75 w-3 rounded-full" />
          <div class="bg-foreground/20 h-0.75 w-4 rounded-full" />
        </div>
        <div class="flex items-center gap-1 pl-1.5">
          <div class="bg-foreground/10 h-0.75 w-4 rounded-full" />
          <div class="bg-foreground/10 h-0.75 w-2 rounded-full" />
        </div>
        <div class="flex items-center gap-1 pl-1.5">
          <div class="bg-foreground/10 h-0.75 w-3 rounded-full" />
          <div class="bg-foreground/10 h-0.75 w-4 rounded-full" />
        </div>
        <div class="flex items-center gap-1 pl-1.5">
          <div class="bg-foreground/10 h-0.75 w-3 rounded-full" />
        </div>
        <div class="flex items-center gap-1">
          <div class="text-foreground/40 font-mono text-[6px]">}</div>
        </div>
      </div>

      <!-- 默认（doc/pdf/txt 等）：文本行 -->
      <div v-else class="space-y-1.5">
        <div class="flex gap-2">
          <div class="bg-foreground/20 h-0.5 w-1/2 rounded-full" />
        </div>
        <div class="flex gap-1">
          <div class="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
          <div class="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
        </div>
        <div class="flex gap-1">
          <div class="bg-foreground/10 h-0.5 w-1/2 rounded-full" />
          <div class="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
        </div>
        <div class="flex gap-1">
          <div class="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
          <div class="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
        </div>
        <div class="flex gap-1">
          <div class="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
          <div class="bg-foreground/10 h-0.5 w-1/2 rounded-full" />
        </div>
        <div class="flex gap-1">
          <div class="bg-foreground/10 h-0.5 w-1/3 rounded-full" />
        </div>
      </div>
    </div>
  </div>
</template>
