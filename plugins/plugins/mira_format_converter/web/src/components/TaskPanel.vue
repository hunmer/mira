<script setup lang="ts">
import { computed } from 'vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import type { TaskState } from '@/types'

const props = defineProps<{
  task: TaskState | null
}>()

const emit = defineEmits<{
  (e: 'reset'): void
}>()

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
      <span class="text-xs font-medium">转换任务</span>
      <span class="text-xs text-muted-foreground">
        <template v-if="!summary.finished">进行中 {{ overallPercent }}%</template>
        <template v-else>
          <span class="text-emerald-600 dark:text-emerald-400">成功 {{ summary.done }}</span>
          <span v-if="summary.failed" class="ml-2 text-destructive">失败 {{ summary.failed }}</span>
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
        目标格式 .{{ task.params.target }} · 质量 {{ task.params.quality === 'high' ? '高' : task.params.quality === 'low' ? '低' : '中' }}
        · {{ task.params.inheritMeta ? '继承文件夹与标签' : '不继承元数据' }}
      </p>

      <!-- 失败明细 -->
      <div v-if="failedItems.length > 0" class="space-y-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-2">
        <p class="text-[11px] font-medium text-destructive">失败明细（其余文件不受影响）</p>
        <p v-for="item in failedItems" :key="item.fileId" class="truncate text-[11px] text-destructive/90" :title="item.error">
          {{ item.name }}：{{ item.error }}
        </p>
      </div>

      <p v-if="summary.finished && summary.done > 0" class="text-[11px] text-muted-foreground">
        转换产物已保存回素材库{{ task.params.inheritMeta ? '（原文件夹）' : '' }}，可在素材库中查看。
      </p>

      <Button v-if="summary.finished" variant="outline" size="sm" class="w-full" @click="emit('reset')">
        继续转换其他文件
      </Button>
    </div>
  </div>
</template>
