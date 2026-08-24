<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import PathTreeSelect from '@/components/PathTreeSelect.vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { libraryApi } from '@/api'
import type { LibraryImportProgress } from 'mira-app-core/shared/sdk'

const props = defineProps<{
  open: boolean
  /** eagle | billfish */
  source: 'eagle' | 'billfish'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** 导入完成（无论成功/取消/失败后已入库的部分）后触发，用于刷新列表 */
  imported: []
}>()

const { t } = useI18n()

const sourcePath = ref('')
const name = ref('')
const libraryPath = ref('')
const submitting = ref(false)
const progress = ref<LibraryImportProgress | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const sourceLabel = computed(() =>
  props.source === 'eagle' ? t('library.importEagle') : t('library.importBillfish'),
)
const percent = computed(() => {
  const p = progress.value
  if (!p || !p.total) return 0
  return Math.floor(((p.completed + p.skipped + p.failed) / p.total) * 100)
})
const importing = computed(() => progress.value?.status === 'importing')

watch(() => props.open, (open) => {
  if (open) {
    sourcePath.value = ''
    name.value = ''
    libraryPath.value = ''
    submitting.value = false
    progress.value = null
  } else {
    stopPolling()
  }
})

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function poll(importId: string) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const p = await libraryApi.getImportProgress(importId)
      progress.value = p
      if (p.status !== 'importing') {
        stopPolling()
        if (p.status === 'completed') {
          toast.success(t('library.importCompleted'))
          emit('imported')
        } else if (p.status === 'error') {
          toast.error(`${t('common.failed')}: ${p.error ?? ''}`)
          emit('imported')
        } else {
          toast.info(t('library.importCancelledDone'))
          emit('imported')
        }
      }
    } catch {
      stopPolling()
      toast.error(t('common.failed'))
    }
  }, 1000)
}

async function handleSubmit() {
  if (!sourcePath.value.trim()) {
    toast.error(t('library.importSourcePathRequired'))
    return
  }
  submitting.value = true
  try {
    const result = await libraryApi.importFrom({
      source: props.source,
      sourcePath: sourcePath.value.trim(),
      name: name.value.trim() || undefined,
      libraryPath: libraryPath.value.trim() || undefined,
    })
    progress.value = {
      id: result.importId,
      source: props.source,
      sourcePath: sourcePath.value.trim(),
      libraryId: result.libraryId,
      libraryName: name.value.trim() || sourcePath.value.trim(),
      status: 'importing',
      total: 0,
      completed: 0,
      skipped: 0,
      failed: 0,
      current: '',
      startedAt: Date.now(),
    }
    poll(result.importId)
  } catch (e: any) {
    toast.error(e?.response?.data?.error || e?.message || t('common.failed'))
    submitting.value = false
    return
  }
  submitting.value = false
}

async function handleCancel() {
  const p = progress.value
  if (p && p.status === 'importing') {
    try {
      await libraryApi.cancelImport(p.id)
    } catch {
      // 取消失败不阻塞关闭
    }
  }
  stopPolling()
  emit('update:open', false)
}

onBeforeUnmount(stopPolling)
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ sourceLabel }}</DialogTitle>
      </DialogHeader>

      <!-- 配置表单（导入启动前） -->
      <div v-if="!progress" class="space-y-4">
        <div class="space-y-2">
          <Label>{{ t('library.importSourcePath') }}</Label>
          <PathTreeSelect
            v-model="sourcePath"
            :placeholder="source === 'eagle' ? t('library.importEaglePathPlaceholder') : t('library.importBillfishPathPlaceholder')"
          />
          <p class="text-xs text-muted-foreground">{{ t('library.importSourcePathHint') }}</p>
        </div>
        <div class="space-y-2">
          <Label>{{ t('library.importName') }}</Label>
          <Input v-model="name" :placeholder="t('library.importNamePlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('library.importLibraryPath') }}</Label>
          <PathTreeSelect v-model="libraryPath" :placeholder="t('library.importLibraryPathPlaceholder')" />
          <p class="text-xs text-muted-foreground">{{ t('library.importLibraryPathHint') }}</p>
        </div>
      </div>

      <!-- 进度（导入启动后） -->
      <div v-else class="space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span>{{ progress.libraryName }}</span>
          <span class="text-muted-foreground">{{ percent }}%</span>
        </div>
        <Progress :model-value="percent" />
        <div class="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div class="font-medium">{{ progress.completed }}</div>
            <div class="text-xs text-muted-foreground">{{ t('library.importCompletedCount') }}</div>
          </div>
          <div>
            <div class="font-medium">{{ progress.skipped }}</div>
            <div class="text-xs text-muted-foreground">{{ t('library.importSkippedCount') }}</div>
          </div>
          <div>
            <div class="font-medium text-destructive">{{ progress.failed }}</div>
            <div class="text-xs text-muted-foreground">{{ t('library.importFailedCount') }}</div>
          </div>
        </div>
        <div v-if="progress.current" class="truncate text-xs text-muted-foreground">
          {{ progress.current }}
        </div>
        <div v-if="progress.status === 'error'" class="text-sm text-destructive">
          {{ progress.error }}
        </div>
      </div>

      <DialogFooter>
        <template v-if="!progress">
          <Button variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</Button>
          <Button :disabled="submitting" @click="handleSubmit">{{ t('library.importStart') }}</Button>
        </template>
        <template v-else>
          <span v-if="importing" class="mr-auto text-xs text-muted-foreground">{{ t('library.importRunningHint') }}</span>
          <Button variant="outline" @click="handleCancel">
            {{ importing ? t('library.importCancel') : t('common.close') }}
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
