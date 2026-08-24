<template>
  <div class="p-4 space-y-6">
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-4 py-3">
        <div>
          <p class="text-base font-normal leading-normal text-foreground">{{ t('views.browserPanel.rememberTitle') }}</p>
          <p class="text-sm text-muted-foreground">{{ t('views.browserPanel.rememberDesc') }}</p>
        </div>
        <Switch
          :model-value="settingsStore.settings.rememberWebviewPage"
          @update:model-value="handleRememberChange"
        />
      </div>

      <div class="flex items-center justify-between gap-4 border-t border-border/60 py-3">
        <div>
          <p class="text-base font-normal leading-normal text-foreground">{{ t('views.browserPanel.clearCacheTitle') }}</p>
          <p class="text-sm text-muted-foreground">{{ t('views.browserPanel.clearCacheDesc') }}</p>
        </div>
        <Button variant="outline" :disabled="isClearing" @click="clearBrowserCache">
          <span class="material-icons mr-1 text-base">delete_sweep</span>
          {{ isClearing ? t('views.browserPanel.clearing') : t('views.browserPanel.clearCache') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/renderer/composables/useToast'
import { useSettingsStore } from '../../stores/settings'

const { t } = useI18n()
const toast = useToast()
const settingsStore = useSettingsStore()
const isClearing = ref(false)

async function handleRememberChange(enabled: boolean) {
  try {
    await settingsStore.updateSetting('rememberWebviewPage', enabled)
    toast.add({
      severity: 'success',
      summary: t('settings.settingSaved'),
      detail: t('views.browserPanel.rememberUpdated'),
      life: 2000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('settings.saveFailed'),
      detail: error instanceof Error ? error.message : t('settings.saveError'),
      life: 5000,
    })
  }
}

async function clearBrowserCache() {
  const electronAPI = (window as any).electronAPI
  if (!electronAPI?.webview?.clearCache) {
    toast.add({
      severity: 'warn',
      summary: t('views.browserPanel.notSupported'),
      detail: t('views.browserPanel.notSupportedDesc'),
      life: 4000,
    })
    return
  }

  isClearing.value = true
  try {
    const result = await electronAPI.webview.clearCache()
    if (result?.success === false) throw new Error(result.message || t('views.browserPanel.clearCacheFailed'))
    toast.add({
      severity: 'success',
      summary: t('views.browserPanel.clearCacheSuccess'),
      detail: t('views.browserPanel.clearCacheSuccessDesc'),
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('views.browserPanel.clearCacheFailed'),
      detail: error instanceof Error ? error.message : t('views.browserPanel.clearCacheFailedDesc'),
      life: 5000,
    })
  } finally {
    isClearing.value = false
  }
}
</script>
