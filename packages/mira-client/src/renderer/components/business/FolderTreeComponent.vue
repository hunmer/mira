<template>
  <div class="folder-tree-container space-y-4">
    <!-- 基础分类 -->
    <div v-if="showBaseCategories">
      <ul class="space-y-0.5">
        <li v-for="folder in baseCategoriesConfig" :key="folder.id">
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
                {{ node.data?.icon || 'folder' }}
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
          <Checkbox id="deleteWithFiles" v-model:checked="deleteWithFiles" />
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
import Tree from '@/components/ui/volt/Tree.vue'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import FolderEditDialog from './FolderEditDialog.vue'
import FolderMoveDialog from './FolderMoveDialog.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import type { TreeNodeData } from '@/components/ui/volt/Tree.vue'
import type { FolderItem } from '../../types/components'
import type { MenuItem } from '@/components/ui/volt/types'
import { miraSDKService } from '../../services/MiraSDKService'
import { useLibraryStore } from '../../stores/library'
import { pinyinMatch } from '../../utils/helpers'

// 颜色转换工具函数
const convertColorToHex = (color?: number | null): string => {
  // 处理null、undefined或0的情况
  if (color === null || color === undefined) return '#6B7280' // 默认灰色

  // 如果是整数颜色值，转换为16进制颜色代码
  if (typeof color === 'number' && color > 0) {
    return `#${color.toString(16).padStart(6, '0')}`
  }

  return '#6B7280' // 默认灰色
}

interface Props {
  folders: FolderItem[]
  tags?: any[]
  selectedFolder?: string
  selectedTags?: string[]  // 新增：选中的标签ID列表
  // 分类显示控制
  showBaseCategories?: boolean
  showTags?: boolean
  // 分类标题
  baseCategoryTitle?: string
  folderTitle?: string
  tagTitle?: string
  // 基础分类配置
  baseCategoriesConfig?: Array<{
    id: string
    label: string
    icon: string
    iconColor?: string
    count?: number
  }>
  // 树类型，用于区分folders和tags
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
  (e: 'refresh-folders'): void // 新增：刷新文件夹数据事件
  (e: 'tag-add', parentTag?: any): void
  (e: 'tag-edit', tag: any): void
  (e: 'tag-move', tag: any): void
  (e: 'tag-clone', tag: any): void
  (e: 'tag-delete', tag: any): void
  (e: 'refresh-tags'): void // 新增：刷新标签数据事件
}

const props = withDefaults(defineProps<Props>(), {
  showBaseCategories: true,
  showTags: false,
  baseCategoryTitle: '基础分类',
  folderTitle: '文件夹',
  tagTitle: '标签',
  treeType: 'folders',
  baseCategoriesConfig: () => [
    {
      id: 'all',
      label: '全部',
      icon: 'folder_open',
      iconColor: 'text-gray-500',
    },
    {
      id: 'uncategorized',
      label: '未分类',
      icon: 'folder_special',
      iconColor: 'text-gray-500'
    },
    {
      id: 'untagged',
      label: '未标签',
      icon: 'label_off',
      iconColor: 'text-gray-500',
    },
    {
      id: 'tag-management',
      label: '标签管理',
      icon: 'label',
      iconColor: 'text-gray-500',
    },
    {
      id: 'trash',
      label: '回收站',
      icon: 'delete',
      iconColor: 'text-red-500',
    }
  ]
})

const emit = defineEmits<Emits>()

// 选择状态
const folderSelectionKeys = ref<Record<string, boolean>>({})
const tagSelectionKeys = ref<Record<string, boolean>>({})
const folderExpandedKeys = ref<Record<string, boolean>>({})

// 右键菜单相关
const currentContextFolder = ref<FolderItem | null>(null)
const currentContextTag = ref<any | null>(null)

// 对话框相关
const showEditDialog = ref(false)
const editingItem = ref<any | null>(null)
const editingParentItem = ref<any | null>(null)
const editingItemType = ref<ContextType>('folder')

// 删除确认对话框
const showDeleteDialog = ref(false)
const deletingItem = ref<any | null>(null)
const deletingType = ref<ContextType>('folder')
const deleteWithFiles = ref(false)

// 动态对话框标题
const dialogTitle = computed(() => {
  const itemTypeName = editingItemType.value === 'folder' ? '文件夹' : '标签'

  if (editingItem.value) {
    // 编辑模式
    return `编辑${itemTypeName}`
  } else if (editingParentItem.value) {
    // 添加子项模式
    const subItemName = editingItemType.value === 'folder' ? '子文件夹' : '子标签'
    return `添加${subItemName}`
  } else {
    // 添加根项模式
    return `添加${itemTypeName}`
  }
})

