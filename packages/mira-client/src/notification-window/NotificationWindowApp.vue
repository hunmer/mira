<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Toaster } from '@/components/ui/sonner'
import NotificationCard from './NotificationCard.vue'
import { createNotificationBridge, type NotificationBridge } from './bridge'
import type {
  FloatingWindowPosition,
  NotificationAction,
  NotificationPayload,
} from '../shared/types'

/** 主进程下发的通知条目（payload + 窗口内部稳定键） */
type NotificationItem = NotificationPayload & { __itemKey?: number }

/** vue-sonner 位置（该联合类型未从包内导出，本地声明） */
type ToasterPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center'

const isDark = ref(false)
const toasterPosition = ref<ToasterPosition>('bottom-right')

/** 活跃 toast id 集合，与主进程下发的 items 保持对齐 */
const activeIds = new Set<string | number>()
let bridge: NotificationBridge | null = null
let lastReportedHeight = 0
let pollTimer: number | null = null
/** 指针是否位于通知卡片上（驱动鼠标穿透切换与悬停暂停） */
let pointerOverToast = false

function toastIdOf(item: NotificationItem, index: number): string | number {
  return item.notificationId ?? `item-${item.__itemKey ?? index}`
}

/** 主进程屏幕位置 → Toaster 位置（center / 自定义坐标按右下角处理） */
function mapPosition(position?: FloatingWindowPosition): ToasterPosition {
  switch (position) {
    case 'top-left':
      return 'top-left'
    case 'top-right':
      return 'top-right'
    case 'bottom-left':
      return 'bottom-left'
    case 'top':
      return 'top-center'
    case 'bottom':
      return 'bottom-center'
    default:
      return 'bottom-right'
  }
}

/** 以主进程 items 为唯一数据源，创建 / 更新 / 移除对应 toast */
function syncToasts(payload: NotificationPayload): void {
  const items: NotificationItem[] = Array.isArray((payload as any).__items)
    ? (payload as any).__items
    : [payload]
  toasterPosition.value = mapPosition(payload.position)

  const ids = new Set<string | number>()
  items.forEach((item, index) => {
    const id = toastIdOf(item, index)
    ids.add(id)
    toast.custom(NotificationCard, {
      id,
      // 自动消失由主进程计时（notification-auto-hide），渲染层常驻
      duration: Infinity,
      unstyled: true,
      componentProps: {
        item,
        onClick: () => sendClick(item),
        onAction: (action: NotificationAction) => sendAction(item, action),
        onClose: () => sendDismissItem(item, index),
      },
    })
  })
  for (const id of activeIds) {
    if (!ids.has(id)) toast.dismiss(id)
  }
  activeIds.clear()
  ids.forEach((id) => activeIds.add(id))
  scheduleMeasure()
}

function sendClick(item: NotificationItem): void {
  bridge?.send({
    type: 'click',
    data: item.data ?? null,
    notificationId: item.notificationId,
    timestamp: Date.now(),
  })
}

function sendAction(item: NotificationItem, action: NotificationAction): void {
  bridge?.send({
    type: 'action',
    id: action.id,
    data: item.data ?? null,
    notificationId: item.notificationId,
    timestamp: Date.now(),
  })
}

function sendDismissItem(item: NotificationItem, index: number): void {
  bridge?.send({
    type: 'dismiss-item',
    notificationId: item.notificationId,
    index,
    timestamp: Date.now(),
  })
}

// ============ 高度测量 ============

/**
 * 测量 toast 列表实际占用高度。
 * vue-sonner 的 li 为 absolute 定位（ol 高度恒为 0），必须遍历 li 取包围盒。
 */
function measureToasterHeight(): number {
  const items = document.querySelectorAll('[data-sonner-toaster] li[data-sonner-toast]')
  if (items.length === 0) return 0
  let top = Infinity
  let bottom = -Infinity
  items.forEach((li) => {
    const rect = li.getBoundingClientRect()
    if (rect.height === 0) return
    top = Math.min(top, rect.top)
    bottom = Math.max(bottom, rect.bottom)
  })
  if (top === Infinity) return 0
  return Math.ceil(bottom - top) + 4
}

