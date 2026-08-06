<script setup lang="ts">
/**
 * 部署检查清单（DeploymentChecklist）
 *
 * 由 React 版 great-ui-deployment-checklist 移植为 Vue 3 + motion-v。
 * 用于 LoginView「在线部署」对话框中，展示后端 (mira-app-server) 部署流水线动画。
 *
 * 点击「启动部署」后，通过 Electron 主进程执行真实命令，并逐步展示后台输出。
 */
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { Motion, AnimatePresence, motion } from 'motion-v'
import { useSettingsStore } from '@renderer/stores/settings'
import { useServerDeploy } from '@renderer/composables/useServerDeploy'
import { cn } from '@/lib/utils'

type TaskStatus = 'pending' | 'running' | 'success' | 'skipped' | 'failed'
type PipelineStatus = 'idle' | 'running' | 'failed' | 'success'

interface Task {
  id: number
  title: string
  subtitle: string
  status: TaskStatus
  info: string | null
}

interface DeploymentProgress {
  stepId: number
  type: 'status' | 'output'
  status?: 'running' | 'success' | 'failed'
  line?: string
}

const emit = defineEmits<{
  connect: [defaultLibraryId: string]
}>()

const settingsStore = useSettingsStore()
// 复用 settingsStore 已有的主题计算（支持 light/dark/auto）
const isDarkMode = computed(() => settingsStore.isDarkMode)

// 版本检测 + 更新（真实检测，仅 Electron 可用）
const {
  status: deployStatus,
  installedVersion,
  latestVersion,
  errorMessage: deployError,
  updateInProgress,
  updateLog,
  checkVersion,
  runUpdate,
} = useServerDeploy()

// 打开组件即检测已安装版本
onMounted(() => {
  checkVersion()
})

// 默认部署步骤（贴合 mira-app-server README 真实流程）
const defaultTasks: Task[] = [
  {
    id: 1,
    title: '安装 Node.js 运行环境',
    subtitle: 'Node.js >= 18，验证 node -v / npm -v。',
    status: 'pending',
    info: null,
  },
  {
    id: 2,
    title: '全局安装 mira-app-server',
    subtitle: 'npm install -g mira-app-server，等待包安装完成。',
    status: 'pending',
    info: null,
  },
  {
    id: 3,
    title: '配置数据目录',
    subtitle: '在应用数据目录中创建 mira-app-server 持久化目录。',
    status: 'pending',
    info: null,
  },
  {
    id: 4,
    title: '启动服务器',
    subtitle: 'mira-app-server start --http-port 8081 --ws-port 8018',
    status: 'pending',
    info: null,
  },
  {
    id: 5,
    title: '健康检查并连接',
    subtitle: 'GET /health 返回 status: ok。',
    status: 'pending',
    info: null,
  },
  {
    id: 6,
    title: '创建默认素材库',
    subtitle: '使用默认管理员创建或复用“默认素材库”。',
    status: 'pending',
    info: null,
  },
]

const tasks = ref<Task[]>(defaultTasks.map(t => ({ ...t })))
const pipelineStatus = ref<PipelineStatus>('idle')
const expandedTaskIds = ref<Set<number>>(new Set())
const defaultLibraryId = ref('')

let running = false

function updateTask(taskId: number, update: Partial<Task>) {
  tasks.value = tasks.value.map(task => (task.id === taskId ? { ...task, ...update } : task))
}

function setTaskExpanded(taskId: number, expanded: boolean) {
  const next = new Set(expandedTaskIds.value)
  if (expanded) next.add(taskId)
  else next.delete(taskId)
  expandedTaskIds.value = next
}

function toggleTask(taskId: number) {
  setTaskExpanded(taskId, !expandedTaskIds.value.has(taskId))
}

function appendTaskOutput(taskId: number, line: string) {
  const task = tasks.value.find(item => item.id === taskId)
  if (!task) return
  const lines = task.info ? task.info.split('\n') : []
  updateTask(taskId, { info: [...lines, line].slice(-100).join('\n') })
}

