<template>
  <li>
    <a 
      :class="[
        'flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-200',
        getItemStyle(),
        selectedFolder === folder.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
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
            'material-symbols-outlined text-lg text-gray-400 mr-1',
            folder.expanded ? '' : ''
          ]"
          @click.stop="handleExpandToggle"
        >
          {{ folder.expanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right' }}
        </button>
        <span 
          v-else-if="folder.level && folder.level > 0"
          class="material-symbols-outlined text-lg text-gray-400 mr-1 invisible"
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
    return 'bg-blue-100 text-blue-700'
  }
  return ''
}

const getIconColor = () => {
  const colors = [
    'text-blue-500', 'text-green-500', 'text-yellow-500', 'text-red-500',
    'text-purple-500', 'text-orange-500', 'text-pink-500', 'text-indigo-500',
    'text-teal-500', 'text-cyan-500', 'text-lime-500', 'text-amber-500'
  ]
  const index = props.folder.id.length % colors.length
  return colors[index]
}

const getCountStyle = () => {
  if (props.selectedFolder === props.folder.id) {
    return 'text-blue-600'
  }
  return 'text-gray-500'
}
</script>
