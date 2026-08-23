<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, ArrowLeftRight, AudioLines, CheckCircle2, Film, Image as ImageIcon, Loader2, X } from '@lucide/vue'
import { thumbUrl } from '@/lib/server'
import { CATEGORY_LABELS, classifyFile, type MediaInput, type TaskItemState } from '@/types'
import { useI18n, type I18nKey } from '@/lib/i18n'

const { t } = useI18n()

const props = defineProps<{
  files: MediaInput[]
  taskItems: TaskItemState[]
  running: boolean
  deletedIds: Set<string>
}>()

const emit = defineEmits<{
  (e: 'remove', id: string): void
}>()

/** 按文件 id 关联任务状态，无任务时为 undefined */
const statusById = computed(() => {
  const map = new Map<string, TaskItemState>()
  for (const item of props.taskItems) map.set(String(item.fileId), item)
  return map
})

function itemOf(file: MediaInput): TaskItemState | undefined {
  return statusById.value.get(String(file.id))
}

function isDeleted(file: MediaInput): boolean {
  return props.deletedIds.has(String(file.id))
}

function categoryClass(category: string): string {
  if (category === 'image') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  if (category === 'video') return 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
  if (category === 'audio') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  return 'bg-muted text-muted-foreground'
}

function categoryLabel(category: string): string {
  return t((CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || 'cat.unknown') as I18nKey)
}
</script>

<template>
  <div class="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
    <div class="flex items-center justify-between border-b px-3 py-2">
      <span class="text-xs font-medium">{{ t('app.pending', { n: files.length }) }}</span>
      <span v-if="running" class="text-xs text-muted-foreground">{{ t('app.converting') }}</span>
    </div>

    <div v-if="files.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      <ArrowLeftRight class="size-8 opacity-40" />
      <p class="text-xs leading-relaxed" v-html="t('app.emptyHint')"></p>
    </div>

    <ul v-else class="flex-1 divide-y overflow-y-auto">
      <li v-for="file in files" :key="file.id" class="group flex items-center gap-2.5 px-3 py-2">
        <!-- 缩略图 -->
        <div class="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
          <img
            v-if="thumbUrl(file)"
            :src="thumbUrl(file)"
            class="size-full object-cover"
            loading="lazy"
            alt=""
          />
          <span v-else class="flex size-full items-center justify-center text-muted-foreground">
            <AudioLines v-if="classifyFile(file.name) === 'audio'" class="size-4" />
            <Film v-else-if="classifyFile(file.name) === 'video'" class="size-4" />
            <ImageIcon v-else class="size-4" />
          </span>
        </div>

        <!-- 名称 + 类别 -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium" :class="isDeleted(file) && 'text-muted-foreground line-through'" :title="file.name">{{ file.name }}</p>
          <div class="mt-0.5 flex items-center gap-1.5">
            <span
              class="rounded px-1.5 py-px text-[10px] leading-4"
              :class="categoryClass(classifyFile(file.name))"
            >{{ categoryLabel(classifyFile(file.name)) }}</span>

            <span v-if="isDeleted(file)" class="text-[10px] text-muted-foreground">{{ t('app.sourceDeleted') }}</span>

            <!-- 任务状态 -->
            <template v-else-if="itemOf(file)">
              <span v-if="itemOf(file)!.status === 'pending'" class="text-[10px] text-muted-foreground">{{ t('app.waiting') }}</span>
              <span v-else-if="itemOf(file)!.status === 'running'" class="text-[10px] text-primary">
                {{ itemOf(file)!.progress > 0 && itemOf(file)!.progress < 100 ? itemOf(file)!.progress + '%' : t('app.converting') }}
              </span>
              <span v-else-if="itemOf(file)!.status === 'importing'" class="text-[10px] text-primary">{{ t('app.importing') }}</span>
              <span v-else-if="itemOf(file)!.status === 'done'" class="text-[10px] text-emerald-600 dark:text-emerald-400">
                ✓ {{ itemOf(file)!.newFileName }}{{ itemOf(file)!.duplicate ? t('app.duplicate') : '' }}
              </span>
              <span v-else class="truncate text-[10px] text-destructive" :title="itemOf(file)!.error">
                ✗ {{ itemOf(file)!.error }}
              </span>
            </template>
          </div>

          <!-- 视频转码进度条 -->
          <div
            v-if="itemOf(file)?.status === 'running' && itemOf(file)!.progress > 0"
            class="mt-1 h-1 overflow-hidden rounded-full bg-primary/15"
          >
            <div class="h-full rounded-full bg-primary transition-all" :style="{ width: itemOf(file)!.progress + '%' }" />
          </div>
          <div v-else-if="itemOf(file)?.status === 'running'" class="mt-1 h-1 overflow-hidden rounded-full bg-primary/15">
            <div class="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
          </div>
        </div>

        <!-- 移除按钮（仅空闲时） -->
        <button
          v-if="!running"
          class="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          :title="t('app.remove')"
          @click="emit('remove', file.id)"
        >
          <X class="size-3.5" />
        </button>
        <CheckCircle2 v-else-if="itemOf(file)?.status === 'done'" class="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <AlertCircle v-else-if="itemOf(file)?.status === 'error'" class="size-4 shrink-0 text-destructive" />
        <Loader2 v-else-if="itemOf(file)?.status === 'running' || itemOf(file)?.status === 'importing'" class="size-4 shrink-0 animate-spin text-primary" />
      </li>
    </ul>
  </div>
</template>
