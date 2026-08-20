<template>
  <div class="bg-[var(--card-light)] dark:bg-[var(--card-dark)] p-6 rounded-lg border border-[var(--border-light)] dark:border-[var(--border-dark)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
    <!-- 插件头部 -->
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center">
        <Avatar
          :class="['mr-4 h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold', getPluginStatusClass(plugin.status)]"
        >
          <AvatarFallback>{{ plugin.config.pluginName.charAt(0).toUpperCase() }}</AvatarFallback>
        </Avatar>
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-semibold text-lg text-[var(--text-light-primary)] dark:text-[var(--text-dark-primary)]">
              {{ plugin.config.pluginName }}
            </h3>
            <Badge
              :variant="getStatusVariant(plugin.status)"
              class="text-xs"
            >{{ getStatusText(plugin.status) }}</Badge>
          </div>
          <Badge
            variant="secondary"
            class="text-xs"
          >{{ plugin.config.version }}</Badge>
        </div>
      </div>

      <!-- 开关 -->
      <Switch
        :model-value="plugin.status === 'loaded'"
        @update:model-value="handleToggle"
      />
    </div>

    <!-- 插件描述 -->
    <p class="text-sm text-[var(--text-light-secondary)] dark:text-[var(--text-dark-secondary)] mb-4 line-clamp-2">
      {{ plugin.config.description }}
    </p>

    <!-- 插件标签 -->
    <div class="flex flex-wrap gap-2 mb-4" v-if="plugin.config.tags && plugin.config.tags.length > 0">
      <span
        v-for="tag in plugin.config.tags"
        :key="tag"
        :class="getTagClass(tag)"
        class="text-xs font-medium px-2 py-1 rounded"
      >
        {{ tag }}
      </span>
    </div>

    <!-- 错误信息 -->
    <div v-if="plugin.error" class="mb-3">
      <Alert variant="destructive" class="p-2">
        <AlertDescription>
          <span class="text-xs">{{ plugin.error }}</span>
        </AlertDescription>
      </Alert>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-between items-center mt-4">
      <div class="flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                @click="$emit('showDetails', plugin)"
                variant="outline"
                size="sm"
              >
                <i class="pi pi-info-circle"></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{{ $t('business.integrationCard.details') }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                @click="$emit('reload', plugin)"
                variant="outline"
                size="sm"
              >
                <i class="pi pi-refresh"></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{{ $t('business.integrationCard.reload') }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              @click="$emit('remove', plugin)"
              variant="destructive"
              size="sm"
            >
              <i class="pi pi-trash"></i>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{{ $t('business.integrationCard.uninstall') }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PluginRuntime } from '../../../shared/types'

// shadcn 组件导入
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'

// 组件属性
interface Props {
  plugin: PluginRuntime
}

const props = defineProps<Props>()
const { t } = useI18n()

// 定义事件
const emit = defineEmits<{
  toggle: [plugin: PluginRuntime, enabled: boolean]
  showDetails: [plugin: PluginRuntime]
  reload: [plugin: PluginRuntime]
  remove: [plugin: PluginRuntime]
}>()

// 方法
const getPluginStatusClass = (status: string) => {
  switch (status) {
    case 'loaded':
      return 'bg-green-500 text-white'
    case 'loading':
      return 'bg-primary text-white'
    case 'error':
      return 'bg-destructive text-white'
    case 'disabled':
      return 'bg-muted text-white'
    default:
      return 'bg-muted text-white'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'loaded':
      return t('business.integrationCard.statusLoaded')
    case 'loading':
      return t('business.integrationCard.statusLoading')
    case 'error':
      return t('business.integrationCard.statusError')
    case 'disabled':
      return t('business.integrationCard.statusDisabled')
    default:
      return t('business.integrationCard.statusUnknown')
  }
}

const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'loaded':
      return 'default'
    case 'loading':
      return 'secondary'
    case 'error':
      return 'destructive'
    case 'disabled':
      return 'outline'
    default:
      return 'secondary'
  }
}

const getTagClass = (tag: string) => {
  // 预定义颜色方案
  const colorSchemes = [
    'bg-primary dark:bg-primary/50 text-primary dark:text-primary',
    'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400',
    'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400',
    'bg-destructive dark:bg-destructive/50 text-destructive dark:text-destructive',
    'bg-primary dark:bg-primary/50 text-primary dark:text-primary',
    'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400',
    'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400',
    'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400',
    'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400',
    'bg-lime-100 dark:bg-lime-900/50 text-lime-600 dark:text-lime-400',
    'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400',
    'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-600 dark:text-fuchsia-400',
    'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
  ]

  // 使用简单的哈希函数为标签文本生成固定的颜色索引
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    const char = tag.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }

  const colorIndex = Math.abs(hash) % colorSchemes.length
  return colorSchemes[colorIndex]
}

const handleToggle = (shouldEnable: boolean) => {
  emit('toggle', props.plugin, shouldEnable)
}
</script>

<style scoped>
/* 主题颜色变量 */
:root {
  --primary: #4361EE;
  --background-light: #F8F9FA;
  --background-dark: #121212;
  --card-light: #FFFFFF;
  --card-dark: #1E1E1E;
  --text-light-primary: #212529;
  --text-dark-primary: #E0E0E0;
  --text-light-secondary: #6C757D;
  --text-dark-secondary: #B0B0B0;
  --border-light: #DEE2E6;
  --border-dark: #333333;
}

/* 行限制 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>