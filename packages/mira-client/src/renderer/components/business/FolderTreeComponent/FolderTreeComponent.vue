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

    <!-- 标题栏 + 搜索 + 添加 -->
    <div class="flex items-center justify-between px-2 mb-2">
      <h2 class="text-xs font-semibold text-gray-500 leading-5">{{ sectionTitle }}</h2>
      <div class="flex items-center gap-0.5 -mr-1">
        <button
          @click="toggleSearch"
          class="flex h-5 w-5 items-center justify-center text-gray-400 hover:text-gray-600 rounded"
          :class="{ 'text-blue-600': showSearch }"
          :title="`搜索${sectionTitle}...`"
        >
          <span class="material-icons leading-none" style="font-size: 18px">search</span>
        </button>
        <button
          @click="ops.handleAdd(itemType)"
          class="flex h-5 w-5 items-center justify-center text-gray-400 hover:text-gray-600 rounded"
          :title="`添加${sectionTitle}`"
        >
          <span class="material-icons leading-none" style="font-size: 18px">add</span>
        </button>
      </div>
    </div>

    <!-- 搜索框 -->
    <div v-if="showSearch" class="px-2 mb-2">
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        :placeholder="`搜索${sectionTitle}...`"
        class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
      />
    </div>

    <!-- 树 -->
    <ContextMenu>
      <ContextMenuTrigger as-child>
        <div v-if="treeData.length > 0" class="tree-scroll max-h-64 overflow-y-auto">
          <Draggable
            v-if="draggable"
            ref="treeRef"
            v-model="treeData"
            :eachDroppable="eachDroppable"
            @before-drag-start="onBeforeDragStart"
            @after-drop="onAfterDrop"
          >
            <template #default="{ node, stat }">
              <div
                :class="[
                  'flex items-center min-h-8 py-1 px-2 rounded-md cursor-pointer',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  selectedKey === node.id ? 'bg-blue-100 text-blue-700' : ''
                ]"
                @click="handleNodeClick(node)"
                @contextmenu="handleNodeContextMenu(node, $event)"
              >
                <span v-if="stat.children.length" class="material-icons text-base mr-1 text-gray-400 hover:text-gray-600 select-none" @click.stop="stat.open = !stat.open">
                  {{ stat.open ? 'expand_more' : 'chevron_right' }}
                </span>
                <span v-else class="inline-block w-5"></span>
                <span class="material-icons mr-2 text-lg" :style="{ color: getNodeColor(node) }">{{ node.icon || defaultIcon }}</span>
                <span class="flex-1 truncate text-sm">{{ node.label }}</span>
                <span v-if="node.count" class="text-xs text-gray-500 ml-2">{{ node.count }}</span>
              </div>
            </template>
          </Draggable>
          <BaseTree v-else v-model="treeData">
            <template #default="{ node, stat }">
              <div
                :class="[
                  'flex items-center min-h-8 py-1 px-2 rounded-md cursor-pointer',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  selectedKey === node.id ? 'bg-blue-100 text-blue-700' : ''
                ]"
                @click="handleNodeClick(node)"
                @contextmenu="handleNodeContextMenu(node, $event)"
              >
                <span v-if="stat.children.length" class="material-icons text-base mr-1 text-gray-400 hover:text-gray-600 select-none" @click.stop="stat.open = !stat.open">
                  {{ stat.open ? 'expand_more' : 'chevron_right' }}
                </span>
                <span v-else class="inline-block w-5"></span>
                <span class="material-icons mr-2 text-lg" :style="{ color: getNodeColor(node) }">{{ node.icon || defaultIcon }}</span>
                <span class="flex-1 truncate text-sm">{{ node.label }}</span>
                <span v-if="node.count" class="text-xs text-gray-500 ml-2">{{ node.count }}</span>
              </div>
            </template>
          </BaseTree>
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
    <div v-if="treeData.length === 0" class="flex flex-col items-center justify-center py-8 text-gray-500">
      <span class="material-icons text-4xl mb-2 text-gray-400">{{ itemType === 'folder' ? 'folder_open' : 'label' }}</span>
      <p class="text-sm text-center">还没有任何的{{ sectionTitle }}</p>
      <p class="text-xs text-gray-400 mt-1">点击上方的 + 按钮添加新{{ sectionTitle }}</p>
    </div>

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

    <!-- 拖拽移动确认对话框 -->
    <AlertDialog v-model:open="showDragConfirm">
      <AlertDialogOverlay />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认移动</AlertDialogTitle>
          <AlertDialogDescription>
            确定将文件夹「{{ dragConfirmInfo.dragName }}」移动到{{ dragConfirmInfo.targetLabel }}吗？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="cancelDragMove">取消</AlertDialogCancel>
          <AlertDialogAction @click="confirmDragMove">确认移动</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Draggable, BaseTree, dragContext } from '@he-tree/vue'
