<template>
  <div class="p-4 space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- 连接状态卡片 -->
      <Card class="p-4">
        <CardContent>
          <div class="flex items-center gap-3 mb-3">
            <span class="material-icons text-2xl" :class="connectionStatusColor">language</span>
            <div>
              <h3 class="font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.overviewPanel.connectionStatus') }}</h3>
              <p class="text-sm text-muted-foreground dark:text-muted-foreground">{{ connectionStatusText }}</p>
            </div>
          </div>
          <div class="text-xs text-muted-foreground">
            {{ $t('views.overviewPanel.server') }} {{ serverListStore.activeServer?.serverUrl || $t('views.overviewPanel.notConnected') }}
          </div>
        </CardContent>
      </Card>

      <!-- 系统信息卡片 -->
      <Card class="p-4">
        <CardContent>
          <div class="flex items-center gap-3 mb-3">
            <span class="material-icons text-2xl text-primary">computer</span>
            <div>
              <h3 class="font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.overviewPanel.systemInfo') }}</h3>
              <p class="text-sm text-muted-foreground dark:text-muted-foreground">{{ systemPlatform }}</p>
            </div>
          </div>
          <div class="text-xs text-muted-foreground">
            {{ $t('views.overviewPanel.version') }} {{ appVersion }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settings'
import { useServerListStore } from '../../stores/serverList'
import { Card, CardContent } from '@/components/ui/card'

const settingsStore = useSettingsStore()
const serverListStore = useServerListStore()
const { t } = useI18n()

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
      return t('views.overviewPanel.connected')
    case 'connecting':
      return t('views.overviewPanel.connecting')
    case 'reconnecting':
      return t('views.overviewPanel.reconnecting')
    case 'error':
      return t('views.overviewPanel.connectionFailed')
    default:
      return t('views.overviewPanel.notConnected')
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
