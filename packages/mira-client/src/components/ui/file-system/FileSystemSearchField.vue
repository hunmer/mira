<script setup lang="ts">
/**
 * 工具栏搜索框（由 React 版 FileSystemSearchField 移植）
 *
 * full 布局内联在头部右列；compact/minimal 宽度下折叠为幽灵图标按钮，
 * 点击在气泡中展开输入框（有查询时按钮带圆点标记）。
 * 暴露 focus() 供根组件的 ⌘F / Ctrl+F 快捷键使用。
 */
import { computed, ref, watchEffect } from "vue"
import { Search, X } from "@lucide/vue"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

defineOptions({ name: "FileSystemSearchField" })

const props = defineProps<{
  isExpanded: boolean
  layout: "full" | "compact" | "minimal"
  value: string
}>()

const emit = defineEmits<{
  (e: "update:isExpanded", isExpanded: boolean): void
  (e: "update:value", value: string): void
}>()

const inputEl = ref<HTMLInputElement | null>(null)
const isInline = computed(() => props.layout === "full")

// 气泡模式展开时把焦点拉进输入框，输入立即开始过滤。
watchEffect(() => {
  if (!isInline.value && props.isExpanded) inputEl.value?.focus()
})

function focus() {
  inputEl.value?.focus()
}

function clearSearch() {
  emit("update:value", "")
  inputEl.value?.focus()
}

defineExpose({ focus })

function onInput(event: Event) {
  emit("update:value", (event.target as HTMLInputElement).value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return
  event.preventDefault()
  event.stopPropagation()
  if (props.value) {
    emit("update:value", "")
  } else {
    emit("update:isExpanded", false)
    ;(event.currentTarget as HTMLInputElement).blur()
  }
}
</script>

<template>
  <div v-if="isInline" class="flex w-56 min-w-32 items-center">
    <div
      class="relative flex h-7 min-w-0 flex-1 items-center rounded-lg border border-input bg-popover text-sm text-foreground shadow-xs outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background dark:bg-input/30"
    >
      <Search
        class="pointer-events-none absolute left-2 size-3.5 text-muted-foreground"
      />
      <input
        ref="inputEl"
        type="text"
        role="searchbox"
        aria-label="Search files"
        placeholder="Search"
        :value="props.value"
        @input="onInput"
        @keydown="onKeydown"
        class="h-full w-full min-w-0 rounded-[inherit] bg-transparent pr-6 pl-7 outline-none placeholder:text-muted-foreground"
      />
      <button
        v-if="props.value"
        type="button"
        aria-label="Clear search"
        @click="clearSearch"
        class="absolute right-1 flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X class="size-3" />
      </button>
    </div>
  </div>

  <Popover
    v-else
    :open="props.isExpanded"
    @update:open="(open: boolean) => emit('update:isExpanded', open)"
  >
    <PopoverTrigger as-child>
      <button
        type="button"
        aria-label="Search"
        title="Search"
        class="relative flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search class="size-4" />
        <span
          v-if="props.value"
          class="absolute top-1 right-1 size-1.5 rounded-full bg-primary"
        />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" :side-offset="6" class="w-64 p-1">
      <div
        class="relative flex h-7 min-w-0 flex-1 items-center rounded-lg border border-input bg-popover text-sm text-foreground shadow-xs outline-none focus-within:ring-2 focus-within:ring-ring dark:bg-input/30"
      >
        <Search
          class="pointer-events-none absolute left-2 size-3.5 text-muted-foreground"
        />
        <input
          ref="inputEl"
          type="text"
          role="searchbox"
          aria-label="Search files"
          placeholder="Search"
          :value="props.value"
          @input="onInput"
          @keydown="onKeydown"
          class="h-full w-full min-w-0 rounded-[inherit] bg-transparent pr-6 pl-7 outline-none placeholder:text-muted-foreground"
        />
        <button
          v-if="props.value"
          type="button"
          aria-label="Clear search"
          @click="clearSearch"
          class="absolute right-1 flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X class="size-3" />
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
