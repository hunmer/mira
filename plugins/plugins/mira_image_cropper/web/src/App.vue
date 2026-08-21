<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import HeaderBar from '@/components/HeaderBar.vue'
import CropStage from '@/components/CropStage.vue'
import CropPanel from '@/components/CropPanel.vue'
import { getSelectedItems, isDark, logInfo, onThemeChanged } from '@/lib/host'
import { useCropperStore } from '@/stores/cropper'

/**
 * 组合根：顶栏 + 左侧交互画布 + 右侧裁切列表/导出。
 *   - 初始从宿主选中项建多图任务（query.media，见宿主 openPluginWindow 注入）
 *   - 整窗拖拽图片 / Ctrl+V 粘贴图片 → 载入
 *   - 快捷键：Delete 删除选中选区、Ctrl+Z / Ctrl+Shift+Z 撤销重做、Esc 取消选中
 *   - 主题跟随宿主（html.dark）
 */
const store = useCropperStore()
const stageRef = ref<InstanceType<typeof CropStage> | null>(null)
const headerRef = ref<InstanceType<typeof HeaderBar> | null>(null)
const dragging = ref(false)

// ── 主题 ─────────────────────────────────────────────
const unsubscribeTheme = onThemeChanged((dark) => {
  document.documentElement.classList.toggle('dark', dark)
})
document.documentElement.classList.toggle('dark', isDark())

// ── 初始任务：宿主选中项 ────────────────────────────
void getSelectedItems().then((items) => {
  if (items.length) void store.initFromMediaList(items)
})

// ── 拖拽 / 粘贴上传 ─────────────────────────────────
let dragDepth = 0
function onDragEnter(e: DragEvent) {
  if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return
  dragDepth += 1
  dragging.value = true
}
function onDragOver(e: DragEvent) {
  if (Array.from(e.dataTransfer?.types || []).includes('Files')) e.preventDefault()
}
function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) dragging.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  dragDepth = 0
  dragging.value = false
  const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'))
  if (file) void store.loadFromFile(file)
}

function onPaste(e: ClipboardEvent) {
  const file = Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith('image/'))
  if (file) void store.loadFromFile(file)
}

// ── 快捷键 ───────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  const key = e.key.toLowerCase()
  if (e.ctrlKey || e.metaKey) {
    if (key === 'z') {
      e.preventDefault()
      if (e.shiftKey) store.redo()
      else store.undo()
    } else if (key === 'y') {
      e.preventDefault()
      store.redo()
    }
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    store.removeSelected()
  } else if (e.key === 'Escape') {
    store.select(null)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('paste', onPaste)
  logInfo('[image-cropper] SPA ready')
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('paste', onPaste)
  unsubscribeTheme()
})
</script>

<template>
  <div
    class="h-full flex flex-col bg-background text-foreground"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <HeaderBar ref="headerRef" :stage="stageRef" />

    <main class="flex-1 flex min-h-0">
      <CropStage ref="stageRef" class="flex-1 flex flex-col min-w-0" />
      <CropPanel />
    </main>

    <!-- 拖拽遮罩 -->
    <div
      v-if="dragging"
      class="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-primary/10 backdrop-blur-[1px]"
    >
      <div class="border-2 border-dashed border-primary rounded-2xl px-10 py-8 text-center">
        <div class="text-3xl mb-2">📥</div>
        <div class="text-sm font-medium">松开以载入图片</div>
      </div>
    </div>
  </div>
</template>
