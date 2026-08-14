<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { thumbnailApi } from '@/api'
import { useLibrary } from '@/composables/useLibrary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const { t } = useI18n()
const { selectedId: selectedLibraryId } = useLibrary()

const loading = ref(false)
const syncing = ref(false)
const isScanning = ref(false)
const stats = ref({ totalFiles: 0, withThumbnails: 0, withoutThumbnails: 0, thumbnailRate: 0 })
const progress = ref({ totalPending: 0, queueLength: 0, processing: false, completed: 0, progress: 0 })
const logs = ref<{ time: string; message: string }[]>([])
let progressTimer: ReturnType<typeof setInterval> | null = null

const hasProgress = computed(() => progress.value.totalPending > 0 || progress.value.processing)

function addLog(message: string) {
  logs.value.unshift({ time: new Date().toLocaleTimeString(), message })
  if (logs.value.length > 50) logs.value = logs.value.slice(0, 50)
}

async function checkProgress() {
  if (!selectedLibraryId.value) return
  try {
    const res: any = await thumbnailApi.progress(selectedLibraryId.value)
    progress.value = res
    if (progress.value.processing || progress.value.queueLength > 0) {
      isScanning.value = true
      startProgressMonitoring()
    }
  } catch {}
}

async function refreshStats() {
  if (!selectedLibraryId.value) return
  loading.value = true
  try {
    const res: any = await thumbnailApi.stats(selectedLibraryId.value)
    if (res) {
      stats.value = res
      addLog(`${t('thumbnail.statsUpdated')}：${t('thumbnail.totalFiles')} ${stats.value.totalFiles}，${t('thumbnail.rate')} ${stats.value.thumbnailRate}%`)
    }
  } catch (error: any) {
    addLog(`${t('thumbnail.statsFailed')}：${error.message}`)
  } finally {
    loading.value = false
  }
}

async function startScan() {
  if (!selectedLibraryId.value) return
  try {
    const res: any = await thumbnailApi.scan(selectedLibraryId.value)
    if (res?.success) {
      isScanning.value = true
      addLog(res?.message || t('thumbnail.scanStarted'))
      startProgressMonitoring()
    }
  } catch (error: any) {
    addLog(`${t('thumbnail.scanFailed')}：${error.message}`)
  }
}

async function cancelScan() {
  try {
    const res: any = await thumbnailApi.cancel()
    if (res?.success) {
      isScanning.value = false
      stopProgressMonitoring()
      addLog(res?.message || t('thumbnail.scanCancelled'))
    }
  } catch (error: any) {
    addLog(`${t('thumbnail.cancelFailed')}：${error.message}`)
  }
}

async function syncThumbs() {
  if (!selectedLibraryId.value) return
  syncing.value = true
  try {
    await thumbnailApi.sync(selectedLibraryId.value)
    {
      addLog(t('thumbnail.syncStarted'))
      startSyncProgressMonitoring()
    }
  } catch (error: any) {
    addLog(`${t('thumbnail.syncFailed')}：${error.message}`)
    syncing.value = false
  }
}

let lastSyncLoggedPercent = -1
function startSyncProgressMonitoring() {
  lastSyncLoggedPercent = -1
  startProgressMonitoring()
  // override the normal progress monitoring with sync-aware version
  stopProgressMonitoring()
  progressTimer = setInterval(async () => {
    try {
      const res: any = await thumbnailApi.progress(selectedLibraryId.value)
      progress.value = res
      const pct = progress.value.progress
      // log at 25% intervals
      if (pct < 100 && pct - lastSyncLoggedPercent >= 25) {
        lastSyncLoggedPercent = pct
        addLog(`${t('thumbnail.syncProgress')}：${progress.value.completed} / ${progress.value.totalPending} (${pct}%)`)
      }
      if (!progress.value.processing && progress.value.queueLength === 0) {
        stopProgressMonitoring()
        const { total, synced } = { total: progress.value.totalPending, synced: progress.value.completed }
        addLog(t('thumbnail.syncResult', { total, synced }))
        syncing.value = false
        setTimeout(() => refreshStats(), 1000)
      }
    } catch {}
  }, 1000)
}

