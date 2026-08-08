<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/renderer/stores/auth'
import { useMediaStore } from '@/renderer/stores/media'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { environment } from '@renderer/utils'
import { shortcutService } from '@renderer/services/ShortcutService'
import ServerControlDialog from '@/renderer/components/business/ServerControlDialog.vue'

defineOptions({ name: 'HomeHeader' })

defineProps<{
  isDesktop: boolean
}>()

const emit = defineEmits<{
  plugins: []
  shortcuts: []
  settings: []
  logout: []
  windowMinimize: []
  windowMaximize: []
  windowClose: []
}>()

const authStore = useAuthStore()
const mediaStore = useMediaStore()
const router = useRouter()
const avatarLoadError = ref(false)
/** 服务端控制对话框可见性（自包含在 HomeHeader 内） */
const showServerDialog = ref(false)

const userAvatarUrl = computed(() => {
  const avatar = (authStore.user as any)?.avatar
  if (!avatar) return ''
  const base = (miraSDKService.getConnectionConfig()?.serverUrl || '').replace(/\/$/, '')
  return `${base}${avatar}`
})

watch(userAvatarUrl, () => { avatarLoadError.value = false })

/**
 * 打开服务器 dashboard 页面。
 * Electron 下在新 BrowserWindow 中打开「当前服务器地址 + /dashboard」；
 * Web 下回退到 window.open。
 */
const openDashboard = async () => {
  const base = (miraSDKService.getConnectionConfig()?.serverUrl || '').replace(/\/$/, '')
  if (!base) return
  const url = `${base}/dashboard`
  if (environment.isElectron) {
    await window.electronAPI.invoke('window:open-url', url, {
      width: 1280,
      height: 800,
      title: 'Mira Dashboard',
    })
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
</script>

<template>
  <!-- 紧凑右侧悬浮栏：用户头像菜单 + 窗口控制 -->
  <header class="flex items-center justify-end gap-1 px-2 py-1.5 rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.10)] w-fit ml-auto">
    <!-- 打开服务器 Dashboard -->
    <button
      class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
      title="打开 Dashboard"
      @click="openDashboard"
    >
      <span class="material-icons" style="font-size: 18px;">dashboard</span>
    </button>

    <!-- 切换详情侧栏 -->
    <button
      class="h-8 w-8 flex items-center justify-center rounded-lg transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95"
      :class="mediaStore.showDetailSidebar
        ? 'text-primary hover:bg-primary/10'
        : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'"
      @click="mediaStore.toggleDetailSidebar()"
    >
      <span class="material-icons" style="font-size: 18px;">view_sidebar</span>
    </button>

    <!-- 用户头像 + 功能菜单（原 HomeToolbar 功能并入） -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button class="h-8 w-8 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors outline-none">
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
      </DropdownMenuTrigger>
      <DropdownMenuContent class="min-w-[220px]" align="end" :side-offset="8">
        <!-- 用户信息 -->
        <DropdownMenuLabel class="font-normal">
          <div class="flex flex-col space-y-1">
            <div class="text-sm font-medium leading-none truncate">{{ authStore.userDisplayName }}</div>
            <div v-if="authStore.user?.role" class="text-xs leading-none text-muted-foreground">{{ authStore.user.role }}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="emit('plugins')">
          <span class="material-icons text-base">extension</span>
          <span>插件管理</span>
        </DropdownMenuItem>
        <DropdownMenuItem @select="emit('shortcuts')">
          <span class="material-icons text-base">keyboard</span>
          <span>快捷键设置</span>
        </DropdownMenuItem>
        <DropdownMenuItem @select="emit('settings')">
          <span class="material-icons text-base">settings</span>
          <span>应用设置</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <!-- 高级：Playground / 开发者工具 / 服务端 -->
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span class="material-icons text-base">tune</span>
            <span>高级</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent class="min-w-[200px]">
            <DropdownMenuItem @select="router.push({ name: 'Playground' })">
              <span class="material-icons text-base">science</span>
              <span>Playground</span>
            </DropdownMenuItem>
            <DropdownMenuItem v-if="environment.isElectron" @select="shortcutService.executeAction('dev.devtools')">
              <span class="material-icons text-base">code</span>
              <span>开发者工具</span>
            </DropdownMenuItem>
            <DropdownMenuItem v-if="environment.isElectron" @select="showServerDialog = true">
              <span class="material-icons text-base">dns</span>
              <span>服务端</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select="emit('logout')">
          <span class="material-icons text-base">logout</span>
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- 窗口控制按钮 - 仅桌面端显示 -->
    <template v-if="isDesktop">
      <!-- macOS：红绿灯样式（关闭/最小化/最大化） -->
      <template v-if="environment.isMac">
        <div class="group flex items-center gap-2 ml-1">
          <button
            class="w-3 h-3 rounded-full bg-[#ff5f57] flex items-center justify-center text-black/50 transition-transform active:scale-95"
            style="box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.15);"
            title="关闭"
            @click="emit('windowClose')"
          >
            <svg class="w-2 h-2 opacity-0 group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="3" y1="3" x2="9" y2="9" />
              <line x1="9" y1="3" x2="3" y2="9" />
            </svg>
          </button>
          <button
            class="w-3 h-3 rounded-full bg-[#febc2e] flex items-center justify-center text-black/50 transition-transform active:scale-95"
            style="box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.15);"
            title="最小化"
            @click="emit('windowMinimize')"
          >
            <svg class="w-2 h-2 opacity-0 group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="3" y1="6" x2="9" y2="6" />
            </svg>
          </button>
          <button
            class="w-3 h-3 rounded-full bg-[#28c840] flex items-center justify-center text-black/50 transition-transform active:scale-95"
            style="box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.15);"
            title="最大化"
            @click="emit('windowMaximize')"
          >
            <svg class="w-2 h-2 opacity-0 group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4 L4 6 L6 4 Z" />
              <path d="M8 8 L8 6 L6 8 Z" />
            </svg>
          </button>
        </div>
      </template>

      <!-- Windows/Linux：常规按钮 -->
      <template v-else>
        <div class="h-5 border-l border-border/60 mx-1"></div>
        <button
          class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          @click="emit('windowMinimize')"
        >
          <span class="material-icons" style="font-size: 16px;">remove</span>
        </button>
        <button
          class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          @click="emit('windowMaximize')"
        >
          <span class="material-icons" style="font-size: 16px;">crop_square</span>
        </button>
        <button
          class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          @click="emit('windowClose')"
        >
          <span class="material-icons" style="font-size: 16px;">close</span>
        </button>
      </template>
    </template>

    <!-- 服务端控制对话框（自包含，仅 Electron 环境） -->
    <ServerControlDialog v-if="environment.isElectron" v-model:open="showServerDialog" />
  </header>
</template>
