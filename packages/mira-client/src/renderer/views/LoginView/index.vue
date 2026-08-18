<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/renderer/stores/auth'
import { useServerListStore } from '@/renderer/stores/serverList'
import { Motion } from 'motion-v'
import Aurora from '@renderer/components/Aurora.vue'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@renderer/composables/useToast'
import { environment } from '@renderer/utils'
import { useWindowAndNavigation } from '@renderer/composables/useWindowAndNavigation'

// LoginView 子组件
import LoginStepper from './LoginStepper.vue'
import ServerStep from './ServerStep.vue'
import AuthStep from './AuthStep.vue'
import LibraryStep from './LibraryStep.vue'
import DeployGuideDialog from './DeployGuideDialog.vue'

// LoginView 组合式函数
import { useLoginState } from './useLoginState'
import { useBackendStatus } from './useBackendStatus'
import { useConnectionFlow } from './useConnectionFlow'

defineOptions({ name: 'LoginView' })

const router = useRouter()
const authStore = useAuthStore()
const serverListStore = useServerListStore()

// 窗口控制（登录页运行在无边框主窗口中，Windows/Linux 需自绘控制按钮）
const { isDesktop, handleWindowMinimize, handleWindowMaximize, handleWindowClose } = useWindowAndNavigation()

// 共享 UI 状态（步骤序号 / 加载 / 错误 / 各步表单字段）
const {
  currentStep,
  loading,
  error,
  serverName,
  serverAddress,
  wsAddress,
  showWsField,
  showAddForm,
  selectedServerId,
  healthData,
  showPassword,
  showConfirmPassword,
  credentials,
  registerForm,
  userRole,
  authToken,
} = useLoginState()

// 后端可用性检测
const {
  backendStatus,
  checkAllBackends,
  backendStatusLabel,
  backendStatusClass,
  backendStatusDotClass,
} = useBackendStatus()

// 连接流程（登录 / 注册 / 连接素材库）
const {
  libraries,
  selectedLibraryId,
  quickConnect,
  testConnection,
  handleLogin,
  handleRegister,
  connectToLibrary,
  connectToDeployedLibrary,
  isLibraryAccessible,
  handleStepBack,
} = useConnectionFlow({
  currentStep,
  loading,
  error,
  serverName,
  serverAddress,
  wsAddress,
  selectedServerId,
  healthData,
  credentials,
  registerForm,
  userRole,
  authToken,
})

function handleClose() {
  if (window.electronAPI) {
    window.close?.()
  } else {
    router.back()
  }
}

// 当前选中的服务器（列表点选优先，其次为预填的最近活跃服务器）
const currentServerId = computed(() => selectedServerId.value || serverListStore.activeServer?.id || '')

/**
 * 打开当前后端地址（dashboard 页面）。
 * 与 HomeHeader.openDashboard 一致：Electron 下经 window:open-url 新窗口打开，Web 下 window.open。
 * 登录前 miraSDKService 尚无连接配置，这里直接用当前表单的服务器地址。
 */
async function openBackend() {
  const base = serverAddress.value.trim().replace(/\/$/, '')
  if (!base) return
  const url = `${base}/dashboard`
  if (environment.isElectron) {
    await window.electronAPI?.invoke('window:open-url', url, {
      width: 1280,
      height: 800,
      title: 'Mira Dashboard',
    })
  } else {
    window.open(url, '_blank', 'noopener')
  }
}

// 错误提示改为 toast
const toast = useToast()
watch(error, (val) => {
  if (val) {
    toast.add({ severity: 'error', detail: val, life: 4000 })
  }
})