// 移动对话框相关
const showMoveDialog = ref(false)
const movingItem = ref<any | null>(null)
const movingItemType = ref<ContextType>('folder')

// 搜索相关
const showFolderSearch = ref(false)
const showTagSearch = ref(false)
const folderSearchQuery = ref('')
const tagSearchQuery = ref('')

// 节点ID映射，用于快速查找节点信息
const nodeIdMap = ref(new Map<string, {
  id: string
  parentId: string | null
  nodeType: string
  data: any
}>())

// Tree组件相关
const treeData = computed((): TreeNodeData[] => {
  // 清空之前的映射
  nodeIdMap.value.clear()
  return convertFoldersToTreeNodes(props.folders || [])
})

// 过滤后的树数据
const filteredTreeData = computed((): TreeNodeData[] => {
  if (!folderSearchQuery.value.trim()) {
    return treeData.value
  }
  return filterTreeNodes(treeData.value, folderSearchQuery.value.trim())
})

const expandedKeys = computed(() => folderExpandedKeys.value)
const selectionKeys = computed(() => folderSelectionKeys.value)

// 将FolderItem转换为TreeNodeData，并构建ID映射
function convertFoldersToTreeNodes(folders: FolderItem[], parentId: string | null = null): TreeNodeData[] {
  return folders.map(folder => {
    const nodeData = {
      key: folder.id,
      label: folder.label,
      data: {
        ...folder,
        parentId: parentId,
        nodeType: props.treeType || 'folder'
      },
      children: folder.children ? convertFoldersToTreeNodes(folder.children, folder.id) : undefined,
      count: folder.count,
      icon: folder.icon
    }

    // 将节点信息添加到ID映射中
    nodeIdMap.value.set(folder.id, {
      id: folder.id,
      parentId: parentId,
      nodeType: props.treeType || 'folder',
      data: folder
    })

    return nodeData
  })
}

// 过滤树节点
function filterTreeNodes(nodes: TreeNodeData[], query: string): TreeNodeData[] {
  const filtered: TreeNodeData[] = []

  for (const node of nodes) {
    // 支持拼音搜索匹配
    const matchesQuery = node.label ? pinyinMatch(node.label, query) : false
    const filteredChildren = node.children ? filterTreeNodes(node.children, query) : []

    if (matchesQuery || filteredChildren.length > 0) {
      filtered.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children
      })
    }
  }

  return filtered
}

// 搜索切换函数
function toggleFolderSearch() {
  showFolderSearch.value = !showFolderSearch.value
  if (!showFolderSearch.value) {
    folderSearchQuery.value = ''
  }
}

function toggleTagSearch() {
  showTagSearch.value = !showTagSearch.value
  if (!showTagSearch.value) {
    tagSearchQuery.value = ''
  }
}

/**
 * 根据节点key获取节点信息
 */
function getNodeInfo(nodeKey: string) {
  return nodeIdMap.value.get(nodeKey)
}

/**
 * 分析拖拽目标，确定新的父文件夹ID和插入位置
 */
