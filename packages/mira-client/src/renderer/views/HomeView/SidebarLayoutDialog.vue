<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SortableLayoutDialog from '@/renderer/components/common/SortableLayoutDialog.vue'
import { useHomeSidebarLayoutStore } from '@renderer/stores/homeSidebarLayout'
import { getModuleDef, type SidebarModuleId } from './sidebarModules'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { t } = useI18n()
const store = useHomeSidebarLayoutStore()
const enabled = computed(() => store.enabledIds.map(toItem).filter(Boolean) as ModuleItem[])
const disabled = computed(() => store.disabledIds.map(toItem).filter(Boolean) as ModuleItem[])
interface ModuleItem { id: SidebarModuleId; title: string; icon: string; description: string }
// title/description 在 computed 内经 t() 翻译，语言切换时随 locale 响应式刷新
function toItem(id: SidebarModuleId): ModuleItem | null {
  const item = getModuleDef(id)
  return item ? { id: item.id, title: t(item.titleKey), icon: item.icon, description: t(item.descriptionKey) } : null
}
function updateEnabled(items: ModuleItem[]) { store.setEnabled(items.map(item => item.id)) }
function updateDisabled(_items: ModuleItem[]) { /* enabled list is the persisted source of truth */ }
</script>

<template>
  <SortableLayoutDialog
    :model-value="props.modelValue"
    :enabled="enabled"
    :disabled="disabled"
    :title="$t('views.sidebarLayoutDialog.title')"
    :description="$t('views.sidebarLayoutDialog.description')"
    :enabled-title="$t('views.sidebarLayoutDialog.enabled')"
    :disabled-title="$t('views.sidebarLayoutDialog.disabled')"
    :done-label="$t('views.sidebarLayoutDialog.done')"
    :reset-label="$t('common.resetOrder')"
    :empty-disabled-label="$t('views.sidebarLayoutDialog.allEnabled')"
    @update:model-value="emit('update:modelValue', $event)"
    @update:enabled="updateEnabled"
    @update:disabled="updateDisabled"
  >
    <template #item="{ item, disabled: isDisabled }">
      <span class="material-icons text-base" :class="isDisabled ? 'text-muted-foreground' : 'text-primary'">{{ item.icon }}</span>
      <div class="min-w-0 flex-1"><div class="truncate text-xs font-medium">{{ item.title }}</div><div class="truncate text-[11px] text-muted-foreground">{{ item.description }}</div></div>
    </template>
  </SortableLayoutDialog>
</template>
