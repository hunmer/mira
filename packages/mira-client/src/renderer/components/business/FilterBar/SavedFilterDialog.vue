<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? t('business.filterBar.editFilter') : t('business.filterBar.addFilter') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <Label for="saved-filter-name">{{ t('business.filterBar.filterName') }}</Label>
          <Input id="saved-filter-name" v-model="name" :placeholder="t('business.filterBar.filterNamePlaceholder')"
            @keydown.enter="handleSave" />
        </div>

        <!-- 当前筛选条件摘要（保存/更新时以此为准） -->
        <div class="flex flex-col gap-2">
          <Label>{{ t('business.filterBar.currentConditions') }}</Label>
          <div v-if="activeSummaries.length > 0" class="flex flex-wrap gap-1.5">
            <span v-for="(item, index) in activeSummaries" :key="index"
              class="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
              <span class="material-icons text-sm">{{ item.icon }}</span>
              <span>{{ item.text }}</span>
            </span>
          </div>
          <p v-else class="text-sm text-muted-foreground">{{ t('business.filterBar.noActiveConditions') }}</p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="close">{{ t('business.filterBar.cancel') }}</Button>
        <Button :disabled="!name.trim()" @click="handleSave">{{ t('business.filterBar.saveFilter') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FilterRule } from '@/renderer/types/filter'
import type { SavedFilter } from '@renderer/composables/LibraryPrefs'

interface Props {
  open: boolean
  /** 编辑中的过滤器（null 表示新建） */
  editing?: SavedFilter | null
  /** 打开对话框时快照的当前 FilterBar 规则 */
  currentRules?: FilterRule[]
}

const props = withDefaults(defineProps<Props>(), {
  editing: null,
  currentRules: () => []
})

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
  (e: 'save', name: string, editingId: string | null): void
}>()

const { t } = useI18n()
const name = ref('')

const isEditing = computed(() => !!props.editing)

watch(() => props.open, (open) => {
  if (open) name.value = props.editing?.name || ''
})

const close = () => emit('update:open', false)

const handleSave = () => {
  if (!name.value.trim()) return
  emit('save', name.value.trim(), props.editing?.id || null)
  close()
}

// 规则值摘要：仅展示有值的过滤条件
const summarizeRule = (rule: FilterRule): { icon: string, text: string } | null => {
  switch (rule.type) {
    case 'folders':
    case 'tags':
      if (rule.selectedValues?.length) {
        return { icon: rule.icon, text: `${rule.label} × ${rule.selectedValues.length}` }
      }
      return null
    case 'urls':
    case 'title':
      if (rule.value?.trim()) {
        return { icon: rule.icon, text: `${rule.label}: ${rule.value.trim()}` }
      }
      return null
    case 'size':
      if (rule.selectedPreset) {
        return { icon: rule.icon, text: `${rule.label}${rule.selectedPreset === 'custom' ? `: ${rule.customMin ?? 0}~${rule.customMax ?? '∞'}` : ''}` }
      }
      return null
    case 'category':
      if (rule.selectedCategory) {
        return { icon: rule.icon, text: `${rule.label}: ${rule.selectedCategory}` }
      }
      return null
    case 'metadata':
      if (rule.metaDimMin !== undefined || rule.metaDimMax !== undefined || rule.metaDurMin !== undefined || rule.metaDurMax !== undefined) {
        return { icon: rule.icon, text: rule.label }
      }
      return null
    default:
      return null
  }
}

const activeSummaries = computed(() =>
  props.currentRules.map(summarizeRule).filter((item): item is { icon: string, text: string } => !!item)
)
</script>