import '@he-tree/vue/style/default.css'
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
import type { FolderItem } from '@renderer/types/components'
import { useFolderOperations } from './composables/useFolderOperations'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'
import { pinyinMatch } from '@renderer/utils/helpers'

interface HeTreeNode {
  id: string
  label: string
  icon?: string
  count?: number
  color?: number | null
  nodeType: string
  originalData?: any
  children?: HeTreeNode[]
}

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
  draggable?: boolean
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
  draggable: false,
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
const libraryStore = useLibraryStore()
const isFolder = computed(() => props.itemType === 'folder')
const defaultIcon = computed(() => isFolder.value ? 'folder' : 'label')
const sectionTitle = computed(() => props.title || (isFolder.value ? '文件夹' : '标签'))

// 搜索
const showSearch = ref(props.defaultShowSearch || false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const treeRef = ref<any>(null)

watch(showSearch, (val) => {
  if (val) nextTick(() => searchInputRef.value?.focus())
})

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) searchQuery.value = ''
}

// 数据转换：FolderItem[] -> HeTreeNode[]
function convertFoldersToNodes(items: FolderItem[]): HeTreeNode[] {
  return items.map(f => ({
    id: f.id,
    label: f.label || (f as any).title || (f as any).name,
    icon: f.icon || 'folder',
    count: f.count,
    color: (f as any).originalData?.color ?? (f as any).color,
    nodeType: 'folder',
    originalData: (f as any).originalData || f,
    children: f.children ? convertFoldersToNodes(f.children) : undefined,
  }))
}

function convertTagsToNodes(tags: any[]): HeTreeNode[] {
  return tags.map(t => ({
    id: `tag-${t.id}`,
    label: t.name || t.title || t.label,
    icon: 'label',
    count: t.fileCount || t.count,
    color: t.color,
    nodeType: 'tag',
    originalData: t,
    children: undefined,
  }))
}

// 过滤
function filterNodes(nodes: HeTreeNode[], query: string): HeTreeNode[] {
  const result: HeTreeNode[] = []
  for (const node of nodes) {
    const match = pinyinMatch(node.label, query)
    const filteredChildren = node.children ? filterNodes(node.children, query) : []
    if (match || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      })
    }
  }
  return result
}

const rawNodes = computed<HeTreeNode[]>(() => {
  return isFolder.value
    ? convertFoldersToNodes(props.folders || [])
    : convertTagsToNodes(props.tags || [])
})

const treeData = computed<HeTreeNode[]>(() => {
  const q = searchQuery.value.trim()
  return q ? filterNodes(rawNodes.value, q) : rawNodes.value
})

// 操作
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

