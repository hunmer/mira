<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CropRegion } from '@/types'
import { useCropperStore } from '@/stores/cropper'

/**
 * 多选区交互画布：
 *   - 原图以 displaySize = naturalSize × scale 渲染，wrapper 平移 offset；
 *   - 选区用原图像素坐标存储（store），渲染时乘 scale，导出/缩略图与显示解耦；
 *   - 遮罩用单个 canvas 绘制（半透明覆盖 + 逐选区 clearRect），选区交互层为绝对定位 div；
 *   - 交互：空白拖拽新建、选区拖拽移动、8 手柄缩放、中键/空格拖拽平移、滚轮缩放（指针中心）。
 */
const store = useCropperStore()

const viewportEl = ref<HTMLDivElement | null>(null)
const maskCanvas = ref<HTMLCanvasElement | null>(null)
const spaceHeld = ref(false)

const displayW = computed(() => (store.image ? Math.round(store.image.width * store.scale) : 0))
const displayH = computed(() => (store.image ? Math.round(store.image.height * store.scale) : 0))

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type Handle = (typeof HANDLES)[number]

const HANDLE_CLASS: Record<Handle, string> = {
  nw: '-top-[5px] -left-[5px] cursor-nwse-resize',
  n: '-top-[5px] left-1/2 -translate-x-1/2 cursor-ns-resize',
  ne: '-top-[5px] -right-[5px] cursor-nesw-resize',
  e: 'top-1/2 -translate-y-1/2 -right-[5px] cursor-ew-resize',
  se: '-bottom-[5px] -right-[5px] cursor-nwse-resize',
  s: '-bottom-[5px] left-1/2 -translate-x-1/2 cursor-ns-resize',
  sw: '-bottom-[5px] -left-[5px] cursor-nesw-resize',
  w: 'top-1/2 -translate-y-1/2 -left-[5px] cursor-ew-resize',
}

interface DragState {
  mode: 'none' | 'pan' | 'draw' | 'move' | 'resize'
  id?: string
  handle?: Handle
  startVp: { x: number; y: number }
  startOffset?: { x: number; y: number }
  origin?: { x: number; y: number } // draw：原图坐标起点
  start?: CropRegion
  moved: boolean // 是否产生实际位移（决定是否保留历史快照）
}

let drag: DragState = { mode: 'none', startVp: { x: 0, y: 0 }, moved: false }
const DRAG_THRESHOLD = 3 // 视口像素

// ── 坐标换算 ─────────────────────────────────────────
function viewportPoint(e: PointerEvent | WheelEvent): { x: number; y: number } {
  const rect = viewportEl.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function toImagePoint(vp: { x: number; y: number }): { x: number; y: number } {
  return { x: (vp.x - store.offset.x) / store.scale, y: (vp.y - store.offset.y) / store.scale }
}

// ── 自适应与缩放 ─────────────────────────────────────
function fitToViewport(applyScale = true) {
  const el = viewportEl.value
  const img = store.image
  if (!el || !img) return
  const pad = 32
  const fit = Math.min((el.clientWidth - pad) / img.width, (el.clientHeight - pad) / img.height)
  store.fitScale = Math.max(0.01, Math.min(fit, 4))
  if (applyScale) {
    store.scale = store.fitScale
    store.offset = {
      x: (el.clientWidth - img.width * store.fitScale) / 2,
      y: (el.clientHeight - img.height * store.fitScale) / 2,
    }
  }
}

function zoomAt(factor: number, vp: { x: number; y: number }) {
  const next = Math.max(0.05, Math.min(8, store.scale * factor))
  if (next === store.scale) return
  const ratio = next / store.scale
  store.offset = {
    x: vp.x - (vp.x - store.offset.x) * ratio,
    y: vp.y - (vp.y - store.offset.y) * ratio,
  }
  store.scale = next
}

function onWheel(e: WheelEvent) {
  if (!store.image) return
  e.preventDefault()
  zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, viewportPoint(e))
}

function centerVp() {
  const el = viewportEl.value
  return { x: (el?.clientWidth || 0) / 2, y: (el?.clientHeight || 0) / 2 }
}

defineExpose({
  fit: () => fitToViewport(true),
  zoomIn: () => zoomAt(1.25, centerVp()),
  zoomOut: () => zoomAt(1 / 1.25, centerVp()),
})

// ── 遮罩绘制 ─────────────────────────────────────────
function drawMask() {
  const canvas = maskCanvas.value
  if (!canvas) return
  const w = displayW.value
  const h = displayH.value
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  if (!store.regions.length) return
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, 0, w, h)
  for (const r of store.regions) {
    ctx.clearRect(r.x * store.scale, r.y * store.scale, r.w * store.scale, r.h * store.scale)
  }
}

