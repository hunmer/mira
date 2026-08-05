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
            服务器: {{ settingsStore.settings.serverUrl }}
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
import { useToast } from '@/renderer/composables/useToast'
import { Card, CardContent } from '@/components/ui/card'

const settingsStore = useSettingsStore()

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

const cacheSize = computed(() => {
  return settingsStore.settings.cacheSize * 1024 * 1024 // Convert MB to bytes
})

// 方法
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>
