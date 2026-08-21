<template>
  <div v-if="visible" class="fixed inset-0 z-[100] bg-black/60 select-none" @contextmenu.prevent="cancel">
    <div v-if="imageUrl" ref="stage" class="absolute inset-4 overflow-hidden" @pointerdown="startSelect" @pointermove="moveSelect" @pointerup="finishSelect">
      <img :src="imageUrl" class="w-full h-full object-contain pointer-events-none" />
      <div v-if="selection" class="absolute border-2 border-primary bg-primary/10" :style="selectionStyle" />
    </div>
    <div class="absolute left-1/2 bottom-8 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-background/95 p-2 shadow-xl">
      <button class="px-3 py-1.5 text-sm rounded-md hover:bg-muted" @click="cancel">取消</button>
      <button class="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50" :disabled="!imageUrl || busy" @click="confirm">完成截图</button>
    </div>
    <div v-if="busy" class="absolute inset-0 flex items-center justify-center text-white">正在处理截图…</div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSettingsStore } from '../../stores/settings'
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void; (e: 'captured', file: File): void }>()
const settings = useSettingsStore()
const imageUrl = ref(''); const sourceData = ref(''); const stage = ref<HTMLElement>(); const busy = ref(false)
const start = ref<{ x: number; y: number }>(); const selection = ref<{ x: number; y: number; w: number; h: number }>()
const selectionStyle = computed(() => selection.value ? { left: `${selection.value.x}px`, top: `${selection.value.y}px`, width: `${selection.value.w}px`, height: `${selection.value.h}px` } : {})
watch(() => props.visible, async visible => { if (!visible) return; imageUrl.value = ''; selection.value = undefined; const result = await window.electronAPI?.invoke('screenshot:capture'); if (result?.success) { sourceData.value = result.data; imageUrl.value = result.data } })
function point(e: PointerEvent) { const r = stage.value!.getBoundingClientRect(); return { x: Math.max(0, Math.min(r.width, e.clientX - r.left)), y: Math.max(0, Math.min(r.height, e.clientY - r.top)) } }
function startSelect(e: PointerEvent) { start.value = point(e); selection.value = { ...start.value, w: 0, h: 0 } }
function moveSelect(e: PointerEvent) { if (!start.value) return; const p = point(e); selection.value = { x: Math.min(start.value.x, p.x), y: Math.min(start.value.y, p.y), w: Math.abs(p.x - start.value.x), h: Math.abs(p.y - start.value.y) } }
function finishSelect() { start.value = undefined }
function cancel() { emit('update:visible', false) }
async function confirm() {
  if (!imageUrl.value) return; busy.value = true
  try {
    const img = new Image(); img.src = sourceData.value; await img.decode(); const bounds = stage.value!.getBoundingClientRect(); const crop = selection.value && selection.value.w > 4 ? selection.value : { x: 0, y: 0, w: bounds.width, h: bounds.height }
    const scale = Math.min(bounds.width / img.width, bounds.height / img.height); const offsetX = (bounds.width - img.width * scale) / 2; const offsetY = (bounds.height - img.height * scale) / 2
    const sx = Math.max(0, (crop.x - offsetX) / scale); const sy = Math.max(0, (crop.y - offsetY) / scale); const sw = Math.min(img.width - sx, crop.w / scale); const sh = Math.min(img.height - sy, crop.h / scale)
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(sw)); canvas.height = Math.max(1, Math.round(sh)); canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    const format = settings.settings.screenshotFormat; const mime = `image/${format === 'jpeg' ? 'jpeg' : format}`; const dataUrl = canvas.toDataURL(mime, 0.92); const base64 = dataUrl.split(',')[1]; const date = new Date().toISOString().replace(/[:.]/g, '-')
    const pictures = await window.electronAPI?.app?.getPath('pictures'); const filePath = `${pictures || ''}/Mira Screenshots/screenshot-${date}.${format}`; await window.electronAPI?.invoke('fs:writeFile', filePath, base64, 'base64')
    if (settings.settings.screenshotCopyToClipboard) await window.electronAPI?.invoke('clipboard:writeImage', filePath)
    const file = await (await fetch(dataUrl)).blob(); emit('captured', new File([file], `screenshot-${date}.${format}`, { type: mime })); emit('update:visible', false)
  } finally { busy.value = false }
}
</script>
