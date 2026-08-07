<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/renderer/stores/auth'
import { useServerListStore } from '@/renderer/stores/serverList'
import { Motion } from 'motion-v'
import Aurora from '@renderer/components/Aurora.vue'
import { useToast } from '@renderer/composables/useToast'

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

// 错误提示改为 toast
const toast = useToast()
watch(error, (val) => {
  if (val) {
    toast.add({ severity: 'error', detail: val, life: 4000 })
  }
})

onMounted(async () => {
  authStore.clearError()
  if (window.electronAPI?.serverAutoStart) {
    const ready = await window.electronAPI.serverAutoStart.waitReady()
    if (!ready.success) return
  }
  await serverListStore.initializeServerList()

  // 用最近活跃的服务器预填地址
  const activeServer = serverListStore.activeServer
  if (activeServer) {
    serverAddress.value = activeServer.serverUrl
    serverName.value = activeServer.name
  }

  // 并发检测所有已保存服务器的后端可用性（用于列表徽标展示）
  checkAllBackends(serverListStore.services)
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
      <!-- Close button -->
      <button class="absolute top-4 right-4 w-8 h-8 border-none bg-transparent text-muted-foreground hover:text-muted-foreground cursor-pointer flex items-center justify-center rounded transition-colors" @click="handleClose" title="关闭">
        <span class="material-icons">close</span>
      </button>

      <h1 class="text-center text-2xl font-bold text-foreground dark:text-muted-foreground mb-6">连接服务器</h1>

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
  </div>
</template>
