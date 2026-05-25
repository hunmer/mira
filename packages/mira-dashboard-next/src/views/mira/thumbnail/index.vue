<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { libraryApi, thumbnailApi } from '@/api'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Library } from '@/types/mira'

const { t } = useI18n()

const loading = ref(false)
const librariesLoading = ref(false)
const isScanning = ref(false)
const libraries = ref<Library[]>([])
const selectedLibraryId = ref('')
const stats = ref({ totalFiles: 0, withThumbnails: 0, withoutThumbnails: 0, thumbnailRate: 0 })
const progress = ref({ totalPending: 0, queueLength: 0, processing: false, completed: 0, progress: 0 })
const logs = ref<{ time: string; message: string }[]>([])
let progressTimer: ReturnType<typeof setInterval> | null = null

const statItems = computed(() => [
  { label: t('thumbnail.totalFiles'), value: stats.value.totalFiles, badge: 'Files', variant: 'secondary' as const },
  { label: t('thumbnail.withThumbnails'), value: stats.value.withThumbnails, badge: `${stats.value.thumbnailRate}%`, variant: 'default' as const },
  { label: t('thumbnail.withoutThumbnails'), value: stats.value.withoutThumbnails, badge: 'Missing', variant: 'destructive' as const },
  { label: t('thumbnail.remainingTasks'), value: progress.value.queueLength || stats.value.withoutThumbnails, badge: 'Queue', variant: 'outline' as const },
])

const selectedLibrary = computed(() =>
  libraries.value.find(lib => lib.id === selectedLibraryId.value) || null,
)

function addLog(message: string) {
  logs.value.unshift({ time: new Date().toLocaleTimeString(), message })
  if (logs.value.length > 50) logs.value = logs.value.slice(0, 50)
}

async function loadLibraries() {
  librariesLoading.value = true
  try {
    const res: any = await libraryApi.list()
    const d = res.data
    libraries.value = Array.isArray(d) ? d : d?.data || []
    if (!selectedLibraryId.value && libraries.value.length) {
      const active = libraries.value.find(lib => (lib as any).status === 'active')
      selectedLibraryId.value = (active || libraries.value[0]).id
      await refreshStats()
    }
  } catch (error: any) {
    addLog(`${t('thumbnail.loadLibrariesFailed')}：${error.message}`)
  } finally {
    librariesLoading.value = false
  }
}

