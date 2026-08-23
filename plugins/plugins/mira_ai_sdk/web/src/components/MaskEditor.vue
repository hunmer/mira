<script setup lang="ts">
/**
 * 蒙版绘制对话框：在参考图上用画笔涂抹，导出 OpenAI /images/edits 约定的 mask PNG——
 * 涂抹区域透明（alpha=0，将被 AI 重绘），其余区域不透明黑（保持原样）。
 * 画布尺寸取参考图原始尺寸（mask 需与原图同尺寸），显示时 CSS 等比缩放。
 */
import { nextTick, ref, watch } from 'vue'
import { Eraser, Paintbrush } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'mira-plugin-ui/src/components/ui/dialog'
import { useI18n } from '@/lib/i18n'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  /** 参考图 dataURL（决定画布尺寸与底图） */
  image: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  /** 确认蒙版：base64 PNG（透明区域=重绘区）；清空状态下返回 null 表示移除蒙版 */
  (e: 'confirm', mask: string | null): void
}>()

const paintRef = ref<HTMLCanvasElement | null>(null)
const brushSize = ref(48)
const hasStrokes = ref(false)

let drawing = false
let last = { x: 0, y: 0 }

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    hasStrokes.value = false
    await nextTick()
    const canvas = paintRef.value
    if (!canvas) return
    // mask 必须与原图同尺寸（OpenAI /images/edits 约定），用 naturalWidth/Height
    const loader = new Image()
    loader.onload = () => {
      canvas.width = loader.naturalWidth || 1024
      canvas.height = loader.naturalHeight || 1024
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    }
    loader.src = props.image
  },
)

function pointerPos(e: PointerEvent) {
  const canvas = paintRef.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  }
}

function strokeTo(from: { x: number; y: number }, to: { x: number; y: number }) {
  const canvas = paintRef.value
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'
  ctx.lineWidth = brushSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}

function onPointerDown(e: PointerEvent) {
  drawing = true
  hasStrokes.value = true
  last = pointerPos(e)
  strokeTo(last, last) // 单点也落墨
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!drawing) return
  const cur = pointerPos(e)
  strokeTo(last, cur)
  last = cur
}

function onPointerUp() {
  drawing = false
}

function clearMask() {
  const canvas = paintRef.value
  const ctx = canvas?.getContext('2d')
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  hasStrokes.value = false
}

function applyMask() {
  const canvas = paintRef.value
  if (!canvas || !hasStrokes.value) {
    emit('confirm', null)
    emit('update:open', false)
    return
  }
  const { width, height } = canvas
  // 1) 归一化笔迹：半透明红 → 二值 alpha（>16 视为涂抹，防边缘羽化产生半透明区）
  const norm = document.createElement('canvas')
  norm.width = width
  norm.height = height
  const nctx = norm.getContext('2d')!
  nctx.drawImage(canvas, 0, 0)
  const img = nctx.getImageData(0, 0, width, height)
  for (let i = 0; i < img.data.length; i += 4) {
    const alpha = img.data[i + 3]
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 0
    img.data[i + 3] = alpha > 16 ? 255 : 0
  }
  nctx.putImageData(img, 0, 0)
  // 2) 黑底不透明 → destination-out 抠掉涂抹区（透明=重绘区）
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const octx = out.getContext('2d')!
  octx.fillStyle = '#000'
  octx.fillRect(0, 0, width, height)
  octx.globalCompositeOperation = 'destination-out'
  octx.drawImage(norm, 0, 0)
  emit('confirm', out.toDataURL('image/png'))
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{{ t('mask.title') }}</DialogTitle>
        <DialogDescription>{{ t('mask.description') }}</DialogDescription>
      </DialogHeader>

      <div
        class="relative max-h-[60vh] select-none overflow-hidden rounded-md border bg-[repeating-conic-gradient(hsl(0_0%_80%)_0%_25%,hsl(0_0%_90%)_0%_50%)] bg-[length:16px_16px]"
      >
        <img :src="props.image" class="block w-full" :alt="t('mask.alt')" draggable="false" />
        <canvas
          ref="paintRef"
          class="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          @pointerdown.prevent="onPointerDown"
          @pointermove.prevent="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        />
      </div>

      <div class="flex items-center gap-3">
        <Paintbrush class="size-4 shrink-0 text-muted-foreground" />
        <input
          v-model.number="brushSize"
          type="range"
          min="8"
          max="180"
          step="4"
          class="h-1.5 flex-1 accent-[var(--primary)]"
        />
        <span class="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">{{ brushSize }}</span>
        <Button variant="outline" size="sm" @click="clearMask">
          <Eraser />{{ t('mask.clear') }}
        </Button>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">{{ t('picker.cancel') }}</Button>
        <Button @click="applyMask">{{ hasStrokes ? t('mask.apply') : t('mask.none') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
