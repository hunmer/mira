<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUploadHistoryStore } from '@renderer/stores/uploadHistory'
import { useLibraryStore } from '@renderer/stores/library'
import { useMediaStore } from '@renderer/stores/media'
import { environment } from '@renderer/utils'

const open = defineModel<boolean>('open', { required: true })
const history = useUploadHistoryStore()
const libraries = useLibraryStore()
const media = useMediaStore()
const retrying = ref<string | null>(null)
const expandedGroups = ref<Set<string>>(new Set())
const groups = computed(() => {
  const map = new Map<string, { title: string; records: any[] }>()
  for (const record of history.uploadRecords) {
    const key = record.batchId || record.id
    if (!map.has(key)) map.set(key, { title: formatDate(record.uploadedAt), records: [] })
    map.get(key)!.records.push(record)
  }
  const result = [...map.entries()].map(([key, value]) => ({
    key,
    ...value,
    success: value.records.filter(record => record.status === 'success').length,
    failed: value.records.filter(record => record.status === 'failed').length,
  }))
  if (expandedGroups.value.size === 0 && result.length > 0) expandedGroups.value.add(result[0].key)
  return result
})

const toggleGroup = (key: string) => {
  const next = new Set(expandedGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedGroups.value = next
}

onMounted(() => history.restoreFromStorage())

const retry = async (record: any) => {
  if (!environment.isElectron || !record.localPath || retrying.value) return
  retrying.value = record.id
  try {
    const bytes = await window.electronAPI.fs.readFileBytes(record.localPath)
    if (!bytes.success || !bytes.data) throw new Error(bytes.message || '读取本地文件失败')
    const result = await media.uploadFile(new File([bytes.data], record.name, { type: record.mimeType }), record.libraryId)
    if (!result.success) throw new Error(result.error || '上传失败')
    history.updateUploadRecord(record.id, { status: 'success', serverId: String((result.data as any)?.id || '') , error: undefined })
  } catch (error) {
    history.updateUploadRecord(record.id, { error: error instanceof Error ? error.message : String(error) })
  } finally {
    retrying.value = null
  }
}

const formatDate = (date: Date) => new Date(date).toLocaleString()
const libraryName = (id: string) => libraries.libraries.find(item => item.id === id)?.name || ''
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="w-[min(720px,calc(100vw-2rem))] max-w-none">
      <DialogHeader><DialogTitle>上传队列</DialogTitle></DialogHeader>
      <div class="max-h-[60vh] overflow-auto">
        <div v-if="groups.length === 0" class="py-12 text-center text-muted-foreground">暂无上传记录</div>
        <div v-else>
          <section v-for="group in groups" :key="group.key" class="mb-5 last:mb-0">
            <button class="flex w-full items-center gap-2 border-b border-border pb-2 text-left" @click="toggleGroup(group.key)">
              <span class="material-icons text-base">{{ expandedGroups.has(group.key) ? 'expand_more' : 'chevron_right' }}</span>
              <span class="flex-1 text-xs font-medium text-muted-foreground">{{ group.title }}</span>
              <span class="text-xs text-muted-foreground">{{ group.records.length }} 个</span>
              <span v-if="group.success" class="text-xs text-green-600">{{ group.success }} 成功</span>
              <span v-if="group.failed" class="text-xs text-destructive">{{ group.failed }} 失败</span>
            </button>
            <div v-if="expandedGroups.has(group.key)" class="divide-y divide-border">
          <div v-for="record in group.records" :key="record.id" class="flex items-center gap-3 py-3">
            <span class="material-icons text-muted-foreground">insert_drive_file</span>
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ record.name }}</div>
              <div class="truncate text-xs text-muted-foreground">{{ libraryName(record.libraryId) || record.libraryName }} · {{ formatDate(record.uploadedAt) }}</div>
              <div v-if="record.error" class="truncate text-xs text-destructive">{{ record.error }}</div>
            </div>
            <span v-if="record.status === 'success'" class="material-icons text-green-600" title="成功">check</span>
            <span v-else class="text-xs text-destructive">失败</span>
            <button v-if="environment.isElectron && record.status === 'failed' && record.localPath" class="text-primary" :disabled="retrying === record.id" title="重试上传" @click="retry(record)">
              <span class="material-icons">refresh</span>
            </button>
          </div>
            </div>
          </section>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
