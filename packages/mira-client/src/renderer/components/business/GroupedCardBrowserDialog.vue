<script setup lang="ts">
/**
 * 通用「分组卡片浏览」对话框
 *
 * 顶部为 A-Z 字母索引（点击跳转到对应分组），下方按首字母（中文取拼音首字母）
 * 分组，每个分组内以响应式换行的方式展示多个卡片。
 *
 * 复用于「文件夹管理」和「标签管理」：点击卡片后抛出 select 事件，
 * 由父级决定打开 tab 的具体逻辑（复用 HomeView 的 handleFolderSelect / handleTagSelect）。
 */
import { computed, nextTick, ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { getPinyinFirstLetter } from '@renderer/utils/helpers'

defineOptions({ name: 'GroupedCardBrowserDialog' })

export interface BrowserItem {
  /** 原始数据（文件夹/标签对象），点击时原样回传 */
  raw: any
  /** 显示名 */
  label: string
  /** 文件数量 */
  count?: number
  /** Material 图标名，默认 folder */
  icon?: string
  /** 颜色数值（文件夹/标签的 color 字段），用于圆点 */
  color?: number
  /** 描述（可选） */
  description?: string
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    title: string
    items: BrowserItem[]
    /** Material 图标，作为空态与默认图标 */
    emptyIcon?: string
    itemTypeLabel?: string
    /** 自定义卡片组件（接收 item + libraryId + onSelect），不传则用内置默认卡片 */
    cardComponent?: any
    /** 当前素材库 id（传给自定义卡片用于拉取缩略图） */
    libraryId?: string
  }>(),
  {
    emptyIcon: 'folder_off',
    itemTypeLabel: '项',
    cardComponent: undefined,
    libraryId: undefined,
  }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [raw: any]
}>()

// ----------------------------------------
// A-Z 分组：按 label 首字母（中文走拼音首字母）归类
// ----------------------------------------
interface Group {
  key: string
  items: BrowserItem[]
}

const groups = computed<Group[]>(() => {
  const buckets: Record<string, BrowserItem[]> = {}
  const order: string[] = []

  for (const item of props.items) {
    const letter = (getPinyinFirstLetter(item.label) || '#').toUpperCase()
    const key = /^[A-Z]$/.test(letter) ? letter : '#'
    if (!buckets[key]) {
      buckets[key] = []
      order.push(key)
    }
    buckets[key].push(item)
  }

  // 组内按名称排序（拼音）
  const sortedKeys = order.sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })

  return sortedKeys.map(key => ({
    key,
    items: buckets[key].slice().sort((x, y) =>
      (getPinyinFirstLetter(x.label) || '').localeCompare(getPinyinFirstLetter(y.label) || '')
    ),
  }))
})

// 出现过的字母集合（A-Z 索引直接遍历 groups，不再展示不存在的字母）

// ----------------------------------------
// 字母索引跳转
// ----------------------------------------
const bodyRef = ref<HTMLElement>()
const activeKey = ref<string>('')

const scrollToGroup = async (key: string) => {
  await nextTick()
  const body = bodyRef.value
  if (!body) return
  const el = body.querySelector(`[data-group-key="${key}"]`) as HTMLElement | null
  if (el) {
    body.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' })
    activeKey.value = key
  }
}

// 滚动时高亮当前字母（节流：rAF）
let ticking = false
const onBodyScroll = () => {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    const body = bodyRef.value
    if (!body) return
    const groupsEls = body.querySelectorAll<HTMLElement>('[data-group-key]')
    let current = ''
    for (const el of groupsEls) {
      if (el.offsetTop - 40 <= body.scrollTop) {
        current = el.dataset.groupKey || ''
      }
    }
    if (current) activeKey.value = current
  })
}

// ----------------------------------------
// 颜色：color 数值 -> #RRGGBB
// ----------------------------------------
const colorHex = (color?: number) => {
  if (color == null) return ''
  return `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}`
}

// ----------------------------------------
// 卡片点击 -> 抛回原始对象，关闭对话框
// ----------------------------------------
const onCardClick = (item: BrowserItem) => {
  emit('select', item.raw)
  emit('update:visible', false)
}

