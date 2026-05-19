<template>
  <div class="p-4 space-y-6">
    <!-- 本地化设置 -->
    <div>
      <h3 class="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">本地化设置</h3>
      <div class="flex max-w-[480px] flex-wrap items-end gap-4 py-3">
        <div class="flex flex-col min-w-40 flex-1">
          <label class="text-slate-900 text-base font-medium leading-normal pb-2">语言</label>
          <Select
            :model-value="settingsStore.settings.language"
            @update:model-value="(value: any) => { settingsStore.settings.language = value; handleSettingChange('language', value) }"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择语言" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in languageOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <!-- 主题设置 -->
    <div>
      <h3 class="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">主题设置</h3>
      <div class="flex flex-wrap gap-5 py-3">
        <ToggleGroup
          type="single"
          :model-value="settingsStore.settings.theme"
          @update:model-value="(value: string) => { if (value) handleSettingChange('theme', value) }"
        >
          <ToggleGroupItem v-for="opt in themeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>

    <!-- 界面设置 -->
    <div>
      <h3 class="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">界面设置</h3>
      <div class="space-y-4">
        <!-- 网格大小 -->
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-slate-900 text-base font-normal leading-normal">网格大小</p>
            <p class="text-slate-600 text-sm">调整媒体文件的显示大小</p>
          </div>
          <Select
            :model-value="settingsStore.settings.gridSize"
            @update:model-value="(value: any) => { settingsStore.settings.gridSize = value; handleSettingChange('gridSize', value) }"
          >
            <SelectTrigger class="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in gridSizeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 显示缩略图 -->
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-slate-900 text-base font-normal leading-normal">显示缩略图</p>
            <p class="text-slate-600 text-sm">在文件列表中显示预览图</p>
          </div>
          <Switch
            :checked="settingsStore.settings.showThumbnails"
            @update:checked="handleSettingChange('showThumbnails', $event)"
          />
        </div>

        <!-- 紧凑模式 -->
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-slate-900 text-base font-normal leading-normal">紧凑模式</p>
            <p class="text-slate-600 text-sm">减少界面元素间距，显示更多内容</p>
          </div>
          <Switch
            :checked="settingsStore.settings.compactMode"
            @update:checked="handleSettingChange('compactMode', $event)"
          />
        </div>

        <!-- 自动连接 -->
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-slate-900 text-base font-normal leading-normal">启动时自动连接</p>
            <p class="text-slate-600 text-sm">应用启动时自动连接到服务器</p>
          </div>
          <Switch
            :checked="settingsStore.settings.autoConnect"
            @update:checked="handleSettingChange('autoConnect', $event)"
          />
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end py-3">
      <Button
        @click="saveSettings"
        :disabled="isSaving"
      >
        保存更改
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

const settingsStore = useSettingsStore()
const toast = useToast()

const isSaving = ref(false)

// 选项配置
const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
  { label: '繁體中文', value: 'zh-TW' },
  { label: '日本語', value: 'ja-JP' }
]

const themeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '自动', value: 'auto' }
]

const gridSizeOptions = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' }
]

// 方法
const handleSettingChange = async (key: string, value: any) => {
  try {
    // 立即应用设置（实时预览）
    if (key === 'theme') {
      settingsStore.applyTheme()
    }
    
    // 自动保存设置
    await settingsStore.saveSettings()
    
    toast.add({
      severity: 'success',
      summary: '设置已保存',
      detail: `${key} 设置已成功更新`,
      life: 2000
    })
  } catch (error) {
    console.error('Setting change error:', error, 'Value:', value)
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: error instanceof Error ? error.message : '保存设置时发生错误',
      life: 5000
    })
  }
}

const saveSettings = async () => {
  isSaving.value = true
  try {
    await settingsStore.saveSettings()
    toast.add({
      severity: 'success',
      summary: '保存成功',
      detail: '所有设置已成功保存',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: error instanceof Error ? error.message : '保存设置时发生错误',
      life: 5000
    })
  } finally {
    isSaving.value = false
  }
}
</script>