watch(
  () => [store.regions.map((r) => `${r.id}:${r.x},${r.y},${r.w},${r.h}`).join('|'), store.scale] as const,
  () => requestAnimationFrame(drawMask),
)

// ── 指针交互 ─────────────────────────────────────────
function regionStyle(r: CropRegion) {
  return {
    left: `${r.x * store.scale}px`,
    top: `${r.y * store.scale}px`,
    width: `${Math.max(1, r.w * store.scale)}px`,
    height: `${Math.max(1, r.h * store.scale)}px`,
  }
}

function regionLabel(r: CropRegion) {
  return `${Math.round(r.w)} × ${Math.round(r.h)}　x:${Math.round(r.x)} y:${Math.round(r.y)}`
}

function handleFromTarget(target: EventTarget | null): { handle: Handle; id: string } | null {
  const el = (target as HTMLElement | null)?.closest?.('[data-handle]') as HTMLElement | null
  if (!el) return null
  const handle = el.dataset.handle as Handle
  const id = el.closest('[data-region-id]')?.getAttribute('data-region-id') || ''
  return id && handle ? { handle, id } : null
}

function regionIdFromTarget(target: EventTarget | null): string | null {
  const el = (target as HTMLElement | null)?.closest?.('[data-region-id]') as HTMLElement | null
  return el?.dataset.regionId || null
}

function capture(e: PointerEvent) {
  try {
    viewportEl.value?.setPointerCapture(e.pointerId)
  } catch { /* 捕获失败时仍由 up 兜底复位 */ }
}

function onPointerDown(e: PointerEvent) {
  if (!store.image || drag.mode !== 'none') return
  const vp = viewportPoint(e)

  // 中键或按住空格 → 平移画布
  if (e.button === 1 || spaceHeld.value) {
    e.preventDefault()
    drag = { mode: 'pan', startVp: vp, startOffset: { ...store.offset }, moved: false }
    capture(e)
    return
  }
  if (e.button !== 0) return

  const hit = handleFromTarget(e.target)
  if (hit) {
    const region = store.regions.find((r) => r.id === hit.id)
    if (region) {
      store.select(hit.id)
      drag = { mode: 'resize', id: hit.id, handle: hit.handle, startVp: vp, start: { ...region }, moved: false }
      capture(e)
      return
    }
  }

  const regionId = regionIdFromTarget(e.target)
  if (regionId) {
    const region = store.regions.find((r) => r.id === regionId)
    if (region) {
      store.select(regionId)
      drag = { mode: 'move', id: regionId, startVp: vp, start: { ...region }, moved: false }
      capture(e)
      return
    }
  }

  // 空白：拖拽新建选区（beginDrawRegion 已记历史，过小拖拽会被 discard 弹回）
  const imgPt = toImagePoint(vp)
  const region = store.beginDrawRegion(Math.round(imgPt.x), Math.round(imgPt.y))
  drag = { mode: 'draw', id: region.id, startVp: vp, origin: imgPt, moved: false }
  capture(e)
}

function onPointerMove(e: PointerEvent) {
  if (drag.mode === 'none') return
  const vp = viewportPoint(e)
  const dx = vp.x - drag.startVp.x
  const dy = vp.y - drag.startVp.y
  const passed = Math.hypot(dx, dy) >= DRAG_THRESHOLD

  // move/resize：首次越过阈值才提交历史，纯点击不产生脏快照
  if (passed && !drag.moved && (drag.mode === 'move' || drag.mode === 'resize')) {
    store.commitHistory()
    drag.moved = true
  }

  if (drag.mode === 'pan') {
    store.offset = {
      x: drag.startOffset!.x + dx,
      y: drag.startOffset!.y + dy,
    }
    return
  }

  const imgPt = toImagePoint(vp)

  if (drag.mode === 'draw') {
    // 归一化负宽高（支持从右下往左上拖拽）
    store.updateRegion(drag.id!, {
      x: Math.round(Math.min(drag.origin!.x, imgPt.x)),
      y: Math.round(Math.min(drag.origin!.y, imgPt.y)),
      w: Math.round(Math.abs(imgPt.x - drag.origin!.x)),
      h: Math.round(Math.abs(imgPt.y - drag.origin!.y)),
    })
    return
  }

  if (drag.mode === 'move') {
    if (!drag.moved) return
    store.updateRegion(drag.id!, {
      x: Math.round(drag.start!.x + dx / store.scale),
      y: Math.round(drag.start!.y + dy / store.scale),
    })
    return
  }

  if (drag.mode === 'resize') {
    if (!drag.moved) return
    const { start, handle } = drag
    const MIN = 4
    let x = start.x, y = start.y, w = start.w, h = start.h
    if (handle!.includes('w')) {
      const right = start.x + start.w
      x = Math.min(imgPt.x, right - MIN)
      w = right - x
    }
    if (handle!.includes('e')) {
      w = Math.max(MIN, imgPt.x - start.x)
    }
    if (handle!.includes('n')) {
      const bottom = start.y + start.h
      y = Math.min(imgPt.y, bottom - MIN)
      h = bottom - y
    }
    if (handle!.includes('s')) {
      h = Math.max(MIN, imgPt.y - start.y)
    }
    store.updateRegion(drag.id!, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) })
  }
}

