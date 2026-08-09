<script setup lang="ts">
/**
 * ServerControlDialog —— 本地后端运行控制对话框。
 *
 * 功能：
 * - 顶部展示后端健康状态与 PID（来自 server-control:status）
 * - 启用 / 停止 / 重启 三个按钮（调用 server-control IPC）
 * - 日志区通过 SSE（GET /api/logs/stream）回放最近 100 条历史 + 实时推送
 * - 启停动作的 stdout 行也会追加到日志区（server-control:progress）
 *
 * SSE 仅在对话框打开时建立；关闭 / 卸载时断开，避免泄漏。
 */
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { miraSDKService } from '@renderer/services/MiraSDKService'

defineOptions({ name: 'ServerControlDialog' })

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const { t } = useI18n()

interface LogEntry {
  timestamp?: string
  level?: 'log' | 'error' | 'warn'
  line: string
}

/** 渲染用日志条目（含 SSE 实时日志 + 启停动作反馈行） */
interface RenderLog {
  time: string
  level: 'log' | 'error' | 'warn' | 'action'
  text: string
}

const logs = ref<RenderLog[]>([])
const logContainer = ref<HTMLElement | null>(null)
const autoScroll = ref(true)

const healthy = ref<boolean | null>(null)
const pid = ref<number | null>(null)
const statusLoading = ref(false)
/** 当前正在执行的动作（null = 空闲），用于禁用按钮 */
const pendingAction = ref<'start' | 'stop' | 'restart' | null>(null)
/** SSE 断连标记 */
const sseConnected = ref(false)

let eventSource: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let statusTimer: ReturnType<typeof setTimeout> | null = null

const statusText = computed(() => {
  if (healthy.value === null) return t('business.serverControlDialog.statusUnknown')
  return healthy.value ? t('business.serverControlDialog.statusRunning') : t('business.serverControlDialog.statusStopped')
})

/** 把任意日志条目规范化为渲染条目 */
function toRenderLog(entry: LogEntry | string, level: RenderLog['level'] = 'log'): RenderLog {
  if (typeof entry === 'string') {
    return { time: new Date().toLocaleTimeString(), level, text: entry }
  }
  return {
    time: entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
    level: entry.level || level,
    text: entry.line,
  }
}

function appendLog(entry: RenderLog) {
  logs.value.push(entry)
  // 限制本地条数，避免长时间运行内存膨胀
  if (logs.value.length > 500) logs.value.splice(0, logs.value.length - 500)
  if (autoScroll.value) {
    nextTick(scrollToBottom)
  }
}

function scrollToBottom() {
  const el = logContainer.value
  if (el) el.scrollTop = el.scrollHeight
}

/** 日志容器滚动：用户主动上滚时暂停自动跟随 */
function onLogScroll() {
  const el = logContainer.value
  if (!el) return
  autoScroll.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

// ───────── SSE ─────────
function getStreamUrl(): string | null {
  const base = (miraSDKService.getConnectionConfig()?.serverUrl || '').replace(/\/$/, '')
  if (!base) return null
  return `${base}/api/logs/stream`
}

function connectSSE() {
  disconnectSSE()
  const url = getStreamUrl()
  if (!url) return

  try {
    eventSource = new EventSource(url)
  } catch {
    scheduleReconnect()
    return
  }

  eventSource.addEventListener('open', () => {
    sseConnected.value = true
    reconnectAttempts = 0
  })

  // 历史回放（最近 100 条）
  eventSource.addEventListener('history', (e: MessageEvent) => {
    try {
      const history = JSON.parse(e.data) as LogEntry[]
      if (Array.isArray(history)) {
        logs.value = [] // 历史为权威来源，重置本地
        history.forEach(item => appendLog(toRenderLog(item)))
      }
    } catch {
      /* 忽略解析失败 */
    }
  })

  // 实时日志
  eventSource.onmessage = (e: MessageEvent) => {
    try {
      const entry = JSON.parse(e.data) as LogEntry
      appendLog(toRenderLog(entry))
    } catch {
      appendLog(toRenderLog(e.data))
    }
  }

  eventSource.onerror = () => {
    sseConnected.value = false
    eventSource?.close()
    eventSource = null
    scheduleReconnect()
  }
}

function disconnectSSE() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempts = 0
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  sseConnected.value = false
}

function scheduleReconnect() {
  if (reconnectTimer) return
  // 指数退避，上限 10s
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000)
  reconnectAttempts += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (props.open) connectSSE()
  }, delay)
}

// ───────── 状态查询 ─────────
async function refreshStatus() {
  statusLoading.value = true
  try {
    const res = await window.electronAPI.serverControl.status()
    if (res.success && res.status) {
      healthy.value = res.status.healthy
      pid.value = res.status.pid
    } else {
      healthy.value = false
      pid.value = null
    }
  } catch {
    healthy.value = null
    pid.value = null
  } finally {
    statusLoading.value = false
  }
}

/** 启动 / 重启后轮询状态直到 healthy 或超时 */
function pollUntilSettled(totalAttempts = 20, intervalMs = 1000) {
  if (statusTimer) clearTimeout(statusTimer)
  let attempts = 0
  const tick = () => {
    attempts += 1
    refreshStatus().then(() => {
      if (healthy.value || attempts >= totalAttempts) {
        if (statusTimer) {
          clearTimeout(statusTimer)
          statusTimer = null
        }
        return
      }
      statusTimer = setTimeout(tick, intervalMs)
    })
  }
  tick()
}

