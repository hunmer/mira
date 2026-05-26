<template>
  <div class="home-view flex-1 flex flex-col">
    <div v-if="loading" class="flex items-center justify-center flex-1">
      <span class="text-gray-400">加载中...</span>
    </div>
    <div v-else-if="error" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <span class="material-icons text-4xl text-gray-400 mb-2 block">cloud_off</span>
        <p class="text-gray-500 text-sm">{{ error }}</p>
      </div>
    </div>
    <webview
      v-else
      :src="dashboardUrl"
      class="flex-1"
      style="width: 100%; height: 100%;"
      allowpopups
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useAuthStore } from '@renderer/stores/auth'

interface Props {
  tabId?: string
  libraryId?: string
}

const props = withDefaults(defineProps<Props>(), {
  tabId: 'home'
})

const loading = ref(true)
const error = ref('')
const dashboardUrl = ref('')

onMounted(async () => {
  try {
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
    const authStore = useAuthStore()
    const url = new URL('/statistics', `${serverUrl.protocol}//${serverUrl.hostname}:${port}`)
    if (authStore.token) {
      url.searchParams.set('token', authStore.token)
    }
    if (props.libraryId) {
      url.searchParams.set('libraryId', props.libraryId)
    }
    dashboardUrl.value = url.toString()
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.home-view {
  min-height: 100%;
}
</style>
