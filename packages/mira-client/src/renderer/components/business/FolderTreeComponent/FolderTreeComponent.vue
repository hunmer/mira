<template>
  <div ref="treeContainerRef" class="folder-tree-container w-full" @dragover.capture="handleTreeDragOver"
    @dragleave.capture="handleTreeDragLeave" @drop.capture="handleTreeDrop">
    <!-- 基础分类 (仅文件夹模式) -->
    <FolderTreeBaseCategories v-if="showBaseCategories && itemType === 'folder'" :categories="resolvedBaseCategories"
      :selected-key="selectedKey" :locating-node-id="locatingNodeId" @select="handleBaseCategoryClick"
      @empty-trash="emit('empty-trash')" />

    <!-- 标题栏 + 搜索 + 多选 + 添加（外层提供统一标题时隐藏） -->
    <FolderTreeHeader v-if="!hideHeader" v-model:search-query="searchQuery" :title="sectionTitle"
      :hide-actions="hideHeaderActions" :selection-enabled="selectionEnabled" :selection-active="selectionActive"
      :is-multi-mode="isMultiMode" :selection-mode-label="selectionModeLabel" :selection-count="selectionCount"
      :show-search="showSearch" @toggle-search="toggleSearch" @toggle-selection="toggleSelectionMode"
      @add="ops.handleAdd(itemType)" @select-all="selectAll" @clear-selection="clearSelection" />

    <!-- 树 -->
    <ContextMenu>
      <ContextMenuTrigger as-child>
        <div v-if="treeData.length > 0" class="tree-scroll max-h-64 overflow-y-auto">
          <component :is="draggable ? Draggable : BaseTree" ref="treeRef" v-model="treeData"
            :each-droppable="draggable ? eachDroppable : undefined" @before-drag-start="onBeforeDragStart"
            @after-drop="onAfterDrop">
            <template #default="{ node, stat }">
              <FolderTreeNode :node="node" :stat="stat" :selected="selectedKey === node.id"
                :multi-selected="selectionActive && isNodeSelected(node)" :drag-over="dragOverNodeId === node.id"
                :locating="locatingNodeId === node.id" :show-checkbox="showNodeCheckbox"
                :check-state="showNodeCheckbox ? getNodeCheckState(node) : false" :default-icon="defaultIcon"
                @node-click="handleNodeClick" @node-context-menu="handleNodeContextMenu"
                @node-drag-over="handleNodeDragOver" @node-drag-leave="handleNodeDragLeave"
                @node-drop="handleNodeDrop" @toggle="toggleNode"
                @check-change="(checked: boolean | 'indeterminate') => onNodeCheckChange(node, checked)" />
            </template>
          </component>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent class="w-52">
        <template v-for="(item, i) in contextMenuItems" :key="i">
          <ContextMenuSeparator v-if="item.separator" />
          <ContextMenuItem v-else :disabled="item.disabled" @click="item.command?.()">
            <span v-if="item.icon" class="material-icons text-base mr-2">{{ item.icon }}</span>
            <span class="flex-1">{{ item.label }}</span>
          </ContextMenuItem>
        </template>
      </ContextMenuContent>
    </ContextMenu>

    <!-- 空状态 -->
    <div v-if="treeData.length === 0" class="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <span class="material-icons text-4xl mb-2 text-muted-foreground">{{ itemType === 'folder' ? 'folder_open' :
        'label'
        }}</span>
      <p class="text-sm text-center">{{ t('business.folderTreeComponent.empty', { title: sectionTitle }) }}</p>
    </div>

    <!-- 编辑/移动/删除/批量删除/拖拽确认对话框 -->
    <FolderTreeDialogs v-model:show-drag-confirm="showDragConfirm" :ops="ops" :folders="folders"
      :drag-confirm-info="dragConfirmInfo" @confirm-drag-move="confirmDragMove" @cancel-drag-move="cancelDragMove" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Draggable, BaseTree } from '@he-tree/vue'
import '@he-tree/vue/style/default.css'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import type { FolderItem } from '@renderer/types/components'
import { useFolderOperations } from './composables/useFolderOperations'
import { useFileDrop } from './composables/useFileDrop'
import { useDragSort } from './composables/useDragSort'
import { useTreeSelection } from './composables/useTreeSelection'
import { useLocateNode } from './composables/useLocateNode'
import { useNodeToggleAnimation } from './composables/useNodeToggleAnimation'
import { buildSelectPayload, convertFoldersToNodes, convertTagsToNodes, filterNodes } from './utils'
import type { HeTreeNode, BaseCategory } from './types'
import FolderTreeBaseCategories from './components/FolderTreeBaseCategories.vue'
import FolderTreeHeader from './components/FolderTreeHeader.vue'
import FolderTreeNode from './components/FolderTreeNode.vue'
import FolderTreeDialogs from './components/FolderTreeDialogs.vue'

