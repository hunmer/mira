<template>
  <div class="inline-block">
    <TooltipProvider v-if="mode === 'button'">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            class="rounded-full"
            :aria-label="buttonLabel"
            @click="toggleTheme"
          >
            <span class="material-icons">{{ currentThemeIcon }}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{{ buttonLabel }}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    
    <Select
      v-else-if="mode === 'dropdown'"
      v-model="selectedTheme"
      @update:model-value="handleThemeChange"
    >
      <SelectTrigger class="min-w-[140px]">
        <SelectValue :placeholder="dropdownPlaceholderResolved">
          <div v-if="selectedTheme" class="flex items-center gap-2">
            <span class="material-icons">{{ getThemeIcon(selectedTheme) }}</span>
            <span>{{ getThemeLabel(selectedTheme) }}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="opt in themeOptions"
          :key="opt.value"
          :value="opt.value"
        >
          <div class="flex items-center gap-2">
            <span class="material-icons">{{ opt.icon }}</span>
            <span>{{ opt.label }}</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
    
    <ToggleGroup
      v-else-if="mode === 'tabs'"
      type="single"
      :model-value="selectedTheme"
      @update:model-value="(value: any) => { if (value) { selectedTheme = value as any; handleThemeChange() } }"
      class="theme-tabs"
    >
      <ToggleGroupItem v-for="opt in themeOptions" :key="opt.value" :value="opt.value" class="flex items-center gap-2">
        <span class="material-icons text-sm">{{ opt.icon }}</span>
        <span v-if="showLabels">{{ opt.label }}</span>
      </ToggleGroupItem>
    </ToggleGroup>
    
    <div v-else-if="mode === 'radio'" class="flex gap-2 items-center">
      <div 
        v-for="theme in themeOptions"
        :key="theme.value"
        class="theme-radio-item"
      >
        <input
          :id="`theme-${theme.value}`"
          type="radio"
          :value="theme.value"
          v-model="selectedTheme"
          class="sr-only"
          @change="handleThemeChange"
        />
        <label
          :for="`theme-${theme.value}`"
          class="theme-radio-label"
          :class="{ active: selectedTheme === theme.value }"
        >
          <i :class="theme.icon"></i>
          <span v-if="showLabels">{{ theme.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settings'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// Props
interface Props {
  mode?: 'button' | 'dropdown' | 'tabs' | 'radio'
  showLabels?: boolean
  includeAuto?: boolean
  includeHighContrast?: boolean
  size?: 'small' | 'normal' | 'large'
  dropdownPlaceholder?: string
}

const { t } = useI18n()

const props = withDefaults(defineProps<Props>(), {
  mode: 'button',
  showLabels: true,
  includeAuto: true,
  includeHighContrast: false,
  size: 'normal',
  dropdownPlaceholder: ''
})

// Store
const settingsStore = useSettingsStore()

// 占位符默认值（需 i18n，因此放在 useI18n 之后用 computed 提供）
const dropdownPlaceholderResolved = computed(() => props.dropdownPlaceholder || t('commonUi.themeSwitcher.selectTheme'))

// 响应式状态
const selectedTheme = ref(settingsStore.settings.theme)

// 主题选项
const themeOptions = computed(() => {
  const options = [
    {
      label: t('commonUi.themeSwitcher.light'),
      value: 'light',
      icon: 'light_mode',
      description: t('commonUi.themeSwitcher.light')
    },
    {
      label: t('commonUi.themeSwitcher.dark'),
      value: 'dark',
      icon: 'dark_mode',
      description: t('commonUi.themeSwitcher.dark')
    }
  ]

  if (props.includeAuto) {
    options.push({
      label: t('commonUi.themeSwitcher.auto'),
      value: 'auto',
      icon: 'computer',
      description: t('commonUi.themeSwitcher.auto')
    })
  }

  if (props.includeHighContrast) {
    options.push({
      label: t('commonUi.themeSwitcher.highContrast'),
      value: 'high-contrast',
      icon: 'visibility',
      description: t('commonUi.themeSwitcher.highContrast')
    })
  }

  return options
})

// 计算属性
const currentThemeIcon = computed(() => {
  const theme = selectedTheme.value
  const iconMap = {
    'light': 'light_mode',
    'dark': 'dark_mode',
    'auto': 'computer',
    'high-contrast': 'visibility'
  }
  return iconMap[theme as keyof typeof iconMap] || 'palette'
})

const buttonLabel = computed(() => {
  const theme = selectedTheme.value
  const labelMap = {
    'light': t('commonUi.themeSwitcher.switchToDark'),
    'dark': t('commonUi.themeSwitcher.switchToLight'),
    'auto': t('commonUi.themeSwitcher.currentAuto'),
    'high-contrast': t('commonUi.themeSwitcher.currentHighContrast')
  }
  return labelMap[theme as keyof typeof labelMap] || t('commonUi.themeSwitcher.switchTheme')
})

// 方法
const getThemeIcon = (theme: string) => {
  const iconMap = {
    'light': 'light_mode',
    'dark': 'dark_mode',
    'auto': 'computer',
    'high-contrast': 'visibility'
  }
  return iconMap[theme as keyof typeof iconMap] || 'palette'
}

const getThemeLabel = (theme: string) => {
  const labelMap = {
    'light': t('commonUi.themeSwitcher.light'),
    'dark': t('commonUi.themeSwitcher.dark'),
    'auto': t('commonUi.themeSwitcher.auto'),
    'high-contrast': t('commonUi.themeSwitcher.highContrast')
  }
  return labelMap[theme as keyof typeof labelMap] || theme
}

const toggleTheme = () => {
  if (props.mode !== 'button') return
  
  const currentIndex = themeOptions.value.findIndex(option => option.value === selectedTheme.value)
  const nextIndex = (currentIndex + 1) % themeOptions.value.length
  selectedTheme.value = themeOptions.value[nextIndex].value as any
  applyTheme()
}

const handleThemeChange = () => {
  applyTheme()
}

const applyTheme = () => {
  // 更新设置store
  settingsStore.settings.theme = selectedTheme.value
  
  // 立即应用主题
  settingsStore.applyTheme()
  
  // 保存设置
  settingsStore.saveSettings().catch(console.error)
  
  // 发送主题变更事件
  emit('change', selectedTheme.value)
}

const detectSystemTheme = () => {
  if (window.matchMedia) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return isDark ? 'dark' : 'light'
  }
  return 'light'
}

const handleSystemThemeChange = (_event: MediaQueryListEvent) => {
  if (selectedTheme.value === 'auto') {
    settingsStore.applyTheme()
  }
}

// Emits
const emit = defineEmits<{
  change: [theme: string]
}>()

// 生命周期
onMounted(() => {
  // 监听系统主题变化
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  }
  
  // 初始化主题
  if (selectedTheme.value !== settingsStore.settings.theme) {
    selectedTheme.value = settingsStore.settings.theme
  }
})

