<template>
  <div class="p-4 space-y-6">
    <!-- 服务设置 -->
    <div>
      <div class="flex items-center justify-between gap-4 py-3">
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ t('settings.autoStartServer') }}</p>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ t('settings.autoStartServerDesc') }}</p>
        </div>
        <Switch
          :checked="autoStartServer"
          :disabled="autoStartServerLoading || !hasServerAutoStart"
          @update:checked="handleAutoStartChange"
        />
      </div>
      <div class="flex items-center justify-between gap-4 py-3">
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ t('settings.closeToTray') }}</p>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ t('settings.closeToTrayDesc') }}</p>
        </div>
        <Switch
          :checked="settingsStore.settings.closeToTray"
          @update:checked="(enabled: boolean) => handleSettingChange('closeToTray', enabled)"
        />
      </div>
    </div>

    <!-- 本地化设置 -->
    <div>
      <div class="flex flex-wrap items-end gap-4 py-3">
        <div class="flex flex-col min-w-40 flex-1">
          <label class="text-foreground dark:text-muted-foreground text-base font-medium leading-normal pb-2">{{ t('settings.language') }}</label>
          <Select
            :model-value="settingsStore.settings.language"
            @update:model-value="(value: any) => handleSettingChange('language', value)"
          >
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('settings.selectLanguage')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in languageOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <!-- 主题（视觉卡片预览） -->
    <div>
      <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5 block">
        {{ t('settings.theme') }}
      </label>
      <div class="flex gap-3">
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          type="button"
          class="flex flex-col items-center gap-1.5 cursor-pointer group"
          @click="handleSettingChange('theme', opt.value)"
        >
          <span
            :class="[
              'relative block h-[70px] w-[88px] overflow-hidden rounded-lg shadow-xs transition-shadow',
              'ring-2 ring-offset-1 ring-offset-background',
              settingsStore.settings.theme === opt.value
                ? 'ring-primary opacity-100'
                : 'ring-transparent opacity-80 hover:opacity-100',
            ]"
          >
            <!-- 内联 SVG 预览（颜色用内联 fill 属性，避免依赖 Tailwind neutral 调色板） -->
            <svg aria-hidden="true" class="size-full" fill="none" viewBox="0 0 88 70" xmlns="http://www.w3.org/2000/svg" v-html="opt.preview" />
          </span>
          <span
            :class="[
              'text-xs font-medium transition-colors',
              settingsStore.settings.theme === opt.value
                ? 'text-foreground'
                : 'text-muted-foreground/70 group-hover:text-muted-foreground',
            ]"
          >
            {{ opt.label }}
          </span>
        </button>
      </div>
    </div>

    <!-- 配色（Primary Color） -->
    <div>
      <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5 block">
        {{ t('settings.primaryColor') }}
      </label>
      <div class="flex items-center gap-2">
        <button
          v-for="color in DEFAULT_PRIMARY_COLORS"
          :key="color"
          type="button"
          :style="{ backgroundColor: color }"
          :class="[
            'size-6 rounded-full border-2 transition-all shrink-0',
            settingsStore.settings.primaryColor === color
              ? 'border-foreground scale-110 ring-2 ring-foreground/20'
              : 'border-transparent hover:scale-105',
          ]"
          @click="handleSettingChange('primaryColor', settingsStore.settings.primaryColor === color ? '' : color)"
        />
        <!-- 自定义取色器：虚线圆点，点击触发原生颜色选择器 -->
        <button
          type="button"
          :style="isCustomPrimaryColor ? { backgroundColor: settingsStore.settings.primaryColor } : undefined"
          :class="[
            'size-6 rounded-full border-2 border-dashed border-muted-foreground/40 shrink-0 relative flex items-center justify-center transition-all hover:scale-105',
            isCustomPrimaryColor && 'border-solid border-foreground scale-110 ring-2 ring-foreground/20',
          ]"
          @click="customColorInput?.click()"
        >
          <span v-if="!isCustomPrimaryColor" class="text-[10px] text-muted-foreground leading-none">+</span>
          <input
            ref="customColorInput"
            type="color"
            :value="settingsStore.settings.primaryColor || '#1456f0'"
            class="sr-only"
            tabindex="-1"
            @input="handleSettingChange('primaryColor', ($event.target as HTMLInputElement).value)"
          />
        </button>
      </div>
    </div>

    <!-- 风格（Style） -->
    <div>
      <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5 block">
        {{ t('settings.style') }}
      </label>
      <Select
        :model-value="settingsStore.settings.themeStyle"
        @update:model-value="(value: any) => handleSettingChange('themeStyle', value)"
      >
        <SelectTrigger class="w-full">
          <SelectValue :placeholder="t('settings.selectStyle')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in styleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        v-if="settingsStore.settings.themeStyle === 'custom'"
        :model-value="settingsStore.settings.themeStyleCustomCss"
        @update:model-value="(value: string | number) => handleSettingChange('themeStyleCustomCss', String(value))"
        class="mt-2 font-mono text-xs min-h-40"
        :placeholder="t('settings.customCssPlaceholder')"
      />
      <Button
        v-if="settingsStore.settings.themeStyle === 'custom'"
        variant="link"
        size="sm"
        class="mt-1.5 h-auto p-0 text-xs"
        @click="openTweakcn"
      >
        <ExternalLink class="size-3 mr-1" />
        tweakcn.com
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ExternalLink } from 'lucide-vue-next'
import { DEFAULT_PRIMARY_COLORS } from '@renderer/utils/theme-style'
import { languageOptions } from './settingsConfig'

