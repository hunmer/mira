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
        <div class="field">
          <Label>服务器名称</Label>
          <Input v-model="serverName" type="text" placeholder="服务器名称" required />
        </div>
        <div class="field">
          <Label>服务器地址</Label>
          <Input v-model="serverAddress" type="text" placeholder="http://192.168.1.100" required />
        </div>
        <Button type="button" variant="ghost" size="sm" @click="showWsField = !showWsField">
          <span class="material-icons text-sm">{{ showWsField ? 'expand_less' : 'expand_more' }}</span>
          WebSocket 地址
        </Button>
        <div v-if="showWsField" class="field">
          <Label>WebSocket 地址</Label>
          <Input v-model="wsAddress" type="text" placeholder="默认 8081" />
        </div>
        <Button type="submit" class="w-full" :disabled="loading">
          <Loader2 v-if="loading" class="animate-spin" />
          {{ loading ? '连接中...' : '下一步' }}
        </Button>
      </form>

      <!-- Step 2: Authentication -->
      <div v-if="currentStep === 2" class="step-form">
        <Tabs default-value="login" class="justify-center">
          <TabsList>
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger v-if="healthData?.allowRegistration !== false" value="register">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form @submit.prevent="handleLogin" class="space-y-4">
              <div class="field">
                <Label>用户名</Label>
                <Input v-model="credentials.username" type="text" placeholder="用户名" required />
              </div>
              <div class="field">
                <Label>密码</Label>
                <div class="relative">
                  <Input v-model="credentials.password" :type="showPassword ? 'text' : 'password'" placeholder="密码" required class="pr-9" />
                  <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showPassword = !showPassword">
                    <span class="material-icons text-sm">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </Button>
                </div>
              </div>
              <Button type="submit" class="w-full" :disabled="loading">
                <Loader2 v-if="loading" class="animate-spin" />
                {{ loading ? '登录中...' : '下一步' }}
              </Button>
              <Button type="button" variant="ghost" class="w-full" @click="currentStep = 1" :disabled="loading">
                上一步
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form @submit.prevent="handleRegister" class="space-y-4">
              <div class="field">
                <Label>用户名</Label>
                <Input v-model="credentials.username" type="text" placeholder="用户名" required />
              </div>
              <div class="field">
                <Label>邮箱（选填）</Label>
                <Input v-model="registerForm.email" type="email" placeholder="邮箱" />
              </div>
              <div class="field">
                <Label>密码</Label>
                <div class="relative">
                  <Input v-model="credentials.password" :type="showPassword ? 'text' : 'password'" placeholder="至少6位，含字母和数字" required class="pr-9" />
                  <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showPassword = !showPassword">
                    <span class="material-icons text-sm">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </Button>
                </div>
              </div>
              <div class="field">
                <Label>确认密码</Label>
                <div class="relative">
                  <Input v-model="registerForm.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="确认密码" required class="pr-9" />
                  <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showConfirmPassword = !showConfirmPassword">
                    <span class="material-icons text-sm">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
                  </Button>
                </div>
              </div>
              <Button type="submit" class="w-full" :disabled="loading">
                <Loader2 v-if="loading" class="animate-spin" />
                {{ loading ? '注册中...' : '注册' }}
              </Button>
              <Button type="button" variant="ghost" class="w-full" @click="currentStep = 1" :disabled="loading">
                上一步
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      <!-- Step 3: Library Selection -->
      <div v-if="currentStep === 3" class="step-form">
        <div v-if="loading" class="loading-text">加载素材库...</div>
        <div v-else-if="libraries.length === 0" class="empty-text">没有可用的素材库</div>
        <div v-else class="library-list">
          <div
            v-for="lib in libraries"
            :key="lib.id"
            class="library-card"
            :class="{ selected: selectedLibraryId === lib.id, disabled: !isLibraryAccessible(lib) }"
            @click="isLibraryAccessible(lib) && (selectedLibraryId = lib.id)"
          >
            <span class="material-icons">{{ lib.icon === 'default' ? 'folder' : 'folder_special' }}</span>
            <div class="library-card-info">
              <div class="library-card-name">{{ lib.name }}</div>
              <div class="library-card-path">{{ lib.path }}</div>
            </div>
            <span v-if="!isLibraryAccessible(lib)" class="material-icons lock-icon">lock</span>
            <span v-else-if="selectedLibraryId === lib.id" class="material-icons check-icon">check_circle</span>
          </div>
        </div>
        <Button class="w-full" :disabled="!selectedLibraryId || loading" @click="connectToLibrary">
          <Loader2 v-if="loading" class="animate-spin" />
          连接
        </Button>
        <Button type="button" variant="ghost" class="w-full" @click="handleStepBack" :disabled="loading">
          上一步
        </Button>
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'
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
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const credentials = reactive({ username: '', password: '' })
const registerForm = reactive({ email: '', confirmPassword: '' })
const userRole = ref('')
const authToken = ref('')

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

function isLibraryAccessible(lib: Library) {
  if (!lib.allowedRoles || lib.allowedRoles.length === 0) return true
  return lib.allowedRoles.includes(userRole.value)
}

// Step 3: Fetch all libraries
async function fetchLibraries(client: any) {
  loading.value = true
  try {
    libraries.value = await client.libraries().getAll()
    // Auto-select if only one accessible library
    const accessible = libraries.value.filter(isLibraryAccessible)
    if (accessible.length === 1) {
      selectedLibraryId.value = accessible[0].id
    }
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
  if (credentials.password.length < 6 ) {
    error.value = '密码至少6位'
    return
  }
  if (credentials.password !== registerForm.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await tempClient.auth().register(credentials.username.trim(), credentials.password)
    await handleLogin()
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

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

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
.library-card.disabled { opacity: 0.5; cursor: not-allowed; border-color: #e5e7eb; background: #f9fafb; }
.library-card.disabled:hover { border-color: #e5e7eb; background: #f9fafb; }
.library-card .material-icons { font-size: 1.5rem; color: #6b7280; }
.library-card.selected .material-icons { color: #1173d4; }
.library-card-info { flex: 1; min-width: 0; }
.library-card-name { font-weight: 600; font-size: 0.9rem; color: #1f2937; }
.library-card-path { font-size: 0.75rem; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.check-icon { color: #1173d4 !important; font-size: 1.25rem !important; }
.lock-icon { color: #9ca3af !important; font-size: 1.25rem !important; }

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

@media (max-width: 480px) {
  .login-container { margin: 1rem; padding: 1.5rem; }
}
</style>
