<script setup lang="ts">
import { computed, ref } from 'vue'
import { Loader2, Trash2 } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from 'mira-plugin-ui/src/components/ui/alert-dialog'
import type { TaskState } from '@/types'
import { useI18n, type I18nKey } from '@/lib/i18n'

const { t } = useI18n()

/** 质量枚举 → 短标签 key */
const QUALITY_KEYS: Record<string, I18nKey> = {
  high: 'app.qualityHighShort',
  medium: 'app.qualityMediumShort',
  low: 'app.qualityLowShort',
}

const props = defineProps<{
  task: TaskState | null
  sourceDeleted: boolean
  deleting: boolean
}>()

const emit = defineEmits<{
  (e: 'reset'): void
  (e: 'delete-sources'): void
}>()

const confirmOpen = ref(false)

const summary = computed(() => {
  if (!props.task) return null
  const items = props.task.items
  const done = items.filter((i) => i.status === 'done').length
  const failed = items.filter((i) => i.status === 'error').length
  const running = items.length - done - failed
  const finished = props.task.status === 'done'
  return { total: items.length, done, failed, running, finished }
})

const overallPercent = computed(() => {
  if (!props.task) return 0
  const items = props.task.items
  if (items.length === 0) return 0
  const sum = items.reduce((acc, i) => {
    if (i.status === 'done' || i.status === 'importing') return acc + 100
    if (i.status === 'error') return acc + 100
    return acc + Math.min(99, i.progress)
  }, 0)
  return Math.round(sum / items.length)
})

const failedItems = computed(() => props.task?.items.filter((i) => i.status === 'error') ?? [])
</script>

<template>
  <div v-if="task && summary" class="rounded-lg border bg-card">
    <div class="flex items-center justify-between border-b px-3 py-2">
      <span class="text-xs font-medium">{{ t('app.task') }}</span>
      <span class="text-xs text-muted-foreground">
        <template v-if="!summary.finished">{{ t('app.progress', { n: overallPercent }) }}</template>
        <template v-else>
          <span class="text-emerald-600 dark:text-emerald-400">{{ t('app.doneCount', { n: summary.done }) }}</span>
          <span v-if="summary.failed" class="ml-2 text-destructive">{{ t('app.failedCount', { n: summary.failed }) }}</span>
        </template>
      </span>
    </div>

    <div class="space-y-3 p-3">
      <!-- 总进度 -->
      <div class="h-1.5 overflow-hidden rounded-full bg-primary/15">
        <div
          class="h-full rounded-full transition-all"
          :class="summary.finished && summary.failed > 0 ? 'bg-amber-500' : 'bg-primary'"
          :style="{ width: overallPercent + '%' }"
        />
      </div>

      <p class="text-[11px] text-muted-foreground">
        {{ t('app.taskParams', {
          target: task.params.target,
          quality: t(QUALITY_KEYS[task.params.quality] || 'app.qualityMediumShort'),
          meta: task.params.inheritMeta ? t('app.metaInherit') : t('app.metaNoInherit'),
        }) }}
      </p>

      <!-- 失败明细 -->
      <div v-if="failedItems.length > 0" class="space-y-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-2">
        <p class="text-[11px] font-medium text-destructive">{{ t('app.failedDetail') }}</p>
        <p v-for="item in failedItems" :key="item.fileId" class="truncate text-[11px] text-destructive/90" :title="item.error">
          {{ item.name }}：{{ item.error }}
        </p>
      </div>

      <p v-if="summary.finished && summary.done > 0" class="text-[11px] text-muted-foreground">
        {{ t('app.savedToLibrary', { suffix: task.params.inheritMeta ? t('app.savedToLibraryInherit') : '' }) }}
      </p>

      <template v-if="summary.finished">
        <!-- 删除已转换的源文件 -->
        <Button
          v-if="summary.done > 0 && !sourceDeleted"
          variant="outline"
          size="sm"
          class="w-full text-destructive hover:text-destructive"
          :disabled="deleting"
          @click="confirmOpen = true"
        >
          <Loader2 v-if="deleting" class="size-4 animate-spin" />
          <Trash2 v-else class="size-4" />
          {{ deleting ? t('app.deleting') : t('app.deleteSources', { n: summary.done }) }}
        </Button>
        <p v-else-if="sourceDeleted" class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Trash2 class="size-3.5" /> {{ t('app.sourcesDeleted') }}
        </p>

        <Button variant="outline" size="sm" class="w-full" @click="emit('reset')">
          {{ t('app.continue') }}
        </Button>
      </template>

      <!-- 删除确认 -->
      <AlertDialog :open="confirmOpen" @update:open="(v: boolean) => (confirmOpen = v)">
        <AlertDialogContent v-if="confirmOpen">
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t('app.deleteTitle') }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ t('app.deleteDesc', { n: summary.done }) }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" size="sm" @click="confirmOpen = false">{{ t('app.cancel') }}</Button>
            <Button variant="destructive" size="sm" @click="confirmOpen = false; emit('delete-sources')">{{ t('app.confirmDelete') }}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
</template>
