<script setup lang="ts">
/**
 * 新建/编辑已保存过滤器的对话框(桌面端 SavedFilterDialog 的组件库自包含版)。
 * 保存动作只抛事件,持久化归宿主。
 */
import { computed, ref, watch } from 'vue'
// 相对路径:library 子入口以源码供宿主直接消费(宿主的 @ 别名指向其自身 src)
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { filterIconOf } from './filterBar'
import { createLibraryTreeT } from './i18n'
import type { FilterRule, LibraryTreeT, SavedFilter } from './types'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** 编辑中的过滤器(null 表示新建) */
    editing?: SavedFilter | null
    /** 打开对话框时快照的当前 FilterBar 规则 */
    currentRules?: FilterRule[]
    /** 文案函数,缺省用内置中文 */
    t?: LibraryTreeT
  }>(),
  {
    editing: null,
    currentRules: () => [],
    t: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
  /** 保存(name 为空串时按钮禁用不会触发) */
  (e: 'save', name: string, editingId: string | null): void
}>()

const name = ref('')

const fallbackT = createLibraryTreeT()
const tt = (key: string) => {
  if (!props.t) return fallbackT(key)
  const r = props.t(key)
  return r === key ? fallbackT(key) : r
}

const isEditing = computed(() => !!props.editing)

watch(() => props.open, open => {
  if (open) name.value = props.editing?.name || ''
})

function close() {
  emit('update:open', false)
}

function handleSave() {
  if (!name.value.trim()) return
  emit('save', name.value.trim(), props.editing?.id || null)
  close()
}

// 规则值摘要:仅展示有值的过滤条件
function summarizeRule(rule: FilterRule): { type: FilterRule['type'], text: string } | null {
  switch (rule.type) {
    case 'folders':
    case 'tags':
      if (rule.selectedValues?.length) {
        return { type: rule.type, text: `${rule.label} × ${rule.selectedValues.length}` }
      }
      return null
    case 'urls':
    case 'title':
      if (rule.value?.trim()) {
        return { type: rule.type, text: `${rule.label}: ${rule.value.trim()}` }
      }
      return null
    case 'size':
      if (rule.selectedPreset) {
        return {
          type: rule.type,
          text: rule.selectedPreset === 'custom'
            ? `${rule.label}: ${rule.customMin ?? 0}~${rule.customMax ?? '∞'}`
            : rule.label,
        }
      }
      return null
    case 'category':
      if (rule.selectedCategory) {
        return { type: rule.type, text: `${rule.label}` }
      }
      return null
    case 'metadata':
      if (rule.metaDimMin !== undefined || rule.metaDimMax !== undefined || rule.metaDurMin !== undefined || rule.metaDurMax !== undefined) {
        return { type: rule.type, text: rule.label }
      }
      return null
    default:
      return null
  }
}

const activeSummaries = computed(() =>
  props.currentRules
    .map(summarizeRule)
    .filter((item): item is { type: FilterRule['type'], text: string } => !!item),
)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? tt('filterBar.editFilter') : tt('filterBar.addFilter') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <Label for="saved-filter-name">{{ tt('filterBar.filterName') }}</Label>
          <Input
            id="saved-filter-name"
            v-model="name"
            :placeholder="tt('filterBar.filterNamePlaceholder')"
            @keydown.enter="handleSave"
          />
        </div>

        <!-- 当前筛选条件摘要(保存/更新时以此为准) -->
        <div class="flex flex-col gap-2">
          <Label>{{ tt('filterBar.currentConditions') }}</Label>
          <div v-if="activeSummaries.length > 0" class="flex flex-wrap gap-1.5">
            <span
              v-for="(item, index) in activeSummaries"
              :key="index"
              class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
            >
              <component :is="filterIconOf(item.type)" class="size-3.5" />
              <span>{{ item.text }}</span>
            </span>
          </div>
          <p v-else class="text-sm text-muted-foreground">{{ tt('filterBar.noActiveConditions') }}</p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="close">{{ tt('filterBar.cancel') }}</Button>
        <Button :disabled="!name.trim()" @click="handleSave">{{ tt('filterBar.saveFilter') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
