<script setup lang="ts">
/**
 * 标签管理对话框
 * 标签是扁平结构，直接映射为 BrowserItem[]。
 * 点击卡片抛回原始 Tag，由父级走 handleTagSelect 打开对应 tab。
 */
import { computed } from 'vue'
import GroupedCardBrowserDialog, { type BrowserItem } from './GroupedCardBrowserDialog.vue'
import { useTagStore } from '@renderer/stores/tag'
import { useLibraryStore } from '@renderer/stores/library'
import { miraSDKService } from '@renderer/services/MiraSDKService'

defineOptions({ name: 'TagManageDialog' })

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [tag: any]
}>()

const tagStore = useTagStore()
const libraryStore = useLibraryStore()

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

// 批量删除：逐个调用 SDK，完成后强制刷新标签列表
const handleBatchDelete = async (raws: any[]) => {
  const libraryId = libraryStore.currentLibrary?.id
  if (!libraryId || !raws.length) return
  for (const tag of raws) {
    try {
      await miraSDKService.deleteTag(libraryId, parseInt(String(tag.id), 10))
    } catch (error) {
      console.error(`Failed to delete tag ${tag?.id}:`, error)
    }
  }
  await tagStore.fetchTags(libraryId, true)
}
</script>

<template>
  <GroupedCardBrowserDialog
    :visible="props.visible"
    :title="$t('business.tagManageDialog.title')"
    :item-type-label="$t('business.tagManageDialog.itemTypeLabel')"
    empty-icon="label_off"
    :items="items"
    @update:visible="emit('update:visible', $event)"
    @select="emit('select', $event)"
    @batch-delete="handleBatchDelete"
  />
</template>
