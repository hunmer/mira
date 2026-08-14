<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { thumbnailApi } from '@/api'
import { useLibrary } from '@/composables/useLibrary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const { selectedId: selectedLibraryId } = useLibrary()
const loading = ref(false)
const scanning = ref(false)
const stats = ref({ available: true, totalFiles: 0, withMetadata: 0, withoutMetadata: 0, metadataRate: 0 })
const progress = ref({ totalPending: 0, completed: 0, queueLength: 0, processing: false, progress: 0 })
let progressTimer: ReturnType<typeof setInterval> | null = null

const hasProgress = computed(() => progress.value.totalPending > 0 || progress.value.processing)

async function refreshStats() {
  if (!selectedLibraryId.value) return
  loading.value = true
  try {
    const res: any = await thumbnailApi.metadataStats(selectedLibraryId.value)
    stats.value = res
  } finally {
    loading.value = false
  }
}

async function refreshProgress() {
  if (!selectedLibraryId.value) return
  try {
    const res: any = await thumbnailApi.metadataProgress(selectedLibraryId.value)
    progress.value = res
    scanning.value = progress.value.processing || progress.value.queueLength > 0
    if (!scanning.value) {
      stopProgressMonitoring()
      if (progress.value.totalPending > 0) await refreshStats()
    }
  } catch {}
}

function startProgressMonitoring() {
  stopProgressMonitoring()
  progressTimer = setInterval(refreshProgress, 1000)
}

function stopProgressMonitoring() {
  if (progressTimer) clearInterval(progressTimer)
  progressTimer = null
}

async function startScan() {
  if (!selectedLibraryId.value) return
  const res: any = await thumbnailApi.metadataScan(selectedLibraryId.value)
  if (res?.available) {
    scanning.value = true
    startProgressMonitoring()
    await refreshProgress()
  } else {
    stats.value.available = false
  }
}

onMounted(async () => {
  await refreshStats()
  await refreshProgress()
})
onBeforeUnmount(stopProgressMonitoring)
</script>

<template>
  <Card>
    <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <CardTitle>{{ t('metadata.title') }}</CardTitle>
        <CardDescription>{{ t('metadata.subtitle') }}</CardDescription>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" :disabled="!selectedLibraryId || loading" @click="refreshStats">
          <span v-if="loading" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {{ t('common.refresh') }}
        </Button>
        <Button size="sm" :disabled="!selectedLibraryId || scanning || !stats.available" @click="startScan">
          <span v-if="scanning" class="mr-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {{ scanning ? t('metadata.scanning') : t('metadata.startScan') }}
        </Button>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="!stats.available" class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        {{ t('metadata.unavailable') }}
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-md border p-3">
          <div class="text-xl font-semibold">{{ stats.totalFiles }}</div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ t('metadata.totalFiles') }}</div>
        </div>
        <div class="rounded-md border p-3">
          <div class="flex items-baseline gap-1">
            <span class="text-xl font-semibold">{{ stats.withMetadata }}</span>
            <span class="text-xs text-muted-foreground">{{ stats.metadataRate }}%</span>
          </div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ t('metadata.withMetadata') }}</div>
        </div>
        <div class="rounded-md border p-3">
          <div class="text-xl font-semibold">{{ stats.withoutMetadata }}</div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ t('metadata.withoutMetadata') }}</div>
        </div>
        <div class="rounded-md border p-3">
          <div class="text-xl font-semibold">{{ progress.queueLength || stats.withoutMetadata }}</div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ t('metadata.remainingTasks') }}</div>
        </div>
      </div>
      <div v-if="hasProgress" class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">{{ t('metadata.completed') }} {{ progress.completed }} / {{ progress.totalPending }}</span>
          <span class="font-semibold">{{ progress.progress }}%</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-secondary">
          <div class="h-full rounded-full bg-primary transition-all duration-500" :style="{ width: progress.progress + '%' }" />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
