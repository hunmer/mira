<script setup lang="ts">
/**
 * 条目信息面板（由 React 版 FileSystemInformation 移植）
 *
 * 分栏视图与画廊视图的侧栏共享：创建/修改时间、大小或子项数。
 */
import { computed } from "vue"
import {
  formatByteSize,
  formatTimestamp,
  type FileSystemEntry,
  type FileSystemIndex,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemInformation" })

const props = defineProps<{
  entry: FileSystemEntry
  index: FileSystemIndex
}>()

const rows = computed(() => {
  const rows: Array<[string, string]> = []
  const created = formatTimestamp(props.entry.createdAt)
  const updated = formatTimestamp(props.entry.updatedAt)

  if (created) rows.push(["Created", created])
  if (updated) rows.push(["Modified", updated])
  if (props.entry.kind === "file") {
    const size = formatByteSize(props.entry.size)

    if (size) rows.push(["Size", size])
  } else {
    const childCount = props.index.children.get(props.entry.path)?.length

    if (childCount !== undefined) {
      rows.push(["Items", `${childCount}`])
    }
  }
  return rows
})
</script>

<template>
  <div v-if="rows.length > 0" class="border-t pt-3">
    <div class="mb-1.5 text-xs font-semibold">Information</div>
    <dl class="space-y-1">
      <div
        v-for="[label, value] in rows"
        :key="label"
        class="flex items-baseline justify-between gap-3 text-xs"
      >
        <dt class="shrink-0 text-muted-foreground">{{ label }}</dt>
        <dd class="text-right">{{ value }}</dd>
      </div>
    </dl>
  </div>
</template>
