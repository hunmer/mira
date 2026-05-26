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
      console.log('[DashboardStore] resolve started, connected:', miraSDKService.isClientConnected())

      if (!miraSDKService.isClientConnected()) {
        error.value = '未连接到服务器'
        console.log('[DashboardStore] not connected')
        return
      }

      const config = miraSDKService.getConnectionConfig()
      console.log('[DashboardStore] config:', JSON.stringify(config))
      if (!config?.serverUrl) {
        error.value = '无法获取服务器地址'
        console.log('[DashboardStore] no serverUrl in config')
        return
      }

      const health = await miraSDKService.getSystemHealth()
      const port = health.dashboardPort || 5173
      console.log('[DashboardStore] health:', JSON.stringify(health), 'port:', port)
      const serverUrl = new URL(config.serverUrl)
      dashboardBaseUrl.value = `${serverUrl.protocol}//${serverUrl.hostname}:${port}`
      console.log('[DashboardStore] resolved baseUrl:', dashboardBaseUrl.value)
    } catch (e: any) {
      error.value = e.message || '加载失败'
      console.log('[DashboardStore] resolve error:', e.message)
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
