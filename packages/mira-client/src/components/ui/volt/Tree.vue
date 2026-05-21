<template>
    <div class="tree-container">
        <!-- 过滤器 -->
       <div v-if="filter || createable" class="tree-filter flex">
            <div class="relative flex-grow">
                <span class="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{{ creating
                    ? 'create_new_folder' : 'search' }}</span>
               <input ref="filterInputRef" v-model="filterValue" type="text"
                    :placeholder="creating ? createPlaceholder : filterPlaceholder"
                    :class="[
                        'w-full pl-8 pr-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        createable ? 'rounded-l-md border-r-0' : 'rounded-md'
                    ]"
                    @keyup.enter="onFilterEnter" />
            </div>
           <button v-if="createable" @click="onCreateAction"
                class="bg-gray-200 hover:bg-gray-300 text-gray-600 py-2 px-3 rounded-r-md border border-gray-300 border-l-0">
                <span class="material-icons text-sm">{{ creating ? 'close' : 'add' }}</span>
            </button>
        </div>

        <!-- 自定义 Tree 组件 -->
        <div class="tree-content">
           <VueDraggable v-if="draggable" v-model="draggableNodes" group="tree-nodes" :animation="200"
                ghost-class="tree-ghost" chosen-class="tree-chosen" drag-class="tree-drag" @end="onDragEnd"
                item-key="key" class="tree-drag-area">
                <TreeNode v-for="node in draggableNodes" :key="node.key" :node="node" :expandedKeys="expandedKeys"
                    :selectionKeys="selectionKeys" :selectionMode="selectionMode" :metaKeySelection="metaKeySelection"
                    :loadingMode="loadingMode" :draggable="draggable" :showCheckbox="showCheckbox" @node-select="onNodeSelect"
                    @node-unselect="onNodeUnselect" @node-expand="onNodeExpand" @node-collapse="onNodeCollapse"
                    @node-toggle="onNodeToggle" @node-contextmenu="onNodeContextMenu" @node-drag-end="onNodeDragEnd">
                    <template v-for="(_, slot) in $slots" v-slot:[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps" />
                    </template>
                </TreeNode>
            </VueDraggable>

            <!-- 非拖拽模式 -->
            <template v-else>
               <TreeNode v-for="node in filteredNodes" :key="node.key" :node="node" :expandedKeys="expandedKeys"
                    :selectionKeys="selectionKeys" :selectionMode="selectionMode" :metaKeySelection="metaKeySelection"
                    :loadingMode="loadingMode" :draggable="false" :showCheckbox="showCheckbox" @node-select="onNodeSelect"
                    @node-unselect="onNodeUnselect" @node-expand="onNodeExpand" @node-collapse="onNodeCollapse"
                    @node-toggle="onNodeToggle" @node-contextmenu="onNodeContextMenu">
                    <template v-for="(_, slot) in $slots" v-slot:[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps" />
                    </template>
                </TreeNode>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import TreeNode from './TreeNode.vue';

// 定义节点接口
export interface TreeNodeData {
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
    value: TreeNodeData[]
    selectionMode?: 'single' | 'multiple' | 'checkbox'
    selectionKeys?: Record<string, any>
    expandedKeys?: Record<string, boolean>
    metaKeySelection?: boolean
    loading?: boolean
    loadingMode?: 'mask' | 'icon'
    filter?: boolean
    filterBy?: string | string[]
    filterMode?: 'lenient' | 'strict'
    filterPlaceholder?: string
    filterLocale?: string
    draggable?: boolean
    createable?: boolean
    createPlaceholder?: string
    showCheckbox?: boolean
}

// Events 定义
interface Emits {
    (e: 'update:selectionKeys', value: Record<string, any>): void
    (e: 'update:expandedKeys', value: Record<string, boolean>): void
    (e: 'update:value', value: TreeNodeData[]): void
    (e: 'node-select', node: TreeNodeData): void
    (e: 'node-unselect', node: TreeNodeData): void
    (e: 'node-expand', node: TreeNodeData): void
    (e: 'node-collapse', node: TreeNodeData): void
    (e: 'node-contextmenu', node: TreeNodeData, event: MouseEvent): void
    (e: 'node-drag-end', event: any): void
    (e: 'create', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
    selectionMode: undefined,
    selectionKeys: () => ({}),
    expandedKeys: () => ({}),
    metaKeySelection: true,
    loading: false,
    loadingMode: 'mask',
    filter: false,
    filterBy: 'label',
    filterMode: 'lenient',
    filterPlaceholder: '搜索...',
    filterLocale: undefined,
    draggable: false,
    createable: false,
    createPlaceholder: '输入名称...',
    showCheckbox: true
})

const emit = defineEmits<Emits>()

// 状态
const filterValue = ref('')
const creating = ref(false)
const filterInputRef = ref<HTMLInputElement>()

// 新建模式切换
function onCreateAction() {
    if (creating.value) {
        creating.value = false
        filterValue.value = ''
    } else {
        creating.value = true
        filterValue.value = ''
        filterInputRef.value?.focus()
    }
}

function onFilterEnter() {
    if (creating.value && filterValue.value.trim()) {
        emit('create', filterValue.value.trim())
        filterValue.value = ''
        creating.value = false
    }
}

// 计算属性
const filteredNodes = computed(() => {
    if (creating.value || !props.filter || !filterValue.value.trim()) {
        return props.value
    }

    return filterNodes(props.value, filterValue.value.trim())
})

// 拖拽模式下的节点列表
const draggableNodes = computed({
    get: () => filteredNodes.value,
    set: (value) => {
        emit('update:value', value)
    }
})

// 过滤节点的方法
function filterNodes(nodes: TreeNodeData[], query: string): TreeNodeData[] {
    const filtered: TreeNodeData[] = []

    for (const node of nodes) {
        const cloned = { ...node }

        if (nodeMatches(cloned, query)) {
            if (props.filterMode === 'lenient') {
                // 宽松模式：如果父节点匹配，包含所有子节点
                filtered.push(cloned)
            } else {
                // 严格模式：继续过滤子节点
                if (cloned.children) {
                    cloned.children = filterNodes(cloned.children, query)
                }
                filtered.push(cloned)
            }
        } else if (cloned.children) {
            // 节点不匹配，但检查子节点
            const filteredChildren = filterNodes(cloned.children, query)
            if (filteredChildren.length > 0) {
                cloned.children = filteredChildren
                filtered.push(cloned)
            }
        }
    }

    return filtered
}

// 检查节点是否匹配查询
function nodeMatches(node: TreeNodeData, query: string): boolean {
    const fields = Array.isArray(props.filterBy) ? props.filterBy : [props.filterBy]

    return fields.some(field => {
        const value = node[field]
        if (typeof value === 'string') {
            return value.toLowerCase().includes(query.toLowerCase())
        }
        return false
    })
}

// 事件处理
function onNodeSelect(node: TreeNodeData) {
    if (props.selectionMode === 'single') {
        emit('update:selectionKeys', { [node.key]: true })
    } else if (props.selectionMode === 'multiple') {
        const newSelection = { ...props.selectionKeys }
        newSelection[node.key] = true
        emit('update:selectionKeys', newSelection)
    } else if (props.selectionMode === 'checkbox') {
        const newSelection = { ...props.selectionKeys }
        newSelection[node.key] = { checked: true, partialChecked: false }
        emit('update:selectionKeys', newSelection)
    }

    emit('node-select', node)
}

function onNodeUnselect(node: TreeNodeData) {
    const newSelection = { ...props.selectionKeys }

    if (props.selectionMode === 'checkbox') {
        newSelection[node.key] = { checked: false, partialChecked: false }
    } else {
        delete newSelection[node.key]
    }

    emit('update:selectionKeys', newSelection)
    emit('node-unselect', node)
}

function onNodeExpand(node: TreeNodeData) {
    const newExpanded = { ...props.expandedKeys }
    newExpanded[node.key] = true
    emit('update:expandedKeys', newExpanded)
    emit('node-expand', node)
}

function onNodeCollapse(node: TreeNodeData) {
    const newExpanded = { ...props.expandedKeys }
    newExpanded[node.key] = false
    emit('update:expandedKeys', newExpanded)
    emit('node-collapse', node)
}

function onNodeToggle(node: TreeNodeData) {
    if (props.expandedKeys[node.key]) {
        onNodeCollapse(node)
    } else {
        onNodeExpand(node)
    }
}

function onNodeContextMenu(node: TreeNodeData, event: MouseEvent) {
    emit('node-contextmenu', node, event)
}

function onDragEnd(event: any) {
    emit('node-drag-end', event)
}

function onNodeDragEnd(event: any) {
    emit('node-drag-end', event)
}

// 公开的方法
function expandAll() {
    const expanded: Record<string, boolean> = {}

    function expandNode(nodes: TreeNodeData[]) {
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                expanded[node.key] = true
                expandNode(node.children)
            }
        })
    }

    expandNode(props.value)
    emit('update:expandedKeys', expanded)
}

function collapseAll() {
    emit('update:expandedKeys', {})
}

// 导出方法供父组件使用
defineExpose({
    expandAll,
    collapseAll
})
</script>

<style scoped>
.tree-container {
    width: 100%;
}

.tree-drag-area {
    min-height: 20px;
}

/* 拖拽样式 */
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
