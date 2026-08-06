<script setup lang="ts">
/**
 * 标签管理对话框
 * 标签是扁平结构，直接映射为 BrowserItem[]。
 * 点击卡片抛回原始 Tag，由父级走 handleTagSelect 打开对应 tab。
 */
import { computed } from 'vue'
import GroupedCardBrowserDialog, { type BrowserItem } from './GroupedCardBrowserDialog.vue'
import { useTagStore } from '@renderer/stores/tag'

defineOptions({ name: 'TagManageDialog' })

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [tag: any]
}>()

const tagStore = useTagStore()

const items = computed<BrowserItem[]>(() =>
  tagStore.tags.map(t => ({
    raw: t,
    label: t.title || (t as any).name || `Tag ${t.id}`,
    count: t.fileCount,
    icon: 'label',
    color: t.color,
    description: t.description,
  }))
)
</script>

<template>
  <GroupedCardBrowserDialog
    :visible="props.visible"
    title="标签管理"
    item-type-label="标签"
    empty-icon="label_off"
    :items="items"
    @update:visible="emit('update:visible', $event)"
    @select="emit('select', $event)"
  />
</template>
