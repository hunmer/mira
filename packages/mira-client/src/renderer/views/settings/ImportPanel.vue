<template>
  <div class="p-4 space-y-6">
    <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">直接导入模式</h3>
    <div class="flex items-center justify-between py-3">
      <div>
        <p class="text-sm font-medium text-slate-900 dark:text-slate-100">启用直接导入</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">开启后，拖拽文件到当前文件夹/标签时将直接上传，无需手动确认</p>
      </div>
      <Switch
        :checked="settingsStore.settings.directImportMode"
        @update:checked="(val: boolean) => { settingsStore.settings.directImportMode = val; handleSettingChange('directImportMode', val) }"
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

const handleSettingChange = async (key: string, value: any) => {
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