function onPointerUp() {
  if (drag.mode === 'draw') {
    const region = store.regions.find((r) => r.id === drag.id)
    if (!region || region.w < 3 || region.h < 3) store.discardRegion(drag.id!)
  } else if (drag.mode === 'move' && !drag.moved) {
    // 无拖动的点击：再次点击已选选区 → 取消选中（PRD 4.2 点击切换）
    if (store.selectedId === drag.id) store.select(null)
  }
  drag = { mode: 'none', startVp: { x: 0, y: 0 }, moved: false }
}

// ── 空格平移辅助 ─────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  if (e.code === 'Space' && !e.repeat) {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    spaceHeld.value = true
    e.preventDefault()
  }
}
function onKeyup(e: KeyboardEvent) {
  if (e.code === 'Space') spaceHeld.value = false
}

// ── 生命周期 ─────────────────────────────────────────
let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
  resizeObserver = new ResizeObserver(() => {
    if (store.image) fitToViewport(false)
  })
  if (viewportEl.value) resizeObserver.observe(viewportEl.value)
  await nextTick()
  if (store.image) fitToViewport(true)
  drawMask()
})

watch(
  () => store.image?.objectUrl,
  async (url) => {
    if (!url) return
    await nextTick()
    fitToViewport(true)
    drawMask()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onKeyup)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="viewportEl"
    class="relative flex-1 overflow-hidden bg-muted/40 select-none"
    :class="spaceHeld ? 'cursor-grab' : 'cursor-crosshair'"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @contextmenu.prevent
  >
    <!-- 图片 + 遮罩 + 选区层（同一平移坐标系） -->
    <div
      v-if="store.image"
      class="absolute top-0 left-0"
      :style="{ transform: `translate(${store.offset.x}px, ${store.offset.y}px)`, width: displayW + 'px', height: displayH + 'px' }"
    >
      <!-- 透明底棋盘格 -->
      <div
        class="absolute inset-0 opacity-40 dark:opacity-25"
        style="background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%); background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0;"
      />
      <img
        :src="store.image.objectUrl"
        class="absolute top-0 left-0 pointer-events-none"
        :style="{ width: displayW + 'px', height: displayH + 'px' }"
        draggable="false"
        alt=""
      />
      <canvas ref="maskCanvas" class="absolute top-0 left-0 pointer-events-none" />

      <!-- 选区交互层 -->
      <div
        v-for="r in store.regions"
        :key="r.id"
        :data-region-id="r.id"
        class="absolute cursor-move"
        :class="r.id === store.selectedId ? 'border-2 border-primary z-10' : 'border border-white/90 z-[5]'"
        :style="regionStyle(r)"
      >
        <span
          class="absolute bottom-full left-0 mb-1 px-1.5 py-0.5 rounded text-[11px] font-mono whitespace-nowrap pointer-events-none text-white bg-black/70"
          :class="{ 'bg-primary text-primary-foreground': r.id === store.selectedId }"
        >
          {{ regionLabel(r) }}
        </span>
        <template v-if="r.id === store.selectedId">
          <span
            v-for="h in HANDLES"
            :key="h"
            :data-handle="h"
            class="absolute w-2.5 h-2.5 bg-white border border-gray-400 rounded-sm shadow"
            :class="HANDLE_CLASS[h]"
          />
        </template>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!store.loading" class="absolute inset-0 grid place-items-center pointer-events-none">
      <div class="text-center text-muted-foreground space-y-2">
        <div class="text-4xl">🖼️</div>
        <div class="text-sm">拖入图片、点击上方「上传」或右键素材「多选区裁切」开始</div>
      </div>
    </div>

    <div v-if="store.loading" class="absolute inset-0 grid place-items-center bg-background/60">
      <div class="text-sm text-muted-foreground">图片加载中…</div>
    </div>
    <div v-if="store.loadError" class="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md bg-destructive/90 text-white text-xs">
      {{ store.loadError }}
    </div>

    <!-- 缩放百分比 -->
    <div v-if="store.image" class="absolute right-2 bottom-2 px-2 py-1 rounded bg-black/60 text-white/90 text-xs font-mono">
      {{ Math.round(store.scale * 100) }}%
    </div>
  </div>
</template>
