<template>
  <div class="home-view flex-1 flex flex-col min-h-full">
    <div v-if="dashboardStore.loading" class="flex items-center justify-center flex-1">
      <span class="text-muted-foreground">加载中...</span>
    </div>
    <div v-else-if="dashboardStore.error" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <span class="material-icons text-4xl text-muted-foreground mb-2 block">cloud_off</span>
        <p class="text-muted-foreground text-sm">{{ dashboardStore.error }}</p>
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
import { useDashboardStore } from '@renderer/stores/dashboard'
import { useAuthStore } from '@renderer/stores/auth'

interface Props {
  tabId?: string
  libraryId?: string
}

const props = withDefaults(defineProps<Props>(), {
  tabId: 'home'
})

const dashboardStore = useDashboardStore()
const dashboardUrl = ref('')

onMounted(async () => {
  await dashboardStore.resolve()
  if (!dashboardStore.dashboardBaseUrl) return

  const authStore = useAuthStore()
  const params: Record<string, string> = {}
  if (authStore.token) params.token = authStore.token
  if (props.libraryId) params.libraryId = props.libraryId
  dashboardUrl.value = dashboardStore.buildUrl('/#/statistics?hideSide=1', params)
})
</script>