async function runPipeline() {
  if (running || updateInProgress.value || !window.electronAPI?.serverDeploy) return
  running = true
  pipelineStatus.value = 'running'
  defaultLibraryId.value = ''
  expandedTaskIds.value = new Set()
  tasks.value = tasks.value.map(t => ({ ...t, status: 'pending', info: null }))

  const api = window.electronAPI.serverDeploy
  const onProgress = (progress: DeploymentProgress) => {
    if (progress.type === 'status' && progress.status) {
      updateTask(progress.stepId, { status: progress.status })
      if (progress.status === 'success') setTaskExpanded(progress.stepId, false)
      if (progress.status === 'failed') setTaskExpanded(progress.stepId, true)
    }
    if (progress.type === 'output' && progress.line) {
      appendTaskOutput(progress.stepId, progress.line)
      setTaskExpanded(progress.stepId, true)
    }
  }
  api.removeDeployProgressListener()
  api.onDeployProgress(onProgress)

  try {
    const result = await api.deploy()
    if (!result.success) {
      const current = tasks.value.find(task => task.status === 'running')
      if (current) {
        updateTask(current.id, { status: 'failed' })
        if (result.message) appendTaskOutput(current.id, result.message)
      }
      pipelineStatus.value = 'failed'
      return
    }
    if (!result.data?.defaultLibraryId) {
      throw new Error('部署完成，但未获取到默认素材库 ID')
    }
    defaultLibraryId.value = result.data.defaultLibraryId
    pipelineStatus.value = 'success'
    await checkVersion()
  } catch (error) {
    const current = tasks.value.find(task => task.status === 'running')
    if (current) {
      updateTask(current.id, { status: 'failed' })
      appendTaskOutput(current.id, error instanceof Error ? error.message : String(error))
    }
    pipelineStatus.value = 'failed'
  } finally {
    api.removeDeployProgressListener()
    running = false
  }
}

function connectNow() {
  if (defaultLibraryId.value) emit('connect', defaultLibraryId.value)
}

// ---- 图标（贴近原 React 版的精简 SVG）----
// 任务图标按 id 渲染；running 时叠加 motion 微动画
// 通过 motion-v 的 motion.<svg-tag> 组件对 SVG 子元素做动画
const MotionRect = motion.rect
const MotionG = motion.g
const MotionPath = motion.path

