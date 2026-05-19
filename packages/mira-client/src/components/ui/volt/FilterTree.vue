<template>
  <div class="filter-tree">
    <!-- 搜索框 -->
    <div v-if="showSearch" class="p-3 border-b border-gray-200">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索..."
          class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <span class="material-icons absolute left-2.5 top-2.5 text-gray-400 text-sm">search</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="showActions" class="p-3 border-b border-gray-200 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <button
          v-if="multiple"
          class="text-xs text-blue-600 hover:text-blue-700"
          @click="selectAll"
        >
          全选
        </button>
        <button
          v-if="multiple && selectedValues.length > 0"
          class="text-xs text-gray-600 hover:text-gray-700"
          @click="clearSelection"
        >
          清除
        </button>
      </div>
      <span v-if="multiple && selectedValues.length > 0" class="text-xs text-gray-500">
        已选择 {{ selectedValues.length }} 项
      </span>
    </div>

    <!-- 树形列表 -->
    <div class="max-h-64 overflow-y-auto">
      <div v-if="filteredItems.length === 0" class="p-4 text-center text-gray-500 text-sm">
        {{ searchQuery ? '无匹配结果' : '暂无数据' }}
      </div>
      
      <div
        v-for="item in filteredItems"
        :key="getItemKey(item)"
        class="filter-tree-item"
      >
        <div 
          class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
          @click="handleItemClick(item)"
        >
          <!-- 展开按钮 -->
          <button
            v-if="item.children && item.children.length > 0"
            class="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 mr-1"
            @click.stop="toggleExpand(item)"
          >
            <span 
              class="material-icons text-xs text-gray-500 transition-transform"
              :class="{ 'rotate-90': expandedItems.has(getItemKey(item)) }"
            >
              chevron_right
            </span>
          </button>
          
          <!-- 占位符（无子项时） -->
          <div v-else class="w-4 mr-1"></div>
          
          <!-- 复选框（多选模式） -->
          <div v-if="multiple" class="flex-shrink-0 mr-2">
            <Checkbox
              :checked="selectedValues.includes(getItemKey(item))"
              :disabled="item.disabled"
              @update:checked="(checked: boolean) => toggleSelect(item, checked)"
              :key="`checkbox-${getItemKey(item)}-${forceUpdateKey}`"
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
              'text-blue-600': !multiple && selectedValues.includes(getItemKey(item)),
              'font-medium': !multiple && selectedValues.includes(getItemKey(item))
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
        <div 
          v-if="item.children && item.children.length > 0 && expandedItems.has(getItemKey(item))"
          class="ml-4"
        >
          <div
            v-for="child in item.children"
            :key="getItemKey(child)"
            class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
            @click="handleItemClick(child)"
          >
            <!-- 占位符 -->
            <div class="w-4 mr-1"></div>
            
            <!-- 复选框（多选模式） -->
            <div v-if="multiple" class="flex-shrink-0 mr-2">
              <Checkbox
                :checked="selectedValues.includes(getItemKey(child))"
                :disabled="child.disabled"
                @update:checked="(checked: boolean) => toggleSelect(child, checked)"
                :key="`checkbox-child-${getItemKey(child)}-${forceUpdateKey}`"
              />
            </div>
            
            <!-- 图标 -->
            <span 
              v-if="child.icon"
              class="material-icons flex-shrink-0 text-sm mr-2"
              :style="{ color: child.iconColor || '#6B7280' }"
            >
              {{ child.icon }}
            </span>
            
            <!-- 标签 -->
            <span 
              class="flex-grow text-sm truncate"
              :class="{ 
                'text-gray-400': child.disabled,
                'text-blue-600': !multiple && selectedValues.includes(getItemKey(child)),
                'font-medium': !multiple && selectedValues.includes(getItemKey(child))
              }"
            >
              {{ child.label }}
            </span>
            
            <!-- 计数 -->
            <span 
              v-if="typeof child.count === 'number'"
              class="flex-shrink-0 text-xs text-gray-500 ml-2"
            >
              {{ child.count }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { pinyinMatch } from '@/renderer/utils/helpers'

export interface FilterTreeItem {
  id: string | number
  label: string
  icon?: string
  iconColor?: string
  count?: number
  children?: FilterTreeItem[]
  disabled?: boolean
  [key: string]: any
}

interface Props {
  items: FilterTreeItem[]
  multiple?: boolean
  selectedValues?: (string | number)[]
  showSearch?: boolean
  showActions?: boolean
  searchFields?: string[]
  keyField?: string
}

interface Emits {
  (e: 'update:selectedValues', values: (string | number)[]): void
  (e: 'select', item: FilterTreeItem, selected: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  multiple: true,
  selectedValues: () => [],
  showSearch: true,
  showActions: true,
  searchFields: () => ['label'],
  keyField: 'id'
})

const emit = defineEmits<Emits>()

// 响应式状态
const searchQuery = ref('')
const expandedItems = ref<Set<string | number>>(new Set())
const forceUpdateKey = ref(0) // 用于强制更新组件

// 监听selectedValues变化并强制更新组件
watch(() => props.selectedValues, () => {
  // 强制更新组件以确保checkbox状态同步
  forceUpdateKey.value++
}, { deep: true })

// 计算属性
const filteredItems = computed(() => {
  if (!searchQuery.value) return props.items
  
  const query = searchQuery.value.toLowerCase()
  return filterItems(props.items, query)
})

// 方法
const getItemKey = (item: FilterTreeItem): string | number => {
  return item[props.keyField] || item.id
}

const filterItems = (items: FilterTreeItem[], query: string): FilterTreeItem[] => {
  const result: FilterTreeItem[] = []

  for (const item of items) {
    // 支持拼音搜索匹配
    const matchesQuery = props.searchFields.some(field => {
      const value = item[field]?.toString()
      return value ? pinyinMatch(value, query) : false
    })

    const filteredChildren = item.children ? filterItems(item.children, query) : []
    const hasMatchingChildren = filteredChildren.length > 0

    if (matchesQuery || hasMatchingChildren) {
      result.push({
        ...item,
        children: filteredChildren
      })

      // 展开有匹配子项的父项
      if (hasMatchingChildren) {
        expandedItems.value.add(getItemKey(item))
      }
    }
  }

  return result
}

const toggleExpand = (item: FilterTreeItem) => {
  const key = getItemKey(item)
  if (expandedItems.value.has(key)) {
    expandedItems.value.delete(key)
  } else {
    expandedItems.value.add(key)
  }
}

const toggleSelect = (item: FilterTreeItem, selected: boolean) => {
  const key = getItemKey(item)
  let newValues = [...props.selectedValues]

  if (props.multiple) {
    if (selected) {
      if (!newValues.includes(key)) {
        newValues.push(key)
      }
    } else {
      newValues = newValues.filter(v => v !== key)
    }
  } else {
    newValues = selected ? [key] : []
  }

  emit('update:selectedValues', newValues)
  emit('select', item, selected)
}

const handleItemClick = (item: FilterTreeItem) => {
  if (item.disabled) return
  
  const key = getItemKey(item)
  const isSelected = props.selectedValues.includes(key)
  
  if (props.multiple) {
    toggleSelect(item, !isSelected)
  } else {
    toggleSelect(item, !isSelected)
  }
}

const selectAll = () => {
  const allKeys = getAllItemKeys(props.items)
  emit('update:selectedValues', allKeys)
}

const clearSelection = () => {
  emit('update:selectedValues', [])
}

const getAllItemKeys = (items: FilterTreeItem[]): (string | number)[] => {
  const keys: (string | number)[] = []
  
  for (const item of items) {
    if (!item.disabled) {
      keys.push(getItemKey(item))
    }
    if (item.children) {
      keys.push(...getAllItemKeys(item.children))
    }
  }
  
  return keys
}
</script>

<style scoped>
.filter-tree {
  min-width: 250px;
}

.rotate-90 {
  transform: rotate(90deg);
}
</style>