function analyzeDropTarget(dropTarget: HTMLElement, draggedFolderId: string) {
  console.log('Analyzing drop target:', dropTarget)

  // 检查是否拖拽到了拖拽目标区域
  const dragTargetArea = dropTarget.closest('.drag-target-area')
  if (dragTargetArea) {
    const targetType = (dragTargetArea as HTMLElement).dataset?.targetType
    const targetNode = (dragTargetArea as HTMLElement).dataset?.targetNode
    const targetParent = (dragTargetArea as HTMLElement).dataset?.targetParent

    console.log('Dropped on drag target area:', { targetType, targetNode, targetParent })

    // 如果拖拽到目标区域，使用目标的父级作为新父级
    return {
      isValid: true,
      newParentId: targetParent ? parseInt(targetParent) : null,
      insertPosition: targetType, // 'before' 或 'after'
      targetNodeId: targetNode
    }
  }

  // 检查是否拖拽到了节点内容区域（表示要作为子节点）
  const nodeContent = dropTarget.closest('.node-content')
  if (nodeContent) {
    const targetFolderId = (nodeContent as HTMLElement).dataset?.folderId
    const targetNodeType = (nodeContent as HTMLElement).dataset?.nodeType

    console.log('Dropped on node content:', { targetFolderId, targetNodeType })

    // 不能拖拽到标签上，也不能拖拽到自己上
    if (targetNodeType === 'tag' || targetFolderId === draggedFolderId) {
      return { isValid: false }
    }

    // 拖拽到文件夹上，作为子文件夹
    return {
      isValid: true,
      newParentId: targetFolderId ? parseInt(targetFolderId) : null,
      insertPosition: 'child',
      targetNodeId: targetFolderId
    }
  }

  // 检查是否拖拽到了tree-drag-area（需要向上查找父级）
  const treeDragArea = dropTarget.closest('.tree-drag-area')
  if (treeDragArea) {
    console.log('Dropped on tree-drag-area, searching for parent folder')

    // 向上遍历DOM，查找包含data-folder-id的父元素
    let currentElement = treeDragArea.parentElement
    while (currentElement && !currentElement.classList.contains('folder-tree-container')) {
      const nodeContent = currentElement.querySelector('.node-content')
      if (nodeContent) {
        const parentFolderId = (nodeContent as HTMLElement).dataset?.folderId
        const parentNodeType = (nodeContent as HTMLElement).dataset?.nodeType

        console.log('Found parent through tree-drag-area traversal:', { parentFolderId, parentNodeType })

        if (parentNodeType !== 'tag' && parentFolderId !== draggedFolderId) {
          return {
            isValid: true,
            newParentId: parentFolderId ? parseInt(parentFolderId) : null,
            insertPosition: 'child',
            targetNodeId: parentFolderId
          }
        }
      }
      currentElement = currentElement.parentElement
    }

    // 如果没有找到父级，则移动到根级别
    console.log('No parent found in tree-drag-area, moving to root level')
    return {
      isValid: true,
      newParentId: null,
      insertPosition: 'root',
      targetNodeId: null
    }
  }

  // 检查是否拖拽到了容器区域（表示要移动到根级别）
  const treeContainer = dropTarget.closest('.folder-tree-container')
  if (treeContainer) {
    console.log('Dropped on tree container - moving to root level')
    return {
      isValid: true,
      newParentId: null,
      insertPosition: 'root',
      targetNodeId: null
    }
  }

  // 向上遍历DOM，查找包含data-folder-id的父元素
  let currentElement = dropTarget.parentElement
  while (currentElement) {
    const nodeContent = currentElement.querySelector('.node-content')
    if (nodeContent) {
      const parentFolderId = (nodeContent as HTMLElement).dataset?.folderId
      const parentNodeType = (nodeContent as HTMLElement).dataset?.nodeType

      console.log('Found parent through general traversal:', { parentFolderId, parentNodeType })

      if (parentNodeType !== 'tag' && parentFolderId !== draggedFolderId) {
        return {
          isValid: true,
          newParentId: parentFolderId ? parseInt(parentFolderId) : null,
          insertPosition: 'child',
          targetNodeId: parentFolderId
        }
      }
    }
    currentElement = currentElement.parentElement
  }

  console.log('No valid drop target found')
  return { isValid: false }
}



/**
 * 设置拖拽事件监听器，提供视觉反馈
 */
function setupDragEventListeners() {
  const container = document.querySelector('.folder-tree-container')
  if (!container) return

  // 拖拽开始
  container.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement
    const nodeContent = target.closest('.node-content')
    if (nodeContent) {
      nodeContent.classList.add('dragging')
    }
  })

  // 拖拽结束
  container.addEventListener('dragend', (e) => {
    const target = e.target as HTMLElement
    const nodeContent = target.closest('.node-content')
    if (nodeContent) {
      nodeContent.classList.remove('dragging')
    }

    // 清除所有拖拽目标区域的高亮
    container.querySelectorAll('.drag-target-area.drag-over').forEach(el => {
      el.classList.remove('drag-over')
    })
  })

  // 拖拽进入目标区域
  container.addEventListener('dragenter', (e) => {
    e.preventDefault()
    const target = e.target as HTMLElement
    const dragTargetArea = target.closest('.drag-target-area')
    if (dragTargetArea) {
      dragTargetArea.classList.add('drag-over')
    }
  })

  // 拖拽离开目标区域
  container.addEventListener('dragleave', (e) => {
    const target = e.target as HTMLElement
    const dragTargetArea = target.closest('.drag-target-area')
    if (dragTargetArea) {
      // 检查是否真的离开了目标区域（而不是进入子元素）
      const rect = dragTargetArea.getBoundingClientRect()
      const x = (e as DragEvent).clientX
      const y = (e as DragEvent).clientY

      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        dragTargetArea.classList.remove('drag-over')
      }
    }
  })

  // 拖拽悬停
  container.addEventListener('dragover', (e) => {
    e.preventDefault()
  })
}

