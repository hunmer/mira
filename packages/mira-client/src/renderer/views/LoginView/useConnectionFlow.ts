/**
 * 连接流程核心逻辑
 *
 * 承载登录向导的服务器连接、认证、素材库连接全流程：
 * - createWsUrl / createTempClient: 构造 WS 地址与临时 SDK client
 * - quickConnect: 从列表快速连接已有服务器
 * - testConnection: 步骤 1 健康检查
 * - handleLogin / handleRegister: 步骤 2 登录 / 注册
 * - fetchLibraries / connectToLibrary: 步骤 3 拉取并连接素材库
 * - isLibraryAccessible / handleStepBack: 辅助判断
 *
 * 依赖 index.vue 提供的共享状态（useLoginState）与 stores/router。
 */
import { ref, type Ref, type Reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@renderer/stores/auth'
import { useLibraryStore } from '@renderer/stores/library'
import { useServerListStore, type ServerConfig } from '@renderer/stores/serverList'
import { saveCredentials, loadCredentials } from './useSavedCredentials'
import type { HealthResponse, Library } from 'mira-app-core/shared/sdk'

/** index.vue 透传进来的共享状态切片 */
export interface LoginFlowState {
  // 通用
  currentStep: Ref<number>
  loading: Ref<boolean>
  error: Ref<string>
  // Step 1
  serverName: Ref<string>
  serverAddress: Ref<string>
  wsAddress: Ref<string>
  selectedServerId: Ref<string>
  healthData: Ref<HealthResponse | null>
  // Step 2
  credentials: Reactive<{ username: string; password: string }>
  registerForm: Reactive<{ email: string; confirmPassword: string }>
  userRole: Ref<string>
  authToken: Ref<string>
}

export function useConnectionFlow(state: LoginFlowState) {
  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()
  const libraryStore = useLibraryStore()
  const serverListStore = useServerListStore()

  // Step 3
  const libraries = ref<Library[]>([])
  const selectedLibraryId = ref('')

  // 临时 SDK client，贯穿 testConnection -> handleLogin -> connectToLibrary
  let tempClient: any = null

  function createWsUrl(httpUrl: string): string {
    if (state.wsAddress.value) return state.wsAddress.value
    const url = new URL(httpUrl)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.port = '8081'
    return url.toString().replace(/\/$/, '')
  }

  async function createTempClient(baseUrl: string) {
    const { MiraClient } = await import('mira-app-core/shared/sdk')
    const cleanUrl = baseUrl.replace(/\/$/, '')
    tempClient = new MiraClient(cleanUrl)
    return tempClient
  }

  // 从列表快速连接已有服务器
  async function quickConnect(server: ServerConfig) {
    state.serverName.value = server.name
    state.serverAddress.value = server.serverUrl
    state.wsAddress.value = server.websocketUrl || ''
    // 仅用于列表项 loading 态展示
    state.selectedServerId.value = server.id
    await testConnection()
  }

  // 步骤 1：测试连接
  async function testConnection() {
    if (!state.serverAddress.value.trim()) {
      state.error.value = '请输入服务器地址'
      return
    }
    state.loading.value = true
    state.error.value = ''
    try {
      const client = await createTempClient(state.serverAddress.value)
      const health = await client.system().getHealth()
      state.healthData.value = health

      if (health.authRequired === false) {
        // 跳过认证，直接进入素材库选择
        state.currentStep.value = 3
        await fetchLibraries(client)
      } else {
        loadCredentials(state.serverAddress.value, saved => {
          state.credentials.username = saved.username
          state.credentials.password = saved.password
        })
        state.currentStep.value = 2
      }
    } catch (err: any) {
      state.error.value = '无法连接服务器，请检查地址'
    } finally {
      state.loading.value = false
    }
  }

  // 步骤 2：登录
  async function handleLogin() {
    if (!state.credentials.username.trim() || !state.credentials.password) {
      state.error.value = '请输入用户名和密码'
      return
    }
    state.loading.value = true
    state.error.value = ''
    try {
      const client = tempClient
      const loginResult = await client.auth().login(state.credentials.username, state.credentials.password)
      const verifyResult = await client.auth().verify()
      state.userRole.value = verifyResult.user?.role || 'user'
      state.authToken.value = loginResult.accessToken || ''

      saveCredentials(state.serverAddress.value, state.credentials.username, state.credentials.password)
      state.currentStep.value = 3
      await fetchLibraries(client)
    } catch (err: any) {
      state.error.value = '登录失败，请检查用户名和密码'
    } finally {
      state.loading.value = false
    }
  }

  function isLibraryAccessible(lib: Library) {
    if (!lib.allowedRoles || lib.allowedRoles.length === 0) return true
    return lib.allowedRoles.includes(state.userRole.value)
  }

  // 步骤 3：拉取素材库列表
  async function fetchLibraries(client: any) {
    state.loading.value = true
    try {
      libraries.value = await client.libraries().getAll()
      // 自动选中第一个有权限的库
      const accessible = libraries.value.filter(isLibraryAccessible)
      if (accessible.length > 0) {
        selectedLibraryId.value = accessible[0].id
      }
    } catch {
      state.error.value = '获取素材库列表失败'
    } finally {
      state.loading.value = false
    }
  }

  // 步骤 3：连接选中的素材库
  async function connectToLibrary() {
    if (!selectedLibraryId.value) return
    state.loading.value = true
    state.error.value = ''
    try {
      const wsUrl = createWsUrl(state.serverAddress.value)
      const lib = libraries.value.find(l => l.id === selectedLibraryId.value)!

      // 导入 MiraSDKService 进行最终连接
      const { miraSDKService } = await import('@renderer/services/MiraSDKService')

      // 保存服务器到 serverListStore（检查是否已存在）
      const existingServer = serverListStore.services.find(
        s => s.serverUrl === state.serverAddress.value.replace(/\/$/, ''),
      )
      if (!existingServer) {
        await serverListStore.addServer({
          id: lib.id,
          name: state.serverName.value || lib.name,
          serverUrl: state.serverAddress.value.replace(/\/$/, ''),
          websocketUrl: wsUrl,
          ...(state.authToken.value && { authToken: state.authToken.value }),
        })
      } else if (state.authToken.value) {
        await serverListStore.updateServer(existingServer.id, { authToken: state.authToken.value })
      }
      await serverListStore.setActiveServer(existingServer?.id || lib.id, { reconnect: false })

      // SDK 连接会从 authStore 读取 token，必须先写入认证状态。
      if (state.healthData.value?.authRequired !== false) {
        authStore.user = { username: state.credentials.username, role: state.userRole.value } as any
        authStore.token = state.authToken.value
        authStore.tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000)
        await authStore.persistAuthState()
      }

      // 通过 MiraSDKService 连接
      const connectResult = await miraSDKService.connect({
        serverUrl: state.serverAddress.value.replace(/\/$/, ''),
        websocketUrl: wsUrl,
        timeout: 30000,
        ...(state.authToken.value && { apiKey: state.authToken.value }),
      })
      if (!connectResult.success) {
        throw new Error(connectResult.message || 'SDK 连接失败')
      }

      // 持久化用户选中的素材库，使 initializeHomeView() 能拾起，
      // 而非回退到 libraries[0]。必须在 setActiveServer（按 activeServerId
      // 划分 LibraryStorage 键）与 connect 之后执行。
      try {
        await libraryStore.fetchLibraries()
        const selectedLib = libraryStore.getLibraryById(selectedLibraryId.value)
        if (selectedLib) {
          await libraryStore.setCurrentLibrary(selectedLib)
        }
      } catch { /* 非致命：selectLibrary() 有自身回退 */ }

      const redirect = route.query.redirect as string
      await router.push(redirect || '/')
    } catch (err: any) {
      state.error.value = '连接失败：' + (err.message || '未知错误')
    } finally {
      state.loading.value = false
    }
  }

  async function connectToDeployedLibrary(defaultLibraryId: string) {
    state.serverName.value = '本地 Mira 服务'
    state.serverAddress.value = 'http://127.0.0.1:8081'
    state.wsAddress.value = 'ws://127.0.0.1:8018'
    state.currentStep.value = 1

    await testConnection()
    if (state.currentStep.value === 2) {
      state.credentials.username = 'admin'
      state.credentials.password = 'admin123'
      await handleLogin()
    }
    if (state.currentStep.value !== 3) return

    const defaultLibrary = libraries.value.find(library => library.id === defaultLibraryId)
    if (!defaultLibrary) {
      state.error.value = '默认素材库不存在，请重新执行部署'
      return
    }
    selectedLibraryId.value = defaultLibrary.id
    await connectToLibrary()
  }

  function handleStepBack() {
    if (state.healthData.value?.authRequired === false) {
      state.currentStep.value = 1
    } else {
      state.currentStep.value = 2
    }
  }

  async function handleRegister() {
    if (!state.credentials.username.trim() || !state.credentials.password) {
      state.error.value = '请输入用户名和密码'
      return
    }
    if (state.credentials.password !== state.registerForm.confirmPassword) {
      state.error.value = '两次输入的密码不一致'
      return
    }
    state.loading.value = true
    state.error.value = ''
    try {
      await tempClient.auth().register(state.credentials.username.trim(), state.credentials.password)
      await handleLogin()
    } catch (err: any) {
      state.error.value = err instanceof Error ? err.message : '注册失败'
    } finally {
      state.loading.value = false
    }
  }

  return {
    libraries,
    selectedLibraryId,
    quickConnect,
    testConnection,
    handleLogin,
    handleRegister,
    fetchLibraries,
    connectToLibrary,
    connectToDeployedLibrary,
    isLibraryAccessible,
    handleStepBack,
  }
}
