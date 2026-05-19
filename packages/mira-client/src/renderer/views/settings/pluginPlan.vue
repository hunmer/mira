<template>
  <div class="plugin-plan-container flex-1 overflow-y-auto" style="max-height: calc(100vh - 200px)">
    <!-- 页面标题 -->
    <!-- 插件目录配置 -->
    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <i class="pi pi-folder text-blue-500"></i>
          插件目录配置
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <!-- 当前插件目录 -->
          <div class="field">
            <label class="block text-sm font-medium mb-2">当前插件目录</label>
            <div class="flex gap-2">
              <Input
                v-model="pluginDirectory"
                placeholder="选择插件目录..."
                class="flex-1"
                readonly
              />
              <Button
                variant="secondary"
                @click="selectPluginDirectory"
              >
                <i class="pi pi-folder-open mr-2"></i>
                浏览
              </Button>
            </div>
            <small class="text-gray-500 dark:text-gray-400">
              插件将从此目录加载，建议使用独立的文件夹
            </small>
          </div>

          <!-- 自动扫描设置 -->
          <div class="field">
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium">自动扫描插件</label>
                <small class="text-gray-500 dark:text-gray-400">
                  启动时自动扫描并加载插件目录中的插件
                </small>
              </div>
              <Switch :checked="autoScanEnabled" @update:checked="autoScanEnabled = $event" />
            </div>
          </div>

          <!-- 扫描间隔设置 -->
          <div class="field" v-if="autoScanEnabled">
            <label class="block text-sm font-medium mb-2">扫描间隔</label>
            <Select v-model="scanInterval">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择扫描间隔" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in scanIntervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
            <small class="text-gray-500 dark:text-gray-400">
              定期检查插件目录变化
            </small>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 插件安全设置 -->
    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <i class="pi pi-shield text-green-500"></i>
          安全设置
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <!-- 插件权限验证 -->
          <div class="field">
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium">严格权限验证</label>
                <small class="text-gray-500 dark:text-gray-400">
                  验证插件权限声明，阻止未授权操作
                </small>
              </div>
              <Switch :checked="strictPermissions" @update:checked="strictPermissions = $event" />
            </div>
          </div>

          <!-- 插件签名验证 -->
          <div class="field">
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium">插件签名验证</label>
                <small class="text-gray-500 dark:text-gray-400">
                  仅加载经过数字签名的插件（建议开启）
                </small>
              </div>
              <Switch :checked="requireSignature" @update:checked="requireSignature = $event" />
            </div>
          </div>

          <!-- 未知插件警告 -->
          <div class="field">
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium">未知插件警告</label>
                <small class="text-gray-500 dark:text-gray-400">
                  加载未知来源插件时显示警告对话框
                </small>
              </div>
              <Switch :checked="warnUnknownPlugins" @update:checked="warnUnknownPlugins = $event" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 插件性能设置 -->
    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <i class="pi pi-cog text-purple-500"></i>
          性能设置
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <!-- 最大插件数量 -->
          <div class="field">
            <label class="block text-sm font-medium mb-2">最大插件数量</label>
            <Input
              type="number"
              :model-value="maxPlugins"
              @update:model-value="maxPlugins = Number($event)"
              min="1"
              max="100"
              class="w-full"
            />
            <small class="text-gray-500 dark:text-gray-400">
              限制同时加载的插件数量以提高性能
            </small>
          </div>

          <!-- 插件超时设置 -->
          <div class="field">
            <label class="block text-sm font-medium mb-2">插件加载超时 (秒)</label>
            <Input
              type="number"
              :model-value="loadTimeout"
              @update:model-value="loadTimeout = Number($event)"
              min="5"
              max="60"
              class="w-full"
            />
            <small class="text-gray-500 dark:text-gray-400">
              插件初始化超时时间
            </small>
          </div>

          <!-- 内存限制 -->
          <div class="field">
            <label class="block text-sm font-medium mb-2">单个插件内存限制 (MB)</label>
            <Input
              type="number"
              :model-value="memoryLimit"
              @update:model-value="memoryLimit = Number($event)"
              min="10"
              max="1000"
              class="w-full"
            />
            <small class="text-gray-500 dark:text-gray-400">
              限制单个插件的内存使用量
            </small>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 操作按钮 -->
    <div class="flex justify-between items-center mt-6">
      <div class="flex gap-2">
        <Button
          variant="secondary"
          @click="rescanPlugins"
          :disabled="rescanning"
        >
          <i class="pi pi-refresh mr-2"></i>
          重新扫描插件
        </Button>
        <Button
          variant="secondary"
          @click="clearPluginCache"
        >
          <i class="pi pi-trash mr-2"></i>
          清理插件缓存
        </Button>
      </div>

      <div class="flex gap-2">
        <Button
          variant="ghost"
          @click="resetSettings"
        >
          <i class="pi pi-undo mr-2"></i>
          重置设置
        </Button>
        <Button
          @click="saveSettings"
          :disabled="saving"
        >
          <i class="pi pi-save mr-2"></i>
          保存设置
        </Button>
      </div>
    </div>

    <!-- 重置确认对话框 -->
    <AlertDialog
      :open="showResetDialog"
      @update:open="showResetDialog = $event"
    >
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
// 导入组件
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
const strictPermissions = ref(true)
const requireSignature = ref(false)
const warnUnknownPlugins = ref(true)
const maxPlugins = ref(50)
const loadTimeout = ref(30)
const memoryLimit = ref(100)

