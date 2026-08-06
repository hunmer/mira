/**
 * 后端可用性检测
 *
 * 对已保存的服务器并发调用 getHealth()，更新每个 serverId 的健康状态。
 * 检测是独立的轻量请求，不影响用户操作；失败统一标记为 offline。
 */
import { ref } from 'vue'
import type { ServerConfig } from '@renderer/stores/serverList'

// 'online' | 'offline' | 'checking' | 'unknown'
export type BackendStatus = 'online' | 'offline' | 'checking' | 'unknown'

export function useBackendStatus() {
  // 记录每个 serverId 的健康检查状态
  const backendStatus = ref<Record<string, BackendStatus>>({})

  // 对单个服务器并发调用 getHealth()，更新 backendStatus。
  async function checkBackendStatus(server: ServerConfig) {
    backendStatus.value = { ...backendStatus.value, [server.id]: 'checking' }
    try {
      const { MiraClient } = await import('mira-app-core/shared/sdk')
      const client = new MiraClient(server.serverUrl.replace(/\/$/, ''))
      // 给健康检查一个较短超时，避免离线服务器拖住整个列表
      // getHealth() 经 HttpClient 已自动解包 { code, data } 外层，
      // 返回的即内层对象，健康信号是 status === 'ok'（无 success 字段）。
      const health = await Promise.race([
        client.system().getHealth(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ])
      backendStatus.value = {
        ...backendStatus.value,
        [server.id]: health?.status === 'ok' ? 'online' : 'offline',
      }
    } catch {
      backendStatus.value = { ...backendStatus.value, [server.id]: 'offline' }
    }
  }

  // 并发检测所有已保存的服务器后端可用性
  function checkAllBackends(services: ServerConfig[]) {
    services.forEach(s => checkBackendStatus(s))
  }

  function backendStatusLabel(id: string): string {
    switch (backendStatus.value[id]) {
      case 'online': return '在线'
      case 'offline': return '离线'
      case 'checking': return '检测中'
      default: return '未检测'
    }
  }

  function backendStatusClass(id: string): string {
    switch (backendStatus.value[id]) {
      case 'online': return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
      case 'offline': return 'text-destructive dark:text-destructive border-destructive/40'
      case 'checking': return 'text-muted-foreground border-border'
      default: return 'text-muted-foreground border-border'
    }
  }

  function backendStatusDotClass(id: string): string {
    switch (backendStatus.value[id]) {
      case 'online': return 'bg-emerald-500'
      case 'offline': return 'bg-destructive'
      default: return 'bg-muted-foreground'
    }
  }

  return {
    backendStatus,
    checkBackendStatus,
    checkAllBackends,
    backendStatusLabel,
    backendStatusClass,
    backendStatusDotClass,
  }
}
