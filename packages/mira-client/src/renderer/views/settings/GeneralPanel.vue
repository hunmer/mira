<template>
  <div class="p-4 space-y-6">
    <div class="flex gap-6">
      <!-- 本地化设置 -->
      <div class="flex-1">
        <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">本地化设置</h3>
        <div class="flex flex-wrap items-end gap-4 py-3">
          <div class="flex flex-col min-w-40 flex-1">
            <label class="text-slate-900 dark:text-slate-100 text-base font-medium leading-normal pb-2">语言</label>
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
      <div class="flex-1">
        <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">主题设置</h3>
        <div class="flex flex-wrap gap-5 py-3">
          <ToggleGroup
            type="single"
            :model-value="settingsStore.settings.theme"
            @update:model-value="(value: string) => { if (value) { settingsStore.settings.theme = value as 'light' | 'dark' | 'auto'; handleSettingChange('theme', value) } }"
          >
            <ToggleGroupItem v-for="opt in themeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const settingsStore = useSettingsStore()
const toast = useToast()


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
</script>