// Store
const libraryStore = useLibraryStore()

// 当前操作的上下文类型
type ContextType = 'folder' | 'tag'

// 通用右键菜单配置函数
function createContextMenuItems(type: ContextType): MenuItem[] {
  const isFolder = type === 'folder'
  const currentItem = isFolder ? currentContextFolder.value : currentContextTag.value
  const itemLabel = isFolder ? '文件夹' : '标签'
  const subItemLabel = isFolder ? '子文件夹' : '子标签'

  const menuItems: MenuItem[] = [
    {
      label: `添加${itemLabel}`,
      icon: 'add',
      command: () => handleItemOperation('add', type)
    },
    {
      label: `添加${subItemLabel}`,
      icon: isFolder ? 'create_new_folder' : 'label',
      command: () => handleItemOperation('addSub', type),
      disabled: !currentItem
    },
    { separator: true },
    {
      label: '编辑',
      icon: 'edit',
      command: () => handleItemOperation('edit', type),
      disabled: !currentItem
    },
    {
      label: '移动',
      icon: 'drive_file_move',
      command: () => handleItemOperation('move', type),
      disabled: !currentItem
    },
    {
      label: '克隆',
      icon: 'content_copy',
      command: () => handleItemOperation('clone', type),
      disabled: !currentItem
    },
    { separator: true },
    {
      label: '删除',
      icon: 'delete',
      command: () => handleItemOperation('delete', type),
      disabled: !currentItem,
      class: 'text-red-600'
    }
  ]

  return menuItems
}

// 右键菜单配置
const folderContextMenuItems = computed((): MenuItem[] => createContextMenuItems('folder'))
const tagContextMenuItems = computed((): MenuItem[] => createContextMenuItems('tag'))

// 用户文件夹树节点
const userTreeNodes = computed<TreeNodeData[]>(() => {
  if (!props.folders || props.folders.length === 0) {
    return []
  }

  // HomeController 已经构建了完整的树结构，直接转换即可
  return props.folders.map(convertFolderItemToTreeNode)
})

// 标签树节点
const tagTreeNodes = computed<TreeNodeData[]>(() => {
  if (!props.tags) return []

  return props.tags.map(tag => {
    const tagKey = `tag-${tag.id}`
    const nodeData = {
      key: tagKey,
      label: tag.name || tag.title || tag.label,
      icon: 'label',
      iconColor: 'text-green-500',
      count: tag.fileCount || tag.count,
      leaf: true,
      selectable: true,
      data: {
        ...tag,
        nodeType: 'tag'
      }
    }

    // 将标签信息添加到ID映射中
    nodeIdMap.value.set(tagKey, {
      id: tagKey,
      parentId: null,
      nodeType: 'tag',
      data: tag
    })

    return nodeData
  })
})

// 过滤后的标签树节点
const filteredTagTreeNodes = computed<TreeNodeData[]>(() => {
  if (!tagSearchQuery.value.trim()) {
    return tagTreeNodes.value
  }
  return filterTreeNodes(tagTreeNodes.value, tagSearchQuery.value.trim())
})

// 转换单个 FolderItem 到 TreeNodeData
function convertFolderItemToTreeNode(item: FolderItem): TreeNodeData {
  // 从item中提取原始的文件夹数据（如果存在）
  const originalData = (item as any).originalData || {
    id: parseInt(item.id),
    title: item.label,
    parent_id: null,
    color: null,
    icon: null
  }

  return {
    key: item.id,
    label: item.label,
    icon: item.icon || 'folder',
    count: item.count,
    leaf: !item.children || item.children.length === 0,
    children: item.children ? item.children.map(convertFolderItemToTreeNode) : undefined,
    selectable: true,
    data: originalData // 传递原始的后端数据结构
  }
}

// 事件处理
function handleBaseCategoryClick(category: any) {
  // 清空并隐藏搜索框
  folderSearchQuery.value = ''
  showFolderSearch.value = false

  // 构造 FolderItem 兼容的对象
  const folderItem: FolderItem = {
    id: category.id,
    label: category.label,
    icon: category.icon || 'folder',
    iconColor: category.iconColor,
    count: category.count,
    active: true
  }

  emit('folder-select', folderItem)
}

