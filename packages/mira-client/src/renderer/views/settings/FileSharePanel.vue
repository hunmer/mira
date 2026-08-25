<template>
  <div class="p-4 space-y-5">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm font-medium">自动接收文件</p>
        <p class="text-xs text-muted-foreground">收到其他设备的分享时不弹确认框，直接下载保存；下载失败时仍会弹出确认框。</p>
      </div>
      <Switch :model-value="settingsStore.settings.deviceShareAutoAccept" @update:model-value="update('deviceShareAutoAccept', $event)" />
    </div>

    <div v-if="appService.isElectron" class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium">保存位置</p>
        <p class="text-xs text-muted-foreground truncate" :title="settingsStore.settings.deviceShareSaveDir">
          {{ settingsStore.settings.deviceShareSaveDir || '未设置（接收文件时可选择）' }}
        </p>
      </div>
      <Button variant="outline" size="sm" class="shrink-0" @click="selectDir">选择…</Button>
    </div>
    <p v-else class="text-xs text-muted-foreground">保存位置设置仅在桌面端可用，网页端文件保存到浏览器默认下载目录。</p>
  </div>
</template>
<script setup lang="ts">
import { appService } from '@renderer/services'
import { useSettingsStore, type AppSettings } from '../../stores/settings'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

const settingsStore = useSettingsStore()

async function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  await settingsStore.updateSetting(key, value)
}

async function selectDir() {
  const result = await (window as any).electronAPI?.fs?.selectDirectory('选择保存位置')
  if (result?.success && result.path) await update('deviceShareSaveDir', result.path)
}
</script>
