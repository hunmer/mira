<template>
  <Dialog :open="showImportDialog" @update:open="handleOpenChange">
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import FileUpload from '../../components/FileUpload.vue'

const settingsStore = useSettingsStore()
const toast = useToast()

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
    
    // 验证设置格式
    if (typeof importedSettings !== 'object' || !importedSettings.serverUrl) {
      throw new Error('无效的设置文件格式')
    }
    
    // 合并设置
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

// 暴露方法给父组件
defineExpose({
  openImportDialog,
  exportSettings
})
</script>
