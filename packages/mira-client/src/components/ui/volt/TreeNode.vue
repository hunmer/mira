<template>
  <div
    class="tree-node"
    :data-folder-id="node.key"
    :data-node-type="node.data?.nodeType || 'folder'"
    :data-parent-id="node.data?.parentId || null"
  >
    <div
      :class="[
        'tree-node-content flex items-center px-2 py-1.5 rounded-md cursor-pointer',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        {
          'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300': isSelected,
          'bg-gray-100 dark:bg-gray-800': !isSelected && expanded,
          'opacity-50': node.disabled
        }
      ]"
      @click="handleClick"
      @dblclick="handleDoubleClick"
      @contextmenu="handleContextMenu"
    >
      <!-- 展开/折叠按钮 -->
      <button
        v-if="hasChildren"
        :class="[
          'tree-toggle mr-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700',
          'transition-transform duration-200',
          { 'rotate-90': expanded }
        ]"
        @click.stop="handleToggle"
      >
        <span class="material-icons text-lg">
          {{ expanded ? 'expand_more' : 'chevron_right' }}
        </span>
      </button>
      
      <!-- 复选框 (checkbox mode) -->
      <Checkbox
        v-if="selectionMode === 'checkbox'"
        :checked="isChecked"
        :disabled="node.disabled"
        class="mr-2"
        @click.stop
        @update:checked="handleCheckboxChange"
      />
      
      <!-- 图标 -->
      <span v-if="nodeIcon" :class="['mr-2', nodeIcon]"></span>
      
      <!-- 加载指示器 -->
      <span v-if="node.loading && loadingMode === 'icon'" class="mr-2 animate-spin">
        <span class="material-icons text-lg">refresh</span>
      </span>
      
      <!-- 节点内容 -->
      <div class="flex-1 flex items-center justify-between">
        <slot :node="node">
          <span class="tree-node-label">{{ node.label }}</span>
        </slot>
        
        <!-- 节点计数或其他信息 -->
        <span v-if="node.count !== undefined && node.count > 0" class="ml-2 text-sm text-gray-500">
          {{ node.count }}
        </span>
      </div>
    </div>
    
    <!-- 子节点 -->
    <div
      v-if="hasChildren && expanded"
      class="tree-children ml-4 mt-1 space-y-1"
    >
      <VueDraggable
        v-if="draggable"
        v-model="draggableChildren"
        group="tree-nodes"
        :animation="200"
        ghost-class="tree-ghost"
        chosen-class="tree-chosen"
        drag-class="tree-drag"
        @end="onChildDragEnd"
        item-key="key"
        class="tree-drag-area"
      >
        <TreeNode
          v-for="child in draggableChildren"
          :key="child.key"
          :node="child"
          :expandedKeys="expandedKeys"
          :selectionKeys="selectionKeys"
          :selectionMode="selectionMode"
          :metaKeySelection="metaKeySelection"
          :loadingMode="loadingMode"
          :draggable="draggable"
          @node-select="$emit('node-select', $event)"
          @node-unselect="$emit('node-unselect', $event)"
          @node-expand="$emit('node-expand', $event)"
          @node-collapse="$emit('node-collapse', $event)"
          @node-toggle="$emit('node-toggle', $event)"
          @node-contextmenu="(...args: any[]) => $emit('node-contextmenu', ...args)"
          @node-drag-end="$emit('node-drag-end', $event)"
        >
          <template v-for="(_, slot) in $slots" v-slot:[slot]>
            <slot :name="slot" />
          </template>
        </TreeNode>
      </VueDraggable>

      <!-- 非拖拽模式 -->
      <template v-else>
        <TreeNode
          v-for="child in node.children"
          :key="child.key"
          :node="child"
          :expandedKeys="expandedKeys"
          :selectionKeys="selectionKeys"
          :selectionMode="selectionMode"
          :metaKeySelection="metaKeySelection"
          :loadingMode="loadingMode"
          :draggable="false"
          @node-select="$emit('node-select', $event)"
          @node-unselect="$emit('node-unselect', $event)"
          @node-expand="$emit('node-expand', $event)"
          @node-collapse="$emit('node-collapse', $event)"
          @node-toggle="$emit('node-toggle', $event)"
          @node-contextmenu="(...args: any[]) => $emit('node-contextmenu', ...args)"
        >
          <template v-for="(_, slot) in $slots" v-slot:[slot]>
            <slot :name="slot" />
          </template>
        </TreeNode>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { Checkbox } from '@/components/ui/checkbox'

