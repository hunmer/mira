<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Crop, RotateCcw, ScanSearch } from '@lucide/vue'
import { Button } from 'mira-plugin-ui'
import { t } from '@/lib/i18n'
import { cropToDataUrl, formatNumber } from '@/lib/image'
import { logError } from '@/lib/mira'
import { cropperSearch, currentTask } from '@/stores/tasks'

/**
 * 中栏：当前任务的种子图预览 + 局部裁剪搜索。
 * 在图片上拖动框选区域 →「搜索选中区域」用该局部重新发起视觉搜索
 * （替代原版 vue-advanced-cropper 的 debounce 自动搜索，改为显式按钮，避免误触发）。
 */
const task = currentTask

const container = ref<HTMLElement>()
const imageEl = ref<HTMLImageElement>()
const natural = reactive({ width: 0, height: 0 })
/** 选区（显示坐标 px）；null 表示无选区 */
const selection = ref<{ x: number; y: number; width: number; height: number } | null>(null)
const dragging = ref(false)
const error = ref('')

const displayScale = computed(() =>
  imageEl.value && natural.width ? imageEl.value.clientWidth / natural.width : 1,
)

// 切换任务清除选区
watch(() => task.value?.id, () => {
  selection.value = null
  error.value = ''
})

function onPointerDown(event: PointerEvent) {
  const target = imageEl.value
  if (!target || event.button !== 0) return
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  dragging.value = true
  selection.value = { x, y, width: 0, height: 0 }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value || !selection.value || !imageEl.value) return
  const rect = imageEl.value.getBoundingClientRect()
  const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
  const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height)
  const start = selection.value
  selection.value = {
    x: Math.min(start.x, x),
    y: Math.min(start.y, y),
    width: Math.abs(x - start.x),
    height: Math.abs(y - start.y),
  }
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  // 丢弃过小的选区（误点）
  if (selection.value && (selection.value.width < 8 || selection.value.height < 8)) {
    selection.value = null
  }
}

async function searchCrop() {
  if (!task.value || !imageEl.value) return
  error.value = ''
  const rect = selection.value || {
    x: 0,
    y: 0,
    width: imageEl.value.clientWidth,
    height: imageEl.value.clientHeight,
  }
  const scale = displayScale.value
  try {
    // 选区是显示坐标，换算回原图坐标后裁剪
    const dataUrl = await cropToDataUrl(task.value.imageUrl, {
      x: rect.x / scale,
      y: rect.y / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    })
    cropperSearch(task.value, dataUrl)
    selection.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    logError('[mira-pinterest-search-v2] crop failed:', error.value)
  }
}
</script>

<template>
  <section v-if="task" class="flex w-80 shrink-0 flex-col border-r border-border bg-background">
    <div class="flex items-center gap-2 border-b border-border px-3 py-2">
      <ScanSearch class="size-4 shrink-0 text-muted-foreground" />
      <span class="min-w-0 flex-1 truncate text-xs" :title="task.name || t('main.image.noTitle')">
        {{ task.name || t('main.image.noTitle') }}
      </span>
      <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
        {{ formatNumber(task.width) }} × {{ formatNumber(task.height) }}
      </span>
    </div>

    <div
      ref="container"
      class="relative flex-1 cursor-crosshair overflow-hidden p-3 select-none"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <img
        ref="imageEl"
        :src="task.imageUrl"
        :alt="task.name || t('main.image.noTitle')"
        class="max-h-full max-w-full rounded-md bg-muted object-contain"
        draggable="false"
        @load="natural.width = $event.naturalWidth; natural.height = $event.naturalHeight"
      >
      <div
        v-if="selection"
        class="pointer-events-none absolute rounded-sm border-2 border-primary bg-primary/10"
        :style="{
          left: `${(imageEl?.offsetLeft ?? 0) + selection.x}px`,
          top: `${(imageEl?.offsetTop ?? 0) + selection.y}px`,
          width: `${selection.width}px`,
          height: `${selection.height}px`,
        }"
      />
    </div>

    <div class="space-y-1.5 border-t border-border px-3 py-2">
      <p class="text-xs text-muted-foreground">{{ t('main.image.cropHint') }}</p>
      <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
      <div class="flex gap-2">
        <Button size="sm" class="h-7 flex-1" :disabled="task.state === 'processing'" @click="searchCrop">
          <Crop class="size-3.5" />
          {{ t('main.image.cropSearch') }}
        </Button>
        <Button size="sm" variant="outline" class="h-7" :disabled="!selection" @click="selection = null">
          <RotateCcw class="size-3.5" />
          {{ t('main.image.resetCrop') }}
        </Button>
      </div>
    </div>
  </section>
</template>
