<template>
  <div class="p-4 space-y-6">
    <div>
      <h3 class="text-foreground dark:text-muted-foreground text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">插件目录配置</h3>
      <div class="space-y-4">
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">当前插件目录</p>
          <div class="flex gap-2 mt-1">
            <Input v-model="pluginDirectory" placeholder="选择插件目录..." class="flex-1" readonly />
            <Button variant="secondary" @click="selectPluginDirectory">
              <span class="material-icons mr-2">folder_open</span>浏览
            </Button>
          </div>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">插件将从此目录加载，建议使用独立的文件夹</p>
        </div>

        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">自动扫描插件</p>
            <p class="text-muted-foreground dark:text-muted-foreground text-sm">启动时自动扫描并加载插件目录中的插件</p>
          </div>
          <Switch :checked="autoScanEnabled" @update:checked="autoScanEnabled = $event" />
        </div>

        <div v-if="autoScanEnabled">
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">扫描间隔</p>
          <Select v-model="scanInterval" class="mt-1">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择扫描间隔" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in scanIntervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">定期检查插件目录变化</p>
        </div>
      </div>
    </div>

    <div>
      <h3 class="text-foreground dark:text-muted-foreground text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">插件市场源</h3>
      <div class="space-y-4">
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">市场源地址列表</p>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm mt-1">
            指向插件市场静态 HTTP 服务的根地址（需提供 plugins.json）。可配置多个源，在「插件市场」标签中通过下拉框切换。
          </p>

          <!-- 已配置的源列表 -->
          <div v-if="clientPluginMarketUrls.length > 0" class="mt-3 space-y-2">
            <div
              v-for="(url, index) in clientPluginMarketUrls"
              :key="index"
              class="flex gap-2 items-center"
            >
              <Input
                :model-value="url"
                placeholder="例如 http://localhost:8080"
                class="flex-1"
                @update:model-value="(val) => updateMarketUrl(index, val)"
                @blur="saveMarketUrls"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                @click="removeMarketUrl(index)"
                title="删除"
              >
                <span class="material-icons">delete</span>
              </Button>
            </div>
          </div>

          <!-- 添加新源 -->
          <div class="flex gap-2 mt-3">
            <Input
              v-model="newMarketUrl"
              placeholder="输入新的市场源地址后点击添加"
              class="flex-1"
              @keydown.enter="addMarketUrl"
            />
            <Button variant="secondary" @click="addMarketUrl">
              <span class="material-icons mr-1">add</span>添加
            </Button>
          </div>
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
const clientPluginMarketUrls = ref<string[]>([])
const newMarketUrl = ref('')

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
    clientPluginMarketUrls.value = []
    newMarketUrl.value = ''

    await settingsStore.updateSettings({
      pluginsDirectory: '',
      autoLoadPlugins: true,
      trustedPlugins: [],
      clientPluginMarketUrl: '',
      clientPluginMarketUrls: []
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

// 保存插件市场源列表（同步规范化并写入「当前选中源」）
const saveMarketUrls = async () => {
  try {
    // 规范化：trim、去空、去重（保留顺序）
    const urls = clientPluginMarketUrls.value
      .map((u) => (u || '').trim())
      .filter((u) => !!u)
      .filter((u, i, arr) => arr.indexOf(u) === i)
    clientPluginMarketUrls.value = urls

    // 保证当前选中源在列表内：若旧选中源仍存在则保留，否则回退到首项
    const currentSelected = (settingsStore.settings.clientPluginMarketUrl || '').trim()
    const selected =
      currentSelected && urls.includes(currentSelected)
        ? currentSelected
        : urls[0] || ''

    await settingsStore.updateSettings({
      clientPluginMarketUrl: selected,
      clientPluginMarketUrls: urls
    })
  } catch (error) {
    console.error('保存市场源失败:', error)
    showToast('error', '错误', '保存插件市场源列表失败')
  }
}

// 修改指定位置的市场源
const updateMarketUrl = (index: number, val: string | number) => {
  clientPluginMarketUrls.value[index] = String(val ?? '')
}

// 添加新的市场源
const addMarketUrl = async () => {
  const url = (newMarketUrl.value || '').trim()
  if (!url) {
    showToast('warn', '警告', '请输入市场源地址')
    return
  }
  if (clientPluginMarketUrls.value.includes(url)) {
    showToast('warn', '警告', '该源地址已存在')
    return
  }
  clientPluginMarketUrls.value.push(url)
  newMarketUrl.value = ''
  await saveMarketUrls()
  showToast('success', '成功', '已添加市场源')
}

// 删除指定市场源
const removeMarketUrl = async (index: number) => {
  clientPluginMarketUrls.value.splice(index, 1)
  await saveMarketUrls()
}

const loadCurrentSettings = async () => {
  try {
    const currentSettings = settingsStore.settings

    pluginDirectory.value = currentSettings.pluginsDirectory || ''
    autoScanEnabled.value = currentSettings.autoLoadPlugins ?? true

    // 插件市场源列表（含旧单值迁移兜底）
    const urlsList = Array.isArray(currentSettings.clientPluginMarketUrls)
      ? currentSettings.clientPluginMarketUrls
      : []
    const oldSingle = (currentSettings.clientPluginMarketUrl || '').trim()
    const mergedUrls =
      urlsList.length > 0
        ? urlsList
        : oldSingle
          ? [oldSingle]
          : []
    clientPluginMarketUrls.value = mergedUrls
      .map((u: string) => (u || '').trim())
      .filter((u: string) => !!u)
      .filter((u: string, i: number, arr: string[]) => arr.indexOf(u) === i)

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
    clientPluginMarketUrls.value = []
    newMarketUrl.value = ''
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

