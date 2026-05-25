<template>
  <div class="login-view">
    <div class="login-container">
      <!-- Close button -->
      <button class="header-button close-button" @click="handleClose" title="关闭">
        <span class="material-icons">close</span>
      </button>

      <h1 class="login-title">连接服务器</h1>

      <!-- Stepper -->
      <Stepper v-model="currentStep" class="stepper">
        <StepperItem :step="1" :completed="currentStep > 1">
          <StepperTrigger>
            <StepperIndicator>1</StepperIndicator>
          </StepperTrigger>
          <div class="stepper-label">服务器</div>
        </StepperItem>
        <div class="stepper-separator" />
        <StepperItem :step="2" :completed="currentStep > 2" :disabled="!healthData || healthData.authRequired === false">
          <StepperTrigger>
            <StepperIndicator>2</StepperIndicator>
          </StepperTrigger>
          <div class="stepper-label">认证</div>
        </StepperItem>
        <div class="stepper-separator" />
        <StepperItem :step="3" :disabled="currentStep < 3">
          <StepperTrigger>
            <StepperIndicator>3</StepperIndicator>
          </StepperTrigger>
          <div class="stepper-label">素材库</div>
        </StepperItem>
      </Stepper>

      <!-- Error banner -->
      <div v-if="error" class="error-banner">
        <span class="material-icons error-icon">error</span>
        {{ error }}
        <button type="button" class="error-close" @click="error = ''">
          <span class="material-icons">close</span>
        </button>
      </div>

      <!-- Step 1: Server Connection -->
      <form v-if="currentStep === 1" @submit.prevent="testConnection" class="step-form">
        <div class="input-group">
          <span class="material-icons input-icon">dns</span>
          <input v-model="serverName" type="text" placeholder="服务器名称" required />
        </div>
        <div class="input-group">
          <span class="material-icons input-icon">link</span>
          <input v-model="serverAddress" type="text" placeholder="服务器地址 (如 http://192.168.1.100)" required />
        </div>
        <button type="button" class="collapse-toggle" @click="showWsField = !showWsField">
          <span class="material-icons">{{ showWsField ? 'expand_less' : 'expand_more' }}</span>
          WebSocket 地址
        </button>
        <div v-if="showWsField" class="input-group">
          <span class="material-icons input-icon">swap_horiz</span>
          <input v-model="wsAddress" type="text" placeholder="WebSocket 地址 (默认 8081)" />
        </div>
        <button type="submit" class="action-button" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? '连接中...' : '下一步' }}
        </button>
      </form>

      <!-- Step 2: Authentication -->
      <form v-if="currentStep === 2" @submit.prevent="authMode === 'login' ? handleLogin() : handleRegister()" class="step-form">
        <ToggleGroup type="single" :model-value="authMode" @update:model-value="onAuthModeChange" class="justify-center">
          <ToggleGroupItem value="login" aria-label="登录">登录</ToggleGroupItem>
          <ToggleGroupItem v-if="healthData?.allowRegistration !== false" value="register" aria-label="注册">注册</ToggleGroupItem>
        </ToggleGroup>

        <div class="input-group">
          <span class="material-icons input-icon">person</span>
          <input v-model="credentials.username" type="text" placeholder="用户名" required />
        </div>
        <div v-if="authMode === 'register'" class="input-group">
          <span class="material-icons input-icon">email</span>
          <input v-model="registerForm.email" type="email" placeholder="邮箱（选填）" />
        </div>
        <div class="input-group">
          <span class="material-icons input-icon">lock</span>
          <input v-model="credentials.password" :type="showPassword ? 'text' : 'password'" :placeholder="authMode === 'register' ? '密码（至少6位，含字母和数字）' : '密码'" required />
          <button type="button" class="password-toggle" @click="showPassword = !showPassword">
            <span class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
          </button>
        </div>
        <div v-if="authMode === 'register'" class="input-group">
          <span class="material-icons input-icon">lock</span>
          <input v-model="registerForm.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="确认密码" required />
          <button type="button" class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
            <span class="material-icons">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
          </button>
        </div>
        <button type="submit" class="action-button" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? (authMode === 'login' ? '登录中...' : '注册中...') : (authMode === 'login' ? '下一步' : '注册') }}
        </button>
        <button type="button" class="back-button" @click="currentStep = 1" :disabled="loading">
          上一步
        </button>
      </form>

      <!-- Step 3: Library Selection -->
      <div v-if="currentStep === 3" class="step-form">
        <div v-if="loading" class="loading-text">加载素材库...</div>
        <div v-else-if="libraries.length === 0" class="empty-text">没有可用的素材库</div>
        <div v-else class="library-list">
          <div
            v-for="lib in libraries"
            :key="lib.id"
            class="library-card"
            :class="{ selected: selectedLibraryId === lib.id }"
            @click="selectedLibraryId = lib.id"
          >
            <span class="material-icons">{{ lib.icon === 'default' ? 'folder' : 'folder_special' }}</span>
            <div class="library-card-info">
              <div class="library-card-name">{{ lib.name }}</div>
              <div class="library-card-path">{{ lib.path }}</div>
            </div>
            <span v-if="selectedLibraryId === lib.id" class="material-icons check-icon">check_circle</span>
          </div>
        </div>
        <button class="action-button" :disabled="!selectedLibraryId || loading" @click="connectToLibrary">
          <span v-if="loading" class="loading-spinner"></span>
          连接
        </button>
        <button type="button" class="back-button" @click="handleStepBack" :disabled="loading">
          上一步
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useServerListStore } from '../stores/serverList'
import {
  Stepper, StepperItem, StepperTrigger, StepperIndicator,
} from '@/components/ui/stepper'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { HealthResponse, Library } from 'mira-server-sdk'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const serverListStore = useServerListStore()

