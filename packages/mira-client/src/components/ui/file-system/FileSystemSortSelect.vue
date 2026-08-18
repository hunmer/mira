<script setup lang="ts">
/**
 * 工具栏"排序方式"下拉（由 React 版 FileSystemSortSelect 移植）
 *
 * full 布局显示当前排序键的短标签；compact 宽度下触发器折叠为排序图标 + 箭头。
 */
import { computed } from "vue"
import { ArrowUpDown } from "@lucide/vue"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { SORT_OPTIONS, type FileSystemSortKey, type FileSystemSortState } from "./fileSystemUtils"

defineOptions({ name: "FileSystemSortSelect" })

const props = defineProps<{
  layout: "full" | "compact" | "minimal"
  showLabel: boolean
  sort: FileSystemSortState
}>()

const emit = defineEmits<{
  (e: "keyChange", key: FileSystemSortKey): void
}>()

const activeOption = computed(
  () => SORT_OPTIONS.find((option) => option.key === props.sort.key)?.triggerLabel
)
</script>

<template>
  <Select
    :model-value="props.sort.key"
    @update:model-value="(value: any) => emit('keyChange', value as FileSystemSortKey)"
  >
    <SelectTrigger
      size="sm"
      aria-label="Sort by"
      title="Sort by"
      class="h-7 min-h-7 w-auto min-w-0 shrink-0 [&_svg]:size-4"
    >
      <span class="flex items-center gap-1.5">
        <ArrowUpDown class="size-4" />
        <span v-if="props.layout === 'full' && props.showLabel">
          {{ activeOption }}
        </span>
      </span>
    </SelectTrigger>
    <SelectContent align="end">
      <SelectItem v-for="option in SORT_OPTIONS" :key="option.key" :value="option.key">
        {{ option.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