onBeforeUnmount(() => {
  running = false
  window.electronAPI?.serverDeploy.removeDeployProgressListener()
})
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col font-sans">
    <!-- 版本状态条：真实检测本地已装版本 + npm 最新版 -->
    <div
      :class="cn(
        'mb-3 flex items-start gap-2 rounded-2xl p-2.5 text-xs transition-colors',
        isDarkMode ? 'bg-neutral-950 text-neutral-300' : 'bg-neutral-100 text-neutral-700',
      )"
    >
      <!-- 状态图标 -->
      <span
        v-if="deployStatus === 'checking' || updateInProgress"
        class="material-icons text-sm animate-spin text-muted-foreground shrink-0"
      >sync</span>
      <span
        v-else-if="deployStatus === 'up-to-date'"
        class="material-icons text-sm text-emerald-500 shrink-0"
      >check_circle</span>
      <span
        v-else-if="deployStatus === 'update-available'"
        class="material-icons text-sm text-amber-500 shrink-0"
      >arrow_upward</span>
      <span
        v-else-if="deployStatus === 'not-installed'"
        class="material-icons text-sm text-muted-foreground shrink-0"
      >download</span>
      <span
        v-else-if="deployStatus === 'error'"
        class="material-icons text-sm text-destructive shrink-0"
      >error</span>
      <span v-else class="material-icons text-sm text-muted-foreground shrink-0">dns</span>

      <!-- 状态文案：允许换行，避免长报错信息撑破容器 -->
      <span class="flex-1 min-w-0 break-words">
        <template v-if="deployStatus === 'checking'">正在检测已安装版本…</template>
        <template v-else-if="updateInProgress">正在更新…{{ updateLog.length ? `（${updateLog.length} 行输出）` : '' }}</template>
        <template v-else-if="deployStatus === 'up-to-date'">
          已安装 v{{ installedVersion }}（最新）
        </template>
        <template v-else-if="deployStatus === 'update-available'">
          {{ installedVersion ? `已装 v${installedVersion}，` : '未安装，' }}最新 v{{ latestVersion }}
        </template>
        <template v-else-if="deployStatus === 'not-installed'">未安装 mira-app-server</template>
        <template v-else-if="deployStatus === 'error'">检测失败：{{ deployError }}</template>
        <template v-else>等待检测</template>
      </span>

      <!-- 操作按钮 -->
      <button
        v-if="deployStatus === 'update-available' && !updateInProgress"
        type="button"
        :class="cn(
          'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors border-none cursor-pointer',
          isDarkMode
            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
        )"
        @click="runUpdate"
      >
        {{ installedVersion ? '更新' : '安装' }}
      </button>
      <button
        v-if="deployStatus === 'error'"
        type="button"
        class="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground border border-border bg-transparent cursor-pointer transition-colors"
        @click="checkVersion"
      >
        重试
      </button>
    </div>

    <!-- 更新进度日志（更新中展示） -->
    <div
      v-if="updateInProgress && updateLog.length"
      :class="cn(
        'mb-3 max-h-24 overflow-y-auto rounded-2xl p-2.5 font-mono text-[10px] leading-relaxed transition-colors',
        isDarkMode ? 'bg-neutral-950 text-neutral-400' : 'bg-neutral-100 text-neutral-500',
      )"
    >
      <div v-for="(line, i) in updateLog" :key="i">{{ line }}</div>
    </div>

    <!-- Tasks -->
    <div class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
      <div v-for="task in tasks" :key="task.id" class="relative flex w-full flex-col items-center">
        <div :class="cn('relative z-10 flex w-full items-center justify-between rounded-2xl p-2.5 transition-colors duration-300', isDarkMode ? 'bg-neutral-950 text-neutral-200' : 'bg-neutral-100/90 text-neutral-800')">
          <div class="flex w-full items-center justify-between">
            <div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
              <!-- Icon box -->
              <div :class="cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300', task.status === 'success' ? (isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-white text-neutral-600 shadow-sm') : task.status === 'running' ? (isDarkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white text-neutral-900 shadow-sm') : (isDarkMode ? 'bg-neutral-900 text-neutral-400' : 'bg-neutral-200/60 text-neutral-500'))">
                <!-- Task id 1: node -->
                <svg v-if="task.id === 1" class="h-4.5 w-4.5 text-current" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1L2 4.5v7L8 15l6-3.5v-7L8 1zm0 2.3l3.8 2.2v5L8 12.7 4.2 10.5v-5L8 3.3z" />
                  <MotionPath v-if="task.status === 'running'" d="M5 8h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" :animate="{ pathLength: [0, 1] }" :transition="{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }" />
                </svg>
                <!-- Task id 2: download / package -->
                <svg v-else-if="task.id === 2" class="h-4.5 w-4.5 text-current" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.5 9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v4a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2.5 13V9z" />
                  <MotionG :animate="task.status === 'running' ? { y: [-2.5, 2] } : { y: 0 }" :transition="task.status === 'running' ? { repeat: Infinity, duration: 0.85, ease: 'easeInOut' } : {}">
                    <path d="M8 1.5a1 1 0 0 1 1 1V6h1.8a.8.8 0 0 1 .56 1.36l-2.8 2.8a.8.8 0 0 1-1.12 0l-2.8-2.8A.8.8 0 0 1 5.2 6H7V2.5a1 1 0 0 1 1-1z" />
                  </MotionG>
                </svg>
                <!-- Task id 3: server / chip -->
                <svg v-else-if="task.id === 3" class="h-4.5 w-4.5 text-current" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="3" width="10" height="10" rx="2" />
                  <rect x="5.5" y="1" width="1.5" height="2" rx="0.5" />
                  <rect x="9" y="1" width="1.5" height="2" rx="0.5" />
                  <rect x="5.5" y="13" width="1.5" height="2" rx="0.5" />
                  <rect x="9" y="13" width="1.5" height="2" rx="0.5" />
                  <rect x="1" y="5.5" width="2" height="1.5" rx="0.5" />
                  <rect x="1" y="9" width="2" height="1.5" rx="0.5" />
                  <rect x="13" y="5.5" width="2" height="1.5" rx="0.5" />
                  <rect x="13" y="9" width="2" height="1.5" rx="0.5" />
                  <rect x="5.5" y="5.5" width="5" height="5" rx="1" :fill="isDarkMode ? '#0a0a0a' : '#ffffff'" />
                  <MotionRect x="6.5" y="6.5" width="3" height="3" rx="0.5" fill="currentColor" :animate="task.status === 'running' ? { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] } : {}" :transition="task.status === 'running' ? { repeat: Infinity, duration: 1, ease: 'easeInOut' } : {}" style="transform-origin: 8px 8px" />
                </svg>
                <!-- Task id 4: layers (config) -->
                <svg v-else-if="task.id === 4" class="h-4.5 w-4.5 text-current" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1.5L1.5 5 8 8.5 14.5 5 8 1.5z" />
                  <path d="M2 7.2l6 3.3 6-3.3v1.8l-6 3.3-6-3.3V7.2z" />
                  <path d="M2 10.7l6 3.3 6-3.3v1.8l-6 3.3-6-3.3v-1.8z" />
                </svg>
                <!-- Task id 5: check connection -->
                <svg v-else class="h-4.5 w-4.5 text-current" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="2" y="2" width="7" height="9" rx="1.5" opacity="0.5" />
                  <rect x="6.5" y="5" width="7" height="9" rx="1.5" />
                  <MotionRect v-if="task.status === 'running'" x="2" y="2" width="7" height="9" rx="1.5" fill="currentColor" :animate="{ x: [0, 4.5], y: [0, 3], opacity: [0.9, 0] }" :transition="{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }" />
                </svg>
              </div>

              <!-- Title / subtitle -->
              <div class="flex min-w-0 flex-col">
                <span :class="cn('font-sans text-xs font-semibold tracking-wide transition-colors', isDarkMode ? 'text-neutral-200' : 'text-neutral-850')">
                  {{ task.title }}
                </span>
                <span :class="cn('mt-0.5 truncate font-sans text-[9px] leading-normal transition-colors font-mono', isDarkMode ? 'text-neutral-400' : 'text-neutral-500')">
                  {{ task.subtitle }}
                </span>
              </div>
            </div>

            <!-- Status indicator -->
            <div class="flex items-center gap-2">
              <button
                v-if="task.info"
                type="button"
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-none bg-transparent text-current opacity-60 transition-opacity hover:opacity-100"
                :title="expandedTaskIds.has(task.id) ? '折叠输出' : '展开输出'"
                @click.stop="toggleTask(task.id)"
              >
                <span class="material-icons text-base">
                  {{ expandedTaskIds.has(task.id) ? 'expand_less' : 'expand_more' }}
                </span>
              </button>
              <div :class="cn('flex h-5.5 w-5.5 items-center justify-center rounded-full transition-all duration-300', task.status === 'success' ? (isDarkMode ? 'bg-neutral-100 text-neutral-950' : 'bg-neutral-950 text-white') : task.status === 'running' ? (isDarkMode ? 'bg-neutral-800 text-neutral-100' : 'bg-white text-neutral-950 shadow-sm') : task.status === 'failed' ? (isDarkMode ? 'bg-red-950/60 text-red-300' : 'bg-red-100 font-bold text-red-950') : task.status === 'skipped' ? (isDarkMode ? 'bg-amber-950/60 text-amber-300' : 'bg-amber-100 font-bold text-amber-950') : (isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200'))">
                <AnimatePresence mode="wait">
                  <Motion v-if="task.status === 'success'" key="success-icon" :initial="{ scale: 0, rotate: -45 }" :animate="{ scale: 1, rotate: 0 }" :exit="{ scale: 0 }" :transition="{ type: 'spring', stiffness: 350, damping: 18 }">
                    <svg class="h-3 w-3 stroke-current" viewBox="0 0 16 16" fill="none">
                      <MotionPath d="M3 8.5L6.5 12L13 4.5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" :initial="{ pathLength: 0 }" :animate="{ pathLength: 1 }" :transition="{ duration: 0.35, ease: 'easeOut' }" />
                    </svg>
                  </Motion>
                  <Motion v-else-if="task.status === 'running'" key="running-icon" :initial="{ scale: 0 }" :animate="{ scale: 1 }" :exit="{ scale: 0 }" :transition="{ duration: 0.2 }" :class="cn('h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent', isDarkMode ? 'text-neutral-300' : 'text-neutral-700')" />
                  <Motion v-else-if="task.status === 'failed'" key="failed-icon" :initial="{ scale: 0, rotate: 45 }" :animate="{ scale: 1, rotate: 0 }" :exit="{ scale: 0 }" :transition="{ type: 'spring', stiffness: 380, damping: 16 }">
                    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </Motion>
                  <Motion v-else-if="task.status === 'skipped'" key="skipped-icon" :initial="{ scale: 0, x: -5 }" :animate="{ scale: 1, x: 0 }" :exit="{ scale: 0 }" :transition="{ type: 'spring', stiffness: 300, damping: 20 }">
                    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Motion>
                  <Motion v-else key="pending-icon" :initial="{ scale: 0 }" :animate="{ scale: 1 }" :exit="{ scale: 0 }" :transition="{ duration: 0.2 }" :class="cn('h-1.5 w-1.5 rounded-full', isDarkMode ? 'bg-neutral-700' : 'bg-neutral-400')" />
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <!-- Info panel (expandable) -->
        <div :class="cn('z-0 grid w-[90%] transition-all duration-300 ease-in-out', task.info && expandedTaskIds.has(task.id) ? '-mt-3.5 grid-rows-[1fr] opacity-100' : 'pointer-events-none mt-0 grid-rows-[0fr] opacity-0')">
          <div class="min-h-0 overflow-hidden">
            <div :class="cn('max-h-24 overflow-y-auto whitespace-pre-wrap break-all rounded-b-2xl px-3.5 pt-5 pb-2.5 font-mono text-[9.5px] leading-relaxed transition-colors duration-300', isDarkMode ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-200/90 text-neutral-800')">
              {{ task.info }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer button -->
    <div class="mt-3">
      <Motion v-if="pipelineStatus === 'idle'" as="button" @click="runPipeline" :while-tap="{ scale: 0.98 }" :class="cn('flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 font-sans text-xs font-bold transition-colors border-none cursor-pointer', isDarkMode ? 'bg-neutral-100 text-neutral-950 hover:bg-neutral-200' : 'bg-neutral-950 text-white hover:bg-neutral-900')">
        <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        启动部署
      </Motion>
      <Motion v-else-if="pipelineStatus === 'running'" as="div" :class="cn('flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 font-sans text-xs font-bold transition-colors duration-300', isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-700')">
        <div :class="cn('h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent', isDarkMode ? 'text-neutral-300' : 'text-neutral-700')" />
        <span>正在部署...</span>
      </Motion>
      <Motion v-else-if="pipelineStatus === 'success'" as="button" type="button" @click="connectNow" :while-tap="{ scale: 0.98 }" :class="cn('flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-none py-2.5 font-sans text-xs font-bold transition-colors', isDarkMode ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-950/80' : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200')">
        <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5L6.5 12L13 4.5" /></svg>
        部署完成，立即连接
      </Motion>
      <Motion v-else as="button" @click="runPipeline" :while-tap="{ scale: 0.98 }" :class="cn('flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 font-sans text-xs font-bold transition-colors border-none cursor-pointer', isDarkMode ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700' : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300')">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <polyline points="3 3 3 8 8 8" />
        </svg>
        部署失败（重试）
      </Motion>
    </div>
  </div>
</template>