// Stepper state
const currentStep = ref(1)
const loading = ref(false)
const error = ref('')

// Step 1
const serverName = ref('')
const serverAddress = ref('')
const wsAddress = ref('')
const showWsField = ref(false)
const healthData = ref<HealthResponse | null>(null)

// Step 2
const authMode = ref<'login' | 'register'>('login')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const credentials = reactive({ username: '', password: '' })
const registerForm = reactive({ email: '', confirmPassword: '' })
const userRole = ref('')
const authToken = ref('')

function onAuthModeChange(val: string | string[]) {
  if (val && typeof val === 'string') authMode.value = val as 'login' | 'register'
}

// Step 3
const libraries = ref<Library[]>([])
const selectedLibraryId = ref('')

// Temporary SDK client
let tempClient: any = null

function createWsUrl(httpUrl: string): string {
  if (wsAddress.value) return wsAddress.value
  const url = new URL(httpUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.port = '8081'
  return url.toString().replace(/\/$/, '')
}

async function createTempClient(baseUrl: string) {
  const { MiraClient } = await import('mira-server-sdk')
  const cleanUrl = baseUrl.replace(/\/$/, '')
  tempClient = new MiraClient(cleanUrl)
  return tempClient
}

// Step 1: Test connection
async function testConnection() {
  if (!serverAddress.value.trim()) {
    error.value = '请输入服务器地址'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const client = await createTempClient(serverAddress.value)
    const health = await client.system().getHealth()
    healthData.value = health

    if (health.authRequired === false) {
      // Skip auth, go to library selection
      currentStep.value = 3
      await fetchLibraries(client)
    } else {
      currentStep.value = 2
    }
  } catch (err: any) {
    error.value = '无法连接服务器，请检查地址'
  } finally {
    loading.value = false
  }
}

// Step 2: Login
async function handleLogin() {
  if (!credentials.username.trim() || !credentials.password) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const client = tempClient
    const loginResult = await client.auth().login(credentials.username, credentials.password)
    const verifyResult = await client.auth().verify()
    userRole.value = verifyResult.user?.role || 'user'
    authToken.value = loginResult.accessToken || ''

    currentStep.value = 3
    await fetchLibraries(client)
  } catch (err: any) {
    error.value = '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}

// Step 3: Fetch & filter libraries
async function fetchLibraries(client: any) {
  loading.value = true
  try {
    const allLibs = await client.libraries().getAll()
    // Filter by user role (backward compatible: no allowedRoles = accessible to all)
    libraries.value = allLibs.filter((lib: Library) => {
      if (!lib.allowedRoles || lib.allowedRoles.length === 0) return true
      return lib.allowedRoles.includes(userRole.value)
    })
  } catch {
    error.value = '获取素材库列表失败'
  } finally {
    loading.value = false
  }
}

// Step 3: Connect to selected library
async function connectToLibrary() {
  if (!selectedLibraryId.value) return
  loading.value = true
  error.value = ''
  try {
    const wsUrl = createWsUrl(serverAddress.value)
    const lib = libraries.value.find(l => l.id === selectedLibraryId.value)!

    // Import MiraSDKService for final connection
    const { miraSDKService } = await import('../services/MiraSDKService')

    // Save server to serverListStore (check if already exists)
    const existingServer = serverListStore.services.find(s => s.serverUrl === serverAddress.value.replace(/\/$/, ''))
    if (!existingServer) {
      await serverListStore.addServer({
        id: lib.id,
        name: serverName.value || lib.name,
        serverUrl: serverAddress.value.replace(/\/$/, ''),
        websocketUrl: wsUrl,
        ...(authToken.value && { authToken: authToken.value }),
      })
    }
    await serverListStore.setActiveServer(existingServer?.id || lib.id)

    // Connect via MiraSDKService
    await miraSDKService.connect({
      serverUrl: serverAddress.value.replace(/\/$/, ''),
      websocketUrl: wsUrl,
      timeout: 30000,
      ...(authToken.value && { apiKey: authToken.value }),
    })

    // Set auth state
    if (healthData.value?.authRequired !== false) {
      authStore.user = { username: credentials.username, role: userRole.value } as any
      authStore.token = authToken.value
      authStore.tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await authStore.persistAuthState()
    }

    const redirect = route.query.redirect as string
    await router.push(redirect || '/')
  } catch (err: any) {
    error.value = '连接失败：' + (err.message || '未知错误')
  } finally {
    loading.value = false
  }
}

function handleStepBack() {
  if (healthData.value?.authRequired === false) {
    currentStep.value = 1
  } else {
    currentStep.value = 2
  }
}

async function handleRegister() {
  if (!credentials.username.trim() || !credentials.password) {
    error.value = '请输入用户名和密码'
    return
  }
  if (credentials.password.length < 6 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(credentials.password)) {
    error.value = '密码至少6位，需包含字母和数字'
    return
  }
  if (credentials.password !== registerForm.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await authStore.register({
      username: credentials.username.trim(),
      email: registerForm.email.trim() || undefined,
      password: credentials.password,
    }, { serverUrl: serverAddress.value, websocketUrl: wsAddress.value || '' })
    if (result.success) {
      // 注册成功后自动登录
      await handleLogin()
    } else {
      error.value = result.error || '注册失败'
    }
  } catch (err: any) {
    error.value = err instanceof Error ? err.message : '注册失败'
  } finally {
    loading.value = false
  }
}

function handleClose() {
  if (window.electronAPI) {
    window.close?.()
  } else {
    router.back()
  }
}

onMounted(async () => {
  authStore.clearError()
  await serverListStore.initializeServerList()

  // Pre-fill server address from last active server
  const activeServer = serverListStore.activeServer
  if (activeServer) {
    serverAddress.value = activeServer.serverUrl
    serverName.value = activeServer.name
  }
})
</script>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-image: url('https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=2020&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  font-family: Inter, 'Noto Sans', sans-serif;
  position: relative;
}

.login-view::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(248, 250, 252, 0.2);
  backdrop-filter: blur(4px);
}

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-button {
  position: absolute;
  top: 1rem;
  width: 2rem;
  height: 2rem;
  border: none;
  background: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: color 0.2s ease;
}
.header-button:hover { color: #6b7280; }
.close-button { right: 1rem; }

.login-title {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 1.5rem 0;
}

/* Stepper */
.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 1.5rem;
}
.stepper-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  text-align: center;
}
.stepper-separator {
  flex: 1;
  height: 2px;
  background: #e5e7eb;
  margin: 0 0.5rem;
  align-self: center;
  margin-top: -1rem;
}

