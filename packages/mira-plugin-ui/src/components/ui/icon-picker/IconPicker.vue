<script setup lang="ts">
/**
 * Material Icons 图标选择器(自 mira-client IconPicker 移植,去掉 i18n)。
 * 圆形触发按钮 + Popover 搜索/网格/分页;图标名与桌面端 icon 字段共用。
 * 字体由 tailwind.css 的 @font-face 提供(.material-icons ligature 渲染)。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { iconNames } from './icon-names'

const props = withDefaults(defineProps<{
  /** 当前选中的图标名;空字符串表示使用默认 */
  modelValue: string
  /** 模型为空时的回退图标 */
  defaultIcon?: string
  /** 触发按钮图标着色(如所选颜色) */
  color?: string
  /** 每页图标数量 */
  pageSize?: number
}>(), {
  defaultIcon: '',
  color: '',
  pageSize: 72,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)
const search = ref('')
const page = ref(1)
const searchInputRef = ref<HTMLInputElement | null>(null)

const iconStyle = computed(() => (props.color ? { color: props.color } : {}))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? iconNames.filter(name => name.toLowerCase().includes(q)) : iconNames
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / props.pageSize)))

const paged = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return filtered.value.slice(start, start + props.pageSize)
})

// 搜索变化:回到第 1 页
watch(search, () => {
  page.value = 1
})

// 打开时重置搜索并聚焦输入框
watch(open, (value) => {
  if (value) {
    search.value = ''
    page.value = 1
    nextTick(() => searchInputRef.value?.focus())
  }
})

function selectIcon (name: string) {
  emit('update:modelValue', name)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="flex size-12 cursor-pointer items-center justify-center rounded-full border border-border bg-muted/50 text-foreground transition-[background-color,border-color,transform] duration-150 hover:border-primary/50 hover:bg-accent active:scale-90"
        :title="modelValue || defaultIcon || '选择图标'"
      >
        <span class="material-icons text-2xl" :style="iconStyle">{{ modelValue || defaultIcon || 'extension' }}</span>
      </button>
    </PopoverTrigger>

    <PopoverContent align="center" side="bottom" :side-offset="6" class="w-80 p-0">
      <div class="flex max-h-[360px] flex-col">
        <!-- 搜索 -->
        <div class="sticky top-0 z-10 rounded-t-md border-b border-border bg-popover/80 p-2 backdrop-blur-md">
          <div class="relative">
            <span class="material-icons absolute top-1/2 left-2 -translate-y-1/2 text-base text-muted-foreground" style="font-size: 16px">search</span>
            <input
              ref="searchInputRef"
              v-model="search"
              type="text"
              placeholder="搜索图标…"
              class="focus:border-primary focus:ring-primary/30 w-full rounded-full border border-border bg-background/70 py-1.5 pr-3 pl-8 text-sm outline-none focus:ring-1"
              @keydown.esc="open = false"
            >
          </div>
          <div class="mt-1.5 flex items-center justify-between px-1">
            <span class="text-muted-foreground text-[11px]">{{ filtered.length }} 个图标</span>
            <button
              v-if="modelValue"
              type="button"
              class="text-primary text-[11px] hover:underline"
              @click="selectIcon('')"
            >
              使用默认
            </button>
          </div>
        </div>

        <!-- 图标网格 -->
        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <div v-if="paged.length > 0" class="grid grid-cols-8 gap-1">
            <button
              v-for="name in paged"
              :key="name"
              type="button"
              :title="name"
              class="text-foreground flex size-8 cursor-pointer items-center justify-center rounded-md transition-[background-color,transform] duration-100 hover:bg-primary/10 active:scale-90"
              :class="modelValue === name ? 'bg-primary/15 ring-primary/40 ring-1' : ''"
              @click="selectIcon(name)"
            >
              <span class="material-icons text-[20px] leading-none" style="font-size: 20px">{{ name }}</span>
            </button>
          </div>
          <div v-else class="text-muted-foreground flex flex-col items-center justify-center py-8">
            <span class="material-icons mb-2" style="font-size: 30px">search_off</span>
            <p class="text-xs">无匹配图标</p>
          </div>
        </div>

        <!-- 分页 -->
        <div
          v-if="totalPages > 1"
          class="text-muted-foreground flex items-center justify-between border-t border-border px-2 py-1.5 text-xs"
        >
          <button
            type="button"
            class="hover:bg-accent flex cursor-pointer items-center rounded px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page <= 1"
            @click="page--"
          >
            <span class="material-icons" style="font-size: 16px">chevron_left</span>
          </button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button
            type="button"
            class="hover:bg-accent flex cursor-pointer items-center rounded px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page >= totalPages"
            @click="page++"
          >
            <span class="material-icons" style="font-size: 16px">chevron_right</span>
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
