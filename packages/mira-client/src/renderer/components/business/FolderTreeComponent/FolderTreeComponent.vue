<template>
  <div class="folder-tree-container">
    <!-- 基础分类 (仅文件夹模式) -->
    <div v-if="showBaseCategories && itemType === 'folder'" class="mb-4">
      <ul class="space-y-0.5">
        <li v-for="folder in baseCategoriesConfig" :key="folder.id">
          <ContextMenu v-if="folder.id === 'trash'">
            <ContextMenuTrigger as-child>
              <a
                :class="[
                  'flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-200 cursor-pointer',
                  selectedKey === folder.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
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
              <ContextMenuItem @click="emit('empty-trash')">
                <span>清空回收站</span>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          <a
            v-else
            :class="[
              'flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-200 cursor-pointer',
              selectedKey === folder.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
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

    <!-- 树 -->
    <TreeSection
      :title="sectionTitle"
      :show-search="showSearch"
      :search-query="searchQuery"
      :search-placeholder="`搜索${sectionTitle}...`"
      :tree-data="filteredNodes"
      :context-menu-items="contextMenuItems"
      :empty-icon="itemType === 'folder' ? 'folder_open' : 'label'"
      :empty-text="`还没有任何的${sectionTitle}`"
      :empty-hint="`点击上方的 + 按钮添加新${sectionTitle}`"
      scroll-class="tree-scroll"
      @toggle-search="toggleSearch"
      @add="ops.handleAdd(itemType)"
      @update:search-query="searchQuery = $event"
      :expandedKeys="expandedKeys"
      :selectionKeys="selectionKeys"
      selectionMode="single"
      :draggable="true"
      @update:value="onTreeDataUpdate"
      @update:expandedKeys="updateExpandedKeys"
      @update:selectionKeys="updateSelectionKeys"
      @node-select="handleNodeSelect"
      @node-unselect="handleNodeSelect"
      @node-expand="handleNodeExpand"
      @node-collapse="handleNodeCollapse"
      @node-contextmenu="handleNodeContextMenu"
      @node-drag-end="currentOnDragEnd"
    >
      <template #node="slotProps">
        <slot name="node" v-bind="slotProps">
          <div v-if="slotProps.node" class="flex items-center">
            <span
              class="material-icons mr-2 text-lg"
              :style="{ color: getNodeColor(slotProps.node) }"
            >
              {{ slotProps.node.icon || defaultIcon }}
            </span>
            <span class="flex-1">{{ slotProps.node.label || '' }}</span>
            <span v-if="slotProps.node.count" class="text-xs text-gray-500 ml-2">{{ slotProps.node.count }}</span>
          </div>
        </slot>
      </template>
    </TreeSection>

    <!-- 通用编辑对话框 -->
    <FolderEditDialog
      :visible="ops.showEditDialog.value"
      :folder="ops.editingItem.value"
      :parent-folder="ops.editingParentItem.value"
      :available-folders="folders"
      :item-type="ops.editingItemType.value"
      :dialog-title="ops.dialogTitle.value"
      @close="ops.handleEditDialogClose"
      @save="ops.handleItemSave"
    />

    <!-- 通用移动对话框 -->
    <FolderMoveDialog
      :visible="ops.showMoveDialog.value"
      :folder="ops.movingItem.value"
      :available-folders="folders"
      :item-type="ops.movingItemType.value"
      @close="ops.handleMoveDialogClose"
      @move="ops.handleItemMove"
    />

    <!-- 删除确认对话框 -->
    <AlertDialog v-model:open="ops.showDeleteDialog.value">
      <AlertDialogOverlay />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除{{ ops.deletingType.value === 'folder' ? '文件夹' : '标签' }} "{{
              (ops.deletingItem.value as any)?.label || (ops.deletingItem.value as any)?.name
            }}" 吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div v-if="ops.deletingType.value === 'folder'" class="flex items-center space-x-2 px-1">
          <Checkbox id="deleteWithFiles" :model-value="ops.deleteWithFiles.value" @update:model-value="ops.deleteWithFiles.value = $event" />
          <label for="deleteWithFiles" class="text-sm text-muted-foreground cursor-pointer select-none">
            同时删除文件夹内的文件（不勾选则文件移至未分类）
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel @click="ops.showDeleteDialog.value = false">取消</AlertDialogCancel>
          <AlertDialogAction @click="ops.confirmDelete">删除</AlertDialogAction>
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
  if (typeof color === 'number' && color > 0) return `#${color.toString(16).padStart(6, '0')}`
  return '#6B7280'
}

interface Props {
  folders?: FolderItem[]
  tags?: any[]
  itemType?: 'folder' | 'tag'
  selectedKey?: string
  showBaseCategories?: boolean
  defaultShowSearch?: boolean
  title?: string
  baseCategoriesConfig?: Array<{
    id: string
    label: string
    icon: string
    iconColor?: string
    count?: number
  }>
}

const props = withDefaults(defineProps<Props>(), {
  itemType: 'folder',
  showBaseCategories: false,
  title: '',
  folders: () => [],
  baseCategoriesConfig: () => [
    { id: 'all', label: '全部', icon: 'folder_open', iconColor: 'text-gray-500' },
    { id: 'uncategorized', label: '未分类', icon: 'folder_special', iconColor: 'text-gray-500' },
    { id: 'untagged', label: '未标签', icon: 'label_off', iconColor: 'text-gray-500' },
    { id: 'trash', label: '回收站', icon: 'delete', iconColor: 'text-red-500' },
  ],
})

