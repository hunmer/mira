<template>
  <div class="p-4 space-y-6">
    <div>
      <div class="space-y-4">
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">启用通知</p>
            <p class="text-muted-foreground dark:text-muted-foreground text-sm">接收应用状态和操作结果通知</p>
          </div>
          <Switch
            :checked="settingsStore.settings.enableNotifications"
            @update:checked="handleSettingChange('enableNotifications', $event)"
          />
        </div>

        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">导入文件通知</p>
            <p class="text-muted-foreground dark:text-muted-foreground text-sm">文件导入完成时弹出桌面通知（批量导入会聚合为一条）</p>
          </div>
          <Switch
            :checked="settingsStore.settings.enableImportNotifications"
            @update:checked="handleSettingChange('enableImportNotifications', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Switch } from '@/components/ui/switch'

const settingsStore = useSettingsStore()
const toast = useToast()

// 方法
const handleSettingChange = async (key: string, value: any) => {
  try {
    // 先写入 store，再保存（避免保存时读到旧值）
    ;(settingsStore.settings as any)[key] = value
    // 自动保存设置
    await settingsStore.saveSettings()

    toast.add({
      severity: 'success',
      summary: '设置已保存',
      detail: `${key} 设置已成功更新`,
      life: 2000
    })
  } catch (error) {
    console.error('Setting change error:', error, 'Value:', value)
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: error instanceof Error ? error.message : '保存设置时发生错误',
      life: 5000
    })
  }
}
</script>
