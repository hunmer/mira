<template>
  <div v-if="visible" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="bg-black bg-opacity-50 absolute inset-0" @click="handleCancel"></div>
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md relative">
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-800">
          {{ props.dialogTitle || (isEdit ? '编辑文件夹' : '创建文件夹') }}
        </h2>
        <button @click="handleCancel" class="text-gray-500 hover:text-gray-800">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="px-6 py-4">
        <form @submit.prevent="handleSubmit" class="space-y-4">
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

          <div>
            <label for="folderDescription" class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              id="folderDescription"
              v-model="formData.description"
              :placeholder="`请输入${itemTypeText}描述（可选）`"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            ></textarea>
          </div>

          <div>
            <label class="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer mb-3">
              <input type="radio" :value="undefined" v-model="formData.parentId" @change="selectedParentId = null" class="text-blue-600" />
              <span class="material-icons text-gray-500">{{ props.itemType === 'tag' ? 'label' : 'home' }}</span>
              <span>{{ props.itemType === 'tag' ? '根标签' : '根目录' }}</span>
            </label>

            <div v-if="parentNodes.length > 0" class="border rounded-md max-h-48 overflow-y-auto p-2">
              <BaseTree :data="parentNodes">
                <template #default="{ node, stat }">
                  <div
                    :class="[
                      'flex items-center px-2 py-1 rounded-md cursor-pointer hover:bg-gray-100',
                      selectedParentId === node.id ? 'bg-blue-100 text-blue-700' : ''
                    ]"
                    @click="selectParent(node)"
                  >
                    <span v-if="stat.children.length" class="material-icons text-base mr-1 text-gray-400" @click.stop="stat.open = !stat.open">
                      {{ stat.open ? 'expand_more' : 'chevron_right' }}
                    </span>
                    <span v-else class="inline-block w-5"></span>
                    <span class="material-icons mr-2 text-lg" :style="{ color: getNodeColor(node) }">
                      {{ props.itemType === 'tag' ? 'label' : 'folder' }}
                    </span>
                    <span class="flex-1 text-sm truncate">{{ node.label }}</span>
                  </div>
                </template>
              </BaseTree>
            </div>
            <div v-else class="text-center py-4 text-gray-400 text-sm">
              没有{{ parentTypeText }}，选择{{ props.itemType === 'tag' ? '根标签' : '根目录' }}创建顶层{{ itemTypeText }}
            </div>

            <p class="text-gray-500 text-xs mt-2">
              选择{{ parentTypeText }}，或选择{{ props.itemType === 'tag' ? '根标签' : '根目录' }}创建顶层{{ itemTypeText }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ itemTypeText }}颜色</label>
            <div class="flex space-x-2">
              <button
                v-for="color in colorOptions"
                :key="String(color.value)"
                type="button"
                @click="formData.color = color.value"
                class="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                :class="[color.class, formData.color === color.value ? 'border-gray-800' : 'border-gray-300']"
              >
                <span v-if="formData.color === color.value" class="material-icons text-white text-sm">check</span>
              </button>
            </div>
          </div>

          <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-3">
            <p class="text-red-600 text-sm">{{ error }}</p>
          </div>
        </form>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button type="button" @click="handleCancel" class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors" :disabled="isLoading">取消</button>
        <button type="button" @click="handleSubmit" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center space-x-2" :disabled="isLoading || !formData.title?.trim()">
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
import { BaseTree } from '@he-tree/vue'
import '@he-tree/vue/style/default.css'
import { Input } from '@/components/ui/input'
import type { FolderItem } from '../../types/components'

interface Props {
  visible: boolean
  folder?: FolderItem | null
  parentFolder?: FolderItem | null
  availableFolders?: FolderItem[]
  itemType?: 'folder' | 'tag'
  dialogTitle?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'save', data: { title: string; parentId?: number; color?: number; description?: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  availableFolders: () => []
})

