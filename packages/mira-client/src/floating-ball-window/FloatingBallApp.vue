<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createFloatingWindowBridge, type FloatingWindowBridge } from '../floating-window/bridge'

/** 拖入文件节点（本地文件带路径，浏览器图片带字节） */
interface DroppedFileNode {
  name: string
  path: string
  isDir: boolean
  size: number
  ext: string
  mimeType: string
  bytes?: number[]
}

const isDragging = ref(false)
const isDragover = ref(false)
const isFileReceived = ref(false)
/** 拖拽期间记录的起始光标位置（相对增量，主进程 setPosition） */
let dragStartCursor: { x: number; y: number } | null = null
/** 本次按下是否真的发生过位移（用于区分点击与拖拽） */
let dragMoved = false
let dragDepth = 0
let rafId = 0
let lastMove: { x: number; y: number } | null = null
let receivedTimer: number | null = null

const ballEl = ref<HTMLElement | null>(null)
let bridge: FloatingWindowBridge | null = null

// ============ 点击 / 右键 ============

function handleClick(): void {
  // 拖拽发生过则不触发点击
  if (dragMoved) {
    dragMoved = false
    return
  }
  bridge?.send({ type: 'fb-click', timestamp: Date.now() })
}

/** 右键菜单：仅发触发信号，主进程用 screen.getCursorScreenPoint() 取真实光标坐标 */
function handleContextMenu(): void {
  bridge?.send({ type: 'fb-context-menu', timestamp: Date.now() })
}

// ============ 自定义拖拽（全向自由移动，主进程 setPosition） ============

function handleDragStart(e: MouseEvent): void {
  // 仅左键触发
  if (e.button !== 0 || isDragging.value) return
  isDragging.value = true
  dragMoved = false
  dragStartCursor = { x: e.screenX, y: e.screenY }
  bridge?.send({ type: 'nt-drag-start', timestamp: Date.now() })
  e.preventDefault()
}

function handleDragMove(e: MouseEvent): void {
  if (!isDragging.value || !dragStartCursor) return
  // 记录最新光标位置，用 rAF 节流，避免 mousemove 高频发消息淹没主进程
  lastMove = { x: e.screenX, y: e.screenY }
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    if (!isDragging.value || !dragStartCursor || !lastMove) return
    const deltaX = lastMove.x - dragStartCursor.x
    const deltaY = lastMove.y - dragStartCursor.y
    // 任一方向有实际位移即视为拖拽
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) dragMoved = true
    bridge?.send({ type: 'nt-drag-move', deltaX, deltaY, timestamp: Date.now() })
  })
}

function handleDragEnd(): void {
  if (!isDragging.value) return
  isDragging.value = false
  dragStartCursor = null
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  bridge?.send({ type: 'nt-drag-end', timestamp: Date.now() })
}

// ============ 文件拖放 ============

function onDragEnter(e: DragEvent): void {
  // 必须无条件阻止默认行为，否则系统会显示不可投放光标，后续 drop 也不会派发。
  e.preventDefault()
  dragDepth += 1
  isDragover.value = true
}

function onDragOver(e: DragEvent): void {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  isDragover.value = true
}

function onDragLeave(): void {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDragover.value = false
}

async function onDrop(e: DragEvent): Promise<void> {
  e.preventDefault()
  dragDepth = 0
  isDragover.value = false
  const files = await collectDroppedFiles(e)
  if (files.length === 0) return
  playReceivedAnimation()
  bridge?.send({ type: 'fb-file-drop', files, timestamp: Date.now() })
}

/**
 * 从 drop 事件收集文件节点。
 * 本地文件只传真实路径；浏览器图片没有磁盘路径，需要携带字节供主窗口重建 File。
 */
async function collectDroppedFiles(e: DragEvent): Promise<DroppedFileNode[]> {
  const dt = e.dataTransfer
  if (!dt) return []
  const api: any = (window as any).electronAPI || {}
  const fileArr = Array.from(dt.files || [])
  const result: DroppedFileNode[] = []
  for (const f of fileArr) {
    let path = ''
    try {
      path = typeof api.getPathForFile === 'function' ? api.getPathForFile(f) : ''
    } catch (_) {
      path = ''
    }
    const name = f.name || ''
    const node: DroppedFileNode = {
      name,
      path,
      isDir: false,
      size: f.size || 0,
      ext: extractExt(name),
      mimeType: f.type || '',
    }
    if (!path && typeof f.arrayBuffer === 'function') {
      node.bytes = Array.from(new Uint8Array(await f.arrayBuffer()))
    }
    result.push(node)
  }
  return result
}

function extractExt(name: string): string {
  const idx = name.lastIndexOf('.')
  if (idx < 0) return ''
  return name.slice(idx + 1).toLowerCase()
}

/** 文件已成功接收：合拢文件夹并闪烁确认 */
function playReceivedAnimation(): void {
  isFileReceived.value = true
  if (receivedTimer !== null) window.clearTimeout(receivedTimer)
  receivedTimer = window.setTimeout(() => {
    isFileReceived.value = false
    receivedTimer = null
  }, 700)
}

/** 主窗口接受拖放后的回执：重播一次接收动画 */
function replayReceivedAnimation(): void {
  const ball = ballEl.value
  if (!ball) return
  ball.classList.remove('is-file-received')
  void ball.offsetWidth
  ball.classList.add('is-file-received')
  window.setTimeout(() => ball.classList.remove('is-file-received'), 700)
}

function preventDefault(e: Event): void {
  e.preventDefault()
}

// ============ 生命周期 ============