function handleFolderSelection(selectionKeys: Record<string, boolean>) {
  folderSelectionKeys.value = selectionKeys
  
  // 清除标签选择
  tagSelectionKeys.value = {}
}

function handleTagSelection(selectionKeys: Record<string, boolean>) {
  tagSelectionKeys.value = selectionKeys
  // 不再清除文件夹选择，允许同时选中文件夹和标签
}


function handleNodeSelect(node: TreeNodeData) {
  if (!node) return

  // 清空并隐藏搜索框
  folderSearchQuery.value = ''
  showFolderSearch.value = false
  tagSearchQuery.value = ''
  showTagSearch.value = false

  // 检查是否是标签节点
  if (node.key?.startsWith('tag-')) {
    emit('tag-select', node.data)
    return
  }

  // 构造 FolderItem 兼容的对象
  const folderItem: FolderItem = {
    id: node.key || '',
    label: node.label || '',
    icon: node.icon || 'folder',
    iconColor: node.iconColor,
    count: node.count,
    active: true,
    ...node.data
  }

  emit('folder-select', folderItem)
}

function handleNodeExpand(node: TreeNodeData) {
  if (node?.data) {
    emit('folder-expand', node.data, true)
  }
}

function handleNodeCollapse(node: TreeNodeData) {
  if (node?.data) {
    emit('folder-expand', node.data, false)
  }
}

function handleNodeContextMenu(node: TreeNodeData, event: MouseEvent) {
  if (!node?.data) return
  currentContextFolder.value = node.data as FolderItem
}

function handleTagContextMenu(node: TreeNodeData, event: MouseEvent) {
  if (!node?.data) return
  currentContextTag.value = node.data
}

function updateExpandedKeys(keys: Record<string, boolean>) {
  folderExpandedKeys.value = keys
}

function updateSelectionKeys(keys: Record<string, boolean>) {
  folderSelectionKeys.value = keys
}

async function onTreeDataUpdate(newData: TreeNodeData[]) {
  console.log('Tree data updated:', newData)
  // 更新本地状态
  emit('refresh-folders')
}

async function onTagTreeDataUpdate(newData: TreeNodeData[]) {
  console.log('Tag tree data updated:', newData)
  // 更新本地状态
  emit('refresh-tags')
}

async function onDragEnd(event: any) {
  console.log('Drag end event:', event)

  if (!libraryStore.currentLibrary) return

  try {
    // 从DOM元素中获取节点信息（TreeNode现在自动设置了数据属性）
    let draggedFolderId: string | null = null
    let nodeInfo: any = null

    if (event.item) {
      // TreeNode的根div现在有data-folder-id属性
      const draggedElement = event.item
      draggedFolderId = draggedElement.dataset?.folderId || draggedElement.getAttribute?.('data-folder-id')

      if (draggedFolderId) {
        nodeInfo = getNodeInfo(draggedFolderId)
        console.log('Got folder ID from TreeNode data attributes:', {
          draggedFolderId,
          nodeInfo,
          element: draggedElement
        })
      }
    }

    if (!draggedFolderId || !nodeInfo) {
      console.warn('No folder ID or node info found for dragged element')
      console.log('Available node IDs:', Array.from(nodeIdMap.value.keys()))
      console.log('Event item:', event.item)
      console.log('Event item dataset:', event.item?.dataset)
      return
    }

    // 只处理文件夹拖拽，标签拖拽暂不支持移动
    if (nodeInfo.nodeType === 'tag') {
      console.log('Tag dragging not supported for moving')
      return
    }

    const dropTarget = event.to

    // 分析拖拽目标
    const dropInfo = analyzeDropTarget(dropTarget, draggedFolderId)
    console.log('Drop target analysis:', dropInfo)

    if (!dropInfo.isValid) {
      console.warn('Invalid drop target')
      return
    }

    // 验证移动是否有意义
    const currentParentId = nodeInfo.parentId
    const currentParentIdNum = currentParentId ? parseInt(currentParentId) : null

    console.log('Move validation:', {
      currentParentId: currentParentIdNum,
      newParentId: dropInfo.newParentId,
      draggedFolderId
    })

    // 如果新父级和当前父级相同，则不需要移动
    if (currentParentIdNum === dropInfo.newParentId) {
      console.log('Folder is already in the target location, no move needed')
      return
    }

    // 防止将文件夹移动到自己或自己的子文件夹中
    if (dropInfo.newParentId && dropInfo.newParentId.toString() === draggedFolderId) {
      console.warn('Cannot move folder into itself')
      return
    }

    // 调用SDK移动文件夹
    const libraryId = libraryStore.currentLibrary.id
    const newParentId = dropInfo.newParentId ?? null
    await miraSDKService.moveFolder(libraryId, parseInt(draggedFolderId), newParentId)

    // 等待一小段时间确保服务器端操作完成，然后刷新
    await new Promise(resolve => setTimeout(resolve, 100))
    emit('refresh-folders')
    console.log('Folder moved successfully via drag and drop')
  } catch (error) {
    console.error('Failed to move folder via drag and drop:', error)
    // 如果移动失败，刷新以恢复原始状态
    emit('refresh-folders')
  }
}

