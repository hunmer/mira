<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="icon-picker-trigger flex items-center justify-center w-10 h-10 rounded-full border border-border bg-muted/50 hover:bg-accent hover:border-primary/50 transition-colors text-foreground"
        :title="modelValue || defaultIcon || $t('business.iconPicker.selectIcon')"
      >
        <span class="material-icons text-xl" :style="iconStyle">{{ modelValue || defaultIcon || 'extension' }}</span>
      </button>
    </PopoverTrigger>

    <PopoverContent
      align="start"
      side="bottom"
      :side-offset="6"
      class="w-80 p-0"
    >
      <div class="flex flex-col max-h-[360px]">
        <!-- 搜索 -->
        <div class="p-2 border-b border-border sticky top-0 bg-white/80 dark:bg-muted/80 backdrop-blur-md rounded-t-2xl z-10">
          <div class="relative">
            <span class="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-base text-muted-foreground">search</span>
            <input
              ref="searchInputRef"
              v-model="search"
              type="text"
              :placeholder="$t('business.iconPicker.searchPlaceholder')"
              class="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-full bg-white/70 dark:bg-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              @keydown.esc="open = false"
            />
          </div>
          <div class="flex items-center justify-between mt-1.5 px-1">
            <span class="text-[11px] text-muted-foreground">{{ $t('business.iconPicker.iconCount', { count: filtered.length }) }}</span>
            <button
              v-if="modelValue"
              type="button"
              class="text-[11px] text-primary hover:underline"
              @click="selectIcon('')"
            >
              {{ $t('business.iconPicker.useDefault') }}
            </button>
          </div>
        </div>

        <!-- 图标网格 -->
        <div class="flex-1 overflow-y-auto p-2 min-h-0">
          <div v-if="paged.length > 0" class="grid grid-cols-8 gap-1">
            <button
              v-for="name in paged"
              :key="name"
              type="button"
              :title="name"
              class="icon-cell flex items-center justify-center w-8 h-8 rounded-md hover:bg-primary/10 text-foreground transition-colors"
              :class="modelValue === name ? 'bg-primary/15 ring-1 ring-primary/40' : ''"
              @click="selectIcon(name)"
            >
              <span class="material-icons text-[20px] leading-none">{{ name }}</span>
            </button>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <span class="material-icons text-3xl mb-2">search_off</span>
            <p class="text-xs">{{ $t('business.iconPicker.noMatch') }}</p>
          </div>
        </div>

        <!-- 分页 -->
        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between px-2 py-1.5 border-t border-border text-xs text-muted-foreground"
        >
          <button
            type="button"
            class="flex items-center px-2 py-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page <= 1"
            @click="page--"
          >
            <span class="material-icons text-base">chevron_left</span>
          </button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button
            type="button"
            class="flex items-center px-2 py-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page >= totalPages"
            @click="page++"
          >
            <span class="material-icons text-base">chevron_right</span>
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import iconNames from '@renderer/data/material-icons.json'

interface Props {
  /** 当前选中的图标名；空字符串表示使用默认 */
  modelValue: string
  /** 模型为空时的回退图标 */
  defaultIcon?: string
  /** 图标颜色（触发按钮显示的图标颜色） */
  color?: string
  /** 每页图标数量 */
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
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
  if (!q) return iconNames as string[]
  return (iconNames as string[]).filter(name => name.toLowerCase().includes(q))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / props.pageSize)))

const paged = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return filtered.value.slice(start, start + props.pageSize)
})

// 搜索变化：回到第 1 页
watch(search, () => {
  page.value = 1
})

// 打开时重置搜索并聚焦输入框
watch(open, (val) => {
  if (val) {
    search.value = ''
    page.value = 1
    nextTick(() => searchInputRef.value?.focus())
  }
})

function selectIcon(name: string) {
  emit('update:modelValue', name)
  open.value = false
}
</script>

<style scoped>
.material-icons {
  font-size: 20px;
}

.icon-picker-trigger:active {
  transform: scale(0.92);
  transition: transform 120ms ease-out;
}

.icon-cell:active {
  transform: scale(0.88);
  transition: transform 100ms ease-out;
}
</style>
