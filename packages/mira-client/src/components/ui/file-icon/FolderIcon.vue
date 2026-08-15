<script setup lang="ts">
/**
 * 文件夹类型图标（复刻自 agent_spaces web 的 editor/file-icon.tsx）
 *
 * 按文件夹名匹配专属图标（src/node_modules/.git 等），
 * 开合状态切换 _opened 变体，未匹配走默认文件夹图标，固定 16px。
 */
import { computed } from "vue"
import { getFolderIconPath } from "./iconPaths"

defineOptions({ name: "FolderIcon" })

const props = withDefaults(
  defineProps<{
    /** 文件夹名，如 "src"、".github" */
    name: string
    /** 是否展开（使用 _opened 图标变体） */
    isOpen?: boolean
  }>(),
  { isOpen: false },
)

const src = computed(() => getFolderIconPath(props.name, props.isOpen))
</script>

<template>
  <img :src="src" :alt="props.name" width="16" height="16" class="size-4 shrink-0" />
</template>