const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

const autoStartServer = ref(false)
const autoStartServerLoading = ref(false)
const hasServerAutoStart = computed(() => Boolean(window.electronAPI?.serverAutoStart))

onMounted(async () => {
  if (!hasServerAutoStart.value) return
  autoStartServerLoading.value = true
  try {
    const result = await window.electronAPI.serverAutoStart.get()
    if (result.success) {
      autoStartServer.value = result.enabled
      settingsStore.settings.autoStartServer = result.enabled
    }
  } catch (error) {
    console.error('Failed to read server auto-start setting:', error)
  } finally {
    autoStartServerLoading.value = false
  }
})

const handleAutoStartChange = async (enabled: boolean) => {
  if (!hasServerAutoStart.value) return
  const previous = autoStartServer.value
  autoStartServerLoading.value = true
  try {
    const result = await window.electronAPI.serverAutoStart.set(enabled)
    if (!result.success) throw new Error(result.message || t('settings.autoStartFailed'))
    autoStartServer.value = result.enabled
    await settingsStore.updateSetting('autoStartServer', result.enabled)
    toast.add({ severity: 'success', summary: t('settings.settingSaved'), detail: result.enabled ? t('settings.autoStartEnabledToast') : t('settings.autoStartDisabledToast'), life: 2000 })
  } catch (error) {
    autoStartServer.value = previous
    toast.add({ severity: 'error', summary: t('settings.saveFailed'), detail: error instanceof Error ? error.message : t('settings.saveError'), life: 5000 })
  } finally {
    autoStartServerLoading.value = false
  }
}

// 自定义取色器 input 引用
const customColorInput = ref<HTMLInputElement | null>(null)

// 当前主色是否为非预设的自定义色
const isCustomPrimaryColor = computed(() => {
  const c = settingsStore.settings.primaryColor
  return !!c && !DEFAULT_PRIMARY_COLORS.includes(c)
})

const themeOptions = [
  {
    label: t('settings.themeLight'),
    value: 'light' as const,
    preview: `
      <path fill="#e5e5e5" d="M0 0h88v70H0z" />
      <path fill="#ffffff" d="M10 12a4 4 0 0 1 4-4h74v62H10V12Z" />
      <circle fill="#d4d4d4" cx="28" cy="26" r="8" />
      <rect fill="#e5e5e5" height="4" rx="2" width="58" x="20" y="42" />
      <rect fill="#e5e5e5" height="4" rx="2" width="58" x="20" y="49" />
      <rect fill="#e5e5e5" height="4" rx="2" width="29" x="20" y="56" />`,
  },
  {
    label: t('settings.themeDark'),
    value: 'dark' as const,
    preview: `
      <path fill="#171717" d="M0 0h88v70H0z" />
      <path fill="#262626" d="M10 12a4 4 0 0 1 4-4h74v62H10V12Z" />
      <circle fill="#525252" cx="28" cy="26" r="8" />
      <rect fill="#404040" height="4" rx="2" width="58" x="20" y="42" />
      <rect fill="#404040" height="4" rx="2" width="58" x="20" y="49" />
      <rect fill="#404040" height="4" rx="2" width="29" x="20" y="56" />`,
  },
  {
    label: t('settings.themeAuto'),
    value: 'auto' as const,
    preview: `
      <path fill="#e5e5e5" d="M0 0h44v70H0z" />
      <path fill="#171717" d="M44 0h44v70H44z" />
      <path fill="#ffffff" d="M10 12a4 4 0 0 1 4-4h30v62H10V12Z" />
      <circle fill="#d4d4d4" cx="28" cy="26" r="8" />
      <path fill="#e5e5e5" d="M20 44a2 2 0 0 1 2-2h22v4H22a2 2 0 0 1-2-2ZM20 51a2 2 0 0 1 2-2h22v4H22a2 2 0 0 1-2-2ZM20 58a2 2 0 0 1 2-2h22v4H22a2 2 0 0 1-2-2Z" />
      <path fill="#262626" d="M54 12a4 4 0 0 1 4-4h30v62H54V12Z" />
      <circle fill="#525252" cx="72" cy="26" r="8" />
      <path fill="#404040" d="M64 44a2 2 0 0 1 2-2h22v4H66a2 2 0 0 1-2-2ZM64 51a2 2 0 0 1 2-2h22v4H66a2 2 0 0 1-2-2ZM64 58a2 2 0 0 1 2-2h22v4H66a2 2 0 0 1-2-2Z" />`,
  },
]

const styleOptions = [
  { label: 'Default', value: '' },
  { label: 'Mira', value: 'mira' },
  { label: 'Lyra', value: 'lyra' },
  { label: 'Luma', value: 'luma' },
  { label: 'Rhea', value: 'rhea' },
  { label: 'Custom', value: 'custom' },
]

// 打开 tweakcn 生成 CSS 变量
const openTweakcn = () => {
  window.open('https://tweakcn.com/', '_blank')
}

// 方法
const handleSettingChange = async (key: string, value: any) => {
  try {
    // 通过 store 统一更新（内部会自动 apply + save）
    await settingsStore.updateSetting(key as any, value)

    toast.add({
      severity: 'success',
      summary: t('settings.settingSaved'),
      detail: t('settings.settingUpdated', { key }),
      life: 2000
    })
  } catch (error) {
    console.error('Setting change error:', error, 'Value:', value)
    toast.add({
      severity: 'error',
      summary: t('settings.saveFailed'),
      detail: error instanceof Error ? error.message : t('settings.saveError'),
      life: 5000
    })
  }
}
</script>
