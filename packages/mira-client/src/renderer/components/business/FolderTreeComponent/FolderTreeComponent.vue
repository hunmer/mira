<template>
  <div class="folder-tree-container space-y-4">
    <!-- 基础分类 -->
    <div v-if="showBaseCategories">
      <ul class="space-y-0.5">
        <li v-for="folder in baseCategoriesConfig" :key="folder.id">
          <ContextMenu v-if="folder.id === 'trash'">
            <ContextMenuTrigger as-child>
              <a
                :class="[
                  'flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-200 cursor-pointer',
                  selectedFolder === folder.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                ]"
                @click.prevent="handleBaseCategoryClick(folder)"
              >
                <span class="flex items-center">
                  <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-gray-500'}`">
                    {{ folder.icon }}
                  </span>
                  {{ folder.label }}
                </span>
                <span v-if="folder.count !== undefined" class="text-gray-500 text-xs">
                  {{ folder.count }}
                </span>
              </a>
            </ContextMenuTrigger>
            <ContextMenuContent class="w-48">
              <ContextMenuItem @click="handleEmptyTrash">
                <span>清空回收站</span>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          <a
            v-else
            :class="[
              'flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-200 cursor-pointer',
              selectedFolder === folder.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
            ]"
            @click.prevent="handleBaseCategoryClick(folder)"
          >
            <span class="flex items-center">
              <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-gray-500'}`">
                {{ folder.icon }}
              </span>
              {{ folder.label }}
            </span>
            <span v-if="folder.count !== undefined" class="text-gray-500 text-xs">
              {{ folder.count }}
            </span>
          </a>
        </li>
      </ul>
    </div>

    <!-- 用户文件夹 -->
    <TreeSection
      v-if="showFolderTree"
      :title="folderTitle"
      :show-search="showFolderSearch"
      :search-query="folderSearchQuery"
      search-placeholder="搜索文件夹..."
      :tree-data="filteredTreeData"
      :context-menu-items="folderContextMenuItems"
      empty-icon="folder_open"
      empty-text="还没有任何的文件夹"
      empty-hint="点击上方的 + 按钮添加新文件夹"
      scroll-class="folder-tree-scroll"
      @toggle-search="toggleFolderSearch"
      @add="handleAdd('folder')"
      @update:search-query="folderSearchQuery = $event"
      :expandedKeys="expandedKeys"
      :selectionKeys="selectionKeys"
      selectionMode="single"
      :draggable="true"
      @update:value="onTreeDataUpdate"
      @update:expandedKeys="updateExpandedKeys"
      @update:selectionKeys="updateSelectionKeys"
      @node-select="handleNodeSelect"
      @node-expand="handleNodeExpand"
      @node-collapse="handleNodeCollapse"
      @node-contextmenu="handleNodeContextMenu"
      @node-drag-end="onDragEnd"
    >
      <template #node="{ node }">
        <div v-if="node" class="flex items-center">
          <span
            class="material-icons mr-2 text-lg"
            :style="{ color: convertColorToHex(node.data?.originalData?.color) }"
          >
            {{ node.icon || node.data?.icon || 'folder' }}
          </span>
          <span class="flex-1">{{ node.label || '' }}</span>
          <span v-if="node.count" class="text-xs text-gray-500 ml-2">{{ node.count }}</span>
        </div>
      </template>
    </TreeSection>

    <!-- 标签分类 -->
    <TreeSection
      :title="tagTitle"
      :show-search="showTagSearch"
      :search-query="tagSearchQuery"
      search-placeholder="搜索标签..."
      :tree-data="filteredTagTreeNodes"
      :context-menu-items="tagContextMenuItems"
      empty-icon="label"
      empty-text="还没有任何的标签"
      empty-hint="点击上方的 + 按钮添加新标签"
      scroll-class="tag-tree-scroll"
      @toggle-search="toggleTagSearch"
      @add="handleAdd('tag')"
      @update:search-query="tagSearchQuery = $event"
      selectionMode="single"
      :selectionKeys="tagSelectionKeys"
      :draggable="true"
      @update:value="onTagTreeDataUpdate"
      @update:selectionKeys="handleTagSelection"
      @node-select="handleNodeSelect"
      @node-contextmenu="handleTagContextMenu"
      @node-drag-end="onTagDragEnd"
    >
      <template #node="{ node }">
        <div v-if="node" class="flex items-center w-full">
          <span
            class="material-icons mr-2 text-lg"
            :style="{ color: convertColorToHex(node.data?.color) }"
          >
            {{ node.icon || 'label' }}
          </span>
          <span class="flex-1">{{ node.label || '' }}</span>
        </div>
      </template>
    </TreeSection>

    <!-- 通用编辑对话框 -->
    <FolderEditDialog
      :visible="showEditDialog"
      :folder="editingItem"
      :parent-folder="editingParentItem"
      :available-folders="folders"
      :item-type="editingItemType"
      :dialog-title="dialogTitle"
      @close="handleEditDialogClose"
      @save="handleItemSave"
    />

    <!-- 通用移动对话框 -->
    <FolderMoveDialog
      :visible="showMoveDialog"
      :folder="movingItem"
      :available-folders="folders"
      :item-type="movingItemType"
      @close="handleMoveDialogClose"
      @move="handleItemMove"
    />

    <!-- 删除确认对话框 -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogOverlay />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除{{ deletingType === 'folder' ? '文件夹' : '标签' }} "{{
              deletingType === 'folder'
                ? (deletingItem as any)?.label
                : (deletingItem as any)?.name || (deletingItem as any)?.label
            }}" 吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div v-if="deletingType === 'folder'" class="flex items-center space-x-2 px-1">
          <Checkbox id="deleteWithFiles" :model-value="deleteWithFiles" @update:model-value="deleteWithFiles = $event" />
          <label for="deleteWithFiles" class="text-sm text-muted-foreground cursor-pointer select-none">
            同时删除文件夹内的文件（不勾选则文件移至未分类）
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteDialog = false">取消</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import TreeSection from './TreeSection.vue'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import FolderEditDialog from '../FolderEditDialog.vue'
import FolderMoveDialog from '../FolderMoveDialog.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import type { TreeNodeData } from '@/components/ui/volt/Tree.vue'
import type { FolderItem } from '@renderer/types/components'
import { useFolderTreeData } from './composables/useFolderTreeData'
import { useFolderDragDrop } from './composables/useFolderDragDrop'
import { useFolderOperations } from './composables/useFolderOperations'

