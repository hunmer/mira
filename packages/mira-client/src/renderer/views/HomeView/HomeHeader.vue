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
import { useSettingsStore } from '@/renderer/stores/settings'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { environment } from '@renderer/utils'
import { shortcutService } from '@renderer/services/ShortcutService'
import { shareDialogOpen } from '@/renderer/composables/useDeviceShare'
import { deviceTransfers, shareDialogTab } from '@/renderer/components/business/DeviceShareDialog/useDeviceTransfers'

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
const settingsStore = useSettingsStore()
const router = useRouter()
const avatarLoadError = ref(false)

/** ws 连接状态对应的 badge 圆点颜色 */
const connectionDotClass = computed(() => {
  switch (settingsStore.connectionStatus) {
    case 'connected':
      return 'bg-green-500'
    case 'connecting':
    case 'reconnecting':
      return 'bg-yellow-500'
    case 'error':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground/60'
  }
})

const userAvatarUrl = computed(() => {
  const avatar = (authStore.user as any)?.avatar
  if (!avatar) return ''
  const base = (miraSDKService.getConnectionConfig()?.serverUrl || '').replace(/\/$/, '')
  return `${base}${avatar}`
})

watch(userAvatarUrl, () => { avatarLoadError.value = false })

/** 切换亮/暗主题（auto 模式下按当前实际生效主题取反） */
const toggleTheme = (event: MouseEvent) => {
  const newTheme = settingsStore.isDarkMode ? 'light' : 'dark'
  const apply = () => {
    settingsStore.settings.theme = newTheme
    settingsStore.applyTheme()
    settingsStore.saveSettings().catch(console.error)
  }
  revealThemeTransition(event, apply)
}

/**
 * 主题切换圆形揭露动画：以点击位置为圆心，
 * 目标主题快照（::view-transition-new(root)）从 0 扩展到覆盖全屏。
 * 用 Web Animations API（pseudoElement 选项）把坐标内联进 clipPath，
 * 避免在 view-transition 伪元素里用 var()/circle() 解析不可靠的问题。
 * 不支持 View Transitions API 或开启「减少动态效果」时降级为直接切换。
 */
const revealThemeTransition = (event: MouseEvent, apply: () => void) => {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => {
      ready: Promise<void>
      finished: Promise<void>
    }
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduceMotion) {
    apply()
    return
  }
  const x = event.clientX
  const y = event.clientY
  // 圆心到视口最远角的距离，确保圆圈能完全覆盖屏幕
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )
  const transition = doc.startViewTransition(apply)
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 800,
          easing: 'linear',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    .catch(() => { }) // transition 可能被中断/跳过，忽略 reject
}

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
      // 标记为 dashboard 窗口：注入 dashboard-preload，
      // 暴露 openLoginWindow / onLoginCookies 供设置页-下载 tab 使用
      dashboard: true,
    })
  } else {
    window.open(url, '_blank', 'noopener')
  }
}

/** DEV 构建标识：控制 UI 测试面板入口等开发专用功能 */
const isDev = import.meta.env.DEV

/** 设备传输：进行中（等待接收/接收中）的数量角标 */
const activeTransferCount = computed(() =>
  deviceTransfers.value.filter(t => t.state === 'sent' || t.state === 'receiving').length)

/** 打开发送/传输合并对话框并定位到传输页签 */
const openTransferPanel = () => {
  shareDialogTab.value = 'transfers'
  shareDialogOpen.value = true
}

/**
 * DEV 专用：打开 UI 测试面板窗口（public/ui-test-panel.html）。
 * 面板经 BroadcastChannel 调用主窗口 window.__procmUiTests 执行测试。
 */
