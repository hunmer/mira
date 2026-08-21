<template>
  <div v-if="visible" class="fixed inset-0 z-[100] bg-black/70 select-none" @contextmenu.prevent="cancel">
    <div ref="stage" class="absolute inset-4 overflow-hidden">
      <img v-if="imageUrl" ref="imageElement" :src="imageUrl" class="h-full w-full object-contain pointer-events-none" @load="syncCanvas" />
      <canvas
        v-if="imageUrl"
        ref="canvas"
        class="absolute touch-none"
        :class="tool === 'text' ? 'cursor-text' : tool === 'select' ? 'cursor-crosshair' : 'cursor-crosshair'"
        :style="frameStyle"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
      />
      <div v-if="selection" class="absolute border-2 border-primary pointer-events-none" :style="selectionStyle">
        <span class="absolute -top-7 left-0 rounded bg-black/75 px-2 py-1 text-xs text-white">{{ Math.round(selection.w * imageScale) }} × {{ Math.round(selection.h * imageScale) }}</span>
      </div>
      <input
        v-if="textEditor"
        ref="textInput"
        v-model="textValue"
        class="absolute z-10 min-w-40 rounded border border-primary bg-background px-2 py-1 text-sm text-foreground shadow-lg outline-none"
        :style="textEditorStyle"
        placeholder="输入文字，回车确认"
        @keydown.enter.prevent="commitText"
        @keydown.esc.prevent="discardText"
        @blur="commitText"
      />
    </div>

    <div class="absolute left-1/2 bottom-8 -translate-x-1/2 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-2 shadow-xl backdrop-blur">
      <button v-for="item in tools" :key="item.id" type="button" class="tool-button" :class="tool === item.id && 'bg-primary text-primary-foreground'" :title="item.label" @click="tool = item.id">
        <component :is="item.icon" class="size-4" />
      </button>
      <div class="mx-1 h-6 w-px bg-border" />
      <label class="tool-button cursor-pointer" title="标注颜色">
        <span class="size-4 rounded-full border border-border" :style="{ backgroundColor: color }" />
        <input v-model="color" type="color" class="sr-only" />
      </label>
      <select v-model.number="lineWidth" class="h-8 rounded-md border border-border bg-background px-2 text-xs" title="线条粗细">
        <option :value="2">细</option><option :value="4">中</option><option :value="8">粗</option>
      </select>
      <button type="button" class="tool-button" title="撤销" :disabled="commands.length === 0" @click="undo"><Undo2 class="size-4" /></button>
      <button type="button" class="tool-button" title="重做" :disabled="redoCommands.length === 0" @click="redo"><Redo2 class="size-4" /></button>
      <div class="mx-1 h-6 w-px bg-border" />
      <button type="button" class="tool-button" title="取消" @click="cancel"><X class="size-4" /></button>
      <button type="button" class="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50" :disabled="!imageUrl || busy" @click="confirm"><Check class="size-4" />完成</button>
    </div>
    <div v-if="busy" class="absolute inset-0 flex items-center justify-center bg-black/35 text-sm text-white">正在处理截图...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowUpRight, Check, Circle, Grid3X3, MousePointer2, Pencil, Redo2, Square, Type, Undo2, X } from 'lucide-vue-next'
import { useSettingsStore } from '../../stores/settings'