const convertColorToHex = (color?: number | null): string => {
  if (color === null || color === undefined) return '#6B7280'
  if (typeof color === 'number' && color > 0) {
    return `#${color.toString(16).padStart(6, '0')}`
  }
  return '#6B7280'
}

interface Props {
  folders: FolderItem[]
  tags?: any[]
  selectedFolder?: string
  selectedTags?: string[]
  showBaseCategories?: boolean
  showTags?: boolean
  showFolderTree?: boolean
  baseCategoryTitle?: string
  folderTitle?: string
  tagTitle?: string
  baseCategoriesConfig?: Array<{
    id: string
    label: string
    icon: string
    iconColor?: string
    count?: number
  }>
  treeType?: 'folders' | 'tags'
}

interface Emits {
  (e: 'folder-select', folder: FolderItem | any): void
  (e: 'folder-expand', folder: FolderItem, expanded: boolean): void
  (e: 'tag-select', tag: any): void
  (e: 'folder-add', parentFolder?: FolderItem): void
  (e: 'folder-edit', folder: FolderItem): void
  (e: 'folder-move', folder: FolderItem): void
  (e: 'folder-clone', folder: FolderItem): void
  (e: 'folder-delete', folder: FolderItem): void
  (e: 'refresh-folders'): void
  (e: 'tag-add', parentTag?: any): void
  (e: 'tag-edit', tag: any): void
  (e: 'tag-move', tag: any): void
  (e: 'tag-clone', tag: any): void
  (e: 'tag-delete', tag: any): void
  (e: 'refresh-tags'): void
  (e: 'empty-trash'): void
}

