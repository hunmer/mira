<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getApiBaseURL } from '@/api/client'
import { RiCheckLine, RiCloseLine, RiStopCircleLine } from '@remixicon/vue'

type LineType = 'cmd' | 'stdout' | 'stderr' | 'info' | 'success' | 'error'
interface Line { type: LineType; text: string }

const props = defineProps<{
  open: boolean
  name: string
  libraryId: string
  version?: string
  registry?: string
  npmSource?: string
  proxy?: string
}>()
const emit = defineEmits<{
  'update:open': [val: boolean]
  finish: [payload: { success: boolean; name: string }]
}>()

const lines = ref<Line[]>([])
const status = ref<'idle' | 'running' | 'success' | 'error'>('idle')
const bodyRef = ref<HTMLDivElement | null>(null)
let es: EventSource | null = null

const running = computed(() => status.value === 'running')
const statusText = computed(() => ({
  idle: '待机', running: '安装中', success: '安装成功', error: '安装失败',
}[status.value]))
const statusColor = computed(() => ({
  idle: 'bg-muted-foreground', running: 'bg-yellow-500 animate-pulse',
  success: 'bg-green-500', error: 'bg-red-500',
}[status.value]))

function cleanup() {
  if (es) { es.close(); es = null }
}

function pushText(type: LineType, text: string) {
  if (!text) return
  // npm 输出可能包含多行, 拆开渲染更清晰
  const parts = text.split(/\r?\n/)
  if (parts.length && parts[parts.length - 1] === '') parts.pop()
  for (const p of parts) lines.value.push({ type, text: p })
}

function start() {
  cleanup()
  const pkg = props.version && props.version !== 'latest' ? `${props.name}@${props.version}` : props.name
  lines.value = [{ type: 'cmd', text: `$ npm install ${pkg} --save --verbose` }]
  status.value = 'running'

  const token = localStorage.getItem('token') || ''
  const params = new URLSearchParams()
  params.set('name', props.name)
  params.set('libraryId', props.libraryId)
  if (props.version) params.set('version', props.version)
  if (props.registry) params.set('registry', props.registry)
  if (props.npmSource) params.set('npmSource', props.npmSource)
  if (props.proxy) params.set('proxy', props.proxy)
  if (token) params.set('token', token)

  const url = `${getApiBaseURL()}/plugins/install/stream?${params.toString()}`
  es = new EventSource(url)

  es.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'stdout' || msg.type === 'stderr') {
        pushText(msg.type, msg.text || '')
      } else if (msg.type === 'info') {
        pushText('info', msg.message || '')
      } else if (msg.type === 'error') {
        lines.value.push({ type: 'error', text: msg.message || '错误' })
        status.value = 'error'
        emit('finish', { success: false, name: props.name })
        cleanup()
      } else if (msg.type === 'done') {
        if (msg.success) {
          lines.value.push({ type: 'success', text: msg.message || '安装成功' })
          status.value = 'success'
          emit('finish', { success: true, name: props.name })
        } else {
          lines.value.push({ type: 'error', text: msg.message || '安装失败' })
          status.value = 'error'
          emit('finish', { success: false, name: props.name })
        }
        cleanup()
      }
    } catch { /* ignore malformed chunk */ }
  }

  es.onerror = () => {
    // onerror 也会在正常 close 后触发, 仅运行中才视为中断
    if (status.value === 'running') {
      lines.value.push({ type: 'error', text: '连接中断或服务器错误' })
      status.value = 'error'
      emit('finish', { success: false, name: props.name })
    }
    cleanup()
  }
}

function abort() {
  // 关闭 EventSource → 触发服务端 req.close → 杀掉 npm 进程
  cleanup()
  if (status.value === 'running') {
    lines.value.push({ type: 'error', text: '已中断安装' })
    status.value = 'error'
    emit('finish', { success: false, name: props.name })
  }
}

function closeDialog() {
  if (running.value) return // 安装中不允许直接关闭, 需先中断或等待
  cleanup()
  emit('update:open', false)
}

// 运行中阻止 esc / 点击遮罩关闭, 避免误杀安装
function onInteractOutside(e: Event) {
  if (running.value) e.preventDefault()
}

watch(() => props.open, (v) => {
  if (v && props.name && props.libraryId) {
    start()
  } else if (!v) {
    cleanup()
    status.value = 'idle'
    lines.value = []
  }
})

watch(lines, async () => {
  await nextTick()
  if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
}, { deep: true })

const lineClass: Record<LineType, string> = {
  cmd: 'text-cyan-400 font-semibold',
  stdout: 'text-gray-300',
  stderr: 'text-yellow-400',
  info: 'text-blue-400',
  success: 'text-green-400 font-semibold',
  error: 'text-red-400',
}
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => { if (!v) closeDialog(); else emit('update:open', true) }">
    <DialogContent
      class="max-w-3xl gap-0 overflow-hidden bg-black p-0 font-mono text-xs ring-green-500/40 sm:max-w-3xl"
      :show-close-button="false"
      @escape-key-down="onInteractOutside"
      @pointer-down-outside="onInteractOutside"
    >
      <!-- Terminal Header -->
      <div class="flex items-center gap-2 border-b border-gray-800 bg-gray-900 px-3 py-2">
        <div class="flex gap-1.5">
          <span class="size-3 rounded-full bg-red-500" />
          <span class="size-3 rounded-full bg-yellow-500" />
          <span class="size-3 rounded-full bg-green-500" />
        </div>
        <div class="flex-1 truncate text-center text-[11px] font-semibold text-gray-400">
          plugin-install:~$ {{ name }}
        </div>
        <div class="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span class="size-2 rounded-full" :class="statusColor" />
          {{ statusText }}
        </div>
      </div>

      <DialogHeader class="sr-only">
        <DialogTitle>插件安装日志</DialogTitle>
        <DialogDescription>实时显示 npm install --verbose 的输出</DialogDescription>
      </DialogHeader>

      <!-- Terminal Body -->
      <div
        ref="bodyRef"
        class="h-[60vh] overflow-y-auto bg-black p-4"
        style="scrollbar-width: thin; scrollbar-color: #10b981 #1f2937"
      >
        <pre v-for="(line, i) in lines" :key="i" class="whitespace-pre-wrap break-all leading-relaxed" :class="lineClass[line.type]">{{ line.text }}</pre>
        <span v-if="running" class="inline-block animate-pulse text-green-400">█</span>
      </div>

      <!-- Terminal Footer -->
      <div class="flex items-center justify-between gap-2 border-t border-gray-800 bg-gray-900 px-3 py-2 text-[11px] text-gray-500">
        <span>使用 ↑/↓ 查看输出 · 绿色=stdout · 黄色=stderr</span>
        <div class="flex items-center gap-2">
          <Button
            v-if="running"
            variant="destructive"
            size="sm"
            class="h-7"
            @click="abort"
          >
            <RiStopCircleLine class="mr-1 size-3.5" /> 中断安装
          </Button>
          <Button
            :variant="status === 'success' ? 'default' : 'outline'"
            size="sm"
            class="h-7"
            :disabled="running"
            @click="closeDialog"
          >
            <component :is="status === 'success' ? RiCheckLine : RiCloseLine" class="mr-1 size-3.5" />
            {{ status === 'success' ? '完成' : '关闭' }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
