<template>
  <div class="p-4 space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- 连接状态卡片 -->
      <Card class="p-4">
        <CardContent>
          <div class="flex items-center gap-3 mb-3">
            <span class="material-icons text-2xl" :class="connectionStatusColor">language</span>
            <div>
              <h3 class="font-semibold text-foreground dark:text-muted-foreground">连接状态</h3>
              <p class="text-sm text-muted-foreground dark:text-muted-foreground">{{ connectionStatusText }}</p>
            </div>
          </div>
          <div class="text-xs text-muted-foreground">
            服务器: {{ serverListStore.activeServer?.serverUrl || '未连接' }}
          </div>
        </CardContent>
      </Card>

      <!-- 系统信息卡片 -->
      <Card class="p-4">
        <CardContent>
          <div class="flex items-center gap-3 mb-3">
            <span class="material-icons text-2xl text-primary">computer</span>
            <div>
              <h3 class="font-semibold text-foreground dark:text-muted-foreground">系统信息</h3>
              <p class="text-sm text-muted-foreground dark:text-muted-foreground">{{ systemPlatform }}</p>
            </div>
          </div>
          <div class="text-xs text-muted-foreground">
            版本: {{ appVersion }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useServerListStore } from '../../stores/serverList'
import { Card, CardContent } from '@/components/ui/card'

const settingsStore = useSettingsStore()
const serverListStore = useServerListStore()

// 计算属性
const connectionStatusColor = computed(() => {
  switch (settingsStore.connectionStatus) {
    case 'connected':
      return 'text-green-600'
    case 'connecting':
    case 'reconnecting':
      return 'text-yellow-600'
    case 'error':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
})

const connectionStatusText = computed(() => {
  switch (settingsStore.connectionStatus) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中...'
    case 'reconnecting':
      return '重新连接中...'
    case 'error':
      return '连接失败'
    default:
      return '未连接'
  }
})

const systemPlatform = computed(() => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI.platform || 'Unknown'
  }
  return navigator.platform || 'Web'
})

const appVersion = computed(() => '1.0.0')
</script>