interface Emits {
  (e: 'select', item: any): void
  (e: 'expand', item: any, expanded: boolean): void
  (e: 'refresh'): void
  (e: 'empty-trash'): void
}

const emit = defineEmits<Emits>()
const isFolder = computed(() => props.itemType === 'folder')
const defaultIcon = computed(() => isFolder.value ? 'folder' : 'label')
const sectionTitle = computed(() => props.title || (isFolder.value ? '文件夹' : '标签'))

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
  computed(() => props.folders || []),
  computed(() => props.tags || []),
  computed(() => props.itemType),
)

const showSearch = computed(() => isFolder.value ? showFolderSearch.value : showTagSearch.value)
const searchQuery = computed({
  get: () => isFolder.value ? folderSearchQuery.value : tagSearchQuery.value,
  set: (v) => { if (isFolder.value) folderSearchQuery.value = v; else tagSearchQuery.value = v },
})
const filteredNodes = computed(() => isFolder.value ? filteredTreeData.value : filteredTagTreeNodes.value)
const toggleSearch = () => isFolder.value ? toggleFolderSearch() : toggleTagSearch()

// 初始化搜索显示状态
if (props.defaultShowSearch) {
  if (isFolder.value) showFolderSearch.value = true
  else showTagSearch.value = true
}

const { setupDragEventListeners, onDragEnd: onFolderDragEnd, onTagDragEnd } = useFolderDragDrop(nodeIdMap, {
  'refresh-folders': () => emit('refresh'),
  'refresh-tags': () => emit('refresh'),
})
const currentOnDragEnd = computed(() => isFolder.value ? onFolderDragEnd : onTagDragEnd)

const ops = useFolderOperations({
  'folder-add': () => {},
  'folder-edit': () => {},
  'folder-move': () => {},
  'folder-clone': () => {},
  'folder-delete': () => {},
  'refresh-folders': () => emit('refresh'),
  'tag-add': () => {},
  'tag-edit': () => {},
  'tag-move': () => {},
  'tag-clone': () => {},
  'tag-delete': () => {},
  'refresh-tags': () => emit('refresh'),
})

const contextMenuItems = computed(() =>
  isFolder.value ? ops.folderContextMenuItems.value : ops.tagContextMenuItems.value
)

// Selection state
const selectionKeys = ref<Record<string, boolean>>({})
const expandedKeys = ref<Record<string, boolean>>({})

// Event handlers
function handleBaseCategoryClick(category: any) {
  folderSearchQuery.value = ''
  showFolderSearch.value = false
  emit('select', {
    id: category.id,
    label: category.label,
    icon: category.icon || 'folder',
    iconColor: category.iconColor,
    count: category.count,
    active: true,
  })
}

function handleNodeSelect(node: TreeNodeData) {
  if (!node) return
  searchQuery.value = ''
  if (isFolder.value) showFolderSearch.value = false
  else showTagSearch.value = false

  emit('select', {
    id: node.key || '',
    label: node.label || '',
    icon: node.icon || defaultIcon.value,
    count: node.count,
    ...node.data,
  })
}

function handleNodeExpand(node: TreeNodeData) {
  if (node?.data) emit('expand', node.data, true)
}

function handleNodeCollapse(node: TreeNodeData) {
  if (node?.data) emit('expand', node.data, false)
}

function handleNodeContextMenu(node: TreeNodeData, _event: MouseEvent) {
  if (!node?.data) return
  if (isFolder.value) ops.currentContextFolder.value = node.data as FolderItem
  else ops.currentContextTag.value = node.data
}

function updateExpandedKeys(keys: Record<string, boolean>) {
  expandedKeys.value = keys
}

function updateSelectionKeys(keys: Record<string, boolean>) {
  selectionKeys.value = keys
}

function onTreeDataUpdate() {
  emit('refresh')
}

function getNodeColor(node: TreeNodeData): string {
  if (isFolder.value) return convertColorToHex(node.data?.originalData?.color)
  return convertColorToHex(node.data?.color)
}

// Lifecycle
let refreshListener: ((event: CustomEvent) => void) | null = null

onMounted(() => {
  refreshListener = () => emit('refresh')
  window.addEventListener(`refresh-${isFolder.value ? 'folders' : 'tags'}`, refreshListener as EventListener)
  setupDragEventListeners()
})

onUnmounted(() => {
  if (refreshListener) {
    window.removeEventListener(`refresh-${isFolder.value ? 'folders' : 'tags'}`, refreshListener as EventListener)
  }
})

// Watchers
watch(() => props.selectedKey, (key) => {
  if (key) {
    selectionKeys.value = {}
    const baseCategory = props.baseCategoriesConfig.find(c => c.id === key)
    if (baseCategory) return
    const items = isFolder.value ? props.folders : []
    const found = items?.find(f => f.id === key)
    if (found) selectionKeys.value = { [key]: true }
  } else {
    selectionKeys.value = {}
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

.tree-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
}

.tree-scroll::-webkit-scrollbar {
  width: 6px;
}

.tree-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.tree-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
}

.tree-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}

.tree-scroll {
  padding-right: 4px;
  margin-right: -4px;
}
</style>
