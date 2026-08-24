/**
 * 部署流水线（DeploymentChecklist）状态组合式函数
 *
 * 模块级单例：部署在 Electron 主进程运行，关闭对话框卸载组件后
 * 仍持续收集进度输出，重新打开对话框时恢复任务状态与日志。
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { toast } from 'vue-sonner'
import i18n from '../i18n'

export type TaskStatus = 'pending' | 'running' | 'success' | 'skipped' | 'failed'
export type PipelineStatus = 'idle' | 'running' | 'failed' | 'success'

export interface DeployTask {
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

// ---- 模块级单例状态（跨组件卸载保留） ----
const tasks = ref<DeployTask[]>([])
const pipelineStatus = ref<PipelineStatus>('idle')
const expandedTaskIds = ref<Set<number>>(new Set())
const defaultLibraryId = ref('')
const deploymentError = ref('')
const showDeploymentError = ref(false)
let running = false

// 正在展示流水线界面的组件数：>0 时部署结果由界面呈现，=0 时以 toast 主动通知
let activeViewers = 0

function updateTask(taskId: number, update: Partial<DeployTask>) {
  tasks.value = tasks.value.map(task => (task.id === taskId ? { ...task, ...update } : task))
}

export function setTaskExpanded(taskId: number, expanded: boolean) {
  const next = new Set(expandedTaskIds.value)
  if (expanded) next.add(taskId)
  else next.delete(taskId)
  expandedTaskIds.value = next
}

function appendTaskOutput(taskId: number, line: string) {
  const task = tasks.value.find(item => item.id === taskId)
  if (!task) return
  const lines = task.info ? task.info.split('\n') : []
  updateTask(taskId, { info: [...lines, line].slice(-100).join('\n') })
}

function handleDeploymentFailure(message: string) {
  const error = message || i18n.global.t('business.deploymentChecklist.deploymentErrorFallback')
  const current = tasks.value.find(task => task.status === 'running')
  if (current) {
    updateTask(current.id, { status: 'failed' })
    appendTaskOutput(current.id, error)
  }
  deploymentError.value = error
  showDeploymentError.value = true
  pipelineStatus.value = 'failed'
  if (!activeViewers) toast.error(error)
}

/**
 * 组件挂载时同步任务文案（i18n 语言可能已切换），保留既有运行状态与输出；
 * 首次调用时以默认任务初始化。
 */
function syncTaskTexts(defaultTasks: DeployTask[]) {
  if (!tasks.value.length) {
    tasks.value = defaultTasks.map(t => ({ ...t }))
    return
  }
  tasks.value = tasks.value.map(t => {
    const def = defaultTasks.find(d => d.id === t.id)
    return def ? { ...t, title: def.title, subtitle: def.subtitle } : t
  })
}

async function runPipeline(options: { registry: string; proxy?: string }) {
  if (running || !window.electronAPI?.serverDeploy) return
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
    const result = await api.deploy({ registry: options.registry, proxy: options.proxy })
    if (!result.success) {
      handleDeploymentFailure(result.message || '')
      return
    }
    if (!result.data?.defaultLibraryId) {
      throw new Error(i18n.global.t('business.deploymentChecklist.noDefaultLibrary'))
    }
    defaultLibraryId.value = result.data.defaultLibraryId
    pipelineStatus.value = 'success'
    if (!activeViewers) toast.success(i18n.global.t('business.deploymentChecklist.deploySuccessToast'))
  } catch (error) {
    handleDeploymentFailure(error instanceof Error ? error.message : String(error))
  } finally {
    api.removeDeployProgressListener()
    running = false
  }
}

export function useDeployPipeline() {
  onMounted(() => { activeViewers++ })
  onBeforeUnmount(() => { activeViewers-- })

  return {
    tasks,
    pipelineStatus,
    expandedTaskIds,
    defaultLibraryId,
    deploymentError,
    showDeploymentError,
    runPipeline,
    syncTaskTexts,
    setTaskExpanded,
  }
}