const openUiTestPanel = async () => {
  const url = `${window.location.origin}/ui-test-panel.html`
  if (environment.isElectron) {
    await window.electronAPI.invoke('window:open-url', url, {
      width: 520,
      height: 760,
      title: 'Mira UI Tests',
    })
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
</script>

<template>
  <!-- 紧凑右侧悬浮栏：用户头像菜单 + 窗口控制 -->
  <header
    class="flex items-center justify-end gap-1 px-2 py-1.5 rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.10)] w-fit ml-auto">
    <!-- 设备传输：待接收列表与对端接收进度 -->
    <button
      class="relative h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:bg-primary/10 hover:text-primary"
      :title="$t('business.deviceShare.transferTitle')" @click="openTransferPanel">
      <span class="material-icons" style="font-size: 18px;">swap_vert</span>
      <span v-if="activeTransferCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] leading-none flex items-center justify-center">
        {{ activeTransferCount }}
      </span>
    </button>

    <!-- 切换亮色/暗色主题 -->
    <button
      class="h-8 w-8 flex items-center justify-center rounded-lg transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95 cursor-pointer text-muted-foreground hover:bg-primary/10 hover:text-primary"
      :title="settingsStore.isDarkMode ? $t('commonUi.themeSwitcher.switchToLight') : $t('commonUi.themeSwitcher.switchToDark')"
      @click="toggleTheme">
      <span class="material-icons" style="font-size: 18px;">{{ settingsStore.isDarkMode ? 'light_mode' : 'dark_mode'
      }}</span>
    </button>

    <!-- 用户头像 + 功能菜单（原 HomeToolbar 功能并入） -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          class="relative h-8 w-8 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors outline-none">
          <img v-if="userAvatarUrl && !avatarLoadError" :src="userAvatarUrl" alt="avatar"
            class="w-7 h-7 rounded-full object-cover shadow-sm" @error="avatarLoadError = true" />
          <div v-else
            class="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium shadow-sm">
            {{ authStore.userDisplayName?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <!-- ws 连接状态指示圆点 -->
          <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-background transition-colors"
            :class="connectionDotClass" :title="settingsStore.connectionStatusText" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent class="min-w-[220px]" align="end" :side-offset="8">
        <!-- 用户信息 -->
        <DropdownMenuLabel class="font-normal">
          <div class="flex flex-col space-y-1">
            <div class="text-sm font-medium leading-none truncate">{{ authStore.userDisplayName }}</div>
            <div v-if="authStore.user?.role" class="text-xs leading-none text-muted-foreground">{{ authStore.user.role
            }}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="emit('settings')">
          <span class="material-icons text-base">settings</span>
          <span>{{ $t('views.homeHeader.settings') }}</span>
        </DropdownMenuItem>
        <DropdownMenuItem @select="openDashboard">
          <span class="material-icons text-base">dashboard</span>
          <span>{{ $t('views.homeHeader.openDashboard') }}</span>
        </DropdownMenuItem>
        <DropdownMenuItem @select="emit('plugins')">
          <span class="material-icons text-base">extension</span>
          <span>{{ $t('views.homeHeader.plugins') }}</span>
        </DropdownMenuItem>
        <DropdownMenuItem @select="emit('shortcuts')">
          <span class="material-icons text-base">keyboard</span>
          <span>{{ $t('views.homeHeader.shortcuts') }}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <!-- 高级：Playground / 开发者工具 / 服务端 -->
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span class="material-icons text-base">tune</span>
            <span>{{ $t('views.homeHeader.advanced') }}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent class="min-w-[200px]">
            <DropdownMenuItem @select="router.push({ name: 'Playground' })">
              <span class="material-icons text-base">science</span>
              <span>Playground</span>
            </DropdownMenuItem>
            <DropdownMenuItem v-if="isDev" @select="openUiTestPanel">
              <span class="material-icons text-base">bug_report</span>
              <span>{{ $t('views.homeHeader.uiTestPanel') }}</span>
            </DropdownMenuItem>
            <DropdownMenuItem v-if="environment.isElectron" @select="shortcutService.executeAction('dev.devtools')">
              <span class="material-icons text-base">code</span>
              <span>{{ $t('views.homeHeader.developerTools') }}</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select="emit('logout')">
          <span class="material-icons text-base">logout</span>
          <span>{{ $t('views.homeHeader.logout') }}</span>
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
            style="box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.15);" :title="$t('views.homeHeader.close')"
            @click="emit('windowClose')">
            <svg class="w-2 h-2 opacity-0 group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round">
              <line x1="3" y1="3" x2="9" y2="9" />
              <line x1="9" y1="3" x2="3" y2="9" />
            </svg>
          </button>
          <button
            class="w-3 h-3 rounded-full bg-[#febc2e] flex items-center justify-center text-black/50 transition-transform active:scale-95"
            style="box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.15);" :title="$t('views.homeHeader.minimize')"
            @click="emit('windowMinimize')">
            <svg class="w-2 h-2 opacity-0 group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round">
              <line x1="3" y1="6" x2="9" y2="6" />
            </svg>
          </button>
          <button
            class="w-3 h-3 rounded-full bg-[#28c840] flex items-center justify-center text-black/50 transition-transform active:scale-95"
            style="box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.15);" :title="$t('views.homeHeader.maximize')"
            @click="emit('windowMaximize')">
            <svg class="w-2 h-2 opacity-0 group-hover:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
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
          @click="emit('windowMinimize')">
          <span class="material-icons" style="font-size: 16px;">remove</span>
        </button>
        <button
          class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          @click="emit('windowMaximize')">
          <span class="material-icons" style="font-size: 16px;">crop_square</span>
        </button>
        <button
          class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          @click="emit('windowClose')">
          <span class="material-icons" style="font-size: 16px;">close</span>
        </button>
      </template>
    </template>
  </header>
</template>