const emit = defineEmits<Emits>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedParentId = ref<string | null>(null)

const formData = ref({
  title: '',
  parentId: undefined as number | undefined,
  color: null as number | null,
  description: ''
})

const errors = ref({ title: '' })
const isEdit = computed(() => !!props.folder)
const itemTypeText = computed(() => props.itemType === 'tag' ? '标签' : '文件夹')
const parentTypeText = computed(() => props.itemType === 'tag' ? '父标签' : '父文件夹')

const colorOptions = [
  { value: null, class: 'bg-gray-200 border-2 border-dashed border-gray-400', label: '无颜色' },
  { value: 0x3B82F6, class: 'bg-blue-500', label: '蓝色' },
  { value: 0x10B981, class: 'bg-green-500', label: '绿色' },
  { value: 0xF59E0B, class: 'bg-yellow-500', label: '黄色' },
  { value: 0xEF4444, class: 'bg-red-500', label: '红色' },
  { value: 0x8B5CF6, class: 'bg-purple-500', label: '紫色' },
  { value: 0xEC4899, class: 'bg-pink-500', label: '粉色' },
  { value: 0x6366F1, class: 'bg-indigo-500', label: '靛蓝' },
  { value: 0x6B7280, class: 'bg-gray-500', label: '灰色' }
]

function getNodeColor(node: any): string {
  const color = node?.color
  if (!color || typeof color !== 'number' || color <= 0) return '#6B7280'
  return `#${color.toString(16).padStart(6, '0')}`
}

interface ParentNode {
  id: string
  label: string
  color?: number | null
  children?: ParentNode[]
}

function filterFolders(folders: FolderItem[], excludeId?: string): FolderItem[] {
  return folders.filter(f => f.id !== excludeId).map(f => ({
    ...f,
    children: f.children ? filterFolders(f.children, excludeId) : undefined,
  }))
}

function toParentNodes(items: FolderItem[]): ParentNode[] {
  return items.map(f => ({
    id: f.id,
    label: f.label,
    color: (f as any).originalData?.color ?? (f as any).color,
    children: f.children ? toParentNodes(f.children) : undefined,
  }))
}

const parentNodes = computed((): ParentNode[] => {
  const filtered = props.folder ? filterFolders(props.availableFolders, props.folder.id) : props.availableFolders
  return toParentNodes(filtered)
})

function selectParent(node: ParentNode) {
  selectedParentId.value = node.id
  formData.value.parentId = parseInt(node.id)
}

const clearError = (field: keyof typeof errors.value) => {
  errors.value[field] = ''
  error.value = null
}

const validateForm = () => {
  errors.value.title = ''
  error.value = null
  if (!formData.value.title?.trim()) {
    errors.value.title = `请输入${itemTypeText.value}名称`
    return false
  }
  if (formData.value.title.trim().length > 100) {
    errors.value.title = `${itemTypeText.value}名称不能超过100个字符`
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
      description: formData.value.description?.trim() || undefined,
    }
    if (formData.value.color !== null) saveData.color = formData.value.color
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
  formData.value = { title: '', parentId: undefined, color: null, description: '' }
  errors.value = { title: '' }
  selectedParentId.value = null
  error.value = null
  isLoading.value = false
}

watch(() => props.visible, (newValue) => {
  if (newValue) {
    resetForm()
    if (props.folder) {
      const folderData = (props.folder as any).data || props.folder
      formData.value = {
        title: folderData.title || props.folder.label || '',
        parentId: folderData.parent_id || undefined,
        color: folderData.color || 1,
        description: folderData.description || '',
      }
      if (formData.value.parentId) {
        selectedParentId.value = formData.value.parentId.toString()
      }
    }
    if (props.parentFolder) {
      const parentId = parseInt(props.parentFolder.id)
      formData.value.parentId = parentId
      selectedParentId.value = parentId.toString()
    }
  }
})
</script>