function startProgressMonitoring() {
  stopProgressMonitoring()
  progressTimer = setInterval(async () => {
    try {
      const res: any = await thumbnailApi.progress(selectedLibraryId.value)
      progress.value = res
      if (!progress.value.processing && progress.value.queueLength === 0) {
        isScanning.value = false
        stopProgressMonitoring()
        if (progress.value.progress === 100) {
          addLog(t('thumbnail.scanComplete'))
          setTimeout(() => refreshStats(), 1000)
        }
      }
    } catch {}
  }, 1000)
}

function stopProgressMonitoring() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

onMounted(async () => {
  await refreshStats()
  checkProgress()
})
onBeforeUnmount(stopProgressMonitoring)
</script>

<template>
  <Card>
    <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <CardTitle>{{ t('thumbnail.title') }}</CardTitle>
        <CardDescription>{{ t('thumbnail.subtitle') }}</CardDescription>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" :disabled="!selectedLibraryId || loading" @click="refreshStats">
          <span v-if="loading" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {{ t('common.refresh') }}
        </Button>
        <Button
          size="sm"
          :variant="isScanning ? 'destructive' : 'default'"
          :disabled="!selectedLibraryId"
          @click="isScanning ? cancelScan() : startScan()"
        >
          <span v-if="isScanning" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {{ isScanning ? t('thumbnail.cancelScan') : t('thumbnail.startScan') }}
        </Button>
        <Button size="sm" variant="outline" :disabled="!selectedLibraryId || syncing" @click="syncThumbs">
          <span v-if="syncing" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {{ t('thumbnail.syncThumbs') }}
        </Button>
        <Popover>
          <PopoverTrigger as-child>
            <Button size="sm" variant="ghost">
              {{ t('thumbnail.logs') }}
              <Badge v-if="logs.length" variant="secondary" class="ml-1.5 h-5 px-1.5 text-xs">{{ logs.length }}</Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-96 p-0" align="end">
            <div class="flex items-center justify-between border-b px-3 py-2">
              <span class="text-sm font-medium">{{ t('thumbnail.logs') }}</span>
              <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="logs = []">{{ t('thumbnail.clearLogs') }}</Button>
            </div>
            <div class="h-72 overflow-y-auto p-3">
              <div v-if="logs.length" class="space-y-1.5 font-mono text-xs">
                <div v-for="(log, index) in logs" :key="index" class="flex gap-2">
                  <span class="shrink-0 text-muted-foreground">[{{ log.time }}]</span>
                  <span>{{ log.message }}</span>
                </div>
              </div>
              <div v-else class="py-10 text-center text-sm text-muted-foreground">
                {{ t('thumbnail.noLogs') }}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- 统计数据：紧凑内联 -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-md border p-3">
          <div class="text-xl font-semibold">{{ stats.totalFiles }}</div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ t('thumbnail.totalFiles') }}</div>
        </div>
        <div class="rounded-md border p-3">
          <div class="flex items-baseline gap-1">
            <span class="text-xl font-semibold">{{ stats.withThumbnails }}</span>
            <span class="text-xs text-muted-foreground">{{ stats.thumbnailRate }}%</span>
          </div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ t('thumbnail.withThumbnails') }}</div>
        </div>
        <div class="rounded-md border p-3">
          <div class="text-xl font-semibold">{{ stats.withoutThumbnails }}</div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ t('thumbnail.withoutThumbnails') }}</div>
        </div>
        <div class="rounded-md border p-3">
          <div class="text-xl font-semibold">{{ progress.queueLength || stats.withoutThumbnails }}</div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ t('thumbnail.remainingTasks') }}</div>
        </div>
      </div>

      <!-- 进度条（仅扫描/同步时显示） -->
      <div v-if="hasProgress" class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">
            {{ t('thumbnail.completed') }} {{ progress.completed }} / {{ progress.totalPending }}
          </span>
          <span class="font-semibold">{{ progress.progress }}%</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-secondary">
          <div class="h-full rounded-full bg-primary transition-all duration-500" :style="{ width: progress.progress + '%' }" />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
