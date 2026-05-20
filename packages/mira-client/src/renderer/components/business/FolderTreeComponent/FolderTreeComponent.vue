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
    <div>
      <div class="flex items-center justify-between px-2 mb-2">
        <h2 class="text-xs font-semibold text-gray-500">{{ folderTitle }}</h2>
        <div class="flex items-center space-x-1">
          <button
            @click="toggleFolderSearch"
            class="p-1 text-gray-400 hover:text-gray-600 rounded"
            :class="{ 'text-blue-600': showFolderSearch }"
            title="搜索文件夹"
          >
            <span class="material-icons text-sm">search</span>
          </button>
          <button
            @click="() => handleAdd('folder')"
            class="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="添加文件夹"
          >
            <span class="material-icons text-sm">add</span>
          </button>
        </div>
      </div>

      <!-- 搜索框 -->
      <div v-if="showFolderSearch" class="px-2 mb-2">
        <input
          v-model="folderSearchQuery"
          type="text"
          placeholder="搜索文件夹..."
          class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
      </div>

      <!-- 拖拽文件夹列表 -->
      <div v-if="filteredTreeData.length > 0" class="folder-tree-scroll max-h-64 overflow-y-auto">
        <ContextMenu>
          <ContextMenuTrigger as-child>
        <Tree
          :value="filteredTreeData"
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
          <template #default="{ node }">
            <div v-if="node" class="flex items-center">
              <!-- 文件夹图标 -->
              <span
                class="material-icons mr-2 text-lg"
                :style="{ color: convertColorToHex(node.data?.originalData?.color) }"
              >
                {{ node.icon || node.data?.icon || 'folder' }}
              </span>

              <!-- 文件夹名称 -->
              <span class="flex-1">{{ node.label || '' }}</span>

              <!-- 文件数量 -->
              <span v-if="node.count" class="text-xs text-gray-500 ml-2">{{ node.count }}</span>
            </div>
          </template>
        </Tree>
          </ContextMenuTrigger>
          <ContextMenuContent class="w-52">
            <template v-for="(item, i) in folderContextMenuItems" :key="i">
              <ContextMenuSeparator v-if="item.separator" />
              <ContextMenuItem v-else :disabled="item.disabled" @click="item.command?.()">
                <span v-if="item.icon" class="material-icons text-base mr-2">{{ item.icon }}</span>
                <span class="flex-1">{{ item.label }}</span>
              </ContextMenuItem>
            </template>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <!-- 文件夹空状态 -->
      <div v-else class="flex flex-col items-center justify-center py-8 text-gray-500">
        <span class="material-icons text-4xl mb-2 text-gray-400">folder_open</span>
        <p class="text-sm text-center">还没有任何的文件夹</p>
        <p class="text-xs text-gray-400 mt-1">点击上方的 + 按钮添加新文件夹</p>
      </div>
    </div>

    <!-- 标签分类 -->
    <div>
      <div class="flex items-center justify-between px-2 mb-2">
        <h2 class="text-xs font-semibold text-gray-500">{{ tagTitle }}</h2>
        <div class="flex items-center space-x-1">
          <button
            @click="toggleTagSearch"
            class="p-1 text-gray-400 hover:text-gray-600 rounded"
            :class="{ 'text-blue-600': showTagSearch }"
            title="搜索标签"
          >
            <span class="material-icons text-sm">search</span>
          </button>
          <button
            @click="() => handleAdd('tag')"
            class="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="添加标签"
          >
            <span class="material-icons text-sm">add</span>
          </button>
        </div>
      </div>

      <!-- 搜索框 -->
      <div v-if="showTagSearch" class="px-2 mb-2">
        <input
          ref="tagSearchInput"
          v-model="tagSearchQuery"
          type="text"
          placeholder="搜索标签..."
          class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
      </div>

      <div v-if="filteredTagTreeNodes.length > 0" class="tag-tree-scroll max-h-64 overflow-y-auto">
        <ContextMenu>
          <ContextMenuTrigger as-child>
        <Tree
          :value="filteredTagTreeNodes"
          selectionMode="single"
          :selectionKeys="tagSelectionKeys"
          :draggable="true"
          @update:value="onTagTreeDataUpdate"
          @update:selectionKeys="handleTagSelection"
          @node-select="handleNodeSelect"
          @node-contextmenu="handleTagContextMenu"
          @node-drag-end="onTagDragEnd"
        >
          <template #default="{ node }">
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
        </Tree>
          </ContextMenuTrigger>
          <ContextMenuContent class="w-52">
            <template v-for="(item, i) in tagContextMenuItems" :key="'tag-'+i">
              <ContextMenuSeparator v-if="item.separator" />
              <ContextMenuItem v-else :disabled="item.disabled" @click="item.command?.()">
                <span v-if="item.icon" class="material-icons text-base mr-2">{{ item.icon }}</span>
                <span class="flex-1">{{ item.label }}</span>
              </ContextMenuItem>
            </template>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <!-- 标签空状态 -->
      <div v-else class="flex flex-col items-center justify-center py-8 text-gray-500">
        <span class="material-icons text-4xl mb-2 text-gray-400">label</span>
        <p class="text-sm text-center">还没有任何的标签</p>
        <p class="text-xs text-gray-400 mt-1">点击上方的 + 按钮添加新标签</p>
      </div>
    </div>

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
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Tree from '@/components/ui/volt/Tree.vue'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
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

const tagSearchInput = ref<HTMLInputElement | null>(null)

watch(showTagSearch, (val) => {
  if (val) nextTick(() => tagSearchInput.value?.focus())
})

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
