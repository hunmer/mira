<script setup lang="ts">
/**
 * 双月范围日历（由 React 版 FileSystemRangeCalendar 移植）
 *
 * 自定义日期范围对话框用（手机宽度只显示一个月）。第一次点击设起点、
 * 第二次设终点；点在起点之前会交换两端；第三次点击重新开始。
 */
import { computed, ref } from "vue"
import { ArrowLeft, ArrowRight } from "@lucide/vue"
import { cn } from "@/lib/utils"
import { WEEKDAY_LABELS, calendarDayKey } from "./fileSystemUtils"

defineOptions({ name: "FileSystemRangeCalendar" })

const props = defineProps<{
  range: { from?: Date, to?: Date }
}>()

const emit = defineEmits<{
  (e: "select", range: { from?: Date, to?: Date }): void
}>()

const initialBase = props.range.from ?? new Date()
const viewMonth = ref(
  new Date(initialBase.getFullYear(), initialBase.getMonth(), 1)
)

const months = computed(() => [
  viewMonth.value,
  new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth() + 1, 1),
])
const fromKey = computed(() =>
  props.range.from ? calendarDayKey(props.range.from) : null
)
const toKey = computed(() =>
  props.range.to ? calendarDayKey(props.range.to) : null
)
const todayKey = calendarDayKey(new Date())

function previousMonth() {
  const previous = viewMonth.value
  viewMonth.value = new Date(previous.getFullYear(), previous.getMonth() - 1, 1)
}

function nextMonth() {
  const previous = viewMonth.value
  viewMonth.value = new Date(previous.getFullYear(), previous.getMonth() + 1, 1)
}

function handleDayClick(day: Date) {
  if (!props.range.from || props.range.to) {
    emit("select", { from: day })
  } else if (calendarDayKey(day) < calendarDayKey(props.range.from)) {
    emit("select", { from: day, to: props.range.from })
  } else {
    emit("select", { from: props.range.from, to: day })
  }
}

interface CalendarCell {
  key: number
  date: Date | null
}

const monthCells = computed(() =>
  months.value.map((month) => {
    const firstWeekday = month.getDay()
    const dayCount = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    ).getDate()
    const cells: CalendarCell[] = [
      ...Array.from({ length: firstWeekday }, (_, index) => ({
        date: null,
        key: index,
      })),
      ...Array.from({ length: dayCount }, (_, index) => ({
        date: new Date(month.getFullYear(), month.getMonth(), index + 1),
        key: firstWeekday + index,
      })),
    ]

    return { month, cells }
  })
)

function cellClass(day: Date) {
  const dayKey = calendarDayKey(day)
  const isFrom = dayKey === fromKey.value
  const isTo = dayKey === toKey.value
  const isWithinRange =
    fromKey.value !== null &&
    toKey.value !== null &&
    dayKey > fromKey.value &&
    dayKey < toKey.value

  return cn(
    "flex h-7 items-center justify-center rounded-md text-xs tabular-nums transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
    isWithinRange && "rounded-none bg-accent",
    (isFrom || isTo) && "bg-primary text-primary-foreground hover:bg-primary",
    isFrom &&
      toKey.value !== null &&
      fromKey.value !== toKey.value &&
      "rounded-r-none",
    isTo && fromKey.value !== toKey.value && "rounded-l-none",
    dayKey === todayKey && !isFrom && !isTo && "font-semibold text-primary"
  )
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      aria-label="Previous month"
      class="absolute top-0 left-0 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      @click="previousMonth"
    >
      <ArrowLeft class="size-4" />
    </button>
    <button
      type="button"
      aria-label="Next month"
      class="absolute top-0 right-0 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      @click="nextMonth"
    >
      <ArrowRight class="size-4" />
    </button>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div
        v-for="{ month, cells }, monthIndex in monthCells"
        :key="`${month.getFullYear()}-${month.getMonth()}`"
        :class="cn(monthIndex === 1 && 'max-sm:hidden')"
      >
        <div class="text-center text-sm leading-6 font-medium">
          {{
            month.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
          }}
        </div>
        <div class="mt-1 grid grid-cols-7 text-center text-xs text-muted-foreground">
          <span v-for="weekday in WEEKDAY_LABELS" :key="weekday" class="h-6 leading-6">
            {{ weekday }}
          </span>
        </div>
        <div class="grid grid-cols-7 gap-y-px">
          <template v-for="cell in cells" :key="cell.key">
            <button
              v-if="cell.date"
              type="button"
              :class="cellClass(cell.date)"
              @click="handleDayClick(cell.date)"
            >
              {{ cell.date.getDate() }}
            </button>
            <span v-else />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