// 定义节点接口
interface TreeNodeData {
    key: string
    label: string
    data?: any
    type?: string
    children?: TreeNodeData[]
    leaf?: boolean
    loading?: boolean
    icon?: string
    expandedIcon?: string
    collapsedIcon?: string
    selectable?: boolean
    disabled?: boolean
    count?: number
    [key: string]: any
}

// Props 定义
interface Props {
  node: TreeNodeData
  expandedKeys: Record<string, boolean>
  selectionKeys: Record<string, any>
  selectionMode?: 'single' | 'multiple' | 'checkbox'
  metaKeySelection?: boolean
  loadingMode?: 'mask' | 'icon'
  draggable?: boolean
}

// Events 定义
interface Emits {
  (e: 'node-select', node: TreeNodeData): void
  (e: 'node-unselect', node: TreeNodeData): void
  (e: 'node-expand', node: TreeNodeData): void
  (e: 'node-collapse', node: TreeNodeData): void
  (e: 'node-toggle', node: TreeNodeData): void
  (e: 'node-contextmenu', node: TreeNodeData, event: MouseEvent): void
  (e: 'node-drag-end', event: any): void
}

const props = withDefaults(defineProps<Props>(), {
  selectionMode: undefined,
  metaKeySelection: true,
  loadingMode: 'mask',
  draggable: false
})

const emit = defineEmits<Emits>()

// 计算属性
const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const expanded = computed(() => {
  return props.expandedKeys[props.node.key] || false
})

const isSelected = computed(() => {
  if (props.selectionMode === 'checkbox') {
    return props.selectionKeys[props.node.key]?.checked || false
  }
  return props.selectionKeys[props.node.key] || false
})

const isChecked = computed(() => {
  return props.selectionKeys[props.node.key]?.checked || false
})

const nodeIcon = computed(() => {
  if (props.node.icon) {
    return props.node.icon
  }

  if (hasChildren.value) {
    if (expanded.value && props.node.expandedIcon) {
      return props.node.expandedIcon
    } else if (!expanded.value && props.node.collapsedIcon) {
      return props.node.collapsedIcon
    }
  }

  return undefined
})

// 拖拽模式下的子节点列表
const draggableChildren = computed({
  get: () => props.node.children || [],
  set: (value) => {
    if (props.node.children) {
      props.node.children.splice(0, props.node.children.length, ...value)
    }
  }
})

// 事件处理
function handleClick(event: MouseEvent) {
  if (props.node.disabled) return
  
  if (props.selectionMode) {
    if (props.selectionMode === 'multiple' && props.metaKeySelection && !event.metaKey && !event.ctrlKey) {
      // 多选模式下，如果需要 metaKey 但没有按下，则单选
      if (isSelected.value) {
        emit('node-unselect', props.node)
      } else {
        emit('node-select', props.node)
      }
    } else if (isSelected.value) {
      emit('node-unselect', props.node)
    } else {
      emit('node-select', props.node)
    }
  }
}

function handleDoubleClick() {
  if (props.node.disabled) return

  if (hasChildren.value) {
    handleToggle()
  }
}

function handleContextMenu(event: MouseEvent) {
  if (props.node.disabled) return

  emit('node-contextmenu', props.node, event)
}

function handleToggle() {
  if (props.node.disabled) return
  
  emit('node-toggle', props.node)
}

function handleCheckboxChange(checked: boolean) {
  if (checked) {
    emit('node-select', props.node)
  } else {
    emit('node-unselect', props.node)
  }
}

function onChildDragEnd(event: any) {
  emit('node-drag-end', event)
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.tree-node-content {
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tree-toggle {
  color: #9ca3af;
}

.tree-toggle:hover {
  color: #4b5563;
}

.dark .tree-toggle {
  color: #6b7280;
}

.dark .tree-toggle:hover {
  color: #d1d5db;
}

.tree-node-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tree-children {
  border-left: 1px solid #e5e7eb;
}

.dark .tree-children {
  border-left-color: #374151;
}

/* 复选框的半选状态样式 */
input[type="checkbox"]:indeterminate {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

input[type="checkbox"]:indeterminate::before {
  content: '';
  display: block;
  width: 0.5rem;
  height: 0.125rem;
  background-color: white;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 拖拽样式 */
.tree-drag-area {
  min-height: 20px;
}

.tree-ghost {
  opacity: 0.5;
  background: #f3f4f6;
  border: 2px dashed #d1d5db;
  border-radius: 6px;
}

.tree-chosen {
  background: #eff6ff;
  border: 1px solid #3b82f6;
  border-radius: 6px;
}

.tree-drag {
  transform: rotate(2deg);
  opacity: 0.8;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
