<template>
  <div class="p-4 space-y-6">
    <h3 class="text-foreground dark:text-muted-foreground text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">直接导入模式</h3>
    <div class="flex items-center justify-between py-3">
      <div>
        <p class="text-sm font-medium text-foreground dark:text-muted-foreground">启用直接导入</p>
        <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">开启后，拖拽文件到当前文件夹/标签时将直接上传，无需手动确认</p>
      </div>
      <Switch
        :model-value="settingsStore.settings.directImportMode"
        @update:model-value="(val: boolean) => { settingsStore.settings.directImportMode = val; handleSettingChange('directImportMode', val) }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Switch } from '@/components/ui/switch'

const settingsStore = useSettingsStore()
const toast = useToast()

const handleSettingChange = async (key: string, _value: any) => {
  try {
    await settingsStore.saveSettings()
    toast.add({
      severity: 'success',
      summary: '设置已保存',
      detail: `${key} 设置已成功更新`,
      life: 2000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: error instanceof Error ? error.message : '保存设置时发生错误',
      life: 5000
    })
  }
}
</script>
