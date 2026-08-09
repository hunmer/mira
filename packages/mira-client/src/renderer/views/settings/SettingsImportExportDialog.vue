<template>
  <Dialog :open="showImportDialog" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>{{ $t('views.settingsImportExportDialog.title') }}</DialogTitle>
      </DialogHeader>
    <FileUpload
      name="settings"
      accept=".json"
      :max-file-size="1000000"
      :choose-label="$t('views.settingsImportExportDialog.chooseFile')"
      @select="handleFileSelect"
    />
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import FileUpload from '../../components/FileUpload.vue'

const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

const showImportDialog = ref(false)

// 处理 Dialog open 状态变化
const handleOpenChange = (open: boolean) => {
  showImportDialog.value = open
}

// 导出方法供父组件调用
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
    
    // 验证设置格式
    if (typeof importedSettings !== 'object' || !importedSettings.serverUrl) {
      throw new Error(t('views.dataPanel.invalidFormat'))
    }

    // 合并设置
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

// 暴露方法给父组件
defineExpose({
  openImportDialog,
  exportSettings
})
</script>
