<template>
  <div class="p-4 space-y-6">
    <div>
      <h3 class="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">插件目录配置</h3>
      <div class="space-y-4">
        <div>
          <p class="text-slate-900 text-base font-normal leading-normal">当前插件目录</p>
          <div class="flex gap-2 mt-1">
            <Input v-model="pluginDirectory" placeholder="选择插件目录..." class="flex-1" readonly />
            <Button variant="secondary" @click="selectPluginDirectory">
              <i class="pi pi-folder-open mr-2"></i>浏览
            </Button>
          </div>
          <p class="text-slate-600 text-sm">插件将从此目录加载，建议使用独立的文件夹</p>
        </div>

        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-slate-900 text-base font-normal leading-normal">自动扫描插件</p>
            <p class="text-slate-600 text-sm">启动时自动扫描并加载插件目录中的插件</p>
          </div>
          <Switch :checked="autoScanEnabled" @update:checked="autoScanEnabled = $event" />
        </div>

        <div v-if="autoScanEnabled">
          <p class="text-slate-900 text-base font-normal leading-normal">扫描间隔</p>
          <Select v-model="scanInterval" class="mt-1">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择扫描间隔" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in scanIntervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-slate-600 text-sm">定期检查插件目录变化</p>
        </div>
      </div>
    </div>

    <AlertDialog :open="showResetDialog" @update:open="showResetDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>重置插件设置</AlertDialogTitle>
          <AlertDialogDescription>确定要重置所有插件设置到默认值吗？此操作不可撤销。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showResetDialog = false">取消</AlertDialogCancel>
          <AlertDialogAction @click="confirmReset">确认重置</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePluginStore } from '@renderer/stores/plugin'
import { useSettingsStore } from '@renderer/stores/settings'
import ConfigStorage from '@renderer/utils/ConfigStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'

// 组合式API
const pluginStore = usePluginStore()
const settingsStore = useSettingsStore()

// 响应式数据
const pluginDirectory = ref('')
const autoScanEnabled = ref(true)
const scanInterval = ref(30000) // 30秒

// 状态
const resetting = ref(false)
const showResetDialog = ref(false)

// 扫描间隔选项
const scanIntervalOptions = [
  { label: '15秒', value: 15000 },
  { label: '30秒', value: 30000 },
  { label: '1分钟', value: 60000 },
  { label: '5分钟', value: 300000 },
  { label: '10分钟', value: 600000 },
  { label: '禁用', value: 0 }
]

// 显示通知的方法
const showToast = (severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string) => {
  // 使用全局事件总线或其他方式显示通知
  // 这里简化处理，可以根据实际项目结构调整
  console.log(`[${severity.toUpperCase()}] ${summary}: ${detail}`)
}

// 方法
const selectPluginDirectory = async () => {
  try {
    // 使用插件 store 的目录选择方法
    const result = await pluginStore.selectPluginDirectory('选择插件目录')
    console.log('selectPluginDirectory result:', result)

    if (result.success && result.data) {
      // 确保我们获取的是路径字符串
      let selectedPath: string | undefined
      
      if (typeof result.data === 'string') {
        selectedPath = result.data
      } else if (typeof result.data === 'object' && result.data) {
        // 处理对象格式的返回值
        selectedPath = (result.data as any).path || 
                      (result.data as any).filePath || 
                      (result.data as any).data
      }
      
      if (selectedPath) {
        pluginDirectory.value = selectedPath
        showToast('success', '成功', `已选择插件目录: ${selectedPath}`)
      } else {
        console.warn('选择目录结果格式异常:', result.data)
        showToast('warn', '警告', '选择的目录路径无效')
      }
    } else if (!result.success && result.error) {
      console.error('选择目录失败:', result.error)
      showToast('error', '错误', result.error || '选择目录失败')
    }
    // 如果 result.success 为 false 但没有 error，可能是用户取消了选择
  } catch (error) {
    console.error('选择目录失败:', error)
    showToast('error', '错误', '选择目录失败')
  }
}

const confirmReset = async () => {
  resetting.value = true
  try {
    pluginDirectory.value = ''
    autoScanEnabled.value = true
    scanInterval.value = 30000

    await settingsStore.updateSettings({
      pluginsDirectory: '',
      autoLoadPlugins: true,
      trustedPlugins: []
    })

    ConfigStorage.removeItem('mira-plugin-extended-settings')

    showResetDialog.value = false
    showToast('success', '成功', '插件设置已重置为默认值')
  } catch (error) {
    console.error('重置设置失败:', error)
    showToast('error', '错误', '重置设置失败')
  } finally {
    resetting.value = false
  }
}

const loadCurrentSettings = async () => {
  try {
    const currentSettings = settingsStore.settings

    pluginDirectory.value = currentSettings.pluginsDirectory || ''
    autoScanEnabled.value = currentSettings.autoLoadPlugins ?? true

    try {
      const extendedSettingsJson = await ConfigStorage.getItem('mira-plugin-extended-settings')
      if (extendedSettingsJson) {
        scanInterval.value = JSON.parse(extendedSettingsJson).scanInterval ?? 30000
      } else {
        scanInterval.value = 30000
      }
    } catch (extError) {
      console.warn('加载扩展插件设置失败，使用默认值:', extError)
      scanInterval.value = 30000
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    showToast('error', '错误', '加载插件设置失败，使用默认设置')
    pluginDirectory.value = ''
    autoScanEnabled.value = true
    scanInterval.value = 30000
  }
}

// 生命周期
onMounted(async () => {
  await loadCurrentSettings()
  // 确保插件数据已加载
  if (pluginStore.localPlugins.length === 0) {
    await pluginStore.loadLocalPlugins()
  }
})
</script>