async function onTagDragEnd(event: any) {
  console.log('Tag drag end event:', event)

  if (!event.item || !libraryStore.currentLibrary) return

  try {
    const draggedNode = event.item

    // 获取被拖拽的标签节点信息 - 改进查找逻辑
    let draggedElement = draggedNode.querySelector('.node-content')

    // 如果在draggedNode中找不到.node-content，尝试其他方法
    if (!draggedElement) {
      // 检查draggedNode本身是否是.node-content
      if (draggedNode.classList?.contains('node-content')) {
        draggedElement = draggedNode
      } else {
        // 向上查找包含.node-content的父元素
        draggedElement = draggedNode.closest('.node-content')
      }
    }

    // 如果还是找不到，尝试查找任何包含data-folder-id的元素
    if (!draggedElement) {
      draggedElement = draggedNode.querySelector('[data-folder-id]') ||
                      draggedNode.closest('[data-folder-id]') ||
                      draggedNode
    }

    const draggedTagId = draggedElement.dataset?.folderId || draggedElement.getAttribute?.('data-folder-id')
    const nodeType = draggedElement.dataset?.nodeType || draggedElement.getAttribute?.('data-node-type')

    console.log('Dragged tag info:', { draggedTagId, nodeType, draggedElement })

    if (!draggedTagId || nodeType !== 'tag') {
      console.warn('No tag ID found or not a tag element')
      return
    }

    // 分析拖拽目标
    const dropTarget = event.to
    const dropInfo = analyzeDropTarget(dropTarget, draggedTagId)
    console.log('Tag drop target analysis:', dropInfo)

    // 标签拖拽暂时只记录日志，可以根据需要实现标签排序功能
    console.log('Tag drag completed, tag ID:', draggedTagId, 'Drop info:', dropInfo)

    // 刷新标签列表
    emit('refresh-tags')
  } catch (error) {
    console.error('Failed to handle tag drag and drop:', error)
    emit('refresh-tags')
  }
}

// 通用操作方法
type OperationType = 'add' | 'addSub' | 'edit' | 'move' | 'clone' | 'delete'

// 通用操作调度器
async function handleItemOperation(operation: OperationType, type: ContextType) {
  const currentItem = type === 'folder' ? currentContextFolder.value : currentContextTag.value

  switch (operation) {
    case 'add':
      handleAdd(type)
      break
    case 'addSub':
      handleAddSub(type, currentItem)
      break
    case 'edit':
      handleEdit(type, currentItem)
      break
    case 'move':
      handleMove(type, currentItem)
      break
    case 'clone':
      await handleClone(type, currentItem)
      break
    case 'delete':
      await handleDelete(type, currentItem)
      break
  }
}

// 添加项目
function handleAdd(type: ContextType) {
  editingItem.value = null
  editingParentItem.value = null
  editingItemType.value = type
  showEditDialog.value = true
}

// 添加子项目
function handleAddSub(type: ContextType, currentItem: any) {
  if (!currentItem) return

  editingItem.value = null
  editingItemType.value = type

  if (type === 'folder') {
    const parentFolderData = currentItem as FolderItem
    editingParentItem.value = {
      ...parentFolderData,
      id: parentFolderData.id,
      label: parentFolderData.label,
      title: parentFolderData.label,
      parent_id: (parentFolderData as any).data?.parent_id
    } as any
  } else {
    editingParentItem.value = {
      ...currentItem,
      type: 'tag'
    }
  }

  showEditDialog.value = true
}

// 编辑项目
function handleEdit(type: ContextType, currentItem: any) {
  if (!currentItem) return

  editingItem.value = currentItem
  editingParentItem.value = null
  editingItemType.value = type
  showEditDialog.value = true
}

