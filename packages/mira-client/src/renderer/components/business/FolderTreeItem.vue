<template>
  <li>
    <a 
      :class="[
        'flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent',
        getItemStyle(),
        selectedFolder === folder.id ? 'bg-primary text-primary' : 'text-foreground'
      ]"
      :style="{ paddingLeft: `${(folder.level || 0) * 1 + 0.5}rem` }"
      href="#"
      @click.prevent="handleClick"
    >
      <span class="flex items-center">
        <!-- 展开/收起按钮 -->
        <button
          v-if="hasChildren"
          :class="[
            'material-symbols-outlined text-lg text-muted-foreground mr-1',
            folder.expanded ? '' : ''
          ]"
          @click.stop="handleExpandToggle"
        >
          {{ folder.expanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right' }}
        </button>
        <span 
          v-else-if="folder.level && folder.level > 0"
          class="material-symbols-outlined text-lg text-muted-foreground mr-1 invisible"
        >
          keyboard_arrow_right
        </span>
        
        <!-- 文件夹图标 -->
        <span :class="`material-icons text-lg mr-2 ${folder.iconColor || getIconColor()}`">
          {{ folder.icon }}
        </span>
        {{ folder.label }}
      </span>
      
      <!-- 文件数量 -->
      <span v-if="folder.count !== undefined" class="text-xs" :class="getCountStyle()">
        {{ folder.count }}
      </span>
    </a>
    
    <!-- 子文件夹 -->
    <ul v-if="hasChildren && folder.expanded" class="space-y-0.5">
      <FolderTreeItem
        v-for="child in folder.children"
        :key="child.id"
        :folder="{ ...child, level: (folder.level || 0) + 1 }"
        :selected-folder="selectedFolder"
        @folder-click="$emit('folder-click', $event)"
        @folder-expand="(folder, expanded) => $emit('folder-expand', folder, expanded)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FolderItem } from '../../types/components'

interface Props {
  folder: FolderItem
  selectedFolder?: string
}

interface Emits {
  (e: 'folder-click', folder: FolderItem): void
  (e: 'folder-expand', folder: FolderItem, expanded: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const hasChildren = computed(() => {
  return props.folder.children && props.folder.children.length > 0
})

const handleClick = () => {
  emit('folder-click', props.folder)
}

const handleExpandToggle = () => {
  const newExpanded = !props.folder.expanded
  emit('folder-expand', { ...props.folder, expanded: newExpanded }, newExpanded)
}

const getItemStyle = () => {
  if (props.selectedFolder === props.folder.id) {
    return 'bg-primary text-primary'
  }
  return ''
}

const getIconColor = () => {
  const colors = [
    'text-primary', 'text-green-500', 'text-yellow-500', 'text-destructive',
    'text-purple-500', 'text-orange-500', 'text-pink-500', 'text-primary',
    'text-teal-500', 'text-cyan-500', 'text-lime-500', 'text-amber-500'
  ]
  const index = props.folder.id.length % colors.length
  return colors[index]
}

const getCountStyle = () => {
  if (props.selectedFolder === props.folder.id) {
    return 'text-primary'
  }
  return 'text-muted-foreground'
}
</script>