interface Props {
  folders?: FolderItem[]
  tags?: any[]
  itemType?: 'folder' | 'tag'
  selectedKey?: string
  /** 初始化时已选中的节点 ID */
  selectedKeys?: string[]
  showBaseCategories?: boolean
  defaultShowSearch?: boolean
  title?: string
  draggable?: boolean
  /**
   * 选择模式开关
   * - 'none'：不启用选择模式（不显示进入选择模式的图标）
   * - 'single'：单选
   * - 'multi'：多选
   */
  selectionMode?: 'none' | 'single' | 'multi'
  baseCategoriesConfig?: BaseCategory[]
  /**
   * 隐藏组件自带标题栏（含搜索/多选/添加按钮）。
   * 当外层用 Collapsible 提供统一标题时设为 true，避免双标题。
   * 隐藏后这些能力通过 defineExpose 暴露给外层调用。
   */
  hideHeader?: boolean
  /**
   * 仅隐藏标题栏右侧操作按钮（搜索/多选/添加），保留标题文本。
   * 用于只需浏览、不需要这些操作的场景（如本地目录浏览树）。
   */
  hideHeaderActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  itemType: 'folder',
  showBaseCategories: false,
  draggable: false,
  selectionMode: 'none',
  title: '',
  hideHeader: false,
  hideHeaderActions: false,
  folders: () => [],
  baseCategoriesConfig: () => [],
})

interface Emits {
  (e: 'select', item: any): void
  (e: 'expand', item: any, expanded: boolean): void
  (e: 'refresh'): void
  (e: 'empty-trash'): void
}

const emit = defineEmits<Emits>()
const { t } = useI18n()
const isFolder = computed(() => props.itemType === 'folder')
const defaultIcon = computed(() => isFolder.value ? 'folder' : 'label')
const sectionTitle = computed(() => props.title || (isFolder.value ? t('business.folderTreeComponent.sectionFolder') : t('business.folderTreeComponent.sectionTag')))
// 基础分类：未传入时使用内置默认（带本地化 label）
const resolvedBaseCategories = computed<BaseCategory[]>(() => {
  if (props.baseCategoriesConfig && props.baseCategoriesConfig.length > 0) return props.baseCategoriesConfig
  return [
    { id: 'all', label: t('business.folderTreeComponent.baseAll'), icon: 'folder_open', iconColor: 'text-muted-foreground' },
    { id: 'uncategorized', label: t('business.folderTreeComponent.baseUncategorized'), icon: 'folder_special', iconColor: 'text-muted-foreground' },
    { id: 'untagged', label: t('business.folderTreeComponent.baseUntagged'), icon: 'label_off', iconColor: 'text-muted-foreground' },
    { id: 'trash', label: t('business.folderTreeComponent.baseTrash'), icon: 'delete', iconColor: 'text-destructive' },
  ]
})

// 搜索
const showSearch = ref(props.defaultShowSearch || false)
const searchQuery = ref('')
const treeRef = ref<any>(null)
const treeContainerRef = ref<HTMLElement | null>(null)

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) searchQuery.value = ''
}

// 数据转换与过滤：FolderItem[]/tags -> HeTreeNode[]
const rawNodes = computed<HeTreeNode[]>(() => {
  return isFolder.value
    ? convertFoldersToNodes(props.folders || [])
    : convertTagsToNodes(props.tags || [])
})

const treeData = computed<HeTreeNode[]>(() => {
  const q = searchQuery.value.trim()
  return q ? filterNodes(rawNodes.value, q) : rawNodes.value
})