// 移动项目
function handleMove(type: ContextType, currentItem: any) {
  if (!currentItem) return

  movingItem.value = currentItem
  movingItemType.value = type
  showMoveDialog.value = true
}

// 克隆项目
async function handleClone(type: ContextType, currentItem: any) {
  if (!currentItem || !libraryStore.currentLibrary) return

  try {
    const libraryId = libraryStore.currentLibrary.id

    if (type === 'folder') {
      const folder = currentItem as FolderItem
      const folderData = (folder as any).data || folder
      const parentId = folderData.parent_id

      const result = await miraSDKService.cloneFolder(
        libraryId,
        parseInt(folder.id),
        `${folder.label} (副本)`,
        parentId
      )

      if (result) {
        emit('folder-clone', folder)
        await new Promise(resolve => setTimeout(resolve, 100))
        emit('refresh-folders')
        console.log('Folder cloned successfully with parent:', parentId)
      }
    } else {
      const tag = currentItem
      const result = await miraSDKService.createTag(
        libraryId,
        `${tag.name || tag.title || tag.label} (副本)`,
        tag.color,
        tag.description
      )

      if (result) {
        emit('tag-clone', tag)
        await new Promise(resolve => setTimeout(resolve, 100))
        emit('refresh-tags')
        console.log('Tag cloned successfully')
      }
    }
  } catch (error) {
    console.error(`Failed to clone ${type}:`, error)
    if (type === 'folder') {
      emit('refresh-folders')
    } else {
      emit('refresh-tags')
    }
  }
}

// 删除项目 - 打开确认对话框
function handleDelete(type: ContextType, currentItem: any) {
  if (!currentItem || !libraryStore.currentLibrary) return
  deletingType.value = type
  deletingItem.value = currentItem
  deleteWithFiles.value = false
  showDeleteDialog.value = true
}

// 确认删除
async function confirmDelete() {
  const type = deletingType.value
  const currentItem = deletingItem.value
  if (!currentItem || !libraryStore.currentLibrary) return

  showDeleteDialog.value = false

  try {
    const libraryId = libraryStore.currentLibrary.id

    if (type === 'folder') {
      await miraSDKService.deleteFolder(libraryId, parseInt((currentItem as FolderItem).id), deleteWithFiles.value)
      emit('folder-delete', currentItem)
      await new Promise(resolve => setTimeout(resolve, 100))
      emit('refresh-folders')
    } else {
      await miraSDKService.deleteTag(libraryId, currentItem.id)
      emit('tag-delete', currentItem)
      await new Promise(resolve => setTimeout(resolve, 100))
      emit('refresh-tags')
    }
  } catch (error) {
    console.error(`Failed to delete ${type}:`, error)
    if (type === 'folder') {
      emit('refresh-folders')
    } else {
      emit('refresh-tags')
    }
  }
}


// 对话框事件处理

// 关闭编辑对话框
function handleEditDialogClose() {
  showEditDialog.value = false
  editingItem.value = null
  editingParentItem.value = null
  editingItemType.value = 'folder'
}

// 关闭移动对话框
function handleMoveDialogClose() {
  showMoveDialog.value = false
  movingItem.value = null
  movingItemType.value = 'folder'
}

// 处理项目移动
async function handleItemMove(data: { folderId: string; newParentId?: number }) {
  if (!libraryStore.currentLibrary || !movingItem.value) return

  try {
    const libraryId = libraryStore.currentLibrary.id
    const itemType = movingItemType.value

    if (itemType === 'folder') {
      await miraSDKService.moveFolder(libraryId, parseInt(data.folderId), data.newParentId || null)
      emit('folder-move', movingItem.value)
      await new Promise(resolve => setTimeout(resolve, 100))
      emit('refresh-folders')
      console.log('Folder moved successfully')
    } else {
      // 标签移动逻辑（如果需要）
      emit('tag-move', movingItem.value)
      await new Promise(resolve => setTimeout(resolve, 100))
      emit('refresh-tags')
      console.log('Tag moved successfully')
    }

    handleMoveDialogClose()
  } catch (error) {
    console.error(`Failed to move ${movingItemType.value}:`, error)
    if (movingItemType.value === 'folder') {
      emit('refresh-folders')
    } else {
      emit('refresh-tags')
    }
  }
}

