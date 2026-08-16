<script setup lang="ts">
import { computed } from 'vue'
import { useFolderOperations } from './FolderTreeComponent/composables/useFolderOperations'
import FolderTreeDialogs from './FolderTreeComponent/components/FolderTreeDialogs.vue'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu'
import type { FolderItem } from '@renderer/types/components'

const props = defineProps<{ folder: FolderItem; folders: FolderItem[] }>()
const emit = defineEmits<{ refresh: [] }>()
const ops = useFolderOperations({
  'folder-add': () => emit('refresh'), 'folder-edit': () => emit('refresh'), 'folder-move': () => emit('refresh'),
  'folder-clone': () => emit('refresh'), 'folder-delete': () => emit('refresh'), 'refresh-folders': () => emit('refresh'),
  'tag-add': () => {}, 'tag-edit': () => {}, 'tag-move': () => {}, 'tag-clone': () => {}, 'tag-delete': () => {}, 'refresh-tags': () => {},
})
const menuItems = computed(() => ops.folderContextMenuItems.value)
function setContextFolder() { ops.currentContextFolder.value = props.folder }
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child @contextmenu="setContextFolder"><slot /></ContextMenuTrigger>
    <ContextMenuContent class="w-52">
      <template v-for="(item, index) in menuItems" :key="index">
        <ContextMenuSeparator v-if="item.separator" />
        <ContextMenuItem v-else :disabled="item.disabled" :class="item.class" @click="item.command?.()">
          <span v-if="item.icon" class="material-icons text-base mr-2">{{ item.icon }}</span>
          <span class="flex-1">{{ item.label }}</span>
        </ContextMenuItem>
      </template>
    </ContextMenuContent>
  </ContextMenu>
  <FolderTreeDialogs :ops="ops" :folders="folders" :show-drag-confirm="false" :drag-confirm-info="{ dragId: '', dragName: '', newParentId: null, targetLabel: '', newSiblingIds: [] }" />
</template>
