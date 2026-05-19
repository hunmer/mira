<template>
  <div v-if="visible" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="bg-black bg-opacity-50 absolute inset-0" @click="handleCancel"></div>
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md relative">
      <!-- 对话框头部 -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-800">
          移动文件夹
        </h2>
        <button 
          @click="handleCancel"
          class="text-gray-500 hover:text-gray-800"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <!-- 对话框内容 -->
      <div class="px-6 py-4">
        <div v-if="folder" class="mb-4 p-3 bg-gray-50 rounded-md">
          <div class="flex items-center space-x-2">
            <span class="material-icons text-gray-600">folder</span>
            <span class="font-medium text-gray-800">{{ folder.label }}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">选择新的父文件夹位置</p>
        </div>

        <!-- 父文件夹选择 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            移动到
          </label>
          
          <!-- 根文件夹选项 -->
          <div class="mb-3">
            <label class="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                :value="undefined"
                v-model="selectedParentId"
                class="text-blue-600"
              />
              <span class="material-icons text-gray-500">home</span>
              <span>根目录</span>
            </label>
          </div>

          <!-- 文件夹树 -->
          <div class="border rounded-md max-h-64 overflow-y-auto">
            <Tree
              :value="folderTreeNodes"
              selectionMode="single"
              :selectionKeys="selectionKeys"
              @update:selectionKeys="handleSelectionChange"
              class="p-2"
            >
              <template #default="slotProps">
                <div class="flex items-center space-x-2 w-full">
                  <span class="material-icons text-gray-500 text-sm">folder</span>
                  <span class="flex-1 text-sm">{{ (slotProps as any).node.label }}</span>
                </div>
              </template>
            </Tree>
          </div>
          
          <p class="text-xs text-gray-500 mt-2">
            选择文件夹作为新的父目录，或选择根目录将文件夹移动到顶层
          </p>
        </div>

        <!-- 错误信息 -->
        <div v-if="error" class="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-red-600 text-sm">{{ error }}</p>
        </div>
      </div>

      <!-- 对话框底部 -->
      <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          type="button"
          @click="handleCancel"
          class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          :disabled="isLoading"
        >
          取消
        </button>
        <button
          type="button"
          @click="handleMove"
          class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center space-x-2"
          :disabled="isLoading"
        >
          <svg v-if="isLoading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ isLoading ? '移动中...' : '移动' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Tree from '@/components/ui/volt/Tree.vue'
import type { TreeNodeData } from '@/components/ui/volt/Tree.vue'
import type { FolderItem } from '../../types/components'

interface Props {
  visible: boolean
  folder?: FolderItem | null // 要移动的文件夹
  availableFolders?: FolderItem[] // 可选的父文件夹列表
}

interface Emits {
  (e: 'close'): void
  (e: 'move', data: {
    folderId: string
    newParentId?: number
  }): void
}

const props = withDefaults(defineProps<Props>(), {
  availableFolders: () => []
})

const emit = defineEmits<Emits>()

// 状态
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedParentId = ref<number | undefined>(undefined)
const selectionKeys = ref<Record<string, boolean>>({})

// 计算属性 - 构建文件夹树节点
const folderTreeNodes = computed((): TreeNodeData[] => {
  if (!props.availableFolders || props.availableFolders.length === 0) {
    return []
  }

  // 过滤掉当前要移动的文件夹及其子文件夹（避免循环引用）
  const filterFolder = (folders: FolderItem[], excludeId: string): FolderItem[] => {
    return folders.filter(folder => {
      if (folder.id === excludeId) return false
      
      // 递归过滤子文件夹
      if (folder.children) {
        folder.children = filterFolder(folder.children, excludeId)
      }
      
      return true
    })
  }

  const filteredFolders = props.folder 
    ? filterFolder([...props.availableFolders], props.folder.id)
    : props.availableFolders

  // 转换为TreeNodeData格式
  const convertToTreeNode = (folder: FolderItem): TreeNodeData => ({
    key: folder.id,
    label: folder.label,
    icon: 'folder',
    data: folder,
    children: folder.children ? folder.children.map(convertToTreeNode) : undefined,
    selectable: true
  })

  return filteredFolders.map(convertToTreeNode)
})

// 方法
const handleSelectionChange = (selection: Record<string, boolean>) => {
  selectionKeys.value = selection
  const selectedKey = Object.keys(selection).find(key => selection[key])
  if (selectedKey) {
    selectedParentId.value = parseInt(selectedKey)
  } else {
    selectedParentId.value = undefined
  }
}

const handleMove = async () => {
  if (!props.folder) return

  isLoading.value = true
  error.value = null

  try {
    emit('move', {
      folderId: props.folder.id,
      newParentId: selectedParentId.value
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '移动失败'
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  resetForm()
  emit('close')
}

const resetForm = () => {
  selectedParentId.value = undefined
  selectionKeys.value = {}
  error.value = null
  isLoading.value = false
}

// 监听对话框显示状态
watch(() => props.visible, (newValue) => {
  if (newValue) {
    resetForm()
  }
})
</script>
