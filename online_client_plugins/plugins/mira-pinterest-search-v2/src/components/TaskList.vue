<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { CheckCircle2, CircleAlert, Crop, Loader2, Plus, X } from '@lucide/vue'
import type { MediaPickerFile } from 'mira-plugin-ui/library'
import { t } from '@/lib/i18n'
import { addTasks, closeTask, setCurrent, state } from '@/stores/tasks'

/**
 * 左栏任务列表：缩略图 + 状态徽标；点击切换当前任务，悬停关闭，中键关闭。
 * 卡片左上角「裁剪」按钮 → 种子图裁剪搜索弹窗（ImagePreview）；
 * 列表底部「+」占位 → 素材库选图弹窗（MediaPickerDialog，自动鉴权）。
 */
const pickerOpen = ref(false)
const cropOpen = ref(false)

// 弹窗异步加载声明（实际产物经 inlineDynamicImports 内联为单文件,见 vite.config）
const MediaPickerDialog = defineAsyncComponent(() =>
  import('mira-plugin-ui/src/library/MediaPickerDialog.vue'),
)
const ImagePreview = defineAsyncComponent(() => import('./ImagePreview.vue'))

function onPicked(files: MediaPickerFile[]) {
  if (!files.length) return
  void addTasks(files.map((file) => ({
    id: `lib-${file.id}`,
    name: file.name,
    ext: file.name.includes('.') ? file.name.split('.').pop()! : '',
    width: file.width,
    height: file.height,
    // 源文件非图片(视频/文档等)时种子改用缩略图直链(缩略图恒为图片帧)
    url: file.isImage ? file.url : file.thumbUrl,
    thumbnailURL: file.thumbUrl,
  })))
}

/** 打开裁剪弹窗:先切到所点任务(弹窗作用于当前任务,否则会显示别的任务) */
function openCrop(taskId: string) {
  setCurrent(taskId)
  cropOpen.value = true
}
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
        :src="task.thumbUrl || task.imageUrl"
        :alt="task.name || t('main.image.noTitle')"
        class="w-full bg-muted object-contain"
        loading="lazy"
      >
      <div class="flex items-center gap-1 px-2 py-1.5">
        <span class="min-w-0 flex-1 truncate text-xs">{{ task.name || t('main.image.noTitle') }}</span>
        <Loader2 v-if="task.state === 'processing' || task.state === 'waiting'" class="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        <CheckCircle2 v-else-if="task.state === 'success'" class="size-3.5 shrink-0 text-primary" />
        <CircleAlert v-else class="size-3.5 shrink-0 text-destructive" />
      </div>
      <!-- 左上角：裁剪搜索入口（hover 显示）；先切到该任务再开弹窗 -->
      <span
        class="absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-md bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
        :title="t('main.image.cropSearch')"
        @click.stop="openCrop(task.id)"
      >
        <Crop class="size-3.5" />
      </span>
      <span
        class="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-md bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
        :title="t('main.preview.close')"
        @click.stop="closeTask(task.id)"
      >
        <X class="size-3.5" />
      </span>
    </button>

    <!-- 底部「+」占位：从素材库添加图片作为搜索任务 -->
    <button
      type="button"
      class="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
      :title="t('main.picker.add')"
      @click="pickerOpen = true"
    >
      <Plus class="size-5" />
      <span class="text-[11px]">{{ t('main.picker.add') }}</span>
    </button>

    <MediaPickerDialog
      v-model:open="pickerOpen"
      storage-key="mira-pinterest-search-v2:picker-library"
      :title="t('main.picker.title')"
      :confirm-text="t('main.picker.add')"
      :selected-count-text="t('main.picker.selectedCount')"
      @confirm="onPicked"
    />

    <!-- 种子图裁剪搜索弹窗（作用于当前任务） -->
    <ImagePreview v-model:open="cropOpen" />
  </aside>
</template>
