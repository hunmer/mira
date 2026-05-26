<template>
  <div v-if="visible" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="bg-black bg-opacity-50 absolute inset-0" @click="handleCancel"></div>
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md relative">
      <!-- 对话框头部 -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-800">
          {{ props.dialogTitle || (isEdit ? '编辑文件夹' : '创建文件夹') }}
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
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- 文件夹名称 -->
          <div>
            <label for="folderTitle" class="block text-sm font-medium text-gray-700 mb-1">
              {{ itemTypeText }}名称 <span class="text-red-500">*</span>
            </label>
            <Input
              id="folderTitle"
              v-model="formData.title"
              :placeholder="`请输入${itemTypeText}名称`"
              class="w-full"
              :class="{ 'border-red-500': errors.title }"
              @input="clearError('title')"
            />
            <p v-if="errors.title" class="text-red-500 text-sm mt-1">{{ errors.title }}</p>
          </div>

          
          <!-- 文件夹描述 -->
          <div>
            <label for="folderDescription" class="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea
              id="folderDescription"
              v-model="formData.description"
              :placeholder="`请输入${itemTypeText}描述（可选）`"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            ></textarea>
          </div>

          <!-- 父文件夹 -->
          <div>
            <!-- 根文件夹选项 -->
            <label class="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer mb-3">
              <input
                type="radio"
                :value="undefined"
                v-model="formData.parentId"
                @change="parentSelectionKeys = {}"
                class="text-blue-600"
              />
              <span class="material-icons text-gray-500">
                {{ props.itemType === 'tag' ? 'label' : 'home' }}
              </span>
              <span>{{ props.itemType === 'tag' ? '根标签' : '根目录' }}</span>
            </label>

            <!-- 文件夹树 -->
            <TreeSection
              :title="parentTypeText"
              :show-search="false"
              :search-query="''"
              :search-placeholder="''"
              :tree-data="parentFolderTreeNodes"
              :context-menu-items="[]"
              :empty-icon="props.itemType === 'tag' ? 'label' : 'folder_open'"
              :empty-text="`没有可选的${parentTypeText}`"
              :empty-hint="`选择${props.itemType === 'tag' ? '根标签' : '根目录'}创建顶层${itemTypeText}`"
              selectionMode="single"
              :selectionKeys="parentSelectionKeys"
              :expandedKeys="parentExpandedKeys"
              @update:selectionKeys="handleParentSelectionChange"
              @update:expandedKeys="parentExpandedKeys = $event"
            >
              <template #node="slotProps">
                <div class="flex items-center">
                  <span class="material-icons mr-2 text-lg" :style="{ color: getNodeColor(slotProps.node) }">
                    {{ slotProps.node.icon || (props.itemType === 'tag' ? 'label' : 'folder') }}
                  </span>
                  <span class="flex-1">{{ slotProps.node.label || '' }}</span>
                </div>
              </template>
            </TreeSection>

            <p class="text-gray-500 text-xs mt-2">
              选择{{ parentTypeText }}，或选择{{ props.itemType === 'tag' ? '根标签' : '根目录' }}创建顶层{{ itemTypeText }}
            </p>
          </div>

          <!-- 文件夹颜色 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ itemTypeText }}颜色
            </label>
            <div class="flex space-x-2">
              <button
                v-for="color in colorOptions"
                :key="color.value"
                type="button"
                @click="formData.color = color.value"
                class="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                :class="[
                  color.class,
                  formData.color === color.value ? 'border-gray-800' : 'border-gray-300'
                ]"
              >
                <span v-if="formData.color === color.value" class="material-icons text-white text-sm">check</span>
              </button>
            </div>
          </div>


          <!-- 错误信息 -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-3">
            <p class="text-red-600 text-sm">{{ error }}</p>
          </div>
        </form>
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
          @click="handleSubmit"
          class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center space-x-2"
          :disabled="isLoading || !formData.title?.trim()"
        >
          <svg v-if="isLoading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ isLoading ? '保存中...' : (isEdit ? '更新' : '创建') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Input } from '@/components/ui/input'
import TreeSection from './FolderTreeComponent/TreeSection.vue'
import type { TreeNodeData } from '@/components/ui/volt/Tree.vue'
import type { FolderItem } from '../../types/components'

interface Props {
  visible: boolean
  folder?: FolderItem | null // 编辑时传入文件夹数据
  parentFolder?: FolderItem | null // 创建子文件夹时传入父文件夹
  availableFolders?: FolderItem[] // 可选的父文件夹列表
  itemType?: 'folder' | 'tag' // 项目类型
  dialogTitle?: string // 动态标题
}

interface Emits {
  (e: 'close'): void
  (e: 'save', data: {
    title: string
    parentId?: number
    color?: number
    description?: string
  }): void
}

const props = withDefaults(defineProps<Props>(), {
  availableFolders: () => []
})

const emit = defineEmits<Emits>()

// 状态
const isLoading = ref(false)
const error = ref<string | null>(null)