// 自定义卡片通过 onSelect 回调选中
const onSelectItem = (raw: any) => {
  emit('select', raw)
  emit('update:visible', false)
}

// 关闭时重置
watch(
  () => props.visible,
  v => {
    if (v) activeKey.value = groups.value[0]?.key || ''
  }
)
</script>

<template>
  <Dialog :open="visible" @update:open="emit('update:visible', $event)">
    <DialogContent class="grouped-card-dialog sm:max-w-[720px] flex flex-col gap-0 p-0">
      <DialogHeader class="px-5 pt-5 pb-3">
        <DialogTitle class="flex items-center gap-2 text-lg">
          <span class="material-icons text-primary">{{ emptyIcon === 'folder_off' ? 'folder' : 'label' }}</span>
          {{ title }}
          <span class="text-xs font-normal text-muted-foreground">{{ items.length }} 个{{ itemTypeLabel }}</span>
        </DialogTitle>
        <DialogDescription class="sr-only">{{ title }}</DialogDescription>
      </DialogHeader>

      <!-- A-Z 字母索引（仅展示出现过的字母） -->
      <div class="px-5 pb-2 shrink-0">
        <div class="flex flex-wrap items-center gap-0.5 text-xs">
          <template v-for="group in groups" :key="group.key">
            <button
              type="button"
              class="h-6 min-w-[18px] px-1 rounded-md transition-colors font-medium"
              :class="activeKey === group.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'"
              @click="scrollToGroup(group.key)"
            >
              {{ group.key }}
            </button>
          </template>
        </div>
      </div>

      <!-- 分组卡片网格 -->
      <div ref="bodyRef" class="flex-1 overflow-y-auto px-5 pb-5 min-h-[280px] max-h-[60vh]" @scroll.passive="onBodyScroll">
        <div v-if="groups.length === 0" class="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
          <span class="material-icons text-4xl mb-2 opacity-50">{{ emptyIcon }}</span>
          <div class="text-sm">暂无{{ itemTypeLabel }}可展示</div>
        </div>

        <div v-for="group in groups" :key="group.key" class="mb-4" :data-group-key="group.key">
          <div class="flex items-center gap-2 mb-2 py-1 z-10">
            <span class="text-sm font-semibold text-primary w-5">{{ group.key }}</span>
            <div class="h-px flex-1 bg-border/60"></div>
            <span class="text-[11px] text-muted-foreground">{{ group.items.length }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <component
              :is="cardComponent || 'button'"
              v-for="item in group.items"
              :key="String(item.raw?.id ?? item.label)"
              :item="item"
              :library-id="libraryId"
              :class="!cardComponent ? 'group/card card-item default-card' : ''"
              v-bind="cardComponent ? { onSelect: onSelectItem } : {}"
              @click="!cardComponent ? onCardClick(item) : null"
            >
              <template v-if="!cardComponent">
                <!-- 默认卡片：图标 + 名称 + 数量 -->
                <span
                  class="material-icons text-[20px] shrink-0"
                  :style="item.color != null ? { color: colorHex(item.color) } : undefined"
                  :class="item.color == null ? 'text-primary' : ''"
                >
                  {{ item.icon || (emptyIcon === 'folder_off' ? 'folder' : 'label') }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-medium text-foreground truncate">{{ item.label }}</span>
                  <span v-if="item.count != null" class="block text-[11px] text-muted-foreground">{{ item.count }} 个文件</span>
                </span>
              </template>
            </component>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.card-item:active {
  transform: scale(0.98);
}

.default-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem 0.5rem 0.625rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  border-color: color-mix(in oklch, var(--border) 60%, transparent);
  background: color-mix(in oklch, var(--card) 60%, transparent);
  transition: all 0.2s ease;
  text-align: left;
  min-width: 140px;
  max-width: 260px;
}

.default-card:hover {
  background: color-mix(in oklch, var(--primary) 8%, transparent);
  border-color: color-mix(in oklch, var(--primary) 40%, transparent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
</style>
