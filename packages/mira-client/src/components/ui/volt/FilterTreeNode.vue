<template>
  <div class="filter-tree-node">
    <div 
      class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
      :style="{ paddingLeft: `${12 + level * 20}px` }"
      @click="handleClick"
    >
      <!-- 展开按钮 -->
      <button
        v-if="hasChildren"
        class="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 mr-1"
        @click.stop="$emit('toggle-expand', item)"
      >
        <span 
          class="material-icons text-xs text-gray-500 transition-transform"
          :class="{ 'rotate-90': isExpanded }"
        >
          chevron_right
        </span>
      </button>
      
      <!-- 占位符（无子项时） -->
      <div v-else class="w-4 mr-1"></div>
      
      <!-- 复选框（多选模式） -->
      <div v-if="multiple" class="flex-shrink-0 mr-2">
        <Checkbox
          :checked="isSelected"
          :disabled="item.disabled"
          @update:checked="(checked: boolean) => emit('toggle-select', item, checked)"
        />
      </div>
      
      <!-- 图标 -->
      <span 
        v-if="item.icon"
        class="material-icons flex-shrink-0 text-sm mr-2"
        :style="{ color: item.iconColor || '#6B7280' }"
      >
        {{ item.icon }}
      </span>
      
      <!-- 标签 -->
      <span 
        class="flex-grow text-sm truncate"
        :class="{ 
          'text-gray-400': item.disabled,
          'text-blue-600': !multiple && isSelected,
          'font-medium': !multiple && isSelected
        }"
      >
        {{ item.label }}
      </span>
      
      <!-- 计数 -->
      <span 
        v-if="typeof item.count === 'number'"
        class="flex-shrink-0 text-xs text-gray-500 ml-2"
      >
        {{ item.count }}
      </span>
    </div>
    
    <!-- 子项 -->
    <div v-if="hasChildren && isExpanded">
      <FilterTreeNode
        v-for="child in item.children"
        :key="getChildKey(child)"
        :item="child"
        :level="level + 1"
        :multiple="multiple"
        :selected-values="selectedValues"
        :expanded-items="expandedItems"
        @toggle-expand="$emit('toggle-expand', $event)"
        @toggle-select="handleChildSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import type { FilterTreeItem } from './FilterTree.vue'

interface Props {
  item: FilterTreeItem
  level: number
  multiple: boolean
  selectedValues: (string | number)[]
  expandedItems: Set<string | number>
}

interface Emits {
  (e: 'toggle-expand', item: FilterTreeItem): void
  (e: 'toggle-select', item: FilterTreeItem, selected: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const hasChildren = computed(() => {
  return props.item.children && props.item.children.length > 0
})

const isExpanded = computed(() => {
  return props.expandedItems.has(props.item.id)
})

const isSelected = computed(() => {
  return props.selectedValues.includes(props.item.id)
})

// 方法
const getChildKey = (child: FilterTreeItem): string | number => {
  return child.id
}

const handleClick = () => {
  if (props.item.disabled) return

  if (props.multiple) {
    emit('toggle-select', props.item, !isSelected.value)
  } else {
    emit('toggle-select', props.item, !isSelected.value)
  }
}

const handleChildSelect = (item: FilterTreeItem, selected: boolean) => {
  emit('toggle-select', item, selected)
}
</script>

<style scoped>
.filter-tree-node {
  user-select: none;
}

.rotate-90 {
  transform: rotate(90deg);
}
</style>
