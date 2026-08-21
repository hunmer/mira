<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import HeaderBar from '@/components/HeaderBar.vue'
import FileList from '@/components/FileList.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import TaskPanel from '@/components/TaskPanel.vue'
import { fetchCapabilities, fetchTaskStatus, startConvert } from '@/lib/server'
import { getSelectedItems, isDark, logError, onThemeChanged } from '@/lib/host'
import { allowedTargets, classifyFile, type Capabilities, type MediaInput, type ScaleKey, type TaskState } from '@/types'

/**
 * 格式转换 SPA：
 *   左列待转换文件（含任务实时状态），右列转换设置 + 任务汇总。
 *   流程：宿主/Query 载入选中素材 → 选目标格式/质量/缩放 → POST convert → 轮询 status。
 */
const files = ref<MediaInput[]>([])
const capabilities = ref<Capabilities | null>(null)
const target = ref('')
const quality = ref<'high' | 'medium' | 'low'>('medium')
const scale = ref<ScaleKey>('none')
const inheritMeta = ref(true)
const task = ref<TaskState | null>(null)
const running = ref(false)
const error = ref('')

let pollTimer: number | null = null
let offTheme: (() => void) | null = null

const runningItems = computed(() => (running.value && task.value ? task.value.items : []))

/** 目标格式不在当前选中集合允许范围时自动纠正 */
watch([files, target], () => {
  if (files.value.length === 0 || !target.value) return
  const lists = files.value.map((f) => new Set(allowedTargets(classifyFile(f.name))))
  if (!lists.every((s) => s.has(target.value))) target.value = ''
})

async function loadFiles() {
  const selected = await getSelectedItems()
  if (selected.length > 0) files.value = selected
}

async function loadCapabilities() {
  try {
    capabilities.value = await fetchCapabilities()
  } catch (e) {
    logError('[format-converter] capabilities failed:', e)
    error.value = `无法连接转换服务：${e instanceof Error ? e.message : String(e)}`
  }
}

async function start() {
  if (running.value || files.value.length === 0 || !target.value) return
  error.value = ''
  try {
    const taskId = await startConvert({
      files: files.value,
      target: target.value,
      quality: quality.value,
      scale: scale.value,
      inheritMeta: inheritMeta.value,
    })
    running.value = true
    task.value = {
      taskId,
      createdAt: Date.now(),
      finishedAt: null,
      status: 'running',
      params: { target: target.value, quality: quality.value, inheritMeta: inheritMeta.value },
      items: [],
    }
    startPolling()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function startPolling() {
  stopPolling()
  pollTimer = window.setInterval(async () => {
    if (!task.value) return stopPolling()
    try {
      task.value = await fetchTaskStatus(task.value.taskId)
      if (task.value.status === 'done') {
        running.value = false
        stopPolling()
      }
    } catch (e) {
      running.value = false
      stopPolling()
      error.value = e instanceof Error ? e.message : String(e)
    }
  }, 1200)
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

/** 任务完成后重置回待转换状态 */
function resetTask() {
  task.value = null
  running.value = false
  error.value = ''
  loadFiles()
}

function removeFile(id: string) {
  files.value = files.value.filter((f) => f.id !== id)
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}

onMounted(() => {
  applyTheme(isDark())
  offTheme = onThemeChanged(applyTheme)
  loadFiles()
  loadCapabilities()
})

onUnmounted(() => {
  stopPolling()
  offTheme?.()
})
</script>

<template>
  <div class="flex h-full flex-col bg-background text-foreground">
    <HeaderBar :capabilities="capabilities" :file-count="files.length" />

    <main class="flex min-h-0 flex-1 gap-3 p-3">
      <div class="h-full w-[46%] min-w-0">
        <FileList :files="files" :task-items="runningItems" :running="running" @remove="removeFile" />
      </div>

      <div class="flex h-full min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
        <SettingsPanel
          v-model:target="target"
          v-model:quality="quality"
          v-model:scale="scale"
          v-model:inherit-meta="inheritMeta"
          :files="files"
          :capabilities="capabilities"
          :running="running"
          :error="error"
          @start="start"
        />
        <TaskPanel :task="task" @reset="resetTask" />
      </div>
    </main>
  </div>
</template>
