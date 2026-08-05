<template>
  <div v-if="visible" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="bg-black bg-opacity-50 absolute inset-0" @click="handleCancel"></div>
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md relative">
      <div class="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 class="text-xl font-semibold text-foreground">移动文件夹</h2>
        <button @click="handleCancel" class="text-muted-foreground hover:text-foreground">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="px-6 py-4">
        <div v-if="folder" class="mb-4 p-3 bg-muted rounded-md">
          <div class="flex items-center space-x-2">
            <span class="material-icons text-muted-foreground">folder</span>
            <span class="font-medium text-foreground">{{ folder.label }}</span>
          </div>
          <p class="text-sm text-muted-foreground mt-1">选择新的父文件夹位置</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-2">移动到</label>
          <div class="mb-3">
            <label class="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
              <input type="radio" :value="undefined" v-model="selectedParentId" class="text-primary" />
              <span class="material-icons text-muted-foreground">home</span>
              <span>根目录</span>
            </label>
          </div>

          <div v-if="folderNodes.length > 0" class="border rounded-md max-h-64 overflow-y-auto p-2">
            <BaseTree :data="folderNodes">
              <template #default="{ node, stat }">
                <div
                  :class="[
                    'flex items-center px-2 py-1 rounded-md cursor-pointer hover:bg-muted',
                    selectedParentId === node.id ? 'bg-primary text-primary' : ''
                  ]"
                  @click="selectedParentId = node.id"
                >
                  <span v-if="stat.children.length" class="material-icons text-base mr-1 text-muted-foreground" @click.stop="stat.open = !stat.open">
                    {{ stat.open ? 'expand_more' : 'chevron_right' }}
                  </span>
                  <span v-else class="inline-block w-5"></span>
                  <span class="material-icons text-muted-foreground text-sm mr-2">folder</span>
                  <span class="flex-1 text-sm">{{ node.label }}</span>
                </div>
              </template>
            </BaseTree>
          </div>

          <p class="text-xs text-muted-foreground mt-2">
            选择文件夹作为新的父目录，或选择根目录将文件夹移动到顶层
          </p>
        </div>

        <div v-if="error" class="mt-4 bg-destructive border border-destructive rounded-md p-3">
          <p class="text-destructive text-sm">{{ error }}</p>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-border flex justify-end space-x-3">
        <button type="button" @click="handleCancel" class="px-4 py-2 text-foreground bg-muted hover:bg-accent rounded-md transition-colors" :disabled="isLoading">取消</button>
        <button type="button" @click="handleMove" class="px-4 py-2 bg-primary text-white hover:bg-primary rounded-md transition-colors flex items-center space-x-2" :disabled="isLoading">
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
import { BaseTree } from '@he-tree/vue'
import '@he-tree/vue/style/default.css'
import type { FolderItem } from '../../types/components'

interface Props {
  visible: boolean
  folder?: FolderItem | null
  availableFolders?: FolderItem[]
  itemType?: 'folder' | 'tag'
}

interface Emits {
  (e: 'close'): void
  (e: 'move', data: { folderId: string; newParentId?: number }): void
}

const props = withDefaults(defineProps<Props>(), {
  availableFolders: () => []
})

const emit = defineEmits<Emits>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedParentId = ref<number | string | undefined>(undefined)

interface MoveNode {
  id: string
  label: string
  children?: MoveNode[]
}

function filterFolders(folders: FolderItem[], excludeId: string): FolderItem[] {
  return folders.filter(f => f.id !== excludeId).map(f => ({
    ...f,
    children: f.children ? filterFolders(f.children, excludeId) : undefined,
  }))
}

function toMoveNodes(items: FolderItem[]): MoveNode[] {
  return items.map(f => ({
    id: f.id,
    label: f.label,
    children: f.children ? toMoveNodes(f.children) : undefined,
  }))
}

const folderNodes = computed((): MoveNode[] => {
  const filtered = props.folder ? filterFolders(props.availableFolders, props.folder.id) : props.availableFolders
  return toMoveNodes(filtered)
})

const handleMove = async () => {
  if (!props.folder) return
  isLoading.value = true
  error.value = null
  try {
    emit('move', {
      folderId: props.folder.id,
      newParentId: selectedParentId.value != null ? (typeof selectedParentId.value === 'string' ? parseInt(selectedParentId.value) : selectedParentId.value) : undefined,
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
  error.value = null
  isLoading.value = false
}

watch(() => props.visible, (newValue) => {
  if (newValue) resetForm()
})
</script>
