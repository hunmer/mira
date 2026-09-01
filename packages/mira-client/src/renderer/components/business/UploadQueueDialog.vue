<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import { useUploadHistoryStore } from '@renderer/stores/uploadHistory'
import { useLibraryStore } from '@renderer/stores/library'
import { useMediaStore } from '@renderer/stores/media'
import { environment } from '@renderer/utils'
import { uploadBatchProgress } from './FileUploadDialog/useUploadQueue'

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
  for (const [key, batch] of uploadBatchProgress.value) {
    if (!map.has(key)) map.set(key, { title: formatDate(batch.startedAt), records: [] })
  }
  const result = [...map.entries()].map(([key, value]) => ({
    key,
    ...value,
    total: uploadBatchProgress.value.get(key)?.total ?? value.records.length,
    completed: uploadBatchProgress.value.get(key)?.completed ?? value.records.length,
    pending: Math.max(0, (uploadBatchProgress.value.get(key)?.total ?? value.records.length) - (uploadBatchProgress.value.get(key)?.completed ?? value.records.length)),
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

// 组内分页：每页最多 200 个文件，页码超出总页数时钳制到最后一页
const PAGE_SIZE = 200
const groupPages = ref<Record<string, number>>({})
const pageCount = (group: { records: any[] }) => Math.max(1, Math.ceil(group.records.length / PAGE_SIZE))
const currentPage = (group: { key: string; records: any[] }) =>
  Math.min(groupPages.value[group.key] || 1, pageCount(group))
const pagedRecords = (group: { key: string; records: any[] }) => {
  const start = (currentPage(group) - 1) * PAGE_SIZE
  return group.records.slice(start, start + PAGE_SIZE)
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

const clearAll = () => {
  if (window.confirm('确定清空所有上传记录吗？')) history.clearAllRecords()
}

// 展开组内带本地路径的媒体记录，通过主进程 nativeImage 缩略图 IPC 展示
const thumbnails = ref<Record<string, string>>({})
const thumbnailRequests = new Set<string>()
const canThumbnail = (record: any) =>
  environment.isElectron &&
  !!window.electronAPI?.fs?.getThumbnail &&
  record.localPath &&
  (record.mimeType?.startsWith('image/') || record.mimeType?.startsWith('video/'))

watch([groups, expandedGroups, groupPages], () => {
  for (const group of groups.value) {
    if (!expandedGroups.value.has(group.key)) continue
    for (const record of group.records) {
      if (thumbnails.value[record.id] || thumbnailRequests.has(record.id) || !canThumbnail(record)) continue
      thumbnailRequests.add(record.id)
      void window.electronAPI!.fs!.getThumbnail!(record.localPath, { width: 96, height: 96 })
        .then((result) => {
          if (result.success && result.data) thumbnails.value = { ...thumbnails.value, [record.id]: result.data }
        })
        .catch(() => undefined)
        .finally(() => thumbnailRequests.delete(record.id))
    }
  }
}, { immediate: true })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex h-[80vh] w-[80vw] max-w-[80vw] flex-col sm:max-w-[80vw]">
      <DialogHeader class="flex-row items-center gap-2">
        <DialogTitle class="flex-1">上传队列</DialogTitle>
        <button
          v-if="groups.length > 0"
          class="mr-8 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="清空记录"
          @click="clearAll"
        >
          <span class="material-icons text-lg">delete_sweep</span>
        </button>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-auto">
        <div v-if="groups.length === 0" class="py-12 text-center text-muted-foreground">暂无上传记录</div>
        <div v-else>
          <section v-for="group in groups" :key="group.key" class="mb-5 last:mb-0">
            <button class="flex w-full items-center gap-2 border-b border-border pb-2 text-left" @click="toggleGroup(group.key)">
              <span class="material-icons text-base">{{ expandedGroups.has(group.key) ? 'expand_more' : 'chevron_right' }}</span>
              <span class="flex-1 text-xs font-medium text-muted-foreground">{{ group.title }}</span>
              <span class="text-xs text-muted-foreground">已上传 {{ group.completed }} / 待上传 {{ group.pending }}</span>
              <span class="text-xs text-muted-foreground">共 {{ group.total }} 个</span>
              <span v-if="group.success" class="text-xs text-green-600">{{ group.success }} 成功</span>
              <span v-if="group.failed" class="text-xs text-destructive">{{ group.failed }} 失败</span>
            </button>
            <div v-if="expandedGroups.has(group.key)">
              <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 pt-2">
          <div v-for="record in pagedRecords(group)" :key="record.id" class="flex items-start gap-1.5 rounded-lg border border-border/60 p-2 transition-colors hover:bg-muted/50" :class="record.status === 'failed' ? 'border-destructive/40' : ''">
            <img v-if="thumbnails[record.id]" :src="thumbnails[record.id]" class="size-10 shrink-0 rounded object-cover" alt="">
            <span v-else class="material-icons mt-0.5 text-base text-muted-foreground">insert_drive_file</span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-xs font-medium" :title="record.name">{{ record.name }}</div>
              <div class="truncate text-[11px] text-muted-foreground" :title="`${libraryName(record.libraryId) || record.libraryName} · ${formatDate(record.uploadedAt)}`">{{ libraryName(record.libraryId) || record.libraryName }}</div>
              <div v-if="record.error" class="truncate text-[11px] text-destructive" :title="record.error">{{ record.error }}</div>
            </div>
            <span v-if="record.status === 'success'" class="material-icons text-sm text-green-600" title="成功">check</span>
            <button v-else-if="environment.isElectron && record.localPath" class="rounded p-0.5 text-primary hover:bg-primary/10" :disabled="retrying === record.id" title="重试上传" @click="retry(record)">
              <span class="material-icons text-sm" :class="retrying === record.id ? 'animate-spin' : ''">refresh</span>
            </button>
            <span v-else class="text-[11px] text-destructive" title="失败">失败</span>
          </div>
              </div>
              <div v-if="pageCount(group) > 1" class="flex justify-center pt-3">
                <Pagination
                  :page="currentPage(group)"
                  :items-per-page="PAGE_SIZE"
                  :total="group.records.length"
                  :sibling-count="1"
                  @update:page="(value: number) => groupPages[group.key] = value"
                >
                  <PaginationContent v-slot="{ items }">
                    <PaginationPrevious>
                      <ChevronLeftIcon class="size-4" />
                      <span class="sr-only">上一页</span>
                    </PaginationPrevious>
                    <template v-for="(item, index) in items" :key="index">
                      <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === currentPage(group)">
                        {{ item.value }}
                      </PaginationItem>
                      <PaginationEllipsis v-else />
                    </template>
                    <PaginationNext>
                      <span class="sr-only">下一页</span>
                      <ChevronRightIcon class="size-4" />
                    </PaginationNext>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
