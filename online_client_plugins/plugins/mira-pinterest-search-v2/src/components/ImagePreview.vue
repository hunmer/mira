<script setup lang="ts">
import { ref, watch } from 'vue'
import { Expand, Crop, RotateCcw, ScanSearch } from '@lucide/vue'
import { Button } from 'mira-plugin-ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'mira-plugin-ui/src/components/ui/dialog'
import { t } from '@/lib/i18n'
import { cropToDataUrl, formatNumber } from '@/lib/image'
import { logError } from '@/lib/mira'
import { cropperSearch, currentTask, restoreSeed } from '@/stores/tasks'

/**
 * 种子图局部裁剪搜索对话框（原中栏常驻区改弹窗，入口在左栏任务卡左上角）。
 * 图片上拖动框选区域 →「搜索选中区域」用该局部重新发起视觉搜索，
 * 发起后自动关窗回到结果区。
 */
const task = currentTask
const open = defineModel<boolean>('open', { default: false })

const container = ref<HTMLElement>()
const imageEl = ref<HTMLImageElement>()
/** 选区（显示坐标 px）；null 表示无选区 */
const selection = ref<{ x: number; y: number; width: number; height: number } | null>(null)
const dragging = ref(false)
const error = ref('')

// 切换任务/关闭弹窗清除选区
watch(() => task.value?.id, () => {
  selection.value = null
  error.value = ''
})
watch(open, (value) => {
  if (!value) selection.value = null
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
  try {
    // 选区与裁剪同为显示坐标:cropToDataUrl 经 <img> 解码整图快照后裁剪,
    // 所见即所得(不做 naturalWidth 换算,规避 EXIF 方向照片横竖互换错位)
    const dataUrl = await cropToDataUrl(task.value.imageUrl, rect, {
      width: imageEl.value.clientWidth,
      height: imageEl.value.clientHeight,
    })
    cropperSearch(task.value, dataUrl)
    selection.value = null
    open.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    logError('[mira-pinterest-search-v2] crop failed:', error.value)
  }
}
</script>

<template>
  <Dialog v-if="task" v-model:open="open">
    <DialogContent class="flex max-h-[85vh] w-full max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader class="flex-row items-center gap-2 border-b border-border px-3 py-2 pr-10 space-y-0">
        <ScanSearch class="size-4 shrink-0 text-muted-foreground" />
        <DialogTitle class="min-w-0 flex-1 truncate text-xs font-medium" :title="task.name || t('main.image.noTitle')">
          {{ task.name || t('main.image.noTitle') }}
        </DialogTitle>
        <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
          {{ formatNumber(task.width) }} × {{ formatNumber(task.height) }}
        </span>
      </DialogHeader>

      <div
        ref="container"
        class="relative flex h-[55vh] cursor-crosshair items-center justify-center overflow-hidden p-3 select-none"
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
          <Button
            v-if="task.imageUrl !== task.originalUrl"
            size="sm"
            variant="outline"
            class="h-7"
            :title="t('main.image.restoreOriginHint')"
            @click="restoreSeed(task); open = false"
          >
            <Expand class="size-3.5" />
            {{ t('main.image.restoreOrigin') }}
          </Button>
          <Button size="sm" variant="outline" class="h-7" :disabled="!selection" @click="selection = null">
            <RotateCcw class="size-3.5" />
            {{ t('main.image.resetCrop') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
