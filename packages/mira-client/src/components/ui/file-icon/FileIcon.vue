<script setup lang="ts">
/**
 * 文件类型图标（复刻自 agent_spaces web 的 editor/file-icon.tsx）
 *
 * 按文件名（package.json 等配置文件优先）→ 扩展名 → 默认图标的顺序匹配，
 * 渲染 public/icons/ 下的 vscode-file-icons 风格 SVG，固定 16px。
 */
import { computed } from "vue"
import { getFileIconPath } from "./iconPaths"

defineOptions({ name: "FileIcon" })

const props = defineProps<{
  /** 文件名（含扩展名），如 "index.ts"、"package.json" */
  name: string
}>()

const src = computed(() => getFileIconPath(props.name))
</script>

<template>
  <img :src="src" :alt="props.name" width="16" height="16" class="size-4 shrink-0" />
</template>
