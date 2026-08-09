<template>
  <div class="p-4 space-y-6">
    <div>
      <div class="space-y-4">
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.notificationsPanel.enableTitle') }}</p>
            <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.notificationsPanel.enableDesc') }}</p>
          </div>
          <Switch
            :checked="settingsStore.settings.enableNotifications"
            @update:checked="handleSettingChange('enableNotifications', $event)"
          />
        </div>

        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.notificationsPanel.importTitle') }}</p>
            <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.notificationsPanel.importDesc') }}</p>
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
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Switch } from '@/components/ui/switch'

const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

// 方法
const handleSettingChange = async (key: string, value: any) => {
  try {
    // 先写入 store，再保存（避免保存时读到旧值）
    ;(settingsStore.settings as any)[key] = value
    // 自动保存设置
    await settingsStore.saveSettings()

    toast.add({
      severity: 'success',
      summary: t('views.common.settingSaved'),
      detail: t('views.common.settingUpdated', { key }),
      life: 2000
    })
  } catch (error) {
    console.error('Setting change error:', error, 'Value:', value)
    toast.add({
      severity: 'error',
      summary: t('views.common.saveFailed'),
      detail: error instanceof Error ? error.message : t('views.common.saveError'),
      life: 5000
    })
  }
}
</script>