// 保存项目
async function handleItemSave(data: {
  title: string
  parentId?: number
  color?: number
  description?: string
}) {
  if (!libraryStore.currentLibrary) return

  try {
    const libraryId = libraryStore.currentLibrary.id
    const itemType = editingItemType.value

    if (editingItem.value) {
      // 更新现有项目
      if (itemType === 'folder') {
        await miraSDKService.updateFolder(libraryId, parseInt(editingItem.value.id), {
          title: data.title,
          parent_id: data.parentId,
          color: data.color,
          description: data.description
        })
        emit('folder-edit', editingItem.value)
        await new Promise(resolve => setTimeout(resolve, 100))
        emit('refresh-folders')
        console.log('Folder updated successfully')
      } else {
        await miraSDKService.updateTag(libraryId, editingItem.value.id, {
          name: data.title,
          color: data.color,
          description: data.description
        })
        emit('tag-edit', editingItem.value)
        await new Promise(resolve => setTimeout(resolve, 100))
        emit('refresh-tags')
        console.log('Tag updated successfully')
      }
    } else {
      // 创建新项目
      if (itemType === 'folder') {
        const result = await miraSDKService.createFolder(
          libraryId,
          data.title,
          data.parentId,
          data.color,
          data.description
        )

        if (editingParentItem.value) {
          emit('folder-add', editingParentItem.value)
        } else {
          emit('folder-add')
        }

        await new Promise(resolve => setTimeout(resolve, 100))
        emit('refresh-folders')
        console.log('Folder created successfully:', result)
      } else {
        const result = await miraSDKService.createTag(
          libraryId,
          data.title,
          data.color,
          data.description
        )

        if (editingParentItem.value) {
          emit('tag-add', editingParentItem.value)
        } else {
          emit('tag-add')
        }

        await new Promise(resolve => setTimeout(resolve, 100))
        emit('refresh-tags')
        console.log('Tag created successfully:', result)
      }
    }

    handleEditDialogClose()
  } catch (error) {
    console.error(`Failed to save ${itemType}:`, error)
    if (itemType === 'folder') {
      emit('refresh-folders')
    } else {
      emit('refresh-tags')
    }
  }
}


// 事件监听器
let folderRefreshListener: ((event: CustomEvent) => void) | null = null
let tagRefreshListener: ((event: CustomEvent) => void) | null = null

// 组件挂载时设置事件监听
onMounted(() => {
  // 监听文件夹刷新事件
  folderRefreshListener = (event: CustomEvent) => {
    console.log('Received folder refresh event:', event.detail)
    emit('refresh-folders')
  }
  window.addEventListener('refresh-folders', folderRefreshListener as EventListener)

  // 监听标签刷新事件
  tagRefreshListener = (event: CustomEvent) => {
    console.log('Received tag refresh event:', event.detail)
    emit('refresh-tags')
  }
  window.addEventListener('refresh-tags', tagRefreshListener as EventListener)

  // 设置拖拽事件监听器
  setupDragEventListeners()
})

// 组件卸载时清理事件监听
onUnmounted(() => {
  if (folderRefreshListener) {
    window.removeEventListener('refresh-folders', folderRefreshListener as EventListener)
  }
  if (tagRefreshListener) {
    window.removeEventListener('refresh-tags', tagRefreshListener as EventListener)
  }
})

// 监听选择变化，更新 active 状态
watch(() => props.selectedFolder, (newSelected) => {
  if (newSelected) {
    // 清除文件夹选择
    folderSelectionKeys.value = {}

    // 检查是否是基础分类
    const baseCategory = props.baseCategoriesConfig.find(c => c.id === newSelected)
    if (baseCategory) {
      // 基础分类不需要在树中设置选择状态，因为它们使用传统的 active 样式
      return
    }

    // 检查是否是文件夹
    const folder = props.folders?.find(f => f.id === newSelected)
    if (folder) {
      folderSelectionKeys.value = { [newSelected]: true }
    }
  } else {
    // 清空选中
    folderSelectionKeys.value = {}
  }
}, { immediate: true })

// 监听标签选中变化
watch(() => props.selectedTags, (newSelectedTags) => {
  if (newSelectedTags && newSelectedTags.length > 0) {
    // 设置标签选中状态，key 需要与 tagTreeNodes 中的 key 格式一致
    const keys: Record<string, boolean> = {}
    newSelectedTags.forEach(tagId => {
      keys[`tag-${tagId}`] = true
    })
    tagSelectionKeys.value = keys
  } else {
    // 清空标签选中
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