// 节点交互
function handleBaseCategoryClick(category: any) {
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

function handleNodeClick(node: HeTreeNode) {
  searchQuery.value = ''
  showSearch.value = false
  emit('select', {
    id: node.id,
    label: node.label,
    icon: node.icon || defaultIcon.value,
    count: node.count,
    ...node.originalData,
  })
}

function handleNodeContextMenu(node: HeTreeNode, _event: MouseEvent) {
  if (isFolder.value) {
    ops.currentContextFolder.value = { ...node.originalData, id: node.id, label: node.label, icon: node.icon, count: node.count } as FolderItem
  } else {
    ops.currentContextTag.value = { ...node.originalData, id: node.id, name: node.label }
  }
}

function getNodeColor(node: HeTreeNode): string {
  return convertColorToHex(node.color)
}

// 拖拽：标签不支持拖拽排序
function eachDroppable() {
  return isFolder.value
}

// 拖拽确认状态
const showDragConfirm = ref(false)
const dragConfirmInfo = ref({
  dragId: '',
  dragName: '',
  newParentId: null as string | null,
  targetLabel: '',
  newSiblingIds: [] as { id: number; sort_index: number }[],
})

// 拖拽前记录旧 parentId
let beforeDragParentId: string | null = null

function onBeforeDragStart() {
  if (!isFolder.value) return
  const dragNode = dragContext.dragNode
  if (!dragNode?.data) return
  beforeDragParentId = dragNode.parent?.data?.id ?? null
}

// 拖拽完成后：同层级排序 or 跨层级移动
function onAfterDrop() {
  if (!isFolder.value || !libraryStore.currentLibrary) return

  const dragNode = dragContext.dragNode
  if (!dragNode?.data) return

  const draggedId = dragNode.data.id as string
  const draggedNodeType = dragNode.data.nodeType as string
  if (draggedNodeType === 'tag') return

  const newParentId = dragNode.parent?.data?.id ?? null
  const isSameLevel = newParentId === beforeDragParentId

  if (isSameLevel) {
    // 同层级排序：直接保存
    const items = collectSiblingSortItems(dragNode)
    doUpdateSortIndex(items)
    return
  }

  // 跨层级移动：弹确认前先存好新兄弟排序
  const dragName = dragNode.data.label as string
  const parentLabel = dragNode.parent?.data?.label ?? ''
  const targetLabel = newParentId ? `「${parentLabel}」下` : '根目录'
  const newSiblingIds = collectSiblingSortItems(dragNode)

  dragConfirmInfo.value = { dragId: draggedId, dragName, newParentId, targetLabel, newSiblingIds }
  showDragConfirm.value = true
}

// 收集同级节点的 sort_index 映射
function collectSiblingSortItems(dragNode: any): { id: number; sort_index: number }[] {
  const parent = dragNode.parent
  const siblings: any[] = parent ? parent.children : (treeRef.value as any)?.stats ?? []
  if (!siblings || siblings.length === 0) return []
  return siblings.map((s: any, i: number) => ({
    id: parseInt(s.data.id),
    sort_index: i,
  }))
}

async function doUpdateSortIndex(items: { id: number; sort_index: number }[]) {
  if (items.length === 0) { beforeDragParentId = null; emit('refresh'); return }
  const libraryId = libraryStore.currentLibrary!.id
  try {
    await miraSDKService.updateFolderSortIndex(libraryId, items)
  } catch (error) {
    console.error('Failed to update folder sort index:', error)
  }
  beforeDragParentId = null
  emit('refresh')
}

// 跨层级移动确认
async function confirmDragMove() {
  showDragConfirm.value = false
  if (!libraryStore.currentLibrary) return

  const { dragId, newParentId, newSiblingIds } = dragConfirmInfo.value
  const libraryId = libraryStore.currentLibrary.id
  try {
    // 1. 移动文件夹到新 parent
    await miraSDKService.moveFolder(
      libraryId,
      parseInt(dragId),
      newParentId ? parseInt(newParentId) : null,
    )
    // 2. 把拖拽时的落点位置写入新兄弟们的 sort_index
    if (newSiblingIds.length > 0) {
      await miraSDKService.updateFolderSortIndex(libraryId, newSiblingIds)
    }
  } catch (error) {
    console.error('Failed to move folder via drag and drop:', error)
  }
  beforeDragParentId = null
  emit('refresh')
}

function cancelDragMove() {
  showDragConfirm.value = false
  beforeDragParentId = null
  emit('refresh')
}

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
.folder-tree-container {
  width: 100%;
}

.material-icons {
  font-size: 18px;
}

.tree-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
  padding-right: 4px;
  margin-right: -4px;
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
</style>
