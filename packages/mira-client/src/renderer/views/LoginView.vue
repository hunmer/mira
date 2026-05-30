<template>
  <div class="flex items-center justify-center min-h-screen bg-[#0a0a0a] font-[Inter,'Noto_Sans',sans-serif] relative overflow-hidden">
    <Aurora
      :color-stops="['#3A29FF', '#FF94B4', '#FF3232']"
      :amplitude="1.0"
      :blend="0.5"
      :speed="1.2"
      class="absolute inset-0 w-full h-full z-0"
    />
    <div class="relative z-[1] w-full max-w-[440px] p-8 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-white/30 dark:border-zinc-700/50 max-[480px]:m-4 max-[480px]:p-6">
      <!-- Close button -->
      <button class="absolute top-4 right-4 w-8 h-8 border-none bg-transparent text-gray-400 hover:text-gray-500 cursor-pointer flex items-center justify-center rounded transition-colors" @click="handleClose" title="关闭">
        <span class="material-icons">close</span>
      </button>

      <h1 class="text-center text-2xl font-bold text-gray-800 dark:text-zinc-100 mb-6">连接服务器</h1>

      <!-- Stepper -->
      <Stepper v-model="currentStep" class="flex items-center justify-center gap-0 mb-6">
        <StepperItem :step="1" :completed="currentStep > 1">
          <StepperTrigger>
            <StepperIndicator>1</StepperIndicator>
          </StepperTrigger>
          <div class="text-xs text-gray-500 dark:text-zinc-400 mt-1 text-center">服务器</div>
        </StepperItem>
        <div class="flex-1 h-0.5 bg-gray-200 dark:bg-zinc-700 mx-2 self-center -mt-4" />
        <StepperItem :step="2" :completed="currentStep > 2" :disabled="!healthData || healthData.authRequired === false">
          <StepperTrigger>
            <StepperIndicator>2</StepperIndicator>
          </StepperTrigger>
          <div class="text-xs text-gray-500 dark:text-zinc-400 mt-1 text-center">认证</div>
        </StepperItem>
        <div class="flex-1 h-0.5 bg-gray-200 dark:bg-zinc-700 mx-2 self-center -mt-4" />
        <StepperItem :step="3" :disabled="currentStep < 3">
          <StepperTrigger>
            <StepperIndicator>3</StepperIndicator>
          </StepperTrigger>
          <div class="text-xs text-gray-500 dark:text-zinc-400 mt-1 text-center">素材库</div>
        </StepperItem>
      </Stepper>

      <!-- Error banner -->
      <div v-if="error" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm flex items-center gap-2 relative mb-4">
        <span class="material-icons text-xl shrink-0">error</span>
        {{ error }}
        <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-red-600 dark:text-red-300 cursor-pointer p-1" @click="error = ''">
          <span class="material-icons text-base">close</span>
        </button>
      </div>

      <!-- Step 1: Server Connection -->
      <div v-if="currentStep === 1">
        <!-- Server List View -->
        <div v-if="!showAddForm" class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-3">
            <!-- Add Server Card -->
            <div
              class="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl cursor-pointer transition-all hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10"
              @click="showAddForm = true"
            >
              <span class="material-icons text-3xl text-gray-400 dark:text-zinc-500">add</span>
              <span class="text-xs text-gray-500 dark:text-zinc-400">添加服务器</span>
            </div>
            <!-- Existing Server Cards -->
            <div
              v-for="server in serverListStore.services"
              :key="server.id"
              class="flex flex-col gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all"
              :class="loading && selectedServerId === server.id
                ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                : 'border-gray-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10'"
              @click="quickConnect(server)"
            >
              <div class="flex items-center gap-2">
                <span class="material-icons text-lg text-blue-600 dark:text-blue-400">dns</span>
                <span class="font-semibold text-sm text-gray-800 dark:text-zinc-100 truncate">{{ server.name }}</span>
              </div>
              <span class="text-xs text-gray-400 dark:text-zinc-500 truncate">{{ server.serverUrl }}</span>
            </div>
          </div>
          <div v-if="serverListStore.services.length === 0" class="text-center py-4 text-sm text-gray-400 dark:text-zinc-500">
            还没有添加过服务器
          </div>
        </div>

        <!-- Add Server Form -->
        <form v-else @submit.prevent="testConnection" class="flex flex-col gap-4 relative">
          <button type="button" class="absolute -top-1 right-0 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 bg-transparent border-none cursor-pointer" @click="showAddForm = false">
            <span class="material-icons text-sm">arrow_back</span>
            返回列表
          </button>
          <div class="flex flex-col gap-1">
            <Label>服务器名称</Label>
            <Input v-model="serverName" type="text" placeholder="服务器名称" required />
          </div>
          <div class="flex flex-col gap-1">
            <Label>服务器地址</Label>
            <Input v-model="serverAddress" type="text" placeholder="http://192.168.1.100" required />
          </div>
          <Button type="button" variant="ghost" size="sm" @click="showWsField = !showWsField">
            <span class="material-icons text-sm">{{ showWsField ? 'expand_less' : 'expand_more' }}</span>
            WebSocket 地址
          </Button>
          <div v-if="showWsField" class="flex flex-col gap-1">
            <Label>WebSocket 地址</Label>
            <Input v-model="wsAddress" type="text" placeholder="默认 8081" />
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            <Loader2 v-if="loading" class="animate-spin" />
            {{ loading ? '连接中...' : '下一步' }}
          </Button>
        </form>
      </div>

      <!-- Step 2: Authentication -->
      <div v-if="currentStep === 2" class="flex flex-col gap-4">
        <Tabs default-value="login" class="justify-center">
          <TabsList>
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger v-if="healthData?.allowRegistration !== false" value="register">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form @submit.prevent="handleLogin" class="space-y-4">
              <div class="flex flex-col gap-1">
                <Label>用户名</Label>
                <Input v-model="credentials.username" type="text" placeholder="用户名" required />
              </div>
              <div class="flex flex-col gap-1">
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
              <div class="flex flex-col gap-1">
                <Label>用户名</Label>
                <Input v-model="credentials.username" type="text" placeholder="用户名" required />
              </div>
              <div class="flex flex-col gap-1">
                <Label>邮箱（选填）</Label>
                <Input v-model="registerForm.email" type="email" placeholder="邮箱" />
              </div>
              <div class="flex flex-col gap-1">
                <Label>密码</Label>
                <div class="relative">
                  <Input v-model="credentials.password" :type="showPassword ? 'text' : 'password'" placeholder="至少6位，含字母和数字" required class="pr-9" />
                  <Button type="button" variant="ghost" size="icon-sm" class="absolute right-0.5 top-1/2 -translate-y-1/2" @click="showPassword = !showPassword">
                    <span class="material-icons text-sm">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </Button>
                </div>
              </div>
              <div class="flex flex-col gap-1">
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
      <div v-if="currentStep === 3" class="flex flex-col gap-4">
        <div v-if="loading" class="text-center py-8 text-gray-400 dark:text-zinc-500">加载素材库...</div>
        <div v-else-if="libraries.length === 0" class="text-center py-8 text-gray-400 dark:text-zinc-500">没有可用的素材库</div>
        <div v-else class="flex flex-col gap-2 max-h-60 overflow-y-auto">
          <div
            v-for="lib in libraries"
            :key="lib.id"
            class="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all"
            :class="[
              selectedLibraryId === lib.id
                ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/15'
                : isLibraryAccessible(lib)
                  ? 'border-gray-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-500/10'
                  : 'opacity-50 cursor-not-allowed border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900'
            ]"
            @click="isLibraryAccessible(lib) && (selectedLibraryId = lib.id)"
          >
            <span class="material-icons text-2xl" :class="selectedLibraryId === lib.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-zinc-400'">{{ lib.icon === 'default' ? 'folder' : 'folder_special' }}</span>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-gray-800 dark:text-zinc-100">{{ lib.name }}</div>
              <div class="text-xs text-gray-400 dark:text-zinc-500 overflow-hidden text-ellipsis whitespace-nowrap">{{ lib.path }}</div>
            </div>
            <span v-if="!isLibraryAccessible(lib)" class="material-icons text-xl text-gray-400 dark:text-zinc-500">lock</span>
            <span v-else-if="selectedLibraryId === lib.id" class="material-icons text-xl text-blue-600 dark:text-blue-400">check_circle</span>
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
import { useServerListStore, type ServerConfig } from '../stores/serverList'
import Aurora from '@renderer/components/Aurora.vue'
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
const showAddForm = ref(false)
const selectedServerId = ref('')
const healthData = ref<HealthResponse | null>(null)

// Step 2
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const credentials = reactive({ username: '', password: '' })
const registerForm = reactive({ email: '', confirmPassword: '' })
const userRole = ref('')
const authToken = ref('')

const CREDS_STORAGE_KEY = 'mira_saved_credentials'

function saveCredentials(serverUrl: string, username: string, password: string) {
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY)
    const all: Record<string, { username: string; password: string }> = raw ? JSON.parse(raw) : {}
    all[serverUrl.replace(/\/$/, '')] = { username, password }
    localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(all))
  } catch {}
}

function loadCredentials(serverUrl: string) {
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY)
    if (!raw) return
    const all: Record<string, { username: string; password: string }> = JSON.parse(raw)
    const saved = all[serverUrl.replace(/\/$/, '')]
    if (saved) {
      credentials.username = saved.username
      credentials.password = saved.password
    }
  } catch {}
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

// Quick connect to an existing server
async function quickConnect(server: ServerConfig) {
  serverName.value = server.name
  serverAddress.value = server.serverUrl
  wsAddress.value = server.websocketUrl || ''
  selectedServerId.value = server.id
  await testConnection()
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
      loadCredentials(serverAddress.value)
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

    saveCredentials(serverAddress.value, credentials.username, credentials.password)
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
