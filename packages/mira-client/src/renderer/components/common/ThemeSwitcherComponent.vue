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
    
    <Dropdown
      v-else-if="mode === 'dropdown'"
      v-model="selectedTheme"
      :options="themeOptions"
      option-label="label"
      option-value="value"
      :placeholder="dropdownPlaceholder"
      class="min-w-[140px]"
      @change="handleThemeChange"
    >
      <template #value="{ value }">
        <div v-if="value" class="flex items-center gap-2">
          <span class="material-icons">{{ getThemeIcon(value) }}</span>
          <span>{{ getThemeLabel(value) }}</span>
        </div>
      </template>
      
      <template #option="{ option }">
        <div class="flex items-center gap-2">
          <span class="material-icons">{{ option.icon }}</span>
          <span>{{ option.label }}</span>
        </div>
      </template>
    </Dropdown>
    
    <ToggleGroup
      v-else-if="mode === 'tabs'"
      type="single"
      :model-value="selectedTheme"
      @update:model-value="(value: string) => { if (value) { selectedTheme = value as any; handleThemeChange() } }"
      class="theme-tabs"
    >
      <ToggleGroupItem v-for="opt in themeOptions" :key="opt.value" :value="opt.value" class="flex items-center gap-2">
        <span class="material-icons text-sm">{{ opt.icon }}</span>
        <span v-if="showLabels">{{ opt.label }}</span>
      </ToggleGroupItem>
    </ToggleGroup>
    
    <div v-else-if="mode === 'radio'" class="flex gap-[var(--mira-space-2)] items-center">
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
import { useSettingsStore } from '../../stores/settings'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Dropdown from '@/components/ui/volt/Dropdown.vue'
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

const props = withDefaults(defineProps<Props>(), {
  mode: 'button',
  showLabels: true,
  includeAuto: true,
  includeHighContrast: false,
  size: 'normal',
  dropdownPlaceholder: '选择主题'
})

// Store
const settingsStore = useSettingsStore()

// 响应式状态
const selectedTheme = ref(settingsStore.settings.theme)

// 主题选项
const themeOptions = computed(() => {
  const options = [
    { 
      label: '浅色', 
      value: 'light', 
      icon: 'light_mode',
      description: '浅色主题'
    },
    { 
      label: '深色', 
      value: 'dark', 
      icon: 'dark_mode',
      description: '深色主题'
    }
  ]
  
  if (props.includeAuto) {
    options.push({ 
      label: '跟随系统', 
      value: 'auto', 
      icon: 'computer',
      description: '跟随系统设置'
    })
  }
  
  if (props.includeHighContrast) {
    options.push({ 
      label: '高对比度', 
      value: 'high-contrast', 
      icon: 'visibility',
      description: '高对比度主题'
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
    'light': '切换到深色主题',
    'dark': '切换到浅色主题',
    'auto': '当前跟随系统',
    'high-contrast': '当前为高对比度'
  }
  return labelMap[theme as keyof typeof labelMap] || '切换主题'
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
    'light': '浅色',
    'dark': '深色',
    'auto': '跟随系统',
    'high-contrast': '高对比度'
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
  padding: var(--mira-space-2) var(--mira-space-3);
}

.theme-radio-label {
  display: flex;
  align-items: center;
  gap: var(--mira-space-2);
  padding: var(--mira-space-2) var(--mira-space-3);
  border: 1px solid var(--mira-border-primary);
  border-radius: var(--mira-radius-md);
  background-color: var(--mira-bg-primary);
  color: var(--mira-text-secondary);
  cursor: pointer;
  transition: all var(--mira-transition-fast);
  user-select: none;
}

.theme-radio-label:hover {
  background-color: var(--mira-gray-50);
  border-color: var(--mira-border-secondary);
  color: var(--mira-text-primary);
}

.theme-radio-label.active {
  background-color: var(--mira-primary-50);
  border-color: var(--mira-primary-500);
  color: var(--mira-primary-700);
}

.dark .theme-radio-label:hover {
  background-color: var(--mira-gray-700);
}

.dark .theme-radio-label.active {
  background-color: var(--mira-primary-900);
  color: var(--mira-primary-200);
}

.theme-switcher[data-size="small"] .theme-radio-label {
  padding: var(--mira-space-1) var(--mira-space-2);
  font-size: var(--mira-text-xs);
}

.theme-switcher[data-size="large"] .theme-radio-label {
  padding: var(--mira-space-3) var(--mira-space-4);
  font-size: var(--mira-text-base);
}

.theme-radio-label:focus-within {
  outline: 2px solid var(--mira-primary-500);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .theme-radio-label {
    transition: none;
  }
}
</style>
