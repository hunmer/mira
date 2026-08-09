<template>
  <div class="p-4 space-y-6">
    <div>
      <div class="flex items-center justify-between py-3">
        <div>
          <p class="text-sm font-medium text-foreground dark:text-muted-foreground">{{ $t('views.importPanel.enableTitle') }}</p>
          <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{{ $t('views.importPanel.enableDesc') }}</p>
        </div>
        <Switch
          :model-value="settingsStore.settings.directImportMode"
          @update:model-value="(val: boolean) => { settingsStore.settings.directImportMode = val; handleSettingChange('directImportMode', val) }"
        />
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

const handleSettingChange = async (key: string, _value: any) => {
  try {
    await settingsStore.saveSettings()
    toast.add({
      severity: 'success',
      summary: t('views.common.settingSaved'),
      detail: t('views.common.settingUpdated', { key }),
      life: 2000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('views.common.saveFailed'),
      detail: error instanceof Error ? error.message : t('views.common.saveError'),
      life: 5000
    })
  }
}
</script>
