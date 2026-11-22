<template>
  <Dialog :open="props.visible" @update:open="handleOpenChange">
    <DialogContent class="flex flex-col max-h-[90vh]" :class="moveChildren ? 'w-[80vw] max-w-none sm:max-w-none' : 'sm:max-w-md'">
      <DialogHeader>
        <DialogTitle>{{ $t('business.folderMoveDialog.title') }}</DialogTitle>
      </DialogHeader>

      <div class="min-h-0 overflow-y-auto pr-1 -mr-1">
        <div v-if="folder" class="mb-4 p-3 bg-muted rounded-md">
          <div class="flex items-center space-x-2">
            <span class="material-icons text-muted-foreground">folder</span>
            <span class="font-medium text-foreground">{{ folder.label }}</span>
          </div>
          <p class="text-sm text-muted-foreground mt-1">{{ $t('business.folderMoveDialog.selectParentHint') }}</p>
        </div>

        <div v-if="hasChildFolders" class="mb-4 flex items-center justify-between gap-3">
          <Label for="move-child-folders">{{ $t('business.folderMoveDialog.moveChildren') }}</Label>
          <Switch id="move-child-folders" v-model="moveChildren" :disabled="isLoading" />
        </div>

        <div class="grid" :class="moveChildren ? 'grid-cols-2 gap-6' : 'grid-cols-1'">
          <div v-if="moveChildren" class="min-w-0 space-y-3">
            <p class="text-xs text-muted-foreground">{{ $t('business.folderMoveDialog.moveChildrenHint') }}</p>
            <div class="flex items-center justify-between text-xs">
              <span>{{ $t('business.folderTreeComponent.selectedCount', { count: selectedChildIds.size }) }}</span>
              <div class="flex gap-2">
                <Button variant="ghost" size="sm" :disabled="isLoading" @click="selectAllChildren">{{ $t('business.folderTreeComponent.selectAll') }}</Button>
                <Button variant="ghost" size="sm" :disabled="isLoading" @click="selectedChildIds = new Set()">{{ $t('business.folderTreeComponent.clear') }}</Button>
              </div>
            </div>
            <div class="border rounded-md max-h-[50vh] overflow-y-auto p-2">
              <BaseTree v-model="childNodes">
                <template #default="{ node, stat }">
                  <div class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted">
                    <Button v-if="stat.children.length" variant="ghost" size="icon" class="h-5 w-5 shrink-0"
                      :aria-label="node.label" :aria-expanded="stat.open" @click="stat.open = !stat.open">
                      <span class="material-icons text-base">{{ stat.open ? 'expand_more' : 'chevron_right' }}</span>
                    </Button>
                    <span v-else class="inline-block w-5 shrink-0"></span>
                    <Checkbox :id="`move-child-${node.id}`" :model-value="getFolderCheckState(node, selectedChildIds)"
                      :disabled="isLoading" @update:model-value="toggleChild(node, $event === true)" />
                    <Label :for="`move-child-${node.id}`" class="flex flex-1 min-w-0 items-center gap-2 cursor-pointer">
                      <span class="material-icons text-sm" :style="{ color: getNodeColor(node) }">folder</span>
                      <span class="truncate">{{ node.label }}</span>
                    </Label>
                  </div>
                </template>
              </BaseTree>
            </div>
          </div>

          <div class="min-w-0" :class="{ 'pointer-events-none opacity-60': isLoading }">
            <label class="block text-sm font-medium text-foreground mb-2">{{ $t('business.folderMoveDialog.moveTo') }}</label>
            <div class="mb-3">
              <label class="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted cursor-pointer">
                <input type="radio" :value="undefined" v-model="selectedParentId" class="text-primary" />
                <span class="material-icons text-muted-foreground">home</span>
                <span>{{ $t('business.folderMoveDialog.rootFolder') }}</span>
              </label>
            </div>

            <div v-if="folderNodes.length > 0" class="border rounded-md overflow-y-auto p-2" :class="moveChildren ? 'max-h-[50vh]' : 'max-h-64'">
              <BaseTree v-model="folderNodes">
                <template #default="{ node, stat }">
                  <div
                    :class="[
                      'flex items-center px-2 py-1 rounded-md cursor-pointer hover:bg-muted',
                      selectedParentId === node.id ? 'bg-primary text-primary-foreground' : ''
                    ]"
                    @click="selectedParentId = node.id"
                  >
                    <span v-if="stat.children.length" class="material-icons text-base mr-1 text-muted-foreground" @click.stop="stat.open = !stat.open">
                      {{ stat.open ? 'expand_more' : 'chevron_right' }}
                    </span>
                    <span v-else class="inline-block w-5"></span>
                    <span class="material-icons text-sm mr-2" :style="{ color: getNodeColor(node) }">folder</span>
                    <span class="flex-1 text-sm">{{ node.label }}</span>
                  </div>
                </template>
              </BaseTree>
            </div>

            <p class="text-xs text-muted-foreground mt-2">
              {{ $t('business.folderMoveDialog.hint') }}
            </p>
          </div>
        </div>

        <div v-if="error" class="mt-4 bg-destructive border border-destructive rounded-md p-3">
          <p class="text-destructive text-sm">{{ error }}</p>
        </div>
      </div>

      <DialogFooter class="mt-2">
        <Button variant="secondary" :disabled="isLoading" @click="handleCancel">{{ $t('business.folderMoveDialog.cancel') }}</Button>
        <Button :disabled="isLoading || (moveChildren && childMoveIds.length === 0)" @click="handleMove">
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { collectFolderIds, collectFolderMoveRoots, getFolderCheckState, toggleFolderSelection, type FolderMoveRequest } from './folderMoveSelection'
import type { FolderItem } from '../../types/components'

