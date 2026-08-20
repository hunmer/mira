<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ImageDown } from '@lucide/vue'
import HeaderBar from '@/components/HeaderBar.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import TaskList from '@/components/TaskList.vue'

// 弹窗类组件异步加载:reka-ui Dialog 等依赖拆出主 chunk(本地文件加载,延迟可忽略)
const InputWarningDialog = defineAsyncComponent(() => import('@/components/InputWarningDialog.vue'))
const ExitConfirmDialog = defineAsyncComponent(() => import('@/components/ExitConfirmDialog.vue'))
const PreviewDialog = defineAsyncComponent(() => import('@/components/PreviewDialog.vue'))
import { t } from '@/lib/i18n'
import { getSelectedItems, isDark, logInfo, onThemeChanged, openExternal } from '@/lib/mira'
import { pinUrl } from '@/lib/pinterest'
import {
  activeItem,
  addDataTask,
  addTasks,
  closePreview,
  openPreview,
  previewNav,
  reSearch,
  saveItem,
  state,
} from '@/stores/tasks'

/**
 * 组合根：三栏布局（任务列表 / 种子图裁剪 / 结果瀑布流）+ 全局交互：
 *   - 初始从宿主选中项建任务（query.media）
 *   - 拖拽图片文件 / Ctrl+V 粘贴图片 → 新任务
 *   - 快捷键：+/- 缩放、Space 预览、S 保存、F 反向搜索、O 打开 Pin、←→ 翻页、Esc 关预览
 *   - Ctrl/Alt/⌘+滚轮调列宽；主题跟随宿主（html.dark）
 */

const SCALE_KEY = 'mira-pinterest-search-v2:scale'
const scale = ref(Number(localStorage.getItem(SCALE_KEY)) || 320)
const exitOpen = ref(false)
const dragging = ref(false)
const dragDepth = ref(0)

watch(scale, (value) => {
  const clamped = Math.min(720, Math.max(160, Math.round(value / 40) * 40))
  if (clamped !== value) scale.value = clamped
  localStorage.setItem(SCALE_KEY, String(clamped))
})

function zoom(direction: 1 | -1) {
  scale.value = Math.min(720, Math.max(160, scale.value + direction * 40))
}

function setScale(value: number) {
  scale.value = value
}

// ── 主题：跟随宿主 / 系统 ────────────────────────────────────────
const dark = ref(isDark())
watch(dark, (value) => document.documentElement.classList.toggle('dark', value), { immediate: true })
let unsubscribeTheme: (() => void) | null = null

// ── 初始任务：宿主选中项 ────────────────────────────────────────
void getSelectedItems().then((items) => {
  if (items.length) void addTasks(items)
})

// ── 快捷键 ──────────────────────────────────────────────────────
function onKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  const item = activeItem()

  if (event.key === '=' || event.key === '+') {
    zoom(1)
  } else if (event.key === '-') {
    zoom(-1)
  } else if (event.key === ' ') {
    event.preventDefault()
    if (state.preview.open) closePreview()
    else if (item) openPreview(item)
  } else if (event.key === 'ArrowLeft') {
    if (state.preview.open) {
      event.preventDefault()
      previewNav(-1)
    }
  } else if (event.key === 'ArrowRight') {
    if (state.preview.open) {
      event.preventDefault()
      previewNav(1)
    }
  } else if (event.key === 'Escape') {
    closePreview()
  } else if (event.key.toLowerCase() === 's') {
    if (item) void saveItem(item)
  } else if (event.key.toLowerCase() === 'f') {
    if (item) reSearch(item)
  } else if (event.key.toLowerCase() === 'o') {
    if (item) void openExternal(pinUrl(item.id))
  } else if (event.key.toLowerCase() === 't' && event.shiftKey) {
    // 置顶由 HeaderBar 内部管理，这里广播自定义事件触发其切换
    window.dispatchEvent(new CustomEvent('mps-v2:toggle-pin'))
  }
}

function onWheel(event: WheelEvent) {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    event.preventDefault()
    zoom(event.deltaY < 0 ? 1 : -1)
  }
}

// ── 粘贴图片 → 新任务 ───────────────────────────────────────────
let lastPaste = 0
function readImageMeta(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({ width: 0, height: 0 })
    image.src = dataUrl
  })
}

async function onPaste(event: ClipboardEvent) {
  if (Date.now() - lastPaste < 1000) return
  const file = Array.from(event.clipboardData?.files || []).find((f) => f.type.startsWith('image/'))
  if (!file) return
  lastPaste = Date.now()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const meta = await readImageMeta(dataUrl)
  addDataTask(dataUrl, meta.width, meta.height, file.name)
}

// ── 拖拽图片文件 → 新任务 ────────────────────────────────────────
async function onDrop(event: DragEvent) {
  dragging.value = false
  dragDepth.value = 0
  const files = Array.from(event.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
  for (const file of files) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const meta = await readImageMeta(dataUrl)
    addDataTask(dataUrl, meta.width, meta.height, file.name)
  }
}

function onDragEnter(event: DragEvent) {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return
  dragDepth.value++
  dragging.value = true
}

function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (!dragDepth.value) dragging.value = false
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
}

function onDropPrevent(event: DragEvent) {
  event.preventDefault()
  void onDrop(event)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('paste', onPaste)
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('drop', onDropPrevent)
  unsubscribeTheme = onThemeChanged((value) => {
    dark.value = value
  })
  logInfo('[mira-pinterest-search-v2] window ready')
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('paste', onPaste)
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('drop', onDropPrevent)
  unsubscribeTheme?.()
})
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-background text-foreground">
    <HeaderBar :scale="scale" @zoom="zoom" @scale="setScale" @close="exitOpen = true" />

    <div class="flex min-h-0 flex-1">
      <!-- 常显：空任务时也可经底部「+」从素材库添加图片建任务；
           种子图裁剪已移入 TaskList 左上角弹窗（原中栏常驻区移除） -->
      <TaskList />
      <ResultPanel :scale="scale" />
    </div>

    <!-- 拖拽整窗上传提示层 -->
    <div
      v-if="dragging"
      class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-primary/10 backdrop-blur-[1px]"
    >
      <div class="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary bg-background/90 px-10 py-8 text-center">
        <ImageDown class="size-8 text-primary" />
        <p class="text-sm">{{ t('dropzone.tip') }}</p>
      </div>
    </div>

    <PreviewDialog />
    <InputWarningDialog />
    <ExitConfirmDialog v-model:open="exitOpen" />
  </div>
</template>
