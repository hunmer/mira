<template>
  <div class="flex flex-col h-full bg-muted">
    <!-- 搜索框 -->
    <div v-if="searchable" class="p-3 border-b border-border">
      <div class="relative">
        <span class="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground leading-none">
          <span class="material-icons text-sm">search</span>
        </span>
        <Input
          v-model="searchQuery"
          :placeholder="$t('commonUi.sidebarNav.searchFolders')"
          class="w-full h-8 text-xs pl-9"
        />
      </div>
    </div>

    <!-- 导航树 -->
    <div class="flex-1 overflow-y-auto py-2">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="mb-0.5"
        :style="{ paddingLeft: `${(item.level || 0) * 16 + 8}px` }"
      >
        <!-- 导航项 -->
        <div
          class="flex items-center py-1.5 px-2 mx-2 rounded-md cursor-pointer transition-all duration-150 ease-in text-foreground text-sm hover:bg-accent"
          :class="{
            'sidebar-nav__item-content--active': item.active,
            'opacity-50': isDragging && dragItem?.id === item.id
          }"
          :draggable="draggable"
          @click="handleItemClick(item)"
          @dragstart="handleDragStart(item, $event)"
          @dragover="handleDragOver"
          @drop="handleDrop(item, $event)"
        >
          <!-- 展开/收起按钮 -->
          <Button
            v-if="item.children && item.children.length > 0"
            variant="ghost"
            size="sm"
            class="w-5 h-5 min-w-[20px] flex items-center justify-center mr-1"
            @click.stop="toggleExpand(item)"
          >
            <span class="material-icons">{{ item.expanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right' }}</span>
          </Button>
          <div v-else class="w-5 h-5 min-w-[20px] flex items-center justify-center mr-1" />

          <!-- 图标 -->
          <span
            class="material-icons mr-2 text-base"
            :style="{ color: item.iconColor }"
          >{{ getItemIcon(item) }}</span>

          <!-- 标签 -->
          <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ item.label }}</span>

          <!-- 数量 -->
          <span v-if="showCounts && item.count !== undefined" class="sidebar-nav__count text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded-xl min-w-[20px] text-center">
            {{ item.count }}
          </span>
        </div>

        <!-- 子项 -->
        <template v-if="item.expanded && item.children">
          <div
            v-for="child in item.children"
            :key="child.id"
            class="mb-0.5"
            :style="{ paddingLeft: `${((item.level || 0) + 1) * 16 + 8}px` }"
          >
            <div
              class="flex items-center py-1.5 px-2 mx-2 rounded-md cursor-pointer transition-all duration-150 ease-in text-foreground text-sm hover:bg-accent"
              :class="{
                'sidebar-nav__item-content--active': child.active,
                'opacity-50': isDragging && dragItem?.id === child.id
              }"
              :draggable="draggable"
              @click="handleItemClick(child)"
              @dragstart="handleDragStart(child, $event)"
              @dragover="handleDragOver"
              @drop="handleDrop(child, $event)"
            >
              <!-- 展开/收起按钮 -->
              <Button
                v-if="child.children && child.children.length > 0"
                variant="ghost"
                size="sm"
                class="w-5 h-5 min-w-[20px] flex items-center justify-center mr-1"
                @click.stop="toggleExpand(child)"
              >
                <span class="material-icons">{{ child.expanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right' }}</span>
              </Button>
              <div v-else class="w-5 h-5 min-w-[20px] flex items-center justify-center mr-1" />

              <!-- 图标 -->
              <span
                class="material-icons mr-2 text-base"
                :style="{ color: child.iconColor }"
              >{{ getItemIcon(child) }}</span>

              <!-- 标签 -->
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ child.label }}</span>

              <!-- 数量 -->
              <span v-if="showCounts && child.count !== undefined" class="sidebar-nav__count text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded-xl min-w-[20px] text-center">
                {{ child.count }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 拖拽指示器 -->
    <div v-if="isDragging" class="absolute left-0 right-0 h-0.5 bg-primary rounded-sm opacity-80 pointer-events-none" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { SidebarNavComponentProps, NavigationItem, SidebarNavEvents } from '../../types/components'

interface Props extends SidebarNavComponentProps {}

const props = withDefaults(defineProps<Props>(), {
  showCounts: true,
  collapsible: true,
  searchable: true,
  draggable: false
})

const emit = defineEmits<SidebarNavEvents>()

// 响应式数据
const searchQuery = ref('')
const isDragging = ref(false)
const dragItem = ref<NavigationItem | null>(null)

// 计算属性
const filteredItems = computed(() => {
  if (!searchQuery.value) {
    return props.items
  }
  
  return filterItems(props.items, searchQuery.value.toLowerCase())
})

// 方法
const filterItems = (items: NavigationItem[], query: string): NavigationItem[] => {
  const filtered: NavigationItem[] = []
  
  for (const item of items) {
    const matchesQuery = item.label.toLowerCase().includes(query)
    const hasMatchingChildren = item.children && filterItems(item.children, query).length > 0
    
    if (matchesQuery || hasMatchingChildren) {
      const filteredItem = { ...item }
      
      if (item.children) {
        filteredItem.children = filterItems(item.children, query)
        // 如果有匹配的子项，展开父项
        if (filteredItem.children.length > 0) {
          filteredItem.expanded = true
        }
      }
      
      filtered.push(filteredItem)
    }
  }
  
  return filtered
}

const handleItemClick = (item: NavigationItem) => {
  emit('item-click', item)
  emit('item-select', item)
}

const toggleExpand = (item: NavigationItem) => {
  if (!props.collapsible) return
  
  const newExpanded = !item.expanded
  item.expanded = newExpanded
  emit('item-expand', item, newExpanded)
}

const getItemIcon = (item: NavigationItem): string => {
  // 直接返回 Material Icons 名称
  return item.icon || 'folder'
}

// 拖拽相关方法
const handleDragStart = (item: NavigationItem, event: DragEvent) => {
  if (!props.draggable) return
  
  isDragging.value = true
  dragItem.value = item
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.id)
  }
}

const handleDragOver = (event: DragEvent) => {
  if (!props.draggable) return
  
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (target: NavigationItem, event: DragEvent) => {
  if (!props.draggable || !dragItem.value) return
  
  event.preventDefault()
  isDragging.value = false
  
  if (dragItem.value.id !== target.id) {
    emit('item-drag', dragItem.value, target)
  }
  
  dragItem.value = null
}
</script>

<style scoped>
.sidebar-nav__item-content--active {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
  font-weight: 600;
}

.sidebar-nav__item-content--active .sidebar-nav__count {
  background: rgb(191 219 254);
  color: rgb(29 78 216);
}

.sidebar-nav__item-content[draggable="true"]:hover {
  cursor: grab;
}

.sidebar-nav__item-content[draggable="true"]:active {
  cursor: grabbing;
}
</style>
