<template>
  <div ref="treeContainerRef" class="folder-tree-container w-full" @dragover.capture="handleTreeDragOver"
    @dragleave.capture="handleTreeDragLeave" @drop.capture="handleTreeDrop">
    <!-- 基础分类 (仅文件夹模式) -->
    <div v-if="showBaseCategories && itemType === 'folder'" class="mb-4">
      <ul class="space-y-0.5">
        <li v-for="folder in resolvedBaseCategories" :key="folder.id">
          <ContextMenu v-if="folder.id === 'trash'">
            <ContextMenuTrigger as-child>
              <a :data-folder-tree-node-id="folder.id" :class="[
                'flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors',
                selectedKey === folder.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground',
                locatingNodeId === folder.id ? 'sidebar-locate-active' : ''
              ]" @click.prevent="handleBaseCategoryClick(folder)">
                <span class="flex items-center">
                  <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-muted-foreground'}`">
                    {{ folder.icon }}
                  </span>
                  {{ folder.label }}
                </span>
                <span v-if="folder.count !== undefined" class="text-muted-foreground text-xs">
                  {{ folder.count }}
                </span>
              </a>
            </ContextMenuTrigger>
            <ContextMenuContent class="w-48">
              <ContextMenuItem @click="emit('empty-trash')">
                <span>{{ $t('business.folderTreeComponent.emptyTrash') }}</span>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          <a v-else :data-folder-tree-node-id="folder.id" :class="[
            'flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors',
            selectedKey === folder.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground',
            locatingNodeId === folder.id ? 'sidebar-locate-active' : ''
          ]" @click.prevent="handleBaseCategoryClick(folder)">
            <span class="flex items-center">
              <span :class="`material-icons mr-2 text-lg ${folder.iconColor || 'text-muted-foreground'}`">
                {{ folder.icon }}
              </span>
              {{ folder.label }}
            </span>
            <span v-if="folder.count !== undefined" class="text-muted-foreground text-xs">
              {{ folder.count }}
            </span>
          </a>
        </li>
      </ul>
    </div>

    <!-- 标题栏 + 搜索 + 多选 + 添加（外层提供统一标题时隐藏） -->
    <div v-if="!hideHeader" class="flex items-center justify-between px-2 mb-2">
      <h2 class="text-xs font-semibold text-muted-foreground leading-5">{{ sectionTitle }}</h2>
      <div v-if="!hideHeaderActions" class="header-actions flex items-center gap-0.5 -mr-1">
        <button @click="toggleSearch"
          class="header-action-btn flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-muted-foreground rounded"
          :class="{ 'text-primary': showSearch }" :title="$t('business.groupedCardBrowserDialog.searchPlaceholder', { type: sectionTitle })">
          <span class="material-icons leading-none" style="font-size: 18px">search</span>
        </button>
        <button v-if="selectionEnabled" @click="toggleSelectionMode"
          class="header-action-btn flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-muted-foreground rounded"
          :class="{ 'text-primary': selectionActive }"
          :title="selectionActive ? $t('business.folderTreeComponent.exitMultiSelect', { mode: selectionModeLabel, count: selectionCount }) : $t('business.folderTreeComponent.multiSelectMode', { mode: selectionModeLabel })">
          <span class="material-icons leading-none" style="font-size: 18px">{{ isMultiMode ? 'checklist' :
            'check_box_outline_blank' }}</span>
        </button>
        <button @click="ops.handleAdd(itemType)"
          class="header-action-btn flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-muted-foreground rounded"
          :title="$t('business.folderTreeComponent.add', { title: sectionTitle })">
          <span class="material-icons leading-none" style="font-size: 18px">add</span>
        </button>
      </div>
    </div>

    <!-- 多选工具条 -->
    <div v-if="selectionActive && isMultiMode"
      class="flex items-center justify-between px-2 mb-2 text-xs text-muted-foreground">
      <span>{{ $t('business.folderTreeComponent.selectedCount', { count: selectionCount }) }}</span>
      <div class="flex items-center gap-2">
        <button class="text-primary hover:underline" @click="selectAll">{{ $t('business.folderTreeComponent.selectAll') }}</button>
        <button class="text-muted-foreground hover:underline" @click="clearSelection">{{ $t('business.folderTreeComponent.clear') }}</button>
      </div>
    </div>

    <!-- 搜索框（展开/折叠动效：grid 0fr→1fr 做高度过渡 + opacity/translateY 叠加） -->
    <Transition name="search-slide">
      <div v-if="showSearch" class="search-shell px-2 mb-2">
        <div class="search-shell-inner">
          <input ref="searchInputRef" v-model="searchQuery" type="text" :placeholder="$t('business.groupedCardBrowserDialog.searchPlaceholder', { type: sectionTitle })"
            class="w-full px-3 py-1.5 text-xs border border-border rounded-full bg-white/60 dark:bg-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30" />
        </div>
      </div>
    </Transition>

    <!-- 树 -->
    <ContextMenu>
      <ContextMenuTrigger as-child>
        <div v-if="treeData.length > 0" class="tree-scroll max-h-64 overflow-y-auto">
          <Draggable v-if="draggable" ref="treeRef" v-model="treeData" :eachDroppable="eachDroppable"
            @before-drag-start="onBeforeDragStart" @after-drop="onAfterDrop">
            <template #default="{ node, stat }">
              <div :data-folder-tree-node-id="node.id" :class="[
                'flex items-center min-h-8 py-1 px-2 rounded-lg cursor-pointer transition-colors',
                'hover:bg-primary/5',
                selectedKey === node.id ? 'bg-primary/10 text-primary font-medium' : '',
                selectionActive && isNodeSelected(node) ? 'bg-primary/10' : '',
                dragOverNodeId === node.id ? 'ring-2 ring-primary/50 bg-primary/10' : '',
                locatingNodeId === node.id ? 'sidebar-locate-active' : ''
              ]" @click="handleNodeClick(node, stat, $event)" @contextmenu="handleNodeContextMenu(node, $event)"
                @dragover="handleNodeDragOver($event, node)" @dragleave="handleNodeDragLeave($event, node)"
                @drop.stop="handleNodeDrop($event, node)">
                <Checkbox v-if="showNodeCheckbox" :model-value="getNodeCheckState(node) === true"
                  :indeterminate="getNodeCheckState(node) === 'indeterminate'" class="mr-1.5"
                  @update:model-value="onNodeCheckChange(node, $event)" @click.stop />
                <span v-if="stat.children.length"
                  class="folder-chevron material-icons text-base mr-1 text-muted-foreground hover:text-muted-foreground select-none"
                  :class="{ 'folder-chevron--open': stat.open }" @click.stop="toggleNode(stat, $event)">
                  chevron_right
                </span>
                <!-- 叶子节点占位：仅在展示 checkbox 时保留，用于与父节点图标对齐；无 checkbox 时隐藏，让图标贴最左侧 -->
                <span v-else-if="showNodeCheckbox" class="inline-block w-5"></span>
                <span class="material-icons mr-2 text-lg" :style="{ color: getNodeColor(node) }">{{ node.icon ||
                  defaultIcon }}</span>
                <span class="flex-1 truncate text-sm">{{ node.label }}</span>
                <span v-if="node.count" class="text-xs text-muted-foreground ml-2">{{ node.count }}</span>
              </div>
            </template>
          </Draggable>
          <BaseTree v-else ref="treeRef" v-model="treeData">
            <template #default="{ node, stat }">
              <div :data-folder-tree-node-id="node.id" :class="[
                'flex items-center min-h-8 py-1 px-2 rounded-lg cursor-pointer transition-colors',
                'hover:bg-primary/5',
                selectedKey === node.id ? 'bg-primary/10 text-primary font-medium' : '',
                selectionActive && isNodeSelected(node) ? 'bg-primary/10' : '',
                dragOverNodeId === node.id ? 'ring-2 ring-primary/50 bg-primary/10' : '',
                locatingNodeId === node.id ? 'sidebar-locate-active' : ''
              ]" @click="handleNodeClick(node, stat, $event)" @contextmenu="handleNodeContextMenu(node, $event)"
                @dragover="handleNodeDragOver($event, node)" @dragleave="handleNodeDragLeave($event, node)"
                @drop.stop="handleNodeDrop($event, node)">
                <Checkbox v-if="showNodeCheckbox" :model-value="getNodeCheckState(node) === true"
                  :indeterminate="getNodeCheckState(node) === 'indeterminate'" class="mr-1.5"
                  @update:model-value="onNodeCheckChange(node, $event)" @click.stop />
                <span v-if="stat.children.length"
                  class="folder-chevron material-icons text-base mr-1 text-muted-foreground hover:text-muted-foreground select-none"
                  :class="{ 'folder-chevron--open': stat.open }" @click.stop="toggleNode(stat, $event)">
                  chevron_right
                </span>
                <!-- 叶子节点占位：仅在展示 checkbox 时保留，用于与父节点图标对齐；无 checkbox 时隐藏，让图标贴最左侧 -->
                <span v-else-if="showNodeCheckbox" class="inline-block w-5"></span>
                <span class="material-icons mr-2 text-lg" :style="{ color: getNodeColor(node) }">{{ node.icon ||
                  defaultIcon }}</span>
                <span class="flex-1 truncate text-sm">{{ node.label }}</span>
                <span v-if="node.count" class="text-xs text-muted-foreground ml-2">{{ node.count }}</span>
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
    <div v-if="treeData.length === 0" class="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <span class="material-icons text-4xl mb-2 text-muted-foreground">{{ itemType === 'folder' ? 'folder_open' :
        'label'
        }}</span>
      <p class="text-sm text-center">{{ $t('business.folderTreeComponent.empty', { title: sectionTitle }) }}</p>
    </div>

    <!-- 通用编辑对话框（Teleport 到 body，避免被侧栏等祖先容器的 transform/filter 等限制为局部定位） -->
    <Teleport to="body">
      <FolderEditDialog :visible="ops.showEditDialog.value" :folder="ops.editingItem.value"
        :parent-folder="ops.editingParentItem.value" :available-folders="folders" :item-type="ops.editingItemType.value"
        :dialog-title="ops.dialogTitle.value" @close="ops.handleEditDialogClose" @save="ops.handleItemSave" />
    </Teleport>

    <!-- 通用移动对话框 -->
    <FolderMoveDialog :visible="ops.showMoveDialog.value" :folder="ops.movingItem.value" :available-folders="folders"
      :item-type="ops.movingItemType.value" @close="ops.handleMoveDialogClose" @move="ops.handleItemMove" />

    <!-- 删除确认对话框 -->
    <AlertDialog v-if="showDeleteDialog" :open="true" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('business.folderTreeComponent.confirmDeleteTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('business.folderTreeComponent.confirmDeleteDesc', { type: ops.deletingType.value === 'folder' ? $t('business.folderTreeComponent.typeFolder') : $t('business.folderTreeComponent.typeTag'), name: (ops.deletingItem.value as any)?.label || (ops.deletingItem.value as any)?.name }) }}
          </AlertDialogDescription>
          </AlertDialogHeader>
          <div v-if="ops.deletingType.value === 'folder'" class="flex items-center space-x-2 px-1">
            <Checkbox id="deleteWithFiles" :model-value="Boolean(ops.deleteWithFiles.value)"
              @update:model-value="ops.deleteWithFiles.value = $event === true" />
            <label for="deleteWithFiles" class="text-sm text-muted-foreground cursor-pointer select-none">
              {{ $t('business.folderTreeComponent.deleteWithFilesLabel') }}
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{{ $t('business.folderTreeComponent.cancel') }}</AlertDialogCancel>
            <AlertDialogAction class="bg-destructive hover:bg-destructive text-white" @click="ops.confirmDelete">{{ $t('business.folderTreeComponent.delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 批量删除确认对话框 -->
    <AlertDialog v-if="showBatchDeleteDialog" :open="true" @update:open="showBatchDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('business.folderTreeComponent.confirmBatchDeleteTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('business.folderTreeComponent.confirmBatchDeleteDesc', { count: ops.batchDeleteTotalCount.value, type: ops.batchDeletingType.value === 'folder' ? $t('business.folderTreeComponent.typeFolder') : $t('business.folderTreeComponent.typeTag') }) }}
          </AlertDialogDescription>
          </AlertDialogHeader>
          <div v-if="ops.batchDeletingType.value === 'folder'" class="flex items-center space-x-2 px-1">
            <Checkbox id="batchDeleteWithFiles" :model-value="Boolean(ops.deleteWithFiles.value)"
              @update:model-value="ops.deleteWithFiles.value = $event === true" />
            <label for="batchDeleteWithFiles" class="text-sm text-muted-foreground cursor-pointer select-none">
              {{ $t('business.folderTreeComponent.deleteWithFilesLabel') }}
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{{ $t('business.folderTreeComponent.cancel') }}</AlertDialogCancel>
            <AlertDialogAction class="bg-destructive hover:bg-destructive text-white" @click="ops.confirmBatchDelete">{{ $t('business.folderTreeComponent.delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 拖拽移动确认对话框 -->
    <AlertDialog :open="showDragConfirm" @update:open="showDragConfirm = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('business.folderTreeComponent.confirmDragMoveTitle') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('business.folderTreeComponent.confirmDragMoveDesc', { name: dragConfirmInfo.dragName, target: dragConfirmInfo.targetLabel }) }}
        </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" @click="cancelDragMove">{{ $t('business.folderTreeComponent.cancel') }}</Button>
          <Button type="button" @click="confirmDragMove">{{ $t('business.folderTreeComponent.confirmMove') }}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { FolderItem } from '@renderer/types/components'
import { useFolderOperations } from './composables/useFolderOperations'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'
import { useMediaStore } from '@renderer/stores/media'
import { useSettingsStore } from '@renderer/stores/settings'
import { useToast } from '@renderer/composables/useToast'
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
  baseCategoriesConfig?: Array<{
    id: string
    label: string
    icon: string
    iconColor?: string
    count?: number
  }>
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
const libraryStore = useLibraryStore()
const mediaStore = useMediaStore()
const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()
const isFolder = computed(() => props.itemType === 'folder')
const defaultIcon = computed(() => isFolder.value ? 'folder' : 'label')
const sectionTitle = computed(() => props.title || (isFolder.value ? t('business.folderTreeComponent.sectionFolder') : t('business.folderTreeComponent.sectionTag')))
// 基础分类：未传入时使用内置默认（带本地化 label）
const resolvedBaseCategories = computed(() => {
  if (props.baseCategoriesConfig && props.baseCategoriesConfig.length > 0) return props.baseCategoriesConfig
  return [
    { id: 'all', label: t('business.folderTreeComponent.baseAll'), icon: 'folder_open', iconColor: 'text-muted-foreground' },
    { id: 'uncategorized', label: t('business.folderTreeComponent.baseUncategorized'), icon: 'folder_special', iconColor: 'text-muted-foreground' },
    { id: 'untagged', label: t('business.folderTreeComponent.baseUntagged'), icon: 'label_off', iconColor: 'text-muted-foreground' },
    { id: 'trash', label: t('business.folderTreeComponent.baseTrash'), icon: 'delete', iconColor: 'text-destructive' },
  ]
})

// 拖拽 drop 状态
const dragOverNodeId = ref<string | null>(null)

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

function hasAcceptableFileDrag(e: DragEvent): boolean {
  const types = Array.from(e.dataTransfer?.types || [])
  return Boolean(
    (window as any).__miraInternalDrag ||
    (window as any).__miraInternalDragFilePaths?.length ||
    e.dataTransfer?.files?.length ||
    types.includes('Files')
  )
}

function normalizeDragPath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase()
}

function resolveInternalDraggedFileIds(e: DragEvent): string[] {
  const cachedIds = ((window as any).__miraInternalDragFileIds || []) as string[]
  const cachedPaths = ((window as any).__miraInternalDragFilePaths || []) as string[]

  if ((window as any).__miraInternalDrag && cachedIds.length > 0) {
    return cachedIds
  }

  if (!e.dataTransfer?.files?.length || cachedIds.length === 0 || cachedPaths.length === 0) {
    return []
  }

  const droppedPaths = Array.from(e.dataTransfer.files)
    .map(file => (file as File & { path?: string }).path || '')
    .filter(Boolean)
    .map(normalizeDragPath)

  if (droppedPaths.length === 0) return []

  const droppedPathSet = new Set(droppedPaths)
  const matchedIds = cachedPaths
    .map((path, index) => droppedPathSet.has(normalizeDragPath(path)) ? cachedIds[index] : null)
    .filter((id): id is string => Boolean(id))

  return matchedIds.length > 0 ? matchedIds : []
}

function clearInternalDragState() {
  ; (window as any).__miraInternalDrag = false
    ; (window as any).__miraInternalDragFileIds = []
    ; (window as any).__miraInternalDragFilePaths = []
}

function findDropNode(target: EventTarget | null): HeTreeNode | null {
  const element = target instanceof HTMLElement
    ? target.closest<HTMLElement>('[data-folder-tree-node-id]')
    : null
  const nodeId = element?.dataset.folderTreeNodeId
  return nodeId ? nodeMap.value.get(nodeId) || null : null
}

function acceptFileDropEvent(e: DragEvent, node: HeTreeNode) {
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
  dragOverNodeId.value = node.id
}

function handleTreeDragOver(e: DragEvent) {
  if (!hasAcceptableFileDrag(e)) return
  const node = findDropNode(e.target)
  if (!node) return
  acceptFileDropEvent(e, node)
}

function handleTreeDragLeave(e: DragEvent) {
  const current = e.currentTarget as HTMLElement | null
  const related = e.relatedTarget as Node | null
  if (current && related && current.contains(related)) return
  dragOverNodeId.value = null
}

async function handleTreeDrop(e: DragEvent) {
  if (!hasAcceptableFileDrag(e)) return
  const node = findDropNode(e.target)
  if (!node) return
  acceptFileDropEvent(e, node)
  await processNodeDrop(e, node)
}

function resolveNodeId(node: HeTreeNode): number {
  // tag 节点 id 格式为 "tag-123"
  const raw = node.id
  return parseInt(isFolder.value ? raw : raw.replace('tag-', ''))
}

function handleNodeDragOver(e: DragEvent, node: HeTreeNode) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  dragOverNodeId.value = node.id
}

function handleNodeDragLeave(e: DragEvent, _node: HeTreeNode) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
    dragOverNodeId.value = null
  }
}

async function handleNodeDrop(e: DragEvent, node: HeTreeNode) {
  await processNodeDrop(e, node)
}

async function processNodeDrop(e: DragEvent, node: HeTreeNode) {
  dragOverNodeId.value = null
  if (!libraryStore.currentLibrary) return
  const libraryId = libraryStore.currentLibrary.id

  const internalFileIds = resolveInternalDraggedFileIds(e)
  // 内部拖拽：素材库文件 → 设置文件夹/标签
  if (internalFileIds.length > 0) {
    await handleInternalDrop(libraryId, internalFileIds, node)
    clearInternalDragState()
    return
  }

  // 外部文件拖拽 → 上传
  if (!e.dataTransfer?.files?.length) return
  const files = Array.from(e.dataTransfer.files)
  const nodeIdNum = resolveNodeId(node)
  if (isNaN(nodeIdNum)) return

  if (settingsStore.settings.directImportMode) {
    const metadata: Record<string, any> = {}
    if (isFolder.value) metadata.folderId = String(nodeIdNum)
    else metadata.tags = [String(nodeIdNum)]
    for (const file of files) {
      mediaStore.uploadFile(file, libraryId, metadata)
    }
    toast.add({ severity: 'success', detail: t('business.folderTreeComponent.uploadingFiles', { count: files.length, name: node.label }), life: 2000 })
    return
  }

  // 非直接导入模式：通过 SDK 上传并带上文件夹/标签
  for (const file of files) {
    const opts: any = {}
    if (isFolder.value) opts.folderId = String(nodeIdNum)
    else opts.tags = [String(nodeIdNum)]
    try {
      await miraSDKService.uploadFile(file, libraryId, opts)
    } catch (err) {
      console.error('Upload failed:', err)
    }
  }
  toast.add({ severity: 'success', detail: t('business.folderTreeComponent.uploadedFiles', { count: files.length, name: node.label }), life: 2000 })
}

async function handleInternalDrop(libraryId: string, fileIds: string[], node: HeTreeNode) {
  const nodeIdNum = resolveNodeId(node)
  if (isNaN(nodeIdNum)) return

  let success = 0
  for (const fid of fileIds) {
    try {
      if (isFolder.value) {
        await miraSDKService.moveFileToFolder(libraryId, parseInt(fid), nodeIdNum)
      } else {
        await miraSDKService.addTagsToFile(libraryId, parseInt(fid), [String(nodeIdNum)])
      }
      success++
    } catch (err) {
      console.error(`Failed to set ${isFolder.value ? 'folder' : 'tag'} for file ${fid}:`, err)
    }
  }
  if (success > 0) {
    toast.add({ severity: 'success', detail: isFolder.value ? t('business.folderTreeComponent.movedToFolder', { count: success, name: node.label }) : t('business.folderTreeComponent.taggedFiles', { count: success, name: node.label }), life: 2000 })
  }
}

// 搜索
const showSearch = ref(props.defaultShowSearch || false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const treeRef = ref<any>(null)
const treeContainerRef = ref<HTMLElement | null>(null)
const locatingNodeId = ref<string | null>(null)
watch(showSearch, (val) => {
  if (val) nextTick(() => searchInputRef.value?.focus())
})

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) searchQuery.value = ''
}

// 选择模式（单选/多选/不启用）
// selectionMode 由 prop 决定能力；selectionActive 表示当前是否已进入选择状态
const selectionEnabled = computed(() => props.selectionMode !== 'none')
const isMultiMode = computed(() => props.selectionMode === 'multi')
const selectionModeLabel = computed(() => isMultiMode.value ? t('business.folderTreeComponent.multiSelectLabel') : t('business.folderTreeComponent.singleSelectLabel'))
// 传入选择模式时直接进入选择状态，便于在弹窗中点击即选
const selectionActive = ref(props.selectionMode !== 'none')
const selectedNodeIds = ref<Set<string>>(new Set())
// 选择模式下当前选中的节点数量
const selectionCount = computed(() => selectedNodeIds.value.size)
// 是否在节点最左侧展示 checkbox（仅多选模式）
const showNodeCheckbox = computed(() => selectionActive.value && isMultiMode.value)

function toggleSelectionMode() {
  selectionActive.value = !selectionActive.value
  if (!selectionActive.value) clearSelection()
}

// 选择模式能力变化时，自动关闭已激活的选择状态并清空选中
watch(() => props.selectionMode, (mode) => {
  selectionActive.value = mode !== 'none'
  clearSelection()
})

function clearSelection() {
  selectedNodeIds.value = new Set()
}

// 单选模式下仅保留一个节点
function selectSingle(node: HeTreeNode) {
  selectedNodeIds.value = new Set([node.id])
}

// 判断节点是否处于选中状态（含被选中分组下的子项）
function isNodeSelected(node: HeTreeNode): boolean {
  if (selectedNodeIds.value.has(node.id)) return true
  // 多选分组被选中时，其子项也视为选中
  if (isMultiMode.value) {
    const ids = collectDescendantIds(node)
    return ids.some(id => selectedNodeIds.value.has(id))
  }
  return false
}

// 递归收集节点及其所有后代 id
function collectDescendantIds(node: HeTreeNode, acc: string[] = []): string[] {
  acc.push(node.id)
  if (node.children?.length) {
    for (const child of node.children) collectDescendantIds(child, acc)
  }
  return acc
}

// 节点勾选状态：true / false / 'indeterminate'（仅多选模式使用）
function getNodeCheckState(node: HeTreeNode): boolean | 'indeterminate' {
  if (!node.children?.length) {
    return selectedNodeIds.value.has(node.id)
  }
  const ids = collectDescendantIds(node)
  const selectedCount = ids.filter(id => selectedNodeIds.value.has(id)).length
  if (selectedCount === 0) return false
  if (selectedCount === ids.length) return true
  return 'indeterminate'
}

function onNodeCheckChange(node: HeTreeNode, checked: boolean | 'indeterminate') {
  const next = new Set(selectedNodeIds.value)
  const ids = collectDescendantIds(node)
  if (checked) {
    ids.forEach(id => next.add(id))
  } else {
    ids.forEach(id => next.delete(id))
  }
  selectedNodeIds.value = next
  // 复选框交互同样通知外层，以便弹窗调用方即时应用节点
  emit('select', {
    label: node.label,
    icon: node.icon || defaultIcon.value,
    count: node.count,
    ...node.originalData,
    id: node.id,
    selected: checked === true,
  })
}

function selectAll() {
  const next = new Set<string>()
  const walk = (nodes: HeTreeNode[]) => {
    for (const node of nodes) {
      collectDescendantIds(node).forEach(id => next.add(id))
    }
  }
  walk(treeData.value)
  selectedNodeIds.value = next
}

// 收集实际要删除的节点：仅保留被选中、且不被某个已选中的祖先节点包含的节点
// （避免对分组勾选时重复删除其后代）
function collectSelectedTopLevelNodes(): { nodes: HeTreeNode[]; total: number } {
  const selectedSet = selectedNodeIds.value
  const topLevel: HeTreeNode[] = []
  const visit = (nodes: HeTreeNode[], ancestorSelected: boolean) => {
    for (const node of nodes) {
      const isSelected = selectedSet.has(node.id)
      if (isSelected && !ancestorSelected) {
        topLevel.push(node)
      }
      if (node.children?.length) {
        visit(node.children, ancestorSelected || isSelected)
      }
    }
  }
  visit(treeData.value, false)
  return { nodes: topLevel, total: selectedSet.size }
}

async function locateNode(id: string): Promise<boolean> {
  console.log('[DEBUG-locate-sidebar] tree locateNode start', {
    id,
    itemType: props.itemType,
    treeDataCount: treeData.value.length,
    rawNodeCount: rawNodes.value.length,
    searchQuery: searchQuery.value,
    hasTreeRef: Boolean(treeRef.value),
    hasTreeContainerRef: Boolean(treeContainerRef.value),
  })
  searchQuery.value = ''
  showSearch.value = false
  await nextTick()

  const node = nodeMap.value.get(id)
  const stat = treeRef.value?.statsFlat?.find((item: any) => item.data?.id === id)
    || (node ? treeRef.value?.getStat?.(node) : null)

  console.log('[DEBUG-locate-sidebar] tree resolve target', {
    id,
    foundNode: Boolean(node),
    foundStat: Boolean(stat),
    statsFlatCount: treeRef.value?.statsFlat?.length,
    visibleStatsCount: treeRef.value?.visibleStats?.length,
  })

  if (stat) {
    let current = stat
    const openedIds: string[] = []
    while (current) {
      current.open = true
      if (current.data?.id) openedIds.push(current.data.id)
      current = current.parent
    }
    console.log('[DEBUG-locate-sidebar] tree opened path', {
      id,
      openedIds,
    })
    await nextTick()
  }

  const target = treeContainerRef.value?.querySelector<HTMLElement>(`[data-folder-tree-node-id="${id}"]`)
  console.log('[DEBUG-locate-sidebar] tree query target element', {
    id,
    foundTarget: Boolean(target),
    targetText: target?.textContent?.trim(),
    containerScrollTop: treeContainerRef.value?.scrollTop,
  })
  if (!target) return false

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  locatingNodeId.value = null
  window.setTimeout(() => {
    locatingNodeId.value = id
    window.setTimeout(() => {
      if (locatingNodeId.value === id) {
        locatingNodeId.value = null
      }
    }, 1800)
  }, 250)
  return true
}

defineExpose({
  locateNode,
  /** 供外层标题栏调用（hideHeader=true 时） */
  showSearch,
  toggleSearch,
  toggleSelectionMode,
  handleAdd: () => ops.handleAdd(props.itemType),
})

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
    icon: t.icon || 'label',
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

// 数据加载或外部当前文件变化后，同步初始化选择状态
watch([() => props.selectedKeys, rawNodes], ([keys]) => {
  if (!selectionActive.value) return
  const wanted = new Set((keys || []).map(String))
  const available = new Set<string>()
  const collect = (nodes: HeTreeNode[]) => nodes.forEach(node => {
    available.add(String(node.id))
    if (node.children) collect(node.children)
  })
  collect(rawNodes.value)
  selectedNodeIds.value = new Set([...wanted].filter(id => available.has(id)))
}, { immediate: true, deep: true })

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
const { showDeleteDialog, showBatchDeleteDialog } = ops

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

const CHILDREN_SLIDE_MS = 240
const animatingStats = new WeakSet<object>()

function getDescendantRows(targetRow: HTMLElement): HTMLElement[] {
  const targetLevel = Number(targetRow.getAttribute('aria-level') || 0)
  if (!targetLevel) return []

  const descendants: HTMLElement[] = []
  let row = targetRow.nextElementSibling as HTMLElement | null
  while (row) {
    const level = Number(row.getAttribute('aria-level') || 0)
    if (level > 0 && level <= targetLevel) break
    descendants.push(row)
    row = row.nextElementSibling as HTMLElement | null
  }
  return descendants
}

function getTargetRow(event: MouseEvent): HTMLElement | null {
  return (event.currentTarget as HTMLElement).closest<HTMLElement>('.tree-node')
}

function animateChildRows(rows: HTMLElement[], phase: 'expand' | 'collapse'): Promise<void> {
  const keyframes: Keyframe[] = phase === 'expand'
    ? [
      { transform: 'translateX(-24px)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ]
    : [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(24px)', opacity: 0 },
    ]
  const animations = rows.map(row => row.animate(keyframes, {
    duration: CHILDREN_SLIDE_MS,
    easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    fill: 'both',
  }))

  return Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
    animations.forEach(animation => animation.cancel())
  })
}

async function toggleNode(stat: any, event: MouseEvent) {
  if (animatingStats.has(stat)) return
  animatingStats.add(stat)
  const targetRow = getTargetRow(event)

  try {
    if (!stat.open) {
      stat.open = true
      await nextTick()
      const descendants = targetRow ? getDescendantRows(targetRow) : []
      await animateChildRows(descendants, 'expand')
      return
    }

    const descendants = targetRow ? getDescendantRows(targetRow) : []
    await animateChildRows(descendants, 'collapse')
    stat.open = false
  } finally {
    animatingStats.delete(stat)
  }
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
      emit('select', {
        label: node.label,
        icon: node.icon || defaultIcon.value,
        count: node.count,
        ...node.originalData,
        id: node.id,
      })
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
  emit('select', {
    label: node.label,
    icon: node.icon || defaultIcon.value,
    count: node.count,
    ...node.originalData,
    // id 放在 originalData 展开之后，避免被原始数据中的数字 id 覆盖（节点 id 始终是字符串）
    id: node.id,
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

// 拖拽：文件夹与标签均支持拖拽排序（标签为扁平结构，仅同层排序）
function eachDroppable() {
  return true
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
  const dragNode = dragContext.dragNode
  if (!dragNode?.data) return
  beforeDragParentId = dragNode.parent?.data?.id ?? null
}

// 拖拽完成后：同层级排序 or 跨层级移动
function onAfterDrop() {
  if (!libraryStore.currentLibrary) return

  const dragNode = dragContext.dragNode
  if (!dragNode?.data) return

  const draggedId = dragNode.data.id as string

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
  const targetLabel = newParentId ? t('business.folderTreeComponent.dragTargetChild', { name: parentLabel }) : t('business.folderTreeComponent.dragTargetRoot')
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
    id: resolveNodeId(s.data),
    sort_index: i,
  }))
}

async function doUpdateSortIndex(items: { id: number; sort_index: number }[]) {
  if (items.length === 0) { beforeDragParentId = null; emit('refresh'); return }
  const libraryId = libraryStore.currentLibrary!.id
  try {
    if (isFolder.value) {
      await miraSDKService.updateFolderSortIndex(libraryId, items)
    } else {
      await miraSDKService.updateTagSortIndex(libraryId, items)
    }
  } catch (error) {
    console.error(`Failed to update ${isFolder.value ? 'folder' : 'tag'} sort index:`, error)
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

.sidebar-locate-active {
  background-color: rgba(191, 219, 254, 0.95) !important;
  color: rgb(29, 78, 216) !important;
  outline: 2px solid rgba(37, 99, 235, 0.95) !important;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.22) !important;
  animation: sidebar-locate-active 0.45s ease-in-out 4;
}

@keyframes sidebar-locate-active {
  0% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.18);
  }

  100% {
    filter: brightness(1);
  }
}

/*
  搜索栏展开/折叠动效。
  - 高度用 grid-template-rows: 0fr → 1fr 过渡（无需 JS 测量，自适应内容高度）。
  - 叠加 opacity + 微量 translateY，进入 ease-out 有 punch、退出更快利索（200ms / 150ms）。
  - 入场起始用 max-height 兜底，避免个别内核 grid 行高过渡不触发。
*/
.search-shell {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}

.search-slide-enter-active {
  transition:
    grid-template-rows 200ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 200ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 200ms cubic-bezier(0.23, 1, 0.32, 1),
    margin 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.search-slide-leave-active {
  transition:
    grid-template-rows 150ms cubic-bezier(0.4, 0, 1, 1),
    opacity 150ms cubic-bezier(0.4, 0, 1, 1),
    transform 150ms cubic-bezier(0.4, 0, 1, 1),
    margin 150ms cubic-bezier(0.4, 0, 1, 1);
}

.search-slide-enter-from {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
  margin-bottom: -0.5rem;
}

.search-slide-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
  margin-bottom: -0.5rem;
}

.search-shell-inner {
  overflow: hidden;
  min-height: 0;
}

.folder-chevron {
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: center center;
}

.folder-chevron--open {
  transform: rotate(90deg);
}

/*
  按下反馈（emil-design-eng 硬性项）：可点击元素按压必须即时回弹。
  图标按钮比卡片按钮更克制，用 scale(0.9)。
*/
.header-action-btn {
  transition: transform 160ms ease-out;
}

.header-action-btn:active {
  transform: scale(0.9);
}

.folder-chevron:active {
  transform: scale(0.9);
}

.folder-chevron.folder-chevron--open:active {
  transform: rotate(90deg) scale(0.9);
}

@media (prefers-reduced-motion: reduce) {

  .search-slide-enter-active,
  .search-slide-leave-active {
    transition: opacity 150ms ease;
  }

  .search-slide-enter-from,
  .search-slide-leave-to {
    grid-template-rows: 0fr;
    transform: none;
  }

  .header-action-btn {
    transition: none;
  }

  /* Folder tree animation is an explicit interaction requirement. */
  .folder-chevron {
    transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1) !important;
  }

}
</style>