const nodeMap = computed(() => {
  const map = new Map<string, HeTreeNode>()
  const walk = (nodes: HeTreeNode[]) => {
    for (const node of nodes) {
      map.set(node.id, node)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(treeData.value)
  return map
})

// 选择模式（单选/多选/不启用）
const {
  selectionEnabled,
  isMultiMode,
  selectionModeLabel,
  selectionActive,
  selectedNodeIds,
  selectionCount,
  showNodeCheckbox,
  toggleSelectionMode,
  clearSelection,
  selectSingle,
  isNodeSelected,
  getNodeCheckState,
  onNodeCheckChange,
  selectAll,
  collectSelectedTopLevelNodes,
} = useTreeSelection({
  selectionMode: toRef(props, 'selectionMode'),
  selectedKeys: toRef(props, 'selectedKeys'),
  treeData,
  rawNodes,
  defaultIcon,
  onSelect: item => emit('select', item),
})

// 文件拖放：外部文件上传 / 内部素材设置文件夹、标签
const {
  dragOverNodeId,
  handleTreeDragOver,
  handleTreeDragLeave,
  handleTreeDrop,
  handleNodeDragOver,
  handleNodeDragLeave,
  handleNodeDrop,
} = useFileDrop({ isFolder, nodeMap })

// 节点定位
const { locatingNodeId, locateNode } = useLocateNode({
  itemType: toRef(props, 'itemType'),
  treeData,
  rawNodes,
  nodeMap,
  treeRef,
  treeContainerRef,
  searchQuery,
  showSearch,
})

// 展开/折叠动画
const { toggleNode } = useNodeToggleAnimation()

// 树内拖拽排序
const {
  showDragConfirm,
  dragConfirmInfo,
  onBeforeDragStart,
  onAfterDrop,
  confirmDragMove,
  cancelDragMove,
} = useDragSort({
  isFolder,
  treeRef,
  onRefresh: () => emit('refresh'),
})

// 拖拽：文件夹与标签均支持拖拽排序（标签为扁平结构，仅同层排序）
function eachDroppable() {
  return true
}

// 操作
const ops = useFolderOperations({
  'folder-add': () => { },
  'folder-edit': () => { },
  'folder-move': () => { },
  'folder-clone': () => { },
  'folder-delete': () => { },
  'refresh-folders': () => emit('refresh'),
  'tag-add': () => { },
  'tag-edit': () => { },
  'tag-move': () => { },
  'tag-clone': () => { },
  'tag-delete': () => { },
  'refresh-tags': () => emit('refresh'),
})

const contextMenuItems = computed(() => {
  // 选择模式激活时：右键菜单仅展示「删除」
  if (selectionActive.value) {
    const { nodes, total } = collectSelectedTopLevelNodes()
    const label = total > 0 ? (isFolder.value ? t('business.folderTreeComponent.deleteFolderCountAction', { count: total }) : t('business.folderTreeComponent.deleteTagCountAction', { count: total })) : (isFolder.value ? t('business.folderTreeComponent.deleteFolderAction') : t('business.folderTreeComponent.deleteTagAction'))
    return [
      {
        label,
        command: () => handleBatchDelete(),
        disabled: nodes.length === 0,
        class: 'text-destructive',
      },
    ]
  }
  return isFolder.value ? ops.folderContextMenuItems.value : ops.tagContextMenuItems.value
})

// 选择模式下的批量删除（单选/多选均走这里）
function handleBatchDelete() {
  const { nodes, total } = collectSelectedTopLevelNodes()
  if (nodes.length === 0) return
  ops.startBatchDelete(isFolder.value ? 'folder' : 'tag', nodes, total)
}

// 批量删除完成时清空选中
watch(() => ops.batchDeleteCompleted.value, (n) => {
  if (n > 0) selectedNodeIds.value = new Set()
})

// 节点交互
function handleBaseCategoryClick(category: BaseCategory) {
  searchQuery.value = ''
  showSearch.value = false
  emit('select', {
    id: category.id,
    label: category.label,
    icon: category.icon || 'folder',
    iconColor: category.iconColor,
    count: category.count,
    active: true,
  })
}

function handleNodeClick(node: HeTreeNode, stat: any, event: MouseEvent) {
  // 选择模式激活：点击节点执行选中/取消选中，不触发常规 select
  if (selectionActive.value) {
    if (isMultiMode.value) {
      // 多选：切换该节点及其所有后代
      onNodeCheckChange(node, !(getNodeCheckState(node) === true))
    } else {
      // 单选：仅选中当前节点
      selectSingle(node)
      emit('select', buildSelectPayload(node, defaultIcon.value))
    }
    return
  }

  // 有子节点的父节点：仅展开/折叠，不触发 select（避免打开新标签页）
  if (stat.children?.length) {
    void toggleNode(stat, event)
    return
  }

  searchQuery.value = ''
  showSearch.value = false
  emit('select', buildSelectPayload(node, defaultIcon.value))
}

function handleNodeContextMenu(node: HeTreeNode, _event: MouseEvent) {
  if (isFolder.value) {
    ops.currentContextFolder.value = { ...node.originalData, id: node.id, label: node.label, icon: node.icon, count: node.count } as FolderItem
  } else {
    ops.currentContextTag.value = { ...node.originalData, id: node.id, name: node.label }
  }
}

defineExpose({
  locateNode,
  /** 供外层标题栏调用（hideHeader=true 时） */
  showSearch,
  toggleSearch,
  toggleSelectionMode,
  handleAdd: () => ops.handleAdd(props.itemType),
})

// 生命周期
let refreshListener: ((event: CustomEvent) => void) | null = null

onMounted(() => {
  refreshListener = () => emit('refresh')
  window.addEventListener(`refresh-${isFolder.value ? 'folders' : 'tags'}`, refreshListener as EventListener)
})

onUnmounted(() => {
  if (refreshListener) {
    window.removeEventListener(`refresh-${isFolder.value ? 'folders' : 'tags'}`, refreshListener as EventListener)
  }
})
</script>

<style scoped>
.material-icons {
  font-size: 18px;
}

.tree-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  padding-right: 4px;
  margin-right: -4px;
}

.tree-scroll::-webkit-scrollbar {
  display: none;
}
</style>
