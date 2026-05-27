import { defineStore } from 'pinia'
import { ref } from 'vue'
import { miraSDKService } from '../services/MiraSDKService'

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(true)
  const error = ref('')
  const dashboardBaseUrl = ref('')

  async function resolve() {
    try {
      loading.value = true
      error.value = ''

      if (!miraSDKService.isClientConnected()) {
        error.value = '未连接到服务器'
        return
      }

      const config = miraSDKService.getConnectionConfig()
      if (!config?.serverUrl) {
        error.value = '无法获取服务器地址'
        return
      }

      const health = await miraSDKService.getSystemHealth()
      const port = health.dashboardPort || 5173
      const serverUrl = new URL(config.serverUrl)
      dashboardBaseUrl.value = `${serverUrl.protocol}//${serverUrl.hostname}:${port}`
    } catch (e: any) {
      error.value = e.message || '加载失败'
    } finally {
      loading.value = false
    }
  }

  function buildUrl(path: string, params?: Record<string, string>) {
    if (!dashboardBaseUrl.value) return ''
    const url = new URL(path, dashboardBaseUrl.value)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) url.searchParams.set(k, v)
      }
    }
    return url.toString()
  }

  function getUserAvatarUrl(userId: string) {
    if (!dashboardBaseUrl.value || !userId) return ''
    return `${dashboardBaseUrl.value}/api/user/avatar/${userId}`
  }

  return { loading, error, dashboardBaseUrl, resolve, buildUrl, getUserAvatarUrl }
})