const props = withDefaults(defineProps<Props>(), {
  showBaseCategories: true,
  showTags: false,
  showFolderTree: true,
  baseCategoryTitle: '基础分类',
  folderTitle: '文件夹',
  tagTitle: '标签',
  treeType: 'folders',
  baseCategoriesConfig: () => [
    { id: 'all', label: '全部', icon: 'folder_open', iconColor: 'text-gray-500' },
    { id: 'uncategorized', label: '未分类', icon: 'folder_special', iconColor: 'text-gray-500' },
    { id: 'untagged', label: '未标签', icon: 'label_off', iconColor: 'text-gray-500' },
    { id: 'tag-management', label: '标签管理', icon: 'label', iconColor: 'text-gray-500' },
    { id: 'trash', label: '回收站', icon: 'delete', iconColor: 'text-red-500' },
  ],
})

const emit = defineEmits<Emits>()

// Composables
const {
  nodeIdMap,
  showFolderSearch,
  showTagSearch,
  folderSearchQuery,
  tagSearchQuery,
  filteredTreeData,
  filteredTagTreeNodes,
  toggleFolderSearch,
  toggleTagSearch,
} = useFolderTreeData(
  computed(() => props.folders),
  computed(() => props.tags || []),
  computed(() => props.treeType || 'folders'),
)

const {
  setupDragEventListeners,
  onDragEnd,
  onTagDragEnd,
} = useFolderDragDrop(nodeIdMap, emit)

const {
  currentContextFolder,
  currentContextTag,
  showEditDialog,
  editingItem,
  editingParentItem,
  editingItemType,
  dialogTitle,
  showMoveDialog,
  movingItem,
  movingItemType,
  folderContextMenuItems,
  tagContextMenuItems,
  handleAdd,
  handleEditDialogClose,
  handleMoveDialogClose,
  handleItemMove,
  handleItemSave,
  showDeleteDialog,
  deletingItem,
  deletingType,
  deleteWithFiles,
  confirmDelete,
} = useFolderOperations(emit)

// 选择状态
const folderSelectionKeys = ref<Record<string, boolean>>({})
const tagSelectionKeys = ref<Record<string, boolean>>({})
const folderExpandedKeys = ref<Record<string, boolean>>({})

const expandedKeys = computed(() => folderExpandedKeys.value)
const selectionKeys = computed(() => folderSelectionKeys.value)

// 事件处理
function handleBaseCategoryClick(category: any) {
  folderSearchQuery.value = ''
  showFolderSearch.value = false
  const folderItem: FolderItem = {
    id: category.id,
    label: category.label,
    icon: category.icon || 'folder',
    iconColor: category.iconColor,
    count: category.count,
    active: true,
  }
  emit('folder-select', folderItem)
}

function handleEmptyTrash() {
  emit('empty-trash')
}

function handleTagSelection(selectionKeys: Record<string, boolean>) {
  tagSelectionKeys.value = selectionKeys
}

function handleNodeSelect(node: TreeNodeData) {
  if (!node) return
  folderSearchQuery.value = ''
  showFolderSearch.value = false
  tagSearchQuery.value = ''
  showTagSearch.value = false

  if (node.key?.startsWith('tag-')) {
    emit('tag-select', node.data)
    return
  }

  const folderItem: FolderItem = {
    id: node.key || '',
    label: node.label || '',
    icon: node.icon || 'folder',
    iconColor: node.iconColor,
    count: node.count,
    active: true,
    ...node.data,
  }
  emit('folder-select', folderItem)
}

function handleNodeExpand(node: TreeNodeData) {
  if (node?.data) emit('folder-expand', node.data, true)
}

function handleNodeCollapse(node: TreeNodeData) {
  if (node?.data) emit('folder-expand', node.data, false)
}

function handleNodeContextMenu(node: TreeNodeData, _event: MouseEvent) {
  if (!node?.data) return
  currentContextFolder.value = node.data as FolderItem
}

