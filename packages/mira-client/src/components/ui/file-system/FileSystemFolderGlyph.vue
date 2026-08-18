<script setup lang="ts">
/**
 * 文件夹图形（由 React 版 FileSystemFolderGlyph 移植）
 *
 * 单一 SVG 数据 URL，图标/列表/分栏/画廊四个视图共用同一字形。
 */
import { cn } from "@/lib/utils"

defineOptions({ name: "FileSystemFolderGlyph" })

const props = defineProps<{
  class?: string
}>()

const FOLDER_GLYPH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 50" width="64" height="50"><defs><linearGradient id="fs-folder-back" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3dabf5"/><stop offset="1" stop-color="#1d84dd"/></linearGradient><linearGradient id="fs-folder-front" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7accfb"/><stop offset="1" stop-color="#37a0ef"/></linearGradient></defs><path d="M5 10c0-3.31 2.69-6 6-6h10.9c1.6 0 3.13.7 4.18 1.9l1.5 1.73a3.5 3.5 0 0 0 2.64 1.22H54c2.76 0 5 2.24 5 5V40c0 3.87-3.13 7-7 7H12c-3.87 0-7-3.13-7-7V10Z" fill="url(#fs-folder-back)"/><path d="M5 15.5h54V40c0 3.87-3.13 7-7 7H12c-3.87 0-7-3.13-7-7V15.5Z" fill="url(#fs-folder-front)"/></svg>`
const FOLDER_GLYPH_DATA_URL = `data:image/svg+xml,${encodeURIComponent(FOLDER_GLYPH_SVG)}`
</script>

<template>
  <img
    :src="FOLDER_GLYPH_DATA_URL"
    alt=""
    aria-hidden="true"
    draggable="false"
    :class="cn('select-none', props.class)"
  />
</template>
