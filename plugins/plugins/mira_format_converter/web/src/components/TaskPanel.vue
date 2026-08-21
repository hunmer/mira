<script setup lang="ts">
import { computed, ref } from 'vue'
import { Loader2, Trash2 } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from 'mira-plugin-ui/src/components/ui/alert-dialog'
import type { TaskState } from '@/types'

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
          {{ deleting ? '删除中…' : `删除已转换的源文件（${summary.done} 个）` }}
        </Button>
        <p v-else-if="sourceDeleted" class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Trash2 class="size-3.5" /> 源文件已移入回收站
        </p>

        <Button variant="outline" size="sm" class="w-full" @click="emit('reset')">
          继续转换其他文件
        </Button>
      </template>

      <!-- 删除确认 -->
      <AlertDialog :open="confirmOpen" @update:open="(v: boolean) => (confirmOpen = v)">
        <AlertDialogContent v-if="confirmOpen">
          <AlertDialogHeader>
            <AlertDialogTitle>删除已转换的源文件？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除 {{ summary.done }} 个已完成转换的源素材（移入回收站，可从回收站恢复），转换产物保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" size="sm" @click="confirmOpen = false">取消</Button>
            <Button variant="destructive" size="sm" @click="confirmOpen = false; emit('delete-sources')">确认删除</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
</template>
