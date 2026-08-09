<template>
  <Dialog :open="props.visible" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-md max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>{{ $t('business.folderMoveDialog.title') }}</DialogTitle>
      </DialogHeader>

      <div class="overflow-y-auto pr-1 -mr-1">
        <div v-if="folder" class="mb-4 p-3 bg-muted rounded-md">
          <div class="flex items-center space-x-2">
            <span class="material-icons text-muted-foreground">folder</span>
            <span class="font-medium text-foreground">{{ folder.label }}</span>
          </div>
          <p class="text-sm text-muted-foreground mt-1">{{ $t('business.folderMoveDialog.selectParentHint') }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-2">{{ $t('business.folderMoveDialog.moveTo') }}</label>
          <div class="mb-3">
            <label class="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
              <input type="radio" :value="undefined" v-model="selectedParentId" class="text-primary" />
              <span class="material-icons text-muted-foreground">home</span>
              <span>{{ $t('business.folderMoveDialog.rootFolder') }}</span>
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
            {{ $t('business.folderMoveDialog.hint') }}
          </p>
        </div>

        <div v-if="error" class="mt-4 bg-destructive border border-destructive rounded-md p-3">
          <p class="text-destructive text-sm">{{ error }}</p>
        </div>
      </div>

      <DialogFooter class="mt-2">
        <Button variant="secondary" :disabled="isLoading" @click="handleCancel">{{ $t('business.folderMoveDialog.cancel') }}</Button>
        <Button :disabled="isLoading" @click="handleMove">
          <svg v-if="isLoading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ isLoading ? $t('business.folderMoveDialog.moving') : $t('business.folderMoveDialog.move') }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BaseTree } from '@he-tree/vue'
import '@he-tree/vue/style/default.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
const { t } = useI18n()

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
    error.value = err instanceof Error ? err.message : t('business.folderMoveDialog.moveFailed')
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  resetForm()
  emit('close')
}

// 桥接 Dialog 的 open 状态变化：点击遮罩/ESC 等关闭操作时触发 close 事件
const handleOpenChange = (open: boolean) => {
  if (!open) handleCancel()
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
