<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/renderer/stores/auth'
import { useDashboardStore } from '@/renderer/stores/dashboard'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { environment } from '@renderer/utils'
import { shortcutService } from '@renderer/services/ShortcutService'

defineOptions({ name: 'HomeHeader' })

defineProps<{
  isDesktop: boolean
}>()

const emit = defineEmits<{
  upload: []
  plugins: []
  shortcuts: []
  settings: []
  logout: []
  windowMinimize: []
  windowMaximize: []
  windowClose: []
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
  <!-- 紧凑右侧悬浮栏：用户头像菜单 + 窗口控制 -->
  <header class="flex items-center justify-end gap-1 px-2 py-1.5 rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.10)] w-fit ml-auto">
    <!-- 用户头像 + 功能菜单（原 HomeToolbar 功能并入） -->
    <Dropdown
      placement="bottom-end"
      min-width="200px"
    >
      <template #trigger>
        <button class="h-8 w-8 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
          <img
            v-if="userAvatarUrl && !avatarLoadError"
            :src="userAvatarUrl"
            alt="avatar"
            class="w-7 h-7 rounded-full object-cover shadow-sm"
            @error="avatarLoadError = true"
          />
          <div v-else class="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium shadow-sm">
            {{ authStore.userDisplayName?.charAt(0)?.toUpperCase() || '?' }}
          </div>
        </button>
      </template>
      <template #content="{ close }">
        <div class="p-2">
          <!-- 用户信息 -->
          <div class="px-2 pt-1 pb-2">
            <div class="text-sm font-medium truncate">{{ authStore.userDisplayName }}</div>
            <div v-if="authStore.user?.role" class="text-xs text-muted-foreground">{{ authStore.user.role }}</div>
          </div>
          <div class="border-t border-border/60 pt-1 space-y-0.5">
            <button
              class="w-full flex items-center space-x-2 p-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg text-sm transition-colors"
              @click="emit('upload'); close()"
            >
              <span class="material-icons text-base">upload_file</span>
              <span>上传文件</span>
            </button>
            <button
              class="w-full flex items-center space-x-2 p-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg text-sm transition-colors"
              @click="emit('plugins'); close()"
            >
              <span class="material-icons text-base">extension</span>
              <span>插件管理</span>
            </button>
            <button
              class="w-full flex items-center space-x-2 p-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg text-sm transition-colors"
              @click="emit('shortcuts'); close()"
            >
              <span class="material-icons text-base">keyboard</span>
              <span>快捷键设置</span>
            </button>
            <button
              class="w-full flex items-center space-x-2 p-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg text-sm transition-colors"
              @click="emit('settings'); close()"
            >
              <span class="material-icons text-base">settings</span>
              <span>应用设置</span>
            </button>
            <button
              v-if="environment.isElectron"
              class="w-full flex items-center space-x-2 p-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg text-sm transition-colors"
              @click="shortcutService.executeAction('dev.devtools'); close()"
            >
              <span class="material-icons text-base">code</span>
              <span>开发者工具</span>
            </button>
          </div>
          <div class="border-t border-border/60 mt-1 pt-1">
            <button
              class="w-full flex items-center space-x-2 p-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm transition-colors"
              @click="emit('logout'); close()"
            >
              <span class="material-icons text-base">logout</span>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </template>
    </Dropdown>

    <!-- 窗口控制按钮 - 仅桌面端显示 -->
    <template v-if="isDesktop">
      <div class="h-5 border-l border-border/60 mx-1"></div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              @click="emit('windowMinimize')"
            >
              <span class="material-icons" style="font-size: 16px;">remove</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">最小化</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              @click="emit('windowMaximize')"
            >
              <span class="material-icons" style="font-size: 16px;">crop_square</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">最大化</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              @click="emit('windowClose')"
            >
              <span class="material-icons" style="font-size: 16px;">close</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">关闭</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </template>
  </header>
</template>