// 监听设置store的主题变化
watch(() => settingsStore.settings.theme, (newTheme) => {
  if (selectedTheme.value !== newTheme) {
    selectedTheme.value = newTheme
  }
})

// 暴露方法
defineExpose({
  setTheme: (theme: string) => {
    selectedTheme.value = theme as any
    applyTheme()
  },
  getCurrentTheme: () => selectedTheme.value,
  getSystemTheme: detectSystemTheme
})
</script>

<style scoped>
.theme-tabs :deep(button) {
  min-width: auto;
  padding: 0.5rem 0.75rem;
}

.theme-radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--background);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 150ms ease;
  user-select: none;
}

.theme-radio-label:hover {
  background-color: var(--muted);
  border-color: var(--border);
  color: var(--foreground);
}

.theme-radio-label.active {
  background-color: var(--accent);
  border-color: var(--ring);
  color: var(--primary);
}

.dark .theme-radio-label:hover {
  background-color: var(--muted);
}

.dark .theme-radio-label.active {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

.theme-switcher[data-size="small"] .theme-radio-label {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.theme-switcher[data-size="large"] .theme-radio-label {
  padding: 0.75rem 1rem;
  font-size: 1rem;
}

.theme-radio-label:focus-within {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .theme-radio-label {
    transition: none;
  }
}
</style>
