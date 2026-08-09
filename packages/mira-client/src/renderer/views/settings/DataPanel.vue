<template>
  <div class="p-4 space-y-6">
    <div>
      <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.dataPanel.desc') }}</p>
    </div>

    <div class="space-y-4">
      <div class="flex items-center justify-between py-2">
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.dataPanel.exportTitle') }}</p>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.dataPanel.exportDesc') }}</p>
        </div>
        <Button @click="exportSettings" variant="outline">
          {{ $t('views.dataPanel.export') }}
        </Button>
      </div>

      <div class="flex items-center justify-between py-2">
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.dataPanel.importTitle') }}</p>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.dataPanel.importDesc') }}</p>
        </div>
        <Button @click="openImportDialog" variant="outline">
          {{ $t('views.dataPanel.import') }}
        </Button>
      </div>
    </div>

    <Dialog :open="showImportDialog" @update:open="showImportDialog = $event">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{{ $t('views.dataPanel.dialogTitle') }}</DialogTitle>
        </DialogHeader>
        <FileUpload
          name="settings"
          accept=".json"
          :max-file-size="1000000"
          :choose-label="$t('views.dataPanel.chooseFile')"
          @select="handleFileSelect"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import FileUpload from '../../components/FileUpload.vue'

const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

const showImportDialog = ref(false)

const openImportDialog = () => {
  showImportDialog.value = true
}

const exportSettings = async () => {
  try {
    const settings = JSON.stringify(settingsStore.settings, null, 2)
    const blob = new Blob([settings], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `mira-settings-${new Date().toISOString().split('T')[0]}.json`
    a.click()

    URL.revokeObjectURL(url)

    toast.add({
      severity: 'success',
      summary: t('views.dataPanel.exportSuccess'),
      detail: t('views.dataPanel.exportSuccessDetail'),
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('views.dataPanel.exportFailed'),
      detail: error instanceof Error ? error.message : t('views.dataPanel.exportError'),
      life: 5000
    })
  }
}

const handleFileSelect = async (event: any) => {
  const file = event.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const importedSettings = JSON.parse(text)

    if (typeof importedSettings !== 'object' || !importedSettings.serverUrl) {
      throw new Error(t('views.dataPanel.invalidFormat'))
    }

    Object.assign(settingsStore.settings, importedSettings)
    await settingsStore.saveSettings()

    showImportDialog.value = false

    toast.add({
      severity: 'success',
      summary: t('views.dataPanel.importSuccess'),
      detail: t('views.dataPanel.importSuccessDetail'),
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('views.dataPanel.importFailed'),
      detail: error instanceof Error ? error.message : t('views.dataPanel.importError'),
      life: 5000
    })
  }
}
</script>