type Tool = 'select' | 'pen' | 'mosaic' | 'text' | 'arrow' | 'rect' | 'ellipse'
type Point = { x: number; y: number }
type Box = Point & { w: number; h: number }
type DrawCommand =
  | { type: 'pen' | 'mosaic'; points: Point[]; color: string; width: number }
  | { type: 'text'; point: Point; text: string; color: string; width: number }
  | { type: 'arrow' | 'rect' | 'ellipse'; start: Point; end: Point; color: string; width: number }

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void; (e: 'captured', file: File): void }>()
const settings = useSettingsStore()
const stage = ref<HTMLElement>(); const imageElement = ref<HTMLImageElement>(); const canvas = ref<HTMLCanvasElement>()
const imageUrl = ref(''); const sourceData = ref(''); const busy = ref(false); const frame = ref<Box>({ x: 0, y: 0, w: 0, h: 0 })
const tool = ref<Tool>('select'); const color = ref('#ef4444'); const lineWidth = ref(4)
const selection = ref<Box>(); const pointerStart = ref<Point>(); const draft = ref<DrawCommand>()
const commands = ref<DrawCommand[]>([]); const redoCommands = ref<DrawCommand[]>([])
const textEditor = ref<Point>(); const textValue = ref(''); const textInput = ref<HTMLInputElement>()
const tools = [
  { id: 'select' as const, label: '选择区域', icon: MousePointer2 }, { id: 'pen' as const, label: '画笔', icon: Pencil },
  { id: 'mosaic' as const, label: '马赛克', icon: Grid3X3 }, { id: 'text' as const, label: '文字', icon: Type },
  { id: 'arrow' as const, label: '箭头', icon: ArrowUpRight }, { id: 'rect' as const, label: '矩形', icon: Square },
  { id: 'ellipse' as const, label: '椭圆', icon: Circle },
]
const frameStyle = computed(() => ({ left: `${frame.value.x}px`, top: `${frame.value.y}px`, width: `${frame.value.w}px`, height: `${frame.value.h}px` }))
const selectionStyle = computed(() => selection.value ? ({ left: `${frame.value.x + selection.value.x}px`, top: `${frame.value.y + selection.value.y}px`, width: `${selection.value.w}px`, height: `${selection.value.h}px` }) : {})
const textEditorStyle = computed(() => textEditor.value ? ({ left: `${frame.value.x + textEditor.value.x}px`, top: `${frame.value.y + textEditor.value.y}px`, color: color.value }) : {})
const imageScale = computed(() => imageElement.value && frame.value.w ? imageElement.value.naturalWidth / frame.value.w : 1)

watch(() => props.visible, async visible => {
  if (!visible) return
  resetEditor()
  const result = await window.electronAPI?.invoke('screenshot:get-source')
  if (result?.success) { sourceData.value = result.data; imageUrl.value = result.data; await nextTick() }
}, { immediate: true })

function resetEditor() { imageUrl.value = ''; selection.value = undefined; commands.value = []; redoCommands.value = []; draft.value = undefined; tool.value = 'select'; discardText() }
function syncCanvas() {
  if (!stage.value || !imageElement.value || !canvas.value) return
  const area = stage.value.getBoundingClientRect(); const ratio = imageElement.value.naturalWidth / imageElement.value.naturalHeight
  let w = area.width; let h = w / ratio
  if (h > area.height) { h = area.height; w = h * ratio }
  frame.value = { x: (area.width - w) / 2, y: (area.height - h) / 2, w, h }
  const dpr = window.devicePixelRatio || 1; canvas.value.width = Math.round(w * dpr); canvas.value.height = Math.round(h * dpr)
  redraw()
}
function localPoint(e: PointerEvent): Point { const rect = canvas.value!.getBoundingClientRect(); return { x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)) } }
function handlePointerDown(e: PointerEvent) {
  if (busy.value) return
  canvas.value?.setPointerCapture(e.pointerId); const p = localPoint(e); pointerStart.value = p
  if (tool.value === 'text') { textEditor.value = p; textValue.value = ''; nextTick(() => textInput.value?.focus()); return }
  if (tool.value === 'select') selection.value = { ...p, w: 0, h: 0 }
  else if (tool.value === 'pen' || tool.value === 'mosaic') draft.value = { type: tool.value, points: [p], color: color.value, width: lineWidth.value }
  else draft.value = { type: tool.value, start: p, end: p, color: color.value, width: lineWidth.value }
}
function handlePointerMove(e: PointerEvent) {
  if (!pointerStart.value) return; const p = localPoint(e)
  if (tool.value === 'select') selection.value = normalizedBox(pointerStart.value, p)
  else if (draft.value?.type === 'pen' || draft.value?.type === 'mosaic') draft.value.points.push(p)
  else if (draft.value && 'end' in draft.value) draft.value.end = p
  redraw()
}
function handlePointerUp(e: PointerEvent) {
  if (!pointerStart.value) return; canvas.value?.releasePointerCapture(e.pointerId)
  if (tool.value === 'select' && selection.value && (selection.value.w < 4 || selection.value.h < 4)) selection.value = undefined
  else if (draft.value) pushCommand(draft.value)
  pointerStart.value = undefined; draft.value = undefined; redraw()
}
function normalizedBox(a: Point, b: Point): Box { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) } }
function pushCommand(command: DrawCommand) { commands.value.push(command); redoCommands.value = [] }
function undo() { const item = commands.value.pop(); if (item) redoCommands.value.push(item); redraw() }
function redo() { const item = redoCommands.value.pop(); if (item) commands.value.push(item); redraw() }
function commitText() { if (textEditor.value && textValue.value.trim()) pushCommand({ type: 'text', point: textEditor.value, text: textValue.value.trim(), color: color.value, width: lineWidth.value }); discardText(); redraw() }
function discardText() { textEditor.value = undefined; textValue.value = '' }