// 表单数据
const formData = ref({
  title: '',
  parentId: undefined as number | undefined,
  color: null as number | null, // 默认无颜色
  description: ''
})

// 表单验证错误
const errors = ref({
  title: ''
})

// 父文件夹选择相关
const parentSelectionKeys = ref<Record<string, boolean>>({})
const parentExpandedKeys = ref<Record<string, boolean>>({})

// 计算属性
const isEdit = computed(() => !!props.folder)

// 项目类型相关的文本
const itemTypeText = computed(() => {
  return props.itemType === 'tag' ? '标签' : '文件夹'
})

const parentTypeText = computed(() => {
  return props.itemType === 'tag' ? '父标签' : '父文件夹'
})

// 颜色选项 - 使用实际的颜色整数值（16进制转10进制）
const colorOptions = [
  { value: null, class: 'bg-gray-200 border-2 border-dashed border-gray-400', label: '无颜色' },
  { value: 0x3B82F6, class: 'bg-blue-500', label: '蓝色' },    // #3B82F6
  { value: 0x10B981, class: 'bg-green-500', label: '绿色' },   // #10B981
  { value: 0xF59E0B, class: 'bg-yellow-500', label: '黄色' },  // #F59E0B
  { value: 0xEF4444, class: 'bg-red-500', label: '红色' },    // #EF4444
  { value: 0x8B5CF6, class: 'bg-purple-500', label: '紫色' },  // #8B5CF6
  { value: 0xEC4899, class: 'bg-pink-500', label: '粉色' },   // #EC4899
  { value: 0x6366F1, class: 'bg-indigo-500', label: '靛蓝' }, // #6366F1
  { value: 0x6B7280, class: 'bg-gray-500', label: '灰色' }    // #6B7280
]

const getNodeColor = (node: any): string => {
  const color = node?.data?.originalData?.color ?? node?.data?.color
  if (!color || typeof color !== 'number' || color <= 0) return '#6B7280'
  return `#${color.toString(16).padStart(6, '0')}`
}

// 父文件夹树节点
const parentFolderTreeNodes = computed((): TreeNodeData[] => {
  if (!props.availableFolders || props.availableFolders.length === 0) {
    return []
  }

  // 过滤掉当前编辑的文件夹及其子文件夹（避免循环引用）
  const filterFolder = (folders: FolderItem[], excludeId?: string): FolderItem[] => {
    return folders.filter(folder => {
      if (excludeId && folder.id === excludeId) return false

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
const clearError = (field: keyof typeof errors.value) => {
  errors.value[field] = ''
  error.value = null
}

// 处理父文件夹选择变化
const handleParentSelectionChange = (selection: Record<string, boolean>) => {
  parentSelectionKeys.value = selection
  const selectedKey = Object.keys(selection).find(key => selection[key])
  if (selectedKey) {
    formData.value.parentId = parseInt(selectedKey)
  } else {
    formData.value.parentId = undefined
  }
}

const validateForm = () => {
  errors.value.title = ''
  error.value = null

  if (!formData.value.title?.trim()) {
    const itemText = props.itemType === 'tag' ? '标签' : '文件夹'
    errors.value.title = `请输入${itemText}名称`
    return false
  }

  if (formData.value.title.trim().length > 100) {
    const itemText = props.itemType === 'tag' ? '标签' : '文件夹'
    errors.value.title = `${itemText}名称不能超过100个字符`
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isLoading.value = true
  error.value = null

  try {
    const saveData: any = {
      title: formData.value.title?.trim() || '',
      parentId: formData.value.parentId,
      description: formData.value.description?.trim() || undefined
    }

    // 只有当颜色不为null时才传递color字段
    if (formData.value.color !== null) {
      saveData.color = formData.value.color
    }

    emit('save', saveData)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  resetForm()
  emit('close')
}

const resetForm = () => {
  formData.value = {
    title: '',
    parentId: undefined,
    color: null, // 默认无颜色
    description: ''
  }

  errors.value = {
    title: ''
  }

  parentSelectionKeys.value = {}
  error.value = null
  isLoading.value = false
}

// 监听对话框显示状态
watch(() => props.visible, (newValue) => {
  if (newValue) {
    // 重置表单
    resetForm()
    
    // 如果是编辑模式，填充现有数据
    if (props.folder) {
      // 从data属性中获取实际的文件夹数据，或者使用label作为title
      const folderData = (props.folder as any).data || props.folder
      formData.value = {
        title: folderData.title || props.folder.label || '',
        parentId: folderData.parent_id || undefined,
        color: folderData.color || 1,
        description: folderData.description || ''
      }

      // 同步Tree选择状态
      if (formData.value.parentId) {
        parentSelectionKeys.value = { [formData.value.parentId.toString()]: true }
      }
    }

    // 如果指定了父文件夹，设置默认父文件夹
    if (props.parentFolder) {
      const parentId = parseInt(props.parentFolder.id)
      formData.value.parentId = parentId
      parentSelectionKeys.value = { [parentId.toString()]: true }
    }
  }
})
</script>

<style scoped>
.bg-opacity-50 {
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
