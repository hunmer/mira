<template>
  <div class="p-4 space-y-6">
    <div>
      <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">数据管理</h3>
      <p class="text-slate-600 dark:text-slate-400 text-sm">导入或导出应用设置</p>
    </div>

    <div class="space-y-4">
      <div class="flex items-center justify-between py-2">
        <div>
          <p class="text-slate-900 dark:text-slate-100 text-base font-normal leading-normal">导出设置</p>
          <p class="text-slate-600 dark:text-slate-400 text-sm">将当前设置保存为 JSON 文件</p>
        </div>
        <Button @click="exportSettings" variant="outline">
          导出
        </Button>
      </div>

      <div class="flex items-center justify-between py-2">
        <div>
          <p class="text-slate-900 dark:text-slate-100 text-base font-normal leading-normal">导入设置</p>
          <p class="text-slate-600 dark:text-slate-400 text-sm">从 JSON 文件恢复设置</p>
        </div>
        <Button @click="openImportDialog" variant="outline">
          导入
        </Button>
      </div>
    </div>

    <Dialog :open="showImportDialog" @update:open="showImportDialog = $event">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>导入设置</DialogTitle>
        </DialogHeader>
        <FileUpload
          name="settings"
          accept=".json"
          :max-file-size="1000000"
          choose-label="选择设置文件"
          @select="handleFileSelect"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import FileUpload from '../../components/FileUpload.vue'

const settingsStore = useSettingsStore()
const toast = useToast()

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
      summary: '导出成功',
      detail: '设置文件已成功导出',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '导出失败',
      detail: error instanceof Error ? error.message : '导出设置时发生错误',
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
      throw new Error('无效的设置文件格式')
    }

    Object.assign(settingsStore.settings, importedSettings)
    await settingsStore.saveSettings()

    showImportDialog.value = false

    toast.add({
      severity: 'success',
      summary: '导入成功',
      detail: '设置已成功导入并保存',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '导入失败',
      detail: error instanceof Error ? error.message : '导入设置时发生错误',
      life: 5000
    })
  }
}
</script>
