<template>
  <div class="sidebar-nav">
    <!-- 搜索框 -->
    <div v-if="searchable" class="sidebar-nav__search">
      <IconField icon-position="left">>
        <InputIcon>
          <span class="material-icons">search</span>
        </InputIcon>
        <Input
          v-model="searchQuery"
          placeholder="搜索文件夹..."
          class="w-full h-8 text-xs"
        />
      </IconField>
    </div>
    
    <!-- 导航树 -->
    <div class="sidebar-nav__tree">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="sidebar-nav__item"
        :style="{ paddingLeft: `${(item.level || 0) * 16 + 8}px` }"
      >
        <!-- 导航项 -->
        <div
          class="sidebar-nav__item-content"
          :class="{
            'sidebar-nav__item-content--active': item.active,
            'sidebar-nav__item-content--dragging': isDragging && dragItem?.id === item.id
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
            class="sidebar-nav__expand-btn"
            @click.stop="toggleExpand(item)"
          >
            <span class="material-icons">{{ item.expanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right' }}</span>
          </Button>
          <div v-else class="sidebar-nav__expand-btn" />
          
          <!-- 图标 -->
          <span 
            class="material-icons sidebar-nav__icon"
            :style="{ color: item.iconColor }"
          >{{ getItemIcon(item) }}</span>
          
          <!-- 标签 -->
          <span class="sidebar-nav__label">{{ item.label }}</span>
          
          <!-- 数量 -->
          <span v-if="showCounts && item.count !== undefined" class="sidebar-nav__count">
            {{ item.count }}
          </span>
        </div>
        
        <!-- 子项 -->
        <template v-if="item.expanded && item.children">
          <div
            v-for="child in item.children"
            :key="child.id"
            class="sidebar-nav__item"
            :style="{ paddingLeft: `${((item.level || 0) + 1) * 16 + 8}px` }"
          >
            <div
              class="sidebar-nav__item-content"
              :class="{
                'sidebar-nav__item-content--active': child.active,
                'sidebar-nav__item-content--dragging': isDragging && dragItem?.id === child.id
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
                class="sidebar-nav__expand-btn"
                @click.stop="toggleExpand(child)"
              >
                <span class="material-icons">{{ child.expanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right' }}</span>
              </Button>
              <div v-else class="sidebar-nav__expand-btn" />
              
              <!-- 图标 -->
              <span 
                class="material-icons sidebar-nav__icon"
                :style="{ color: child.iconColor }"
              >{{ getItemIcon(child) }}</span>
              
              <!-- 标签 -->
              <span class="sidebar-nav__label">{{ child.label }}</span>
              
              <!-- 数量 -->
              <span v-if="showCounts && child.count !== undefined" class="sidebar-nav__count">
                {{ child.count }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>
    
    <!-- 拖拽指示器 -->
    <div v-if="isDragging" class="sidebar-nav__drop-indicator" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Input } from '@/components/ui/input'
import IconField from '@/components/ui/volt/IconField.vue'
import InputIcon from '@/components/ui/volt/InputIcon.vue'
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
.sidebar-nav {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgb(249 250 251);
}

.sidebar-nav__search {
  padding: 12px;
  border-bottom: 1px solid rgb(229 231 235);
}

.sidebar-nav__tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar-nav__item {
  margin-bottom: 2px;
}

.sidebar-nav__item-content {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  margin: 0 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: rgb(55 65 81);
  font-size: 0.875rem;
}

.sidebar-nav__item-content:hover {
  background: rgb(229 231 235);
}

.sidebar-nav__item-content--active {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
  font-weight: 600;
}

.sidebar-nav__item-content--dragging {
  opacity: 0.5;
}

.sidebar-nav__expand-btn {
  width: 20px;
  height: 20px;
  min-width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.sidebar-nav__icon {
  margin-right: 8px;
  font-size: 1rem;
}

.sidebar-nav__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-nav__count {
  font-size: 0.75rem;
  color: rgb(107 114 128);
  background: rgb(229 231 235);
  padding: 2px 6px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.sidebar-nav__item-content--active .sidebar-nav__count {
  background: rgb(191 219 254);
  color: rgb(29 78 216);
}

.sidebar-nav__drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgb(59 130 246);
  border-radius: 1px;
  opacity: 0.8;
  pointer-events: none;
}

/* 拖拽时的视觉反馈 */
.sidebar-nav__item-content[draggable="true"]:hover {
  cursor: grab;
}

.sidebar-nav__item-content[draggable="true"]:active {
  cursor: grabbing;
}
</style>