function redraw() {
  const target = canvas.value; if (!target) return
  const ctx = target.getContext('2d')!; const dpr = window.devicePixelRatio || 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, frame.value.w, frame.value.h)
  for (const command of commands.value) drawCommand(ctx, command, 1, imageElement.value)
  if (draft.value) drawCommand(ctx, draft.value, 1, imageElement.value)
}
function drawCommand(ctx: CanvasRenderingContext2D, command: DrawCommand, scale: number, source?: HTMLImageElement) {
  ctx.save(); ctx.strokeStyle = command.color; ctx.fillStyle = command.color; ctx.lineWidth = command.width * scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const p = (point: Point) => ({ x: point.x * scale, y: point.y * scale })
  if (command.type === 'pen') { const points = command.points.map(p); ctx.beginPath(); points.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke() }
  else if (command.type === 'mosaic' && source) {
    const cell = Math.max(8, command.width * 3) * scale; const srcScale = source.naturalWidth / frame.value.w
    for (const point of command.points) { const q = p(point); const sx = Math.max(0, point.x * srcScale - cell / 2); const sy = Math.max(0, point.y * srcScale - cell / 2); ctx.imageSmoothingEnabled = false; ctx.drawImage(source, sx, sy, cell, cell, q.x - cell / 2, q.y - cell / 2, cell, cell) }
  } else if (command.type === 'text') { const q = p(command.point); ctx.font = `${Math.max(14, command.width * 5) * scale}px sans-serif`; ctx.fillText(command.text, q.x, q.y) }
  else if ('start' in command) {
    const a = p(command.start); const b = p(command.end); ctx.beginPath()
    if (command.type === 'rect') ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y)
    else if (command.type === 'ellipse') ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2)
    else { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); const angle = Math.atan2(b.y - a.y, b.x - a.x); const head = 12 * scale; ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 6), b.y - head * Math.sin(angle - Math.PI / 6)); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 6), b.y - head * Math.sin(angle + Math.PI / 6)) }
    ctx.stroke()
  }
  ctx.restore()
}
function cancel() { emit('update:visible', false) }
async function confirm() {
  if (!imageElement.value) return; busy.value = true
  try {
    commitText(); const img = imageElement.value; const crop = selection.value || { x: 0, y: 0, w: frame.value.w, h: frame.value.h }; const scale = img.naturalWidth / frame.value.w
    const output = document.createElement('canvas'); output.width = Math.max(1, Math.round(crop.w * scale)); output.height = Math.max(1, Math.round(crop.h * scale)); const ctx = output.getContext('2d')!
    ctx.drawImage(img, crop.x * scale, crop.y * scale, crop.w * scale, crop.h * scale, 0, 0, output.width, output.height)
    ctx.save(); ctx.translate(-crop.x * scale, -crop.y * scale); for (const command of commands.value) drawCommand(ctx, command, scale, img); ctx.restore()
    const format = settings.settings.screenshotFormat; const mime = `image/${format === 'jpeg' ? 'jpeg' : format}`; const dataUrl = output.toDataURL(mime, 0.92); const base64 = dataUrl.split(',')[1]; const date = new Date().toISOString().replace(/[:.]/g, '-')
    const pictures = await window.electronAPI?.app?.getPath('pictures'); const filePath = `${pictures || ''}/Mira Screenshots/screenshot-${date}.${format}`; await window.electronAPI?.invoke('fs:writeFile', filePath, base64, 'base64')
    if (settings.settings.screenshotCopyToClipboard) await window.electronAPI?.invoke('clipboard:writeImage', filePath)
    const blob = await (await fetch(dataUrl)).blob(); emit('captured', new File([blob], `screenshot-${date}.${format}`, { type: mime })); emit('update:visible', false)
  } finally { busy.value = false }
}
function handleKeydown(e: KeyboardEvent) { if (!props.visible) return; if (e.key === 'Escape') cancel(); else if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() } else if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); redo() } }
window.addEventListener('resize', syncCanvas); window.addEventListener('keydown', handleKeydown)
onBeforeUnmount(() => { window.removeEventListener('resize', syncCanvas); window.removeEventListener('keydown', handleKeydown) })
</script>

<style scoped>
.tool-button { display: inline-flex; height: 2rem; width: 2rem; align-items: center; justify-content: center; border-radius: 0.375rem; color: var(--muted-foreground); transition: color 150ms, background-color 150ms; }
.tool-button:hover:not(:disabled) { background: var(--muted); color: var(--foreground); }
.tool-button:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
