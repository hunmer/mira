import { defineStore } from 'pinia'
import { ref } from 'vue'
import { miraSDKService } from '../services/MiraSDKService'
import i18n from '../i18n'

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(true)
  const error = ref('')
  const dashboardBaseUrl = ref('')

  async function resolve() {
    try {
      loading.value = true
      error.value = ''

      if (!miraSDKService.isClientConnected()) {
        error.value = i18n.global.t('stores.dashboard.notConnected')
        return
      }

      const config = miraSDKService.getConnectionConfig()
      if (!config?.serverUrl) {
        error.value = i18n.global.t('stores.dashboard.missingServerUrl')
        return
      }

      // dashboard 直接由后端服务器在 /dashboard 路径下提供，无需独立端口
      const serverUrl = new URL(config.serverUrl)
      dashboardBaseUrl.value = `${serverUrl.protocol}//${serverUrl.host}`
    } catch (e: any) {
      error.value = e.message || i18n.global.t('stores.dashboard.loadFailed')
    } finally {
      loading.value = false
    }
  }

  function buildUrl(path: string, params?: Record<string, string>) {
    if (!dashboardBaseUrl.value) return ''
    // dashboard 由后端服务器在 /dashboard 路径下提供
    const fullPath = `/dashboard${path}`
    if (!params || !Object.values(params).some(Boolean)) {
      return `${dashboardBaseUrl.value}${fullPath}`
    }
    const qs = Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    const separator = fullPath.includes('?') ? '&' : '?'
    // hash 路由：把参数拼在 hash 内的 query string 里，而不是 hash 前面
    const hashIdx = fullPath.indexOf('#')
    if (hashIdx !== -1) {
      const beforeHash = fullPath.slice(0, hashIdx)
      const afterHash = fullPath.slice(hashIdx + 1)
      const sep = afterHash.includes('?') ? '&' : '?'
      return `${dashboardBaseUrl.value}${beforeHash}#${afterHash}${sep}${qs}`
    }
    return `${dashboardBaseUrl.value}${fullPath}${separator}${qs}`
  }

  function getUserAvatarUrl(userId: string) {
    if (!dashboardBaseUrl.value || !userId) return ''
    return `${dashboardBaseUrl.value}/api/user/avatar/${userId}`
  }

  return { loading, error, dashboardBaseUrl, resolve, buildUrl, getUserAvatarUrl }
})
