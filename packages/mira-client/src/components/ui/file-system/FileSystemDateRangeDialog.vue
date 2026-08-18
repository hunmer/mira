<script setup lang="ts">
/**
 * 自定义日期范围对话框（由 React 版 FileSystemDateRangeDialog 移植）
 *
 * From/To 输入 + 双月范围日历 + 快捷预设。应用的区间从首日起点到末日终点。
 */
import { ref } from "vue"
import { Calendar } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import FileSystemRangeCalendar from "./FileSystemRangeCalendar.vue"
import {
  DATE_RANGE_DIALOG_PRESETS,
  dateRangePresetRange,
  formatDateInputValue,
  parseDateInputValue,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemDateRangeDialog" })

const props = defineProps<{
  initialRange?: { from: Date, to: Date }
}>()

const emit = defineEmits<{
  (e: "apply", from: Date, to: Date): void
  (e: "close"): void
}>()

const range = ref<{ from?: Date, to?: Date }>(props.initialRange ?? {})
const fromInput = ref(formatDateInputValue(props.initialRange?.from))
const toInput = ref(formatDateInputValue(props.initialRange?.to))

function selectRange(next: { from?: Date, to?: Date }) {
  range.value = next
  if (next.from) fromInput.value = formatDateInputValue(next.from)
  if (next.to) toInput.value = formatDateInputValue(next.to)
}

function onFromInput(value: string | number) {
  fromInput.value = String(value)

  const parsed = parseDateInputValue(fromInput.value)

  if (parsed) range.value = { ...range.value, from: parsed }
}

function onToInput(value: string | number) {
  toInput.value = String(value)

  const parsed = parseDateInputValue(toInput.value)

  if (parsed) range.value = { ...range.value, to: parsed }
}

function apply() {
  if (!range.value.from || !range.value.to) return

  const from = new Date(range.value.from)
  const to = new Date(range.value.to)

  from.setHours(0, 0, 0, 0)
  to.setHours(23, 59, 59, 999)
  emit("apply", from, to)
}
</script>

<template>
  <Dialog :open="true" @update:open="(open: boolean) => !open && emit('close')">
    <DialogContent class="w-[30rem] max-w-[calc(100vw-2rem)]">
      <DialogHeader>
        <DialogTitle>Custom date range</DialogTitle>
      </DialogHeader>
      <div class="flex flex-col gap-4">
        <div class="flex gap-3">
          <div class="flex flex-1 flex-col gap-1.5">
            <span class="text-xs font-medium">From</span>
            <div class="relative flex items-center">
              <Calendar
                class="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
              />
              <Input
                type="text"
                :model-value="fromInput"
                placeholder="YYYY-MM-DD"
                aria-label="From date"
                class="h-8 pl-8 sm:h-8"
                @update:model-value="onFromInput"
              />
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-1.5">
            <span class="text-xs font-medium">To</span>
            <div class="relative flex items-center">
              <Calendar
                class="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
              />
              <Input
                type="text"
                :model-value="toInput"
                placeholder="YYYY-MM-DD"
                aria-label="To date"
                class="h-8 pl-8 sm:h-8"
                @update:model-value="onToInput"
              />
            </div>
          </div>
        </div>
        <FileSystemRangeCalendar :range="range" @select="selectRange" />
        <div class="grid grid-cols-3 gap-2">
          <Button
            v-for="preset in DATE_RANGE_DIALOG_PRESETS"
            :key="preset"
            type="button"
            variant="outline"
            size="sm"
            @click="selectRange(dateRangePresetRange(preset))"
          >
            {{ preset }}
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="emit('close')">
          Cancel
        </Button>
        <Button
          type="button"
          :disabled="!range.from || !range.to"
          @click="apply"
        >
          Apply
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