// 后端可用性徽标定时刷新（避免停留在过期状态）
const BACKEND_CHECK_INTERVAL_MS = 10000
let backendCheckTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  authStore.clearError()
  // 注：local server 启动等待已在 App.vue 的 ServerStartupLoading 中处理，
  // 这里不再重复等待 —— 手动选择/填写服务器地址的场景本就不依赖 local server。
  await serverListStore.initializeServerList()

  // 用最近活跃的服务器预填地址
  const activeServer = serverListStore.activeServer
  if (activeServer) {
    serverAddress.value = activeServer.serverUrl
    serverName.value = activeServer.name
  }

  // 并发检测所有已保存服务器的后端可用性（用于列表徽标展示），并周期性刷新
  checkAllBackends(serverListStore.services)
  backendCheckTimer = setInterval(() => {
    checkAllBackends(serverListStore.services)
  }, BACKEND_CHECK_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (backendCheckTimer) {
    clearInterval(backendCheckTimer)
    backendCheckTimer = null
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-[#0a0a0a] font-[Inter,'Noto_Sans',sans-serif] relative overflow-hidden">
    <Aurora
      :color-stops="['#3A29FF', '#FF94B4', '#FF3232']"
      :amplitude="1.0"
      :blend="0.5"
      :speed="1.2"
      class="absolute inset-0 w-full h-full z-0"
    />
    <Motion layout class="relative z-[1] w-full max-w-[440px] p-8 bg-white/90 dark:bg-muted/90 backdrop-blur-xl rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-white/30 dark:border-border/50 max-[480px]:m-4 max-[480px]:p-6">
      <!-- Close button（仅 Web：浏览器无窗口控制，提供返回；Electron 由右上角窗口控制组接管） -->
      <button v-if="!isDesktop" class="absolute top-4 right-4 w-8 h-8 border-none bg-transparent text-muted-foreground hover:text-muted-foreground cursor-pointer flex items-center justify-center rounded transition-colors" @click="handleClose" :title="$t('views.loginView.close')">
        <span class="material-icons">close</span>
      </button>

      <h1 class="text-center text-2xl font-bold text-foreground dark:text-muted-foreground mb-6">{{ $t('views.loginView.connectServer') }}</h1>

      <!-- Stepper -->
      <LoginStepper :current-step="currentStep" :health-data="healthData" />

      <!-- Step 1: Server Connection -->
      <ServerStep
        v-if="currentStep === 1"
        :loading="loading"
        v-model:show-add-form="showAddForm"
        v-model:show-ws-field="showWsField"
        v-model:server-name="serverName"
        v-model:server-address="serverAddress"
        v-model:ws-address="wsAddress"
        :selected-server-id="selectedServerId"
        :services="serverListStore.services"
        :backend-status="backendStatus"
        :backend-status-label="backendStatusLabel"
        :backend-status-class="backendStatusClass"
        :backend-status-dot-class="backendStatusDotClass"
        @quick-connect="quickConnect($event)"
        @test-connection="testConnection"
        @delete-server="serverListStore.deleteServer($event)"
      />

      <!-- Step 2: Authentication -->
      <AuthStep
        v-else-if="currentStep === 2"
        :loading="loading"
        :health-data="healthData"
        v-model:show-password="showPassword"
        v-model:show-confirm-password="showConfirmPassword"
        :credentials="credentials"
        :register-form="registerForm"
        @login="handleLogin"
        @register="handleRegister"
        @back="currentStep = 1"
      />

      <!-- Step 3: Library Selection -->
      <LibraryStep
        v-else-if="currentStep === 3"
        :loading="loading"
        :libraries="libraries"
        :selected-library-id="selectedLibraryId"
        :is-library-accessible="isLibraryAccessible"
        @update:selected-library-id="selectedLibraryId = $event"
        @connect="connectToLibrary"
        @back="handleStepBack"
      />

      <!-- 部署指南入口 + 对话框（仅 step 1 展示） -->
      <DeployGuideDialog v-if="currentStep === 1" @connect="connectToDeployedLibrary" />
    </Motion>

    <!-- 右上角：窗口控制按钮（Windows/Linux，与 HomeHeader 一致） -->
    <div v-if="isDesktop && !environment.isMac" class="absolute top-4 right-4 z-[2] flex items-center gap-1">
      <button
        class="h-8 w-8 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
        :title="$t('views.homeHeader.minimize')"
        @click="handleWindowMinimize"
      >
        <span class="material-icons" style="font-size: 16px;">remove</span>
      </button>
      <button
        class="h-8 w-8 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
        :title="$t('views.homeHeader.maximize')"
        @click="handleWindowMaximize"
      >
        <span class="material-icons" style="font-size: 16px;">crop_square</span>
      </button>
      <button
        class="h-8 w-8 flex items-center justify-center rounded-lg text-white/80 hover:bg-destructive/15 hover:text-destructive transition-colors cursor-pointer"
        :title="$t('views.homeHeader.close')"
        @click="handleWindowClose"
      >
        <span class="material-icons" style="font-size: 16px;">close</span>
      </button>
    </div>

    <!-- 右下角：当前选中服务器的可用性徽标，点击打开后端 dashboard -->
    <button
      type="button"
      class="absolute bottom-4 right-4 z-[2] flex h-9 items-center gap-2 rounded-full border border-white/50 dark:border-border/60 bg-white/70 dark:bg-muted/70 backdrop-blur-xl px-3 shadow-[0_4px_20px_rgba(0,0,0,0.15)] cursor-pointer transition-colors hover:bg-white dark:hover:bg-muted"
      :title="$t('views.homeHeader.openDashboard')"
      @click="openBackend"
    >
      <span class="material-icons text-sm text-muted-foreground">dns</span>
      <Badge variant="outline" :class="backendStatusClass(currentServerId)" class="gap-1 px-1.5 py-0 text-[10px]">
        <span v-if="backendStatus[currentServerId] === 'checking'" class="material-icons text-[10px] animate-spin">sync</span>
        <span v-else class="w-1.5 h-1.5 rounded-full" :class="backendStatusDotClass(currentServerId)" />
        {{ backendStatusLabel(currentServerId) }}
      </Badge>
    </button>
  </div>
</template>
