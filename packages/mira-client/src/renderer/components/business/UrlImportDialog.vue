<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useUrlImportStore } from '@renderer/stores/urlImport'
import { useLibraryStore } from '@renderer/stores/library'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { webSocketService } from '@renderer/services/WebSocketService'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const store = useUrlImportStore()
const libraryStore = useLibraryStore()

const text = ref('')
const submitting = ref(false)
const batchId = ref<string | null>(null)
interface ItemState { url: string; status: 'pending' | 'success' | 'duplicate' | 'failed'; error?: string }
const items = ref<ItemState[]>([])
const progress = ref({ total: 0, completed: 0, failed: 0, skipped: 0, done: false })

const visible = computed({
  get: () => store.visible,
  set: (v: boolean) => { if (!v) store.close() },
})

// 打开时同步预填
watch(() => store.visible, (v) => {
  if (v) {
    text.value = (store.urls || []).join('\n')
    items.value = []
    batchId.value = null
    progress.value = { total: 0, completed: 0, failed: 0, skipped: 0, done: false }
  }
})

const percent = computed(() => {
  const p = progress.value
  if (!p.total) return 0
  return Math.round(((p.completed + p.failed + p.skipped) / p.total) * 100)
})

const canStart = computed(() => !submitting.value && text.value.trim().length > 0 && libraryStore.currentLibrary?.id)

// WebSocket 监听
const onProgress = (data: any) => {
  if (!batchId.value || data?.batchId !== batchId.value) return
  progress.value = {
    total: data.total ?? 0,
    completed: data.completed ?? 0,
    failed: data.failed ?? 0,
    skipped: data.skipped ?? 0,
    done: !!data.done,
  }
  if (data.done && !submitting.value) {
    toast.success(t('business.urlImportDialog.done'))
  }
}
const onItem = (data: any) => {
  if (!batchId.value || data?.batchId !== batchId.value) return
  const target = items.value.find((it) => it.url === data.url)
  if (target) {
    target.status = data.status === 'success' ? 'success' : data.status === 'duplicate' ? 'duplicate' : 'failed'
    if (data.status === 'failed') target.error = data.error
  }
}
webSocketService.addEventListener('download::progress', onProgress)
webSocketService.addEventListener('download::item', onItem)
onBeforeUnmount(() => {
  webSocketService.removeEventListener('download::progress', onProgress)
  webSocketService.removeEventListener('download::item', onItem)
})

function parseUrls(): string[] {
  return text.value.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s))
}

async function start() {
  const libraryId = libraryStore.currentLibrary?.id
  if (!libraryId) { toast.error(t('business.urlImportDialog.noLibrary')); return }
  const urls = parseUrls()
  if (urls.length === 0) { toast.error(t('business.urlImportDialog.emptyUrls')); return }
  submitting.value = true
  items.value = urls.map((u) => ({ url: u, status: 'pending' }))
  progress.value = { total: urls.length, completed: 0, failed: 0, skipped: 0, done: false }
  try {
    const res = await miraSDKService.startDownloadFromUrl(libraryId, urls, store.folderId)
    batchId.value = res.batchId
  } catch (e: any) {
    toast.error(e?.message || t('business.urlImportDialog.startFailed'))
    items.value = []
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="visible">
    <DialogContent class="sm:max-w-[640px]">
      <DialogHeader>
        <DialogTitle>{{ t('business.urlImportDialog.title') }}</DialogTitle>
        <DialogDescription>{{ t('business.urlImportDialog.subtitle') }}</DialogDescription>
      </DialogHeader>

      <div class="space-y-3 py-1">
        <Textarea
          v-model="text"
          :placeholder="t('business.urlImportDialog.placeholder')"
          rows="8"
          class="font-mono text-xs"
          :disabled="!!batchId"
        />

        <!-- 进度区 -->
        <div v-if="batchId" class="space-y-2">
          <Progress :model-value="percent" />
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{{ t('business.urlImportDialog.total', { n: progress.total }) }}</span>
            <span class="text-green-600 dark:text-green-400">{{ t('business.urlImportDialog.completed', { n: progress.completed }) }}</span>
            <span v-if="progress.skipped" class="text-yellow-600 dark:text-yellow-400">{{ t('business.urlImportDialog.skipped', { n: progress.skipped }) }}</span>
            <span v-if="progress.failed" class="text-destructive">{{ t('business.urlImportDialog.failed', { n: progress.failed }) }}</span>
          </div>
          <!-- 逐条状态（失败项高亮） -->
          <div v-if="items.length" class="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
            <div
              v-for="it in items"
              :key="it.url"
              class="flex items-center gap-2 text-xs"
              :class="it.status === 'failed' ? 'text-destructive' : it.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'"
            >
              <span class="size-1.5 rounded-full shrink-0"
                :class="{'bg-muted-foreground': it.status==='pending', 'bg-green-500': it.status==='success', 'bg-yellow-500': it.status==='duplicate', 'bg-destructive': it.status==='failed'}" />
              <span class="truncate flex-1" :title="it.url">{{ it.url }}</span>
              <span v-if="it.status === 'failed'" class="shrink-0 max-w-[50%] truncate" :title="it.error">{{ it.error }}</span>
            </div>
          </div>
        </div>

        <p v-else class="text-xs text-muted-foreground">
          {{ t('business.urlImportDialog.cookieHint') }}
        </p>
      </div>

      <div class="flex justify-between items-center gap-2">
        <span class="text-xs text-muted-foreground">{{ t('business.urlImportDialog.batchHint') }}</span>
        <Button :disabled="!canStart" @click="start">
          {{ submitting ? t('business.urlImportDialog.starting') : t('business.urlImportDialog.start') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
