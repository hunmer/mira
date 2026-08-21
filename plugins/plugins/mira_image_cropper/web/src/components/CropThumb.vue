<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CropRegion } from '@/types'
import { useCropperStore } from '@/stores/cropper'

/**
 * 单个选区的实时裁切缩略图：canvas 按原图坐标 drawImage，
 * 坐标变化经 rAF 节流重绘（拖拽时与画布同步刷新）。
 */
const props = defineProps<{ region: CropRegion }>()
const store = useCropperStore()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const THUMB_MAX = 88

let raf = 0
function scheduleDraw() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    draw()
  })
}

function draw() {
  const canvas = canvasEl.value
  const img = store.imageEl
  if (!canvas || !img) return
  const { x, y, w, h } = props.region
  const sw = Math.max(1, Math.round(w))
  const sh = Math.max(1, Math.round(h))
  const ratio = Math.min(THUMB_MAX / sw, THUMB_MAX / sh, 1)
  canvas.width = Math.max(1, Math.round(sw * ratio))
  canvas.height = Math.max(1, Math.round(sh * ratio))
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height)
}

watch(() => ({ ...props.region }), scheduleDraw, { deep: true })
watch(() => store.imageEl, scheduleDraw)

onMounted(scheduleDraw)
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="grid place-items-center p-1.5 rounded-md bg-[repeating-conic-gradient(#0002_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] checker-dark">
    <canvas ref="canvasEl" class="max-w-full max-h-full" />
  </div>
</template>

<style scoped>
.dark .checker-dark {
  background: repeating-conic-gradient(#ffffff22 0% 25%, transparent 0% 50%);
  background-size: 12px 12px;
}
</style>
