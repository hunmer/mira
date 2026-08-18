<script setup lang="ts">
/**
 * 文件类型图标（替代 React 版基于 @pierre/trees sprite 的 FileTypeIcon）
 *
 * 复用库内 file-icon 的 vscode-file-icons 彩色 SVG 按文件名解析，
 * 尺寸跟随传入的 class。
 */
import { computed } from "vue"
import { getFileIconPath } from "@/components/ui/file-icon/iconPaths"
import { cn } from "@/lib/utils"

defineOptions({ name: "FileSystemFileTypeIcon" })

const props = defineProps<{
  fileName: string
  class?: string
}>()

const src = computed(() => getFileIconPath(props.fileName))
</script>

<template>
  <img
    :src="src"
    alt=""
    aria-hidden="true"
    draggable="false"
    :class="cn('shrink-0', props.class)"
  />
</template>
