<script setup lang="ts">
/**
 * 文件夹管理对话框
 * 用 3D 动画卡片展示所有文件夹，悬停时扇形展开前几张缩略图预览，
 * 点击卡片抛回原始 Folder，由父级走 handleFolderSelect 打开对应 tab。
 *
 * 数据源直接用 store 的扁平数组（不依赖 folderTree computed 的根节点判定，
 * 后者在 parent_id 为 null/0 时可能过滤掉全部节点），所有文件夹都会展示。
 */
import { computed } from 'vue'
import GroupedCardBrowserDialog, { type BrowserItem } from './GroupedCardBrowserDialog.vue'
import AnimatedFolderCard from './AnimatedFolderCard.vue'
import { useFolderStore } from '@renderer/stores/folder'
import { useLibraryStore } from '@renderer/stores/library'

defineOptions({ name: 'FolderManageDialog' })

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [folder: any]
}>()

const folderStore = useFolderStore()
const libraryStore = useLibraryStore()

// 扁平展示所有文件夹，与侧栏树共享同一份数据
const items = computed<BrowserItem[]>(() =>
  (folderStore.folders || []).map((f: any) => ({
    raw: f,
    label: f.title || f.name || `Folder ${f.id}`,
    count: f.fileCount,
    icon: 'folder',
    color: f.color,
    description: f.description,
  }))
)
</script>

<template>
  <GroupedCardBrowserDialog
    :visible="props.visible"
    :title="$t('business.folderManageDialog.title')"
    :item-type-label="$t('business.folderManageDialog.itemTypeLabel')"
    empty-icon="folder_off"
    :items="items"
    :card-component="AnimatedFolderCard"
    :card-props="{ size: 160 }"
    :library-id="libraryStore.currentLibrary?.id"
    @update:visible="emit('update:visible', $event)"
    @select="emit('select', $event)"
  />
</template>
