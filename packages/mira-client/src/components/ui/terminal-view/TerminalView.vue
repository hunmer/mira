<script setup lang="ts">
/**
 * 终端视图（TerminalView）
 *
 * 从 mira-dashboard-next InstallTerminalDialog 的终端样式抽离：
 * 顶部窗口点 + 标题 + 状态指示，主体为黑底等宽输出，按行类型着色并自动滚底。
 */
import { ref, watch, nextTick } from 'vue'

export type TerminalLineType = 'cmd' | 'stdout' | 'stderr' | 'info' | 'success' | 'error'
export interface TerminalLine { type: TerminalLineType; text: string }
export type TerminalStatus = 'idle' | 'running' | 'success' | 'error'

const props = withDefaults(defineProps<{
  /** 标题栏文字（显示在窗口点右侧，居中截断） */
  title?: string
  /** 输出行 */
  lines?: TerminalLine[]
  /** 运行中：行尾显示闪烁光标 */
  running?: boolean
  /** 状态点颜色 */
  status?: TerminalStatus
  /** 状态文字（不传则只显示状态点） */
  statusText?: string
  /** 输出区附加 class（用于控制高度、字号等） */
  bodyClass?: string
}>(), {
  title: '',
  lines: () => [],
  running: false,
  status: 'idle',
  statusText: '',
  bodyClass: '',
})

const bodyRef = ref<HTMLDivElement | null>(null)

watch(() => props.lines, async () => {
  await nextTick()
  if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
}, { deep: true })

const statusColor: Record<TerminalStatus, string> = {
  idle: 'bg-muted-foreground',
  running: 'bg-yellow-500 animate-pulse',
  success: 'bg-green-500',
  error: 'bg-red-500',
}

const lineClass: Record<TerminalLineType, string> = {
  cmd: 'text-cyan-400 font-semibold',
  stdout: 'text-gray-300',
  stderr: 'text-yellow-400',
  info: 'text-blue-400',
  success: 'text-green-400 font-semibold',
  error: 'text-red-400',
}
</script>

<template>
  <div class="flex flex-col overflow-hidden bg-black font-mono text-xs ring-1 ring-green-500/40">
    <!-- Terminal Header -->
    <div class="flex shrink-0 items-center gap-2 border-b border-gray-800 bg-gray-900 px-3 py-2">
      <div class="flex gap-1.5">
        <span class="size-3 rounded-full bg-red-500" />
        <span class="size-3 rounded-full bg-yellow-500" />
        <span class="size-3 rounded-full bg-green-500" />
      </div>
      <div class="flex-1 truncate text-center text-[11px] font-semibold text-gray-400">{{ title }}</div>
      <div class="flex items-center gap-1.5 text-[11px] text-gray-400">
        <span class="size-2 rounded-full" :class="statusColor[status]" />
        <span v-if="statusText">{{ statusText }}</span>
      </div>
    </div>

    <!-- Terminal Body -->
    <div
      ref="bodyRef"
      class="overflow-y-auto bg-black p-3"
      :class="bodyClass"
      style="scrollbar-width: thin; scrollbar-color: #10b981 #1f2937"
    >
      <pre v-for="(line, i) in lines" :key="i" class="whitespace-pre-wrap break-all leading-relaxed" :class="lineClass[line.type]">{{ line.text }}</pre>
      <span v-if="running" class="inline-block animate-pulse text-green-400">█</span>
    </div>
  </div>
</template>
