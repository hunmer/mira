<template>
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
  <AlertDialog v-if="ops.showDeleteDialog.value" :open="true" @update:open="ops.showDeleteDialog.value = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('business.folderTreeComponent.confirmDeleteTitle') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('business.folderTreeComponent.confirmDeleteDesc', { type: ops.deletingType.value === 'folder' ? t('business.folderTreeComponent.typeFolder') : t('business.folderTreeComponent.typeTag'), name: (ops.deletingItem.value as any)?.label || (ops.deletingItem.value as any)?.name }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div v-if="ops.deletingType.value === 'folder'" class="flex items-center space-x-2 px-1">
        <Checkbox id="deleteWithFiles" :model-value="Boolean(ops.deleteWithFiles.value)"
          @update:model-value="ops.deleteWithFiles.value = $event === true" />
        <label for="deleteWithFiles" class="text-sm text-muted-foreground cursor-pointer select-none">
          {{ t('business.folderTreeComponent.deleteWithFilesLabel') }}
        </label>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('business.folderTreeComponent.cancel') }}</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive hover:bg-destructive text-white" @click="ops.confirmDelete">{{ t('business.folderTreeComponent.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- 批量删除确认对话框 -->
  <AlertDialog v-if="ops.showBatchDeleteDialog.value" :open="true" @update:open="ops.showBatchDeleteDialog.value = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('business.folderTreeComponent.confirmBatchDeleteTitle') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('business.folderTreeComponent.confirmBatchDeleteDesc', { count: ops.batchDeleteTotalCount.value, type: ops.batchDeletingType.value === 'folder' ? t('business.folderTreeComponent.typeFolder') : t('business.folderTreeComponent.typeTag') }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div v-if="ops.batchDeletingType.value === 'folder'" class="flex items-center space-x-2 px-1">
        <Checkbox id="batchDeleteWithFiles" :model-value="Boolean(ops.deleteWithFiles.value)"
          @update:model-value="ops.deleteWithFiles.value = $event === true" />
        <label for="batchDeleteWithFiles" class="text-sm text-muted-foreground cursor-pointer select-none">
          {{ t('business.folderTreeComponent.deleteWithFilesLabel') }}
        </label>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('business.folderTreeComponent.cancel') }}</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive hover:bg-destructive text-white" @click="ops.confirmBatchDelete">{{ t('business.folderTreeComponent.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- 拖拽移动确认对话框 -->
  <AlertDialog :open="showDragConfirm" @update:open="emit('update:showDragConfirm', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('business.folderTreeComponent.confirmDragMoveTitle') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('business.folderTreeComponent.confirmDragMoveDesc', { name: dragConfirmInfo.dragName, target: dragConfirmInfo.targetLabel }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button type="button" variant="outline" @click="emit('cancel-drag-move')">{{ t('business.folderTreeComponent.cancel') }}</Button>
        <Button type="button" @click="emit('confirm-drag-move')">{{ t('business.folderTreeComponent.confirmMove') }}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FolderEditDialog from '../../FolderEditDialog.vue'
import FolderMoveDialog from '../../FolderMoveDialog.vue'
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
import type { useFolderOperations } from '../composables/useFolderOperations'
import type { DragConfirmInfo } from '../composables/useDragSort'

type FolderOperations = ReturnType<typeof useFolderOperations>

defineProps<{
  ops: FolderOperations
  folders: FolderItem[]
  showDragConfirm: boolean
  dragConfirmInfo: DragConfirmInfo
}>()

const emit = defineEmits<{
  (e: 'update:showDragConfirm', value: boolean): void
  (e: 'confirm-drag-move'): void
  (e: 'cancel-drag-move'): void
}>()

const { t } = useI18n()
</script>