// ───────── 控制动作 ─────────
async function runAction(action: 'start' | 'stop' | 'restart') {
  if (pendingAction.value) return
  pendingAction.value = action
  const labelKeyMap = { start: 'actionStart', stop: 'actionStop', restart: 'actionRestart' } as const
  appendLog(toRenderLog(t(`business.serverControlDialog.${labelKeyMap[action]}Begin`), 'action'))
  try {
    const res = await window.electronAPI.serverControl[action]()
    appendLog(toRenderLog(
      res.success ? t(`business.serverControlDialog.${labelKeyMap[action]}Complete`) : t(`business.serverControlDialog.${labelKeyMap[action]}Failed`, { message: res.message || t('business.serverControlDialog.statusUnknown') }),
      res.success ? 'action' : 'error',
    ))
    // 启动 / 重启后轮询健康；停止直接刷新一次
    if (action === 'start' || action === 'restart') {
      pollUntilSettled()
    } else {
      refreshStatus()
    }
  } catch (error) {
    appendLog(toRenderLog(t(`business.serverControlDialog.${labelKeyMap[action]}Error`, { message: error instanceof Error ? error.message : String(error) }), 'error'))
    refreshStatus()
  } finally {
    pendingAction.value = null
  }
}

// ───────── 监听启停进度（把脚本 stdout 行也显示在日志区） ─────────
function onProgress(progress: {
  type: 'data' | 'done'
  action: 'start' | 'stop' | 'restart'
  line?: string
  success?: boolean
  message?: string
}) {
  if (progress.type === 'data' && progress.line) {
    appendLog(toRenderLog(progress.line, 'action'))
  }
}

window.electronAPI.serverControl.onProgress(onProgress)

// ───────── 打开 / 关闭联动 ─────────
watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      logs.value = []
      autoScroll.value = true
      connectSSE()
      refreshStatus()
    } else {
      disconnectSSE()
      if (statusTimer) {
        clearTimeout(statusTimer)
        statusTimer = null
      }
    }
  },
)

onUnmounted(() => {
  disconnectSSE()
  window.electronAPI.serverControl.removeProgressListener()
  if (statusTimer) clearTimeout(statusTimer)
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[760px] flex flex-col max-h-[85vh]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span class="material-icons text-primary">dns</span>
          {{ $t('business.serverControlDialog.title') }}
        </DialogTitle>
        <DialogDescription class="sr-only">{{ $t('business.serverControlDialog.description') }}</DialogDescription>
      </DialogHeader>

      <!-- 状态栏 -->
      <div class="flex items-center gap-3 flex-wrap text-sm">
        <div class="flex items-center gap-1.5">
          <span
            class="inline-block w-2 h-2 rounded-full"
            :class="healthy === null ? 'bg-muted-foreground' : healthy ? 'bg-green-500' : 'bg-red-500'"
          ></span>
          <span class="text-muted-foreground">{{ $t('business.serverControlDialog.statusLabel') }}</span>
          <span :class="healthy ? 'text-green-600 dark:text-green-400' : 'text-foreground'">{{ statusText }}</span>
        </div>
        <div v-if="pid" class="text-muted-foreground">PID: <span class="text-foreground font-mono">{{ pid }}</span></div>
        <div v-if="!sseConnected && open" class="text-xs text-amber-600 dark:text-amber-400">{{ $t('business.serverControlDialog.logStreamDisconnected') }}</div>
        <Button variant="ghost" size="xs" class="ml-auto" :disabled="statusLoading" @click="refreshStatus">
          <span class="material-icons text-sm">refresh</span>
          {{ $t('business.serverControlDialog.refresh') }}
        </Button>
      </div>

      <!-- 控制按钮 -->
      <div class="flex items-center gap-2">
        <Button size="sm" :disabled="pendingAction !== null || healthy === true" @click="runAction('start')">
          <span class="material-icons text-sm">play_arrow</span>
          {{ $t('business.serverControlDialog.start') }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="pendingAction !== null || healthy !== true"
          @click="runAction('stop')"
        >
          <span class="material-icons text-sm">stop</span>
          {{ $t('business.serverControlDialog.stop') }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="pendingAction !== null"
          @click="runAction('restart')"
        >
          <span class="material-icons text-sm">restart_alt</span>
          {{ $t('business.serverControlDialog.restart') }}
        </Button>
        <span v-if="pendingAction" class="text-xs text-muted-foreground ml-1">{{ $t('business.serverControlDialog.executing') }}</span>
        <Button variant="ghost" size="xs" class="ml-auto" @click="logs = []">
          <span class="material-icons text-sm">delete_sweep</span>
          {{ $t('business.serverControlDialog.clear') }}
        </Button>
      </div>

      <!-- 日志区 -->
      <div
        ref="logContainer"
        class="flex-1 min-h-[320px] overflow-auto rounded-lg border border-border bg-zinc-950 text-zinc-100 p-3 font-mono text-xs leading-relaxed"
        @scroll="onLogScroll"
      >
        <div v-if="logs.length === 0" class="text-zinc-500 italic">{{ $t('business.serverControlDialog.noLogs') }}</div>
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="whitespace-pre-wrap break-all"
          :class="{
            'text-red-400': log.level === 'error',
            'text-amber-300': log.level === 'warn',
            'text-sky-300': log.level === 'action',
          }"
        >
          <span class="text-zinc-600 select-none">[{{ log.time }}] </span>{{ log.text }}
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
