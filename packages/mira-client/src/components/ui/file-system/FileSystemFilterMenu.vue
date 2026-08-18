<script setup lang="ts">
/**
 * 工具栏过滤菜单（由 React 版 FileSystemFilterMenu 移植）
 *
 * 文件类型为可搜索的多选清单，日期为单选预设 + 自定义区间，
 * 与 Extend 的表格过滤一致。
 */
import { Calendar, File, Filter } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import FileSystemFileTypeCommand from "./FileSystemFileTypeCommand.vue"
import {
  DATE_FILTER_PRESETS,
  FILTER_TYPE_LABELS,
  type FileSystemDateFilterType,
  type FileSystemFilter,
  type FileTypeFilterOption,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemFilterMenu" })

const props = defineProps<{
  fileTypeOptions: FileTypeFilterOption[]
  filters: FileSystemFilter[]
}>()

const emit = defineEmits<{
  (e: "openCustomRange", type: FileSystemDateFilterType): void
  (e: "selectDatePreset", type: FileSystemDateFilterType, preset: string): void
  (e: "toggleFileType", mime: string, checked: boolean): void
}>()

const dateFilterTypes: FileSystemDateFilterType[] = [
  "dateModified",
  "dateCreated",
]
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Filter"
        title="Filter"
        class="relative size-7"
      >
        <Filter class="size-4" />
        <span
          v-if="props.filters.length > 0"
          class="absolute top-1 right-1 size-1.5 rounded-full bg-primary"
        />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-44">
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <File class="size-4 text-muted-foreground" />
          File type
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent class="w-60">
          <FileSystemFileTypeCommand
            :checked-mimes="props.filters.find((filter) => filter.type === 'fileType')?.value ?? []"
            :options="props.fileTypeOptions"
            @toggle="(mime: string, checked: boolean) => emit('toggleFileType', mime, checked)"
          />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub v-for="type in dateFilterTypes" :key="type">
        <DropdownMenuSubTrigger>
          <Calendar class="size-4 text-muted-foreground" />
          {{ FILTER_TYPE_LABELS[type] }}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <div class="h-auto max-h-72 overflow-y-auto">
            <DropdownMenuItem
              v-for="preset in DATE_FILTER_PRESETS"
              :key="preset"
              @click="emit('selectDatePreset', type, preset)"
            >
              {{ preset }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="emit('openCustomRange', type)">
              Custom date range…
            </DropdownMenuItem>
          </div>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
