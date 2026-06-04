<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dropdown from '@/components/ui/volt/Dropdown.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/renderer/stores/auth'
import { useDashboardStore } from '@/renderer/stores/dashboard'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { environment } from '@renderer/utils'
import { shortcutService } from '@renderer/services/ShortcutService'

defineOptions({ name: 'HomeToolbar' })

const emit = defineEmits<{
  upload: []
  plugins: []
  shortcuts: []
  settings: []
  logout: []
}>()

const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const avatarLoadError = ref(false)

const userAvatarUrl = computed(() => {
  const userId = authStore.user?.id
  const baseUrl = dashboardStore.dashboardBaseUrl
  if (userId && baseUrl) {
    return dashboardStore.getUserAvatarUrl(userId)
  }
  const avatar = (authStore.user as any)?.avatar
  if (!avatar) return ''
  const base = (miraSDKService.getConnectionConfig()?.serverUrl || '').replace(/\/$/, '')
  return `${base}${avatar}`
})

watch(userAvatarUrl, () => { avatarLoadError.value = false })
</script>

<template>
  <div class="w-12 shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center py-2 space-y-2">
    <!-- 文件上传按钮 -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            @click="emit('upload')"
          >
            <span class="material-icons text-gray-600 text-base">upload_file</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">上传文件</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- 分隔线 -->
    <div class="w-6 border-t border-gray-200 dark:border-gray-700"></div>

    <!-- 插件管理按钮 -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            @click="emit('plugins')"
          >
            <span class="material-icons text-gray-600 text-base">extension</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">插件管理</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- 快捷键设置按钮 -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            @click="emit('shortcuts')"
          >
            <span class="material-icons text-gray-600 text-base">keyboard</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">快捷键设置</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- 设置按钮 -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            @click="emit('settings')"
          >
            <span class="material-icons text-gray-600 text-base">settings</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">应用设置</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- 弹性占位 -->
    <div class="flex-1"></div>

    <!-- 用户信息 -->
    <Dropdown
      placement="bottom-end"
      min-width="180px"
    >
      <template #trigger>
        <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <img
            v-if="userAvatarUrl && !avatarLoadError"
            :src="userAvatarUrl"
            alt="avatar"
            class="w-6 h-6 rounded-full object-cover"
            @error="avatarLoadError = true"
          />
          <div v-else class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
            {{ authStore.userDisplayName?.charAt(0)?.toUpperCase() || '?' }}
          </div>
        </button>
      </template>
      <template #content="{ close }">
        <div class="p-3">
          <div class="text-sm font-medium truncate">{{ authStore.userDisplayName }}</div>
          <div v-if="authStore.user?.role" class="px-2 pb-2 text-xs text-gray-500">{{ authStore.user.role }}</div>
          <div class="border-t border-gray-100 dark:border-gray-700 pt-1">
            <button
              class="w-full flex items-center space-x-2 p-2 text-red-600 hover:bg-red-50 rounded text-sm"
              @click="emit('logout'); close()"
            >
              <span class="material-icons text-base">logout</span>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </template>
    </Dropdown>

    <!-- 开发者工具按钮（仅在Electron环境中显示） -->
    <TooltipProvider v-if="environment.isElectron">
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            @click="shortcutService.executeAction('dev.devtools')"
          >
            <span class="material-icons text-gray-600 text-base">code</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">开发者工具</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>