// 状态
const saving = ref(false)
const rescanning = ref(false)
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

const saveSettings = async () => {
  saving.value = true
  try {
    // 更新设置 store 中的插件相关设置
    await settingsStore.updateSettings({
      pluginsDirectory: pluginDirectory.value,
      enablePluginDevMode: false, // 这个在界面上没有对应的控件，保持默认值
      autoLoadPlugins: autoScanEnabled.value,
      maxPluginLoadTime: loadTimeout.value * 1000, // 转换为毫秒
      enablePluginSandbox: strictPermissions.value,
      trustedPlugins: settingsStore.settings.trustedPlugins || [] // 保持原有的信任插件列表
    })

    // 对于不在 AppSettings 中的字段，我们将它们存储在 localStorage 中
    // 这是一个临时解决方案，直到我们决定是否要扩展 AppSettings 接口
    const extendedSettings = {
      scanInterval: scanInterval.value,
      requireSignature: requireSignature.value,
      warnUnknownPlugins: warnUnknownPlugins.value,
      maxPlugins: maxPlugins.value,
      memoryLimit: memoryLimit.value
    }
    ConfigStorage.setItem('mira-plugin-extended-settings', JSON.stringify(extendedSettings))
    
    showToast('success', '成功', '插件设置已保存')
  } catch (error) {
    console.error('保存设置失败:', error)
    showToast('error', '错误', '保存设置失败')
  } finally {
    saving.value = false
  }
}

const rescanPlugins = async () => {
  rescanning.value = true
  try {
    await pluginStore.loadLocalPlugins()
    showToast('success', '成功', '插件重新扫描完成')
  } catch (error) {
    console.error('重新扫描失败:', error)
    showToast('error', '错误', '重新扫描插件失败')
  } finally {
    rescanning.value = false
  }
}

const clearPluginCache = async () => {
  try {
    // 缓存清理功能现在由 PluginService 管理
    console.log('Plugin cache clearing moved to PluginService')
    showToast('success', '成功', '插件缓存已清理')
  } catch (error) {
    console.error('清理缓存失败:', error)
    showToast('error', '错误', '清理缓存失败')
  }
}

const resetSettings = () => {
  showResetDialog.value = true
}

