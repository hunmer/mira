<script setup lang="ts">
/**
 * 过滤条件胶囊（由 React 版 FileSystemFilterPill 移植）
 *
 * 状态栏里一条已应用过滤条件的分段胶囊：类型 · 操作符 · 值 · 删除，
 * 每段都可交互，与 Extend 的表格过滤胶囊一致。
 */
import { computed } from "vue"
import { Calendar, File, X } from "@lucide/vue"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import FileSystemFileTypeCommand from "./FileSystemFileTypeCommand.vue"
import {
  DATE_FILTER_PRESETS,
  FILTER_OPERATOR_LABELS,
  FILTER_TYPE_LABELS,
  filterOperatorChoices,
  isCustomDateRangeValue,
  type FileSystemFilter,
  type FileSystemFilterOperator,
  type FileTypeFilterOption,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemFilterPill" })

const props = defineProps<{
  fileTypeOptions: FileTypeFilterOption[]
  filter: FileSystemFilter
}>()

const emit = defineEmits<{
  (e: "openCustomRange"): void
  (e: "operatorChange", operator: FileSystemFilterOperator): void
  (e: "remove"): void
  (e: "selectDatePreset", preset: string): void
  (e: "toggleFileType", mime: string, checked: boolean): void
}>()

const isCustomRange = computed(
  () => props.filter.type !== "fileType" && isCustomDateRangeValue(props.filter.value)
)
const selectedTypeLabels = computed(() =>
  props.filter.type === "fileType"
    ? props.filter.value.map(
        (mime) =>
          props.fileTypeOptions.find((option) => option.mime === mime)?.label ??
          mime
      )
    : []
)
const operatorChoices = computed(() => filterOperatorChoices(props.filter))
const customRangeText = computed(() =>
  props.filter.value
    .map((value) => new Date(value).toLocaleDateString("en-US"))
    .join(" – ")
)

const FILTER_PILL_SEGMENT_CLASSNAME =
  "flex h-5 items-center gap-1 border border-l-0 bg-background px-1.5 whitespace-nowrap text-foreground"
const FILTER_PILL_BUTTON_CLASSNAME = cn(
  FILTER_PILL_SEGMENT_CLASSNAME,
  "transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
)
</script>

<template>
  <div class="flex items-center text-xs">
    <span
      :class="cn(FILTER_PILL_SEGMENT_CLASSNAME, 'rounded-l-md border-l text-primary')"
    >
      <File v-if="props.filter.type === 'fileType'" class="size-3" />
      <Calendar v-else class="size-3" />
      {{ FILTER_TYPE_LABELS[props.filter.type] }}
    </span>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          :class="cn(FILTER_PILL_BUTTON_CLASSNAME, 'text-primary')"
        >
          {{ FILTER_OPERATOR_LABELS[props.filter.operator] }}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="min-w-28">
        <DropdownMenuItem
          v-for="operator in operatorChoices"
          :key="operator"
          @click="emit('operatorChange', operator)"
        >
          {{ FILTER_OPERATOR_LABELS[operator] }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <DropdownMenu v-if="props.filter.type === 'fileType'">
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          :title="selectedTypeLabels.join(', ')"
          :class="FILTER_PILL_BUTTON_CLASSNAME"
        >
          {{
            props.filter.value.length === 1
              ? selectedTypeLabels[0]
              : `${props.filter.value.length} selected`
          }}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-60">
        <FileSystemFileTypeCommand
          :checked-mimes="props.filter.value"
          :options="props.fileTypeOptions"
          @toggle="(mime: string, checked: boolean) => emit('toggleFileType', mime, checked)"
        />
      </DropdownMenuContent>
    </DropdownMenu>

    <button
      v-else-if="isCustomRange"
      type="button"
      :class="FILTER_PILL_BUTTON_CLASSNAME"
      @click="emit('openCustomRange')"
    >
      {{ customRangeText }}
    </button>

    <DropdownMenu v-else>
      <DropdownMenuTrigger as-child>
        <button type="button" :class="FILTER_PILL_BUTTON_CLASSNAME">
          {{ props.filter.value[0] }}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <div class="h-auto max-h-72 overflow-y-auto">
          <DropdownMenuItem
            v-for="preset in DATE_FILTER_PRESETS"
            :key="preset"
            @click="emit('selectDatePreset', preset)"
          >
            {{ preset }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('openCustomRange')">
            Custom date range…
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

    <button
      type="button"
      :aria-label="`Remove ${FILTER_TYPE_LABELS[props.filter.type]} filter`"
      :class="cn(FILTER_PILL_BUTTON_CLASSNAME, 'rounded-r-md px-1 text-muted-foreground hover:text-foreground')"
      @click="emit('remove')"
    >
      <X class="size-3" />
    </button>
  </div>
</template>