interface Props {
  visible: boolean
  folder?: FolderItem | null
  availableFolders?: FolderItem[]
  itemType?: 'folder' | 'tag'
  moveItems: (data: FolderMoveRequest) => Promise<void>
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  availableFolders: () => []
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedParentId = ref<number | string | undefined>(undefined)
const moveChildren = ref(false)
const selectedChildIds = ref<Set<string>>(new Set())
const childNodes = ref<MoveNode[]>([])

function findFolder(items: FolderItem[], id: string): FolderItem | undefined {
  for (const item of items) {
    if (item.id === id) return item
    const found = findFolder(item.children || [], id)
    if (found) return found
  }
}

// 右键菜单传入的节点可能没有 children，从完整树中找到当前文件夹。
const currentFolder = computed(() => props.folder
  ? findFolder(props.availableFolders, props.folder.id) ?? props.folder
  : undefined)
const hasChildFolders = computed(() => props.itemType !== 'tag' && !!currentFolder.value?.children?.length)
const childMoveIds = computed(() => collectFolderMoveRoots(childNodes.value, selectedChildIds.value))

function selectAllChildren() {
  selectedChildIds.value = new Set(collectFolderIds(childNodes.value))
}

function toggleChild(node: MoveNode, checked: boolean) {
  selectedChildIds.value = toggleFolderSelection(childNodes.value, selectedChildIds.value, node.id, checked)
}

watch(moveChildren, (enabled) => {
  if (enabled) selectAllChildren()
})

watch(() => currentFolder.value?.children, (children) => {
  childNodes.value = toMoveNodes(children || [])
  // 刷新后去掉已移走的节点，保留尚未完成的选择，便于失败后重试。
  const available = new Set(collectFolderIds(childNodes.value))
  selectedChildIds.value = new Set([...selectedChildIds.value].filter(id => available.has(id)))
  if (!hasChildFolders.value) moveChildren.value = false
}, { immediate: true, deep: true })

interface MoveNode {
  id: string
  label: string
  color?: number | null
  children?: MoveNode[]
}

function getNodeColor(node: MoveNode): string {
  const color = node.color
  if (!color || typeof color !== 'number' || color <= 0) return '#6B7280'
  return `#${color.toString(16).padStart(6, '0')}`
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
    color: f.originalData?.color ?? (f as FolderItem & { color?: number | null }).color,
    children: f.children ? toMoveNodes(f.children) : undefined,
  }))
}

// BaseTree 会回写 modelValue，使用可写 ref 同步文件夹树。
const folderNodes = ref<MoveNode[]>([])
watch(
  () => [props.availableFolders, props.folder?.id] as const,
  () => {
    const filtered = props.folder ? filterFolders(props.availableFolders, props.folder.id) : props.availableFolders
    folderNodes.value = toMoveNodes(filtered)
  },
  { immediate: true, deep: true }
)

const handleMove = async () => {
  if (!props.folder || isLoading.value || (moveChildren.value && childMoveIds.value.length === 0)) return
  isLoading.value = true
  error.value = null
  try {
    await props.moveItems({
      folderId: props.folder.id,
      folderIds: moveChildren.value ? childMoveIds.value : undefined,
      newParentId: selectedParentId.value != null ? (typeof selectedParentId.value === 'string' ? parseInt(selectedParentId.value) : selectedParentId.value) : undefined,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('business.folderMoveDialog.moveFailed')
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  if (isLoading.value) return
  resetForm()
  emit('close')
}

// 桥接 Dialog 的 open 状态变化：点击遮罩/ESC 等关闭操作时触发 close 事件
const handleOpenChange = (open: boolean) => {
  if (!open) handleCancel()
}

const resetForm = () => {
  moveChildren.value = false
  selectedChildIds.value = new Set()
  selectedParentId.value = undefined
  error.value = null
  isLoading.value = false
}

watch(() => props.visible, (newValue) => {
  if (newValue) resetForm()
})
</script>