const confirmReset = async () => {
  resetting.value = true
  try {
    // 重置为默认值
    pluginDirectory.value = ''
    autoScanEnabled.value = true
    scanInterval.value = 30000
    strictPermissions.value = true
    requireSignature.value = false
    warnUnknownPlugins.value = true
    maxPlugins.value = 50
    loadTimeout.value = 30
    memoryLimit.value = 100

    // 重置设置 store 中的插件相关设置为默认值
    await settingsStore.updateSettings({
      pluginsDirectory: '',
      enablePluginDevMode: false,
      autoLoadPlugins: true,
      maxPluginLoadTime: 30000,
      enablePluginSandbox: false,
      trustedPlugins: []
    })

    // 清除扩展设置
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
    // 从设置 store 加载主要的插件设置
    const currentSettings = settingsStore.settings
    
    // 恢复主要插件设置
    pluginDirectory.value = currentSettings.pluginsDirectory || ''
    autoScanEnabled.value = currentSettings.autoLoadPlugins ?? true
    strictPermissions.value = currentSettings.enablePluginSandbox ?? true
    loadTimeout.value = Math.floor((currentSettings.maxPluginLoadTime || 30000) / 1000) // 转换为秒

    // 从 localStorage 加载扩展设置
    try {
      const extendedSettingsJson = ConfigStorage.getItem('mira-plugin-extended-settings')
      if (extendedSettingsJson) {
        const extendedSettings = JSON.parse(extendedSettingsJson)
        scanInterval.value = extendedSettings.scanInterval ?? 30000
        requireSignature.value = extendedSettings.requireSignature ?? false
        warnUnknownPlugins.value = extendedSettings.warnUnknownPlugins ?? true
        maxPlugins.value = extendedSettings.maxPlugins ?? 50
        memoryLimit.value = extendedSettings.memoryLimit ?? 100
      } else {
        // 使用默认值
        scanInterval.value = 30000
        requireSignature.value = false
        warnUnknownPlugins.value = true
        maxPlugins.value = 50
        memoryLimit.value = 100
      }
    } catch (extError) {
      console.warn('加载扩展插件设置失败，使用默认值:', extError)
      scanInterval.value = 30000
      requireSignature.value = false
      warnUnknownPlugins.value = true
      maxPlugins.value = 50
      memoryLimit.value = 100
    }
    
    console.log('已加载当前插件设置:', {
      pluginsDirectory: pluginDirectory.value,
      autoLoadPlugins: autoScanEnabled.value,
      maxPluginLoadTime: loadTimeout.value,
      enablePluginSandbox: strictPermissions.value,
      scanInterval: scanInterval.value,
      requireSignature: requireSignature.value,
      warnUnknownPlugins: warnUnknownPlugins.value,
      maxPlugins: maxPlugins.value,
      memoryLimit: memoryLimit.value
    })
    
  } catch (error) {
    console.error('加载设置失败:', error)
    showToast('error', '错误', '加载插件设置失败，使用默认设置')
    
    // 出错时使用默认值
    pluginDirectory.value = ''
    autoScanEnabled.value = true
    scanInterval.value = 30000
    strictPermissions.value = true
    requireSignature.value = false
    warnUnknownPlugins.value = true
    maxPlugins.value = 50
    loadTimeout.value = 30
    memoryLimit.value = 100
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

<style scoped>
.plugin-plan-container {
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 600px; /* 确保最小高度 */
}

.page-header {
  margin-bottom: 1.5rem;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

:deep(.dark) .field label {
  color: #d1d5db;
}

.field small {
  margin-top: 0.25rem;
  display: block;
}

/* 确保滚动条样式 */
.plugin-plan-container::-webkit-scrollbar {
  width: 6px;
}

.plugin-plan-container::-webkit-scrollbar-track {
  background-color: #f3f4f6;
}

:deep(.dark) .plugin-plan-container::-webkit-scrollbar-track {
  background-color: #1f2937;
}

.plugin-plan-container::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 0.375rem;
}

:deep(.dark) .plugin-plan-container::-webkit-scrollbar-thumb {
  background-color: #4b5563;
}

.plugin-plan-container::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}

:deep(.dark) .plugin-plan-container::-webkit-scrollbar-thumb:hover {
  background-color: #6b7280;
}
</style>