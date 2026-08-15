<template>
  <div class="p-4 space-y-6">
    <div>
      <div class="space-y-4">
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.pluginsPanel.directoryTitle') }}</p>
          <div class="flex gap-2 mt-1">
            <Input v-model="pluginDirectory" :placeholder="$t('views.pluginsPanel.directoryPlaceholder')" class="flex-1" readonly />
            <Button variant="secondary" @click="selectPluginDirectory">
              <span class="material-icons mr-2">folder_open</span>{{ $t('views.pluginsPanel.browse') }}
            </Button>
          </div>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.pluginsPanel.directoryDesc') }}</p>
        </div>

        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.pluginsPanel.autoScanTitle') }}</p>
            <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.pluginsPanel.autoScanDesc') }}</p>
          </div>
          <Switch :checked="autoScanEnabled" @update:checked="autoScanEnabled = $event" />
        </div>

        <div v-if="autoScanEnabled">
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.pluginsPanel.scanIntervalTitle') }}</p>
          <Select v-model="scanInterval" class="mt-1">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="$t('views.pluginsPanel.selectScanInterval')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in scanIntervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.pluginsPanel.scanIntervalDesc') }}</p>
        </div>
      </div>
    </div>

    <div>
      <div class="space-y-4">
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.pluginsPanel.marketListTitle') }}</p>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm mt-1">
            {{ $t('views.pluginsPanel.marketListDesc') }}
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
                :placeholder="$t('views.pluginsPanel.marketUrlPlaceholder')"
                class="flex-1"
                @update:model-value="(val) => updateMarketUrl(index, val)"
                @blur="saveMarketUrls"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                @click="removeMarketUrl(index)"
                :title="$t('views.pluginsPanel.delete')"
              >
                <span class="material-icons">delete</span>
              </Button>
            </div>
          </div>

          <!-- 添加新源 -->
          <div class="flex gap-2 mt-3">
            <Input
              v-model="newMarketUrl"
              :placeholder="$t('views.pluginsPanel.newMarketPlaceholder')"
              class="flex-1"
              @keydown.enter="addMarketUrl"
            />
            <Button variant="secondary" @click="addMarketUrl">
              <span class="material-icons mr-1">add</span>{{ $t('views.pluginsPanel.add') }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <AlertDialog :open="showResetDialog" @update:open="showResetDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('views.pluginsPanel.resetTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ $t('views.pluginsPanel.resetDesc') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showResetDialog = false">{{ $t('views.pluginsPanel.cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="confirmReset">{{ $t('views.pluginsPanel.confirmReset') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()

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
const scanIntervalOptions = computed(() => [
  { label: t('views.pluginsPanel.interval15s'), value: 15000 },
  { label: t('views.pluginsPanel.interval30s'), value: 30000 },
  { label: t('views.pluginsPanel.interval1m'), value: 60000 },
  { label: t('views.pluginsPanel.interval5m'), value: 300000 },
  { label: t('views.pluginsPanel.interval10m'), value: 600000 },
  { label: t('views.pluginsPanel.intervalDisabled'), value: 0 }
])

// 显示通知的方法
const showToast = (severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string) => {
  // 使用全局事件总线或其他方式显示通知
  // 这里简化处理，可以根据实际项目结构调整
}

// 方法
const selectPluginDirectory = async () => {
  try {
    // 使用插件 store 的目录选择方法
    const result = await pluginStore.selectPluginDirectory(t('views.pluginsPanel.selectDirectory'))
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
        showToast('success', t('views.common.settingSaved'), t('views.pluginsPanel.selectSuccess', { path: selectedPath }))
      } else {
        console.warn('选择目录结果格式异常:', result.data)
        showToast('warn', t('views.common.saveFailed'), t('views.pluginsPanel.selectInvalid'))
      }
    } else if (!result.success && result.message) {
      console.error('选择目录失败:', result.message)
      showToast('error', t('views.common.saveFailed'), result.message || t('views.pluginsPanel.selectFailed'))
    }
    // 如果 result.success 为 false 但没有 error，可能是用户取消了选择
  } catch (error) {
    console.error('选择目录失败:', error)
    showToast('error', t('views.common.saveFailed'), t('views.pluginsPanel.selectFailed'))
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
    showToast('success', t('views.common.settingSaved'), t('views.pluginsPanel.resetSuccess'))
  } catch (error) {
    console.error('重置设置失败:', error)
    showToast('error', t('views.common.saveFailed'), t('views.pluginsPanel.resetFailed'))
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
    showToast('error', t('views.common.saveFailed'), t('views.pluginsPanel.saveMarketFailed'))
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
    showToast('warn', t('views.common.saveFailed'), t('views.pluginsPanel.marketEmptyWarn'))
    return
  }
  if (clientPluginMarketUrls.value.includes(url)) {
    showToast('warn', t('views.common.saveFailed'), t('views.pluginsPanel.marketDuplicateWarn'))
    return
  }
  clientPluginMarketUrls.value.push(url)
  newMarketUrl.value = ''
  await saveMarketUrls()
  showToast('success', t('views.common.settingSaved'), t('views.pluginsPanel.marketAddedSuccess'))
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
    showToast('error', t('views.common.saveFailed'), t('views.pluginsPanel.loadFailed'))
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

