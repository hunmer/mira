<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import PathTreeSelect from '@/components/PathTreeSelect.vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { toast } from 'vue-sonner'
import { libraryApi } from '@/api'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** 导入完成后触发，用于刷新列表 */
  imported: []
}>()

const { t } = useI18n()
const { confirmDialog, requireConfirm } = useConfirmDialog()

const selectedPath = ref('')
const submitting = ref(false)

watch(() => props.open, (open) => {
  if (open) {
    selectedPath.value = ''
    submitting.value = false
  }
})

async function handleConfirm() {
  const p = selectedPath.value.trim()
  if (!p) {
    toast.error(t('library.selectPathFirst'))
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const result = await libraryApi.checkPath(p)

    if (!result.isLibrary) {
      toast.error(t('library.notLibraryDir'))
      return
    }
    if (result.registered) {
      toast.info(t('library.alreadyInList'))
      return
    }

    // 已有素材库：提示是否导入
    const ok = await requireConfirm({
      title: t('library.openLibrary'),
      description: t('library.existingLibraryPrompt'),
      confirmText: t('library.importExisting'),
    })
    if (!ok) return

    // 以目录名作为库名，保持原路径不变（服务端将打开已有 library_data.db）
    await libraryApi.create({ name: result.name, path: p, description: '' })
    toast.success(t('common.success'))
    emit('imported')
    emit('update:open', false)
  } catch (error: any) {
    toast.error(error?.response?.data?.error || error?.message || t('common.failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('library.openLibrary') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-2">
        <Label>{{ t('library.path') }}</Label>
        <PathTreeSelect
          v-model="selectedPath"
          :placeholder="t('library.openLibraryPathPlaceholder')"
        />
        <p class="text-xs text-muted-foreground">{{ t('library.openLibraryHint') }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="submitting" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </Button>
        <Button :disabled="submitting" @click="handleConfirm">{{ t('library.openLibraryConfirm') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 是否导入已有素材库 -->
  <ConfirmDialog
    v-bind="confirmDialog"
    @update:open="confirmDialog.open = $event"
    @confirm="confirmDialog.resolve(true)"
    @cancel="confirmDialog.resolve(false)"
  />
</template>