/* Forms */
.step-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  position: relative;
}
.input-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 2;
  font-size: 1.25rem;
}
.input-group input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: white;
  transition: border-color 0.2s;
}
.input-group input:focus {
  outline: none;
  border-color: #1173d4;
  box-shadow: 0 0 0 2px rgba(17, 115, 212, 0.2);
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  z-index: 2;
}

.collapse-toggle {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
}
.collapse-toggle:hover { color: #374151; }

/* Buttons */
.action-button {
  width: 100%;
  background: #1173d4;
  color: white;
  font-weight: 700;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.action-button:hover:not(:disabled) { background: rgba(17, 115, 212, 0.9); }
.action-button:disabled { opacity: 0.6; cursor: not-allowed; }

.back-button {
  width: 100%;
  background: none;
  color: #6b7280;
  font-weight: 600;
  padding: 0.5rem;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}
.back-button:hover { color: #374151; }

/* Library list */
.library-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 240px;
  overflow-y: auto;
}
.library-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}
.library-card:hover { border-color: #93c5fd; background: #f0f7ff; }
.library-card.selected { border-color: #1173d4; background: #eff6ff; }
.library-card .material-icons { font-size: 1.5rem; color: #6b7280; }
.library-card.selected .material-icons { color: #1173d4; }
.library-card-info { flex: 1; min-width: 0; }
.library-card-name { font-weight: 600; font-size: 0.9rem; color: #1f2937; }
.library-card-path { font-size: 0.75rem; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.check-icon { color: #1173d4 !important; font-size: 1.25rem !important; }

/* Error */
.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  margin-bottom: 1rem;
}
.error-icon { font-size: 1.25rem; flex-shrink: 0; }
.error-close {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.25rem;
}
.error-close .material-icons { font-size: 1rem; }

.loading-text, .empty-text {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .login-container { margin: 1rem; padding: 1.5rem; }
}
</style>