/** 高度变化时上报，主进程据此调整窗口尺寸并重定位 */
function reportMeasure(): void {
  const height = measureToasterHeight()
  if (height > 0 && height !== lastReportedHeight) {
    lastReportedHeight = height
    bridge?.send({ type: 'measure-ready', height, timestamp: Date.now() })
  }
}

/** 内容变化后立即测一次，并在 toast 进出动画结束后（~400ms）再修正一次 */
function scheduleMeasure(): void {
  nextTick(reportMeasure)
  window.setTimeout(reportMeasure, 450)
}

// ============ 鼠标穿透 ============

/**
 * 窗口默认整体穿透（主进程 setIgnoreMouseEvents(true, { forward: true })），
 * forward 会把 mousemove 转发给页面：据此判断指针是否位于卡片上，
 * 在「卡片可交互」与「空白区域点击穿透到底层应用」之间动态切换。
 */
function handlePointerMove(event: MouseEvent): void {
  const target = document.elementFromPoint(event.clientX, event.clientY)
  const overToast = !!target?.closest('li[data-sonner-toast]')
  if (overToast === pointerOverToast) return
  pointerOverToast = overToast
  bridge?.send({ type: 'set-mouse-events', ignore: !overToast, timestamp: Date.now() })
  // 悬停暂停 / 恢复自动消失与穿透状态联动
  bridge?.send({ type: overToast ? 'hover-pause' : 'hover-resume', timestamp: Date.now() })
}

/** 指针从卡片直接划出窗口（未经过空白区触发 mousemove 切换）时兜底恢复穿透与计时 */
function handleWindowMouseOut(event: MouseEvent): void {
  if (event.relatedTarget !== null || !pointerOverToast) return
  pointerOverToast = false
  bridge?.send({ type: 'set-mouse-events', ignore: true, timestamp: Date.now() })
  bridge?.send({ type: 'hover-resume', timestamp: Date.now() })
}

onMounted(() => {
  document.addEventListener('contextmenu', preventDefault)
  document.addEventListener('dragover', preventDefault)
  document.addEventListener('drop', preventDefault)
  document.addEventListener('mousemove', handlePointerMove)
  document.addEventListener('mouseout', handleWindowMouseOut)

  bridge = createNotificationBridge({
    role: 'notification',
    onMessage: (data) => {
      if (data.type === 'notification-content' && data.payload) {
        syncToasts(data.payload)
      } else if (data.type === 'notification-auto-hide') {
        for (const id of activeIds) toast.dismiss(id)
        activeIds.clear()
      }
    },
    onReady: () => {
      bridge?.send({ type: 'notification-ready', timestamp: Date.now() })
    },
    onTheme: (dark) => {
      isDark.value = dark
    },
  })
  bridge.start()

  // 兜底轮询：覆盖动画期间的高度渐变与任何漏测时机
  pollTimer = window.setInterval(reportMeasure, 250)
})

onUnmounted(() => {
  document.removeEventListener('contextmenu', preventDefault)
  document.removeEventListener('dragover', preventDefault)
  document.removeEventListener('drop', preventDefault)
  document.removeEventListener('mousemove', handlePointerMove)
  document.removeEventListener('mouseout', handleWindowMouseOut)
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
})

function preventDefault(e: Event): void {
  e.preventDefault()
}
</script>

<template>
  <div class="h-full w-full">
    <Toaster
      :theme="isDark ? 'dark' : 'light'"
      :position="toasterPosition"
      :expand="true"
      :visible-toasts="10"
      :gap="8"
      offset="0px"
      :duration="Infinity"
      :close-button="false"
      :style="{ '--width': '340px' }"
    />
  </div>
</template>

<style>
/* Material Icons 本地字体（卡片类型图标用，经 Vite 资源管线打包） */
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url('../../assets/fonts/material-icons.ttf') format('truetype');
}

.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}

/* 通知窗口为透明无边框 BrowserWindow，覆盖 main.css 的 body 不透明背景 */
body {
  background: transparent !important;
  overflow: hidden;
}
</style>
