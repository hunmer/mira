<script setup lang="ts">
import { CheckCircle2, CircleAlert, Loader2, X } from '@lucide/vue'
import { t } from '@/lib/i18n'
import { closeTask, setCurrent, state } from '@/stores/tasks'

/**
 * 左栏任务列表：缩略图 + 状态徽标；点击切换当前任务，悬停关闭，中键关闭。
 */
</script>

<template>
  <aside class="flex w-44 shrink-0 flex-col overflow-y-auto border-r border-border bg-background p-2">
    <button
      v-for="task in state.tasks"
      :key="task.id"
      type="button"
      class="group relative mb-2 overflow-hidden rounded-lg border text-left transition-colors"
      :class="task.id === state.currentId
        ? 'border-primary ring-1 ring-primary'
        : 'border-border hover:border-muted-foreground/40'"
      :title="task.name || t('main.image.noTitle')"
      @click="setCurrent(task.id)"
      @auxclick.middle.prevent="closeTask(task.id)"
    >
      <img
        :src="task.imageUrl"
        :alt="task.name || t('main.image.noTitle')"
        class="h-24 w-full bg-muted object-cover"
        loading="lazy"
      >
      <div class="flex items-center gap-1 px-2 py-1.5">
        <span class="min-w-0 flex-1 truncate text-xs">{{ task.name || t('main.image.noTitle') }}</span>
        <Loader2 v-if="task.state === 'processing' || task.state === 'waiting'" class="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        <CheckCircle2 v-else-if="task.state === 'success'" class="size-3.5 shrink-0 text-primary" />
        <CircleAlert v-else class="size-3.5 shrink-0 text-destructive" />
      </div>
      <span
        class="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-md bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
        :title="t('main.preview.close')"
        @click.stop="closeTask(task.id)"
      >
        <X class="size-3.5" />
      </span>
    </button>
  </aside>
</template>
