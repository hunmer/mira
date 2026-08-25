<script setup lang="ts">
/**
 * SidebarShortcutsModule —— 快捷分类模块（全部 / 未分类 / 未标签 / 回收站）。
 *
 * 计数从服务端按当前素材库统计（避免受激活 tab 和本地分页数据影响），
 * 随文件夹树 / 标签 / library-file-changed 事件刷新；回收站项右键可清空。
 * 由原 SidebarModuleList 拆出，逻辑零改动。
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import { miraSDKService } from '@/renderer/services/MiraSDKService'

defineOptions({ name: 'SidebarShortcutsModule' })

const props = defineProps<{
  /** 当前素材库 id */
  libraryId: string
  /** 文件夹树 / 标签变化时重新统计（与原实现一致） */
  folderTree: any[]
  tags: any[]
  /** 当前选中项 id（active 高亮） */
  selectedFolderId: any
}>()

const emit = defineEmits<{
  select: [category: any]
  emptyTrash: []
}>()

const { t } = useI18n()

const shortcutCountState = ref({ all: 0, uncategorized: 0, untagged: 0, trash: 0 })
const shortcutCounts = computed(() => shortcutCountState.value)
let shortcutCountRequestId = 0

/** 从服务端按当前素材库统计快捷分类，避免受当前激活 tab 和本地分页数据影响。 */
async function loadShortcutCounts(libraryId: string) {
  const requestId = ++shortcutCountRequestId
  try {
    const stats = await miraSDKService.getLibraryStats(libraryId)
    const counts = stats.shortcutCounts || {}

    if (requestId !== shortcutCountRequestId) return
    shortcutCountState.value = {
      all: Number(counts.all || 0),
      uncategorized: Number(counts.uncategorized || 0),
      untagged: Number(counts.untagged || 0),
      trash: Number(counts.trash || 0),
    }
  } catch (error) {
    if (requestId === shortcutCountRequestId) {
      console.warn('加载快捷分类数量失败:', error)
      shortcutCountState.value = { all: 0, uncategorized: 0, untagged: 0, trash: 0 }
    }
  }
}

watch([
  () => props.libraryId,
  () => props.folderTree,
  () => props.tags,
], ([libraryId]) => {
  if (libraryId) loadShortcutCounts(libraryId)
  else shortcutCountState.value = { all: 0, uncategorized: 0, untagged: 0, trash: 0 }
}, { immediate: true, deep: true })

const onLibraryFileChanged = (event: Event) => {
  const libraryId = (event as CustomEvent<{ libraryId?: string }>).detail?.libraryId
  if (libraryId && libraryId === props.libraryId) loadShortcutCounts(libraryId)
}
window.addEventListener('library-file-changed', onLibraryFileChanged)
onBeforeUnmount(() => window.removeEventListener('library-file-changed', onLibraryFileChanged))

const baseCategories = computed(() => [
  { id: 'all', label: t('views.sidebarModuleList.all'), icon: 'folder_open', iconColor: 'text-muted-foreground', count: shortcutCounts.value.all },
  { id: 'uncategorized', label: t('views.sidebarModuleList.uncategorized'), icon: 'folder_special', iconColor: 'text-muted-foreground', count: shortcutCounts.value.uncategorized },
  { id: 'untagged', label: t('views.sidebarModuleList.untagged'), icon: 'label_off', iconColor: 'text-muted-foreground', count: shortcutCounts.value.untagged },
  { id: 'trash', label: t('views.sidebarModuleList.trash'), icon: 'delete', iconColor: 'text-destructive', count: shortcutCounts.value.trash },
])

const handleBaseCategoryClick = (category: any) => {
  emit('select', {
    id: category.id,
    label: category.label,
    icon: category.icon || 'folder',
    iconColor: category.iconColor,
    count: category.count,
    active: true,
  })
}
</script>

<template>
  <ul class="space-y-0.5">
    <li v-for="folder in baseCategories" :key="folder.id">
      <ContextMenu v-if="folder.id === 'trash'">
        <ContextMenuTrigger as-child>
          <a
            :data-folder-tree-node-id="folder.id"
            :class="[
              'cat-item',
              selectedFolderId === folder.id ? 'cat-item--active' : '',
            ]"
            @click.prevent="handleBaseCategoryClick(folder)"
          >
            <span class="flex items-center">
              <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-muted-foreground'}`">
                {{ folder.icon }}
              </span>
              {{ folder.label }}
            </span>
            <span v-if="folder.count !== undefined" class="text-muted-foreground text-xs">
              {{ folder.count }}
            </span>
          </a>
        </ContextMenuTrigger>
        <ContextMenuContent class="w-48">
          <ContextMenuItem @click="emit('emptyTrash')">
            <span>{{ t('views.sidebarModuleList.emptyTrash') }}</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <a
        v-else
        :data-folder-tree-node-id="folder.id"
        :class="[
          'cat-item',
          selectedFolderId === folder.id ? 'cat-item--active' : '',
        ]"
        @click.prevent="handleBaseCategoryClick(folder)"
      >
        <span class="flex items-center">
          <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-muted-foreground'}`">
            {{ folder.icon }}
          </span>
          {{ folder.label }}
        </span>
        <span v-if="folder.count !== undefined" class="text-muted-foreground text-xs">
          {{ folder.count }}
        </span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  color: var(--foreground);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.cat-item:hover {
  background-color: color-mix(in oklch, var(--primary) 5%, transparent);
}

.cat-item--active {
  background-color: color-mix(in oklch, var(--primary) 10%, transparent);
  color: var(--primary);
  font-weight: 500;
}
</style>