function handleTagContextMenu(node: TreeNodeData, _event: MouseEvent) {
  if (!node?.data) return
  currentContextTag.value = node.data
}

function updateExpandedKeys(keys: Record<string, boolean>) {
  folderExpandedKeys.value = keys
}

function updateSelectionKeys(keys: Record<string, boolean>) {
  folderSelectionKeys.value = keys
}

async function onTreeDataUpdate(_newData: TreeNodeData[]) {
  emit('refresh-folders')
}

async function onTagTreeDataUpdate(_newData: TreeNodeData[]) {
  emit('refresh-tags')
}

// 生命周期
let folderRefreshListener: ((event: CustomEvent) => void) | null = null
let tagRefreshListener: ((event: CustomEvent) => void) | null = null

onMounted(() => {
  folderRefreshListener = () => emit('refresh-folders')
  window.addEventListener('refresh-folders', folderRefreshListener as EventListener)

  tagRefreshListener = () => emit('refresh-tags')
  window.addEventListener('refresh-tags', tagRefreshListener as EventListener)

  setupDragEventListeners()
})

onUnmounted(() => {
  if (folderRefreshListener) window.removeEventListener('refresh-folders', folderRefreshListener as EventListener)
  if (tagRefreshListener) window.removeEventListener('refresh-tags', tagRefreshListener as EventListener)
})

// Watchers
watch(() => props.selectedFolder, (newSelected) => {
  if (newSelected) {
    folderSelectionKeys.value = {}
    const baseCategory = props.baseCategoriesConfig.find(c => c.id === newSelected)
    if (baseCategory) return
    const folder = props.folders?.find(f => f.id === newSelected)
    if (folder) folderSelectionKeys.value = { [newSelected]: true }
  } else {
    folderSelectionKeys.value = {}
  }
}, { immediate: true })

watch(() => props.selectedTags, (newSelectedTags) => {
  if (newSelectedTags && newSelectedTags.length > 0) {
    const keys: Record<string, boolean> = {}
    newSelectedTags.forEach(tagId => { keys[`tag-${tagId}`] = true })
    tagSelectionKeys.value = keys
  } else {
    tagSelectionKeys.value = {}
  }
}, { immediate: true })
</script>

<style scoped>
.folder-tree-container {
  width: 100%;
}

.material-icons {
  font-size: 18px;
}

/* 文件夹和标签滚动区域样式 */
.folder-tree-scroll,
.tag-tree-scroll {
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
}

.folder-tree-scroll::-webkit-scrollbar,
.tag-tree-scroll::-webkit-scrollbar {
  width: 6px;
}

.folder-tree-scroll::-webkit-scrollbar-track,
.tag-tree-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.folder-tree-scroll::-webkit-scrollbar-thumb,
.tag-tree-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.folder-tree-scroll::-webkit-scrollbar-thumb:hover,
.tag-tree-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}

/* 确保内容区域有合适的边距 */
.folder-tree-scroll,
.tag-tree-scroll {
  padding-right: 4px;
  margin-right: -4px;
}

/* 拖拽目标区域样式 */
.drag-target-area {
  height: 2px;
  margin-left: 1rem;
  margin-right: 0.5rem;
  background-color: transparent;
  transition: background-color 0.2s ease;
  position: relative;
}

.drag-target-area:hover,
.drag-target-area.drag-over {
  background-color: #3b82f6;
  height: 3px;
}

.drag-target-area::before {
  content: '';
  position: absolute;
  left: -0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #3b82f6;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.drag-target-area:hover::before,
.drag-target-area.drag-over::before {
  opacity: 1;
}

/* 节点内容样式 */
.node-content {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s ease;
}

.node-content:hover {
  background-color: #f3f4f6;
}

/* 拖拽状态样式 */
.dragging {
  opacity: 0.5;
}

.drag-target-before {
  margin-top: -1px;
}

.drag-target-after {
  margin-bottom: -1px;
}
</style>