onMounted(() => {
  document.addEventListener('contextmenu', preventDefault)
  // Electron/macOS 对文件拖拽暴露的 dataTransfer.types 不完全一致，
  // 在窗口级监听确保拖到透明窗口边缘时也能显示接收状态。
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
  // 拖拽期间在 document 上追踪 mousemove/mouseup（鼠标离开窗口也能继续）
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)

  bridge = createFloatingWindowBridge({
    role: 'floating-ball',
    onMessage: (data) => {
      if (data.type === 'fb-drop-accepted') {
        replayReceivedAnimation()
      }
    },
    onReady: () => {
      bridge?.send({ type: 'fb-ready', timestamp: Date.now() })
    },
  })
  bridge.start()
})

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', preventDefault)
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  if (rafId) cancelAnimationFrame(rafId)
  if (receivedTimer !== null) window.clearTimeout(receivedTimer)
})
</script>

<template>
  <div class="flex h-full w-full items-center justify-center p-4">
    <div
      ref="ballEl"
      class="floating-ball fb-pulse"
      :class="{ 'is-dragging': isDragging, 'is-dragover': isDragover, 'is-file-received': isFileReceived }"
      title="拖拽移动 · 拖入文件上传 · 单击触发动作 · 右键打开菜单"
      @mousedown="handleDragStart"
      @click="handleClick"
      @contextmenu.prevent="handleContextMenu"
    >
      <div class="folder-back">
        <div class="folder-page page-left"><i></i><i></i><i></i><i></i></div>
        <div class="folder-page page-center"><i></i><i></i><i></i><i></i></div>
        <div class="folder-page page-right"><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="folder-front"></div>
      <div class="fb-drop-hint" :class="{ 'is-visible': isDragover }">松开导入</div>
    </div>
  </div>
</template>

<style scoped>
.floating-ball {
  width: 82px;
  height: 62px;
  cursor: grab;
  position: relative;
  perspective: 180px;
  transition: transform 0.2s ease, filter 0.2s ease;
  user-select: none;
  -webkit-user-select: none;
  pointer-events: auto;
  -webkit-app-region: no-drag;
}

.floating-ball:hover {
  transform: translateY(-2px) scale(1.04);
  filter: brightness(1.08);
}

.floating-ball.is-dragging {
  cursor: grabbing;
  transform: scale(0.96);
  transition: none;
}

.folder-back {
  position: absolute;
  inset: 7px 5px 3px;
  border-radius: 8px;
  background: #18151b;
  box-shadow: inset 0 0 7px 4px rgba(79, 73, 85, 0.22),
    0 4px 12px -3px rgba(79, 70, 229, 0.32), 0 2px 6px -1px rgba(0, 0, 0, 0.18);
}

.folder-back::before {
  content: '';
  position: absolute;
  top: -7px;
  left: 5px;
  width: 32px;
  height: 12px;
  border-radius: 7px 7px 0 0;
  background: #211c26;
}

.folder-front {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  bottom: 0;
  height: 45px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px 7px 11px 11px;
  background: linear-gradient(180deg, rgba(66, 56, 76, 0.96), rgba(35, 31, 40, 0.98));
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.08), 0 2px 5px rgba(0, 0, 0, 0.18);
  transform-origin: bottom center;
  transition: transform 0.42s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.2s ease;
}

.folder-page {
  position: absolute;
  z-index: 10;
  top: 6px;
  left: 50%;
  width: 38px;
  height: 47px;
  padding: 7px 5px;
  border-radius: 5px;
  background: linear-gradient(180deg, #f0eff6, #d9d7e5);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
  transition: transform 0.48s cubic-bezier(0.2, 0.9, 0.2, 1);
}

.folder-page i {
  display: block;
  height: 3px;
  margin-bottom: 4px;
  border-radius: 3px;
  background: #c5c2d6;
}

.page-left { transform: translateX(-50%) rotate(-3deg); }
.page-center { transform: translateX(-50%); z-index: 12; }
.page-right { transform: translateX(-50%) rotate(3deg); }

.floating-ball.is-dragover {
  transform: translateY(-2px) scale(1.04);
  filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.55));
}

.floating-ball.is-dragover .folder-front {
  transform: rotateX(-38deg);
  background: linear-gradient(180deg, rgba(43, 107, 85, 0.98), rgba(24, 68, 56, 0.98));
}

.floating-ball.is-dragover .page-left { transform: translate(-115%, -31px) rotate(-12deg); }
.floating-ball.is-dragover .page-center { transform: translate(-50%, -38px) rotate(1deg); }
.floating-ball.is-dragover .page-right { transform: translate(15%, -32px) rotate(11deg); }

/* 文件已成功接收：合拢文件夹并闪烁确认 */
@keyframes fb-received {
  0% { transform: scale(1.04); filter: drop-shadow(0 0 0 rgba(16, 185, 129, 0)); }
  42% { transform: scale(1.14); filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.85)); }
  100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(16, 185, 129, 0)); }
}

.floating-ball.fb-pulse.is-file-received {
  animation: fb-received 0.7s ease-out;
}

.floating-ball.is-file-received .folder-front {
  background: #10b981;
}

/* 文件夹待机呼吸 */
@keyframes fb-pulse {
  0%, 100% { filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.14)); }
  50% { filter: drop-shadow(0 4px 7px rgba(99, 102, 241, 0.22)); }
}

.floating-ball.fb-pulse {
  animation: fb-pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 拖拽/拖入期间关闭呼吸动画，避免抖动 */
.floating-ball.is-dragging.fb-pulse,
.floating-ball.is-dragover.fb-pulse {
  animation: none;
}

/* 拖入提示文字 */
.fb-drop-hint {
  position: absolute;
  top: -31px;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: #fff;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.fb-drop-hint.is-visible {
  opacity: 1;
}
</style>