async function refreshStats() {
  if (!selectedLibraryId.value) return
  loading.value = true
  try {
    const res: any = await thumbnailApi.stats(selectedLibraryId.value)
    if (res.data?.success) {
      stats.value = res.data.data
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
    if (res.data?.success) {
      isScanning.value = true
      addLog(res.data.message || t('thumbnail.scanStarted'))
      startProgressMonitoring()
    }
  } catch (error: any) {
    addLog(`${t('thumbnail.scanFailed')}：${error.message}`)
  }
}

async function cancelScan() {
  try {
    const res: any = await thumbnailApi.cancel()
    if (res.data?.success) {
      isScanning.value = false
      stopProgressMonitoring()
      addLog(res.data.message || t('thumbnail.scanCancelled'))
    }
  } catch (error: any) {
    addLog(`${t('thumbnail.cancelFailed')}：${error.message}`)
  }
}

function startProgressMonitoring() {
  stopProgressMonitoring()
  progressTimer = setInterval(async () => {
    try {
      const res: any = await thumbnailApi.progress(selectedLibraryId.value)
      if (!res.data?.success) return
      progress.value = res.data.data
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

function handleLibraryChange(id: any) {
  selectedLibraryId.value = id as string
  stopProgressMonitoring()
  isScanning.value = false
  progress.value = { totalPending: 0, queueLength: 0, processing: false, completed: 0, progress: 0 }
  refreshStats()
}

onMounted(loadLibraries)
onBeforeUnmount(stopProgressMonitoring)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-normal">{{ t('thumbnail.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('thumbnail.subtitle') }}</p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select :model-value="selectedLibraryId" :disabled="librariesLoading || isScanning" @update:model-value="handleLibraryChange">
          <SelectTrigger class="w-full sm:w-64">
            <SelectValue :placeholder="librariesLoading ? t('thumbnail.loading') : t('thumbnail.selectLibrary')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="library in libraries" :key="library.id" :value="library.id">
              {{ library.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <div class="flex gap-2 sm:ml-auto">
          <Button variant="outline" :disabled="!selectedLibraryId || loading" @click="refreshStats">
            <span v-if="loading" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {{ t('common.refresh') }}
          </Button>
          <Button :disabled="!selectedLibraryId || isScanning" @click="startScan">
            <span v-if="isScanning" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {{ isScanning ? t('thumbnail.scanning') : t('thumbnail.startScan') }}
          </Button>
          <Button variant="destructive" :disabled="!isScanning" @click="cancelScan">
            {{ t('thumbnail.cancelScan') }}
          </Button>
        </div>
      </div>
    </div>

    <Card v-if="selectedLibrary">
      <CardContent class="flex flex-col gap-2 pt-5 md:flex-row md:items-center md:justify-between">
        <div class="min-w-0">
          <div class="truncate text-sm font-medium">{{ selectedLibrary.name }}</div>
          <div class="truncate text-xs text-muted-foreground">{{ selectedLibrary.path }}</div>
        </div>
        <Badge :variant="(selectedLibrary as any).status === 'active' ? 'default' : 'secondary'">
          {{ (selectedLibrary as any).status === 'active' ? t('library.active') : t('library.inactive') }}
        </Badge>
      </CardContent>
    </Card>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card v-for="item in statItems" :key="item.label">
        <CardContent class="pt-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-2xl font-semibold">{{ item.value }}</div>
              <div class="mt-1 text-sm text-muted-foreground">{{ item.label }}</div>
            </div>
            <Badge :variant="item.variant">{{ item.badge }}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{{ t('thumbnail.progress') }}</CardTitle>
          <CardDescription>{{ t('thumbnail.progressDesc') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="progress.totalPending > 0" class="space-y-5">
            <div class="flex items-center justify-between gap-4">
              <div class="text-sm text-muted-foreground">
                {{ t('thumbnail.completed') }} {{ progress.completed }} / {{ progress.totalPending }}
              </div>
              <div class="text-xl font-semibold">{{ progress.progress }}%</div>
            </div>
            <div class="h-3 overflow-hidden rounded-full bg-secondary">
              <div class="h-full rounded-full bg-primary transition-all duration-500" :style="{ width: progress.progress + '%' }" />
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-md border p-4 text-center">
                <div class="text-lg font-semibold">{{ progress.totalPending }}</div>
                <div class="text-xs text-muted-foreground">{{ t('thumbnail.totalTasks') }}</div>
              </div>
              <div class="rounded-md border p-4 text-center">
                <div class="text-lg font-semibold">{{ progress.completed }}</div>
                <div class="text-xs text-muted-foreground">{{ t('thumbnail.completedTasks') }}</div>
              </div>
              <div class="rounded-md border p-4 text-center">
                <div class="text-lg font-semibold">{{ progress.queueLength }}</div>
                <div class="text-xs text-muted-foreground">{{ t('thumbnail.inQueue') }}</div>
              </div>
            </div>
          </div>
          <div v-else class="py-10 text-center">
            <div class="text-lg font-medium">{{ t('thumbnail.noPendingTasks') }}</div>
            <div class="mt-1 text-sm text-muted-foreground">{{ t('thumbnail.noPendingTasksDesc') }}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{{ t('thumbnail.logs') }}</CardTitle>
            <CardDescription>{{ t('thumbnail.logsDesc') }}</CardDescription>
          </div>
          <Button variant="outline" size="sm" @click="logs = []">{{ t('thumbnail.clearLogs') }}</Button>
        </CardHeader>
        <CardContent>
          <div class="h-80 overflow-y-auto rounded-md border bg-muted/40 p-4">
            <div v-if="logs.length" class="space-y-2 font-mono text-xs">
              <div v-for="(log, index) in logs" :key="index" class="flex gap-2">
                <span class="shrink-0 text-muted-foreground">[{{ log.time }}]</span>
                <span>{{ log.message }}</span>
              </div>
            </div>
            <div v-else class="py-12 text-center text-sm text-muted-foreground">
              {{ t('thumbnail.noLogs') }}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
