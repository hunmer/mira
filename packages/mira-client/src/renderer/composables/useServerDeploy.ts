/**
 * 后端部署 (mira-app-server) 版本检测 + 更新组合式函数
 *
 * 封装与主进程 ServerDeployHandlers 的交互：
 * - checkVersion(): 并发检测本地已装版本 + npm 最新版本，比较后给出状态
 * - runUpdate(): 一键更新，监听进度事件，完成后自动刷新版本
 *
 * 仅 Electron 环境可用；非 Electron 调用会短路（status 维持 'unavailable'）。
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import { environment } from '@renderer/utils'

export type DeployStatus =
  | 'idle' // 未检测
  | 'checking' // 检测中
  | 'not-installed' // 未安装
  | 'up-to-date' // 已安装且最新
  | 'update-available' // 已安装但有新版本
  | 'error' // 检测失败
  | 'unavailable' // 非 Electron 环境

/** 轻量 semver 比较：a > b 返回 1，相等 0，小于 -1（非法版本视为相等） */
function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(n => parseInt(n, 10))
  const pb = b.replace(/^v/, '').split('.').map(n => parseInt(n, 10))
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] || 0
    const db = pb[i] || 0
    if (Number.isNaN(da) || Number.isNaN(db)) return 0
    if (da > db) return 1
    if (da < db) return -1
  }
  return 0
}

export function useServerDeploy() {
  const status = ref<DeployStatus>('idle')
  const installedVersion = ref<string | null>(null)
  const latestVersion = ref<string | null>(null)
  const errorMessage = ref('')

  // 更新相关
  const updateInProgress = ref(false)
  const updateLog = ref<string[]>([])

  const isElectron = environment.isElectron && !!window.electronAPI?.serverDeploy

  /** 是否需要更新（已装且有更新版本） */
  const hasUpdate = computed(
    () => status.value === 'update-available' && !!latestVersion.value,
  )

  async function checkVersion(): Promise<void> {
    if (!isElectron) {
      status.value = 'unavailable'
      return
    }
    status.value = 'checking'
    errorMessage.value = ''

    try {
      const api = window.electronAPI!.serverDeploy
      const [installedRes, latestRes] = await Promise.all([
        api.getInstalledVersion(),
        api.getLatestVersion(),
      ])

      const installed = installedRes.data?.installed ? installedRes.data.version ?? null : null
      const latest = latestRes.data?.latest ?? null
      installedVersion.value = installed
      latestVersion.value = latest

      if (!installed) {
        // 未安装：若有最新版仍提示安装
        status.value = latest ? 'update-available' : 'not-installed'
        return
      }
      if (!latest) {
        // 已安装但查不到最新版（离线），视为已是最新
        status.value = 'up-to-date'
        return
      }
      status.value = compareVersions(latest, installed) > 0 ? 'update-available' : 'up-to-date'
    } catch (err) {
      status.value = 'error'
      errorMessage.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function runUpdate(): Promise<void> {
    if (!isElectron || updateInProgress.value) return
    updateInProgress.value = true
    updateLog.value = []

    const api = window.electronAPI!.serverDeploy
    const onProgress = (p: { type: string; line?: string }) => {
      if (p.type === 'data' && p.line) updateLog.value.push(p.line)
    }
    api.onUpdateProgress(onProgress)

    try {
      const res = await api.update()
      if (res.success) {
        // 更新成功后刷新版本状态
        await checkVersion()
      } else {
        errorMessage.value = res.message || res.data?.message || '更新失败'
      }
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : String(err)
    } finally {
      api.removeUpdateProgressListener()
      updateInProgress.value = false
    }
  }

  // 组件卸载时移除监听，避免泄漏
  onBeforeUnmount(() => {
    if (isElectron) {
      window.electronAPI?.serverDeploy.removeUpdateProgressListener()
    }
  })

  return {
    status,
    installedVersion,
    latestVersion,
    errorMessage,
    updateInProgress,
    updateLog,
    hasUpdate,
    isElectron,
    checkVersion,
    runUpdate,
  }
}
