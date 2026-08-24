<script setup lang="ts">
/**
 * 服务端控制台 —— 自 mira-client 的 ServerControlDialog 迁移为 Web 页面。
 *
 * 与 Electron 版的差异：
 * - 状态来自 HTTP /api/health（Electron 版走 IPC 还能拿到 PID，Web 端拿不到）
 * - 停止走 POST /api/system/stop（服务端仅接受本机回环调用，远程访问会 403）
 * - 启动 / 重启依赖本机进程管理（Electron 主进程），Web 端无法提供
 * - 日志区通过 SSE（GET /api/logs/stream）回放最近 100 条历史 + 实时推送
 *
 * SSE 在页面挂载时建立，离开时断开，避免泄漏。
 */
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { getApiBaseURL } from '@/api/client'
import { systemApi } from '@/api'
import { toast } from 'vue-sonner'
import {
  RiServerLine, RiRefreshLine, RiStopCircleLine, RiEraserLine,
} from '@remixicon/vue'

const { t } = useI18n()

interface LogEntry {
  timestamp?: string
  level?: 'log' | 'error' | 'warn'
  line: string
}

/** 渲染用日志条目（含 SSE 实时日志 + 动作反馈行） */
interface RenderLog {
  time: string
  level: 'log' | 'error' | 'warn' | 'action'
  text: string
}

const logs = ref<RenderLog[]>([])
const logContainer = ref<HTMLElement | null>(null)
const autoScroll = ref(true)

const healthy = ref<boolean | null>(null)
const statusLoading = ref(false)
/** 正在执行停止（用于禁用按钮） */
const pendingStop = ref(false)
/** SSE 断连标记 */
const sseConnected = ref(false)

let eventSource: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0

function statusText(): string {
  if (healthy.value === null) return t('serverControl.statusUnknown')
  return healthy.value ? t('serverControl.statusRunning') : t('serverControl.statusStopped')
}

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
function getStreamUrl(): string {
  const base = getApiBaseURL().replace(/\/api\/?$/, '')
  return `${base}/api/logs/stream`
}

function connectSSE() {
  disconnectSSE()
  try {
    eventSource = new EventSource(getStreamUrl())
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
    connectSSE()
  }, delay)
}

// ───────── 状态查询 ─────────
async function refreshStatus() {
  statusLoading.value = true
  try {
    await systemApi.health()
    healthy.value = true
  } catch {
    healthy.value = false
  } finally {
    statusLoading.value = false
  }
}

// ───────── 停止动作 ─────────
const { confirmDialog, requireConfirm } = useConfirmDialog()

async function handleStop() {
  if (pendingStop.value || healthy.value !== true) return
  if (!(await requireConfirm({
    title: t('serverControl.stop'),
    description: t('serverControl.stopConfirmDesc'),
    confirmText: t('serverControl.stop'),
  }))) return
  pendingStop.value = true
  appendLog(toRenderLog(t('serverControl.actionStopBegin'), 'action'))
  try {
    await systemApi.stopServer()
    appendLog(toRenderLog(t('serverControl.actionStopComplete'), 'action'))
    toast.success(t('common.stopServerSuccess'))
    // 服务器退出后请求必然失败，稍等片刻再刷新为已停止
    setTimeout(refreshStatus, 1500)
  } catch (e: any) {
    appendLog(toRenderLog(t('serverControl.actionStopFailed', { message: e?.message ?? '' }), 'error'))
  } finally {
    pendingStop.value = false
  }
}

onMounted(() => {
  connectSSE()
  refreshStatus()
})

onUnmounted(() => {
  disconnectSSE()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="flex items-center gap-2 text-2xl font-bold">
          <RiServerLine class="size-6 text-primary" />
          {{ t('serverControl.title') }}
        </h1>
        <p class="text-muted-foreground">{{ t('serverControl.subtitle') }}</p>
      </div>
      <Button variant="outline" size="sm" :disabled="statusLoading" @click="refreshStatus">
        <RiRefreshLine class="size-4" />
        {{ t('serverControl.refresh') }}
      </Button>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-3 p-4">
        <!-- 状态栏 -->
        <div class="flex items-center gap-3 flex-wrap text-sm">
          <div class="flex items-center gap-1.5">
            <span
              class="inline-block w-2 h-2 rounded-full"
              :class="healthy === null ? 'bg-muted-foreground' : healthy ? 'bg-green-500' : 'bg-red-500'"
            ></span>
            <span class="text-muted-foreground">{{ t('serverControl.statusLabel') }}</span>
            <span :class="healthy ? 'text-green-600 dark:text-green-400' : 'text-foreground'">{{ statusText() }}</span>
          </div>
          <div v-if="!sseConnected" class="text-xs text-amber-600 dark:text-amber-400">
            {{ t('serverControl.logStreamDisconnected') }}
          </div>
          <Button
            variant="destructive"
            size="sm"
            class="ml-auto"
            :disabled="pendingStop || healthy !== true"
            @click="handleStop"
          >
            <RiStopCircleLine class="size-4" />
            {{ t('serverControl.stop') }}
          </Button>
        </div>

        <!-- 工具行 -->
        <div class="flex items-center gap-2">
          <span v-if="pendingStop" class="text-xs text-muted-foreground ml-1">{{ t('serverControl.executing') }}</span>
          <Button variant="ghost" size="sm" class="ml-auto" @click="logs = []">
            <RiEraserLine class="size-4" />
            {{ t('serverControl.clear') }}
          </Button>
        </div>

        <!-- 日志区 -->
        <div
          ref="logContainer"
          class="h-[calc(100vh-360px)] min-h-[320px] overflow-auto rounded-lg border border-border bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100"
          @scroll="onLogScroll"
        >
          <div v-if="logs.length === 0" class="text-zinc-500 italic">{{ t('serverControl.noLogs') }}</div>
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
      </CardContent>
    </Card>

    <ConfirmDialog
      v-bind="confirmDialog"
      @update:open="confirmDialog.open = $event"
      @confirm="confirmDialog.resolve(true)"
      @cancel="confirmDialog.resolve(false)"
    />
  </div>
</template>
