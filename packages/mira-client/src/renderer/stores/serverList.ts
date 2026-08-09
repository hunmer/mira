import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ConfigStorage from '@renderer/utils/ConfigStorage'
import i18n from '../i18n'

const DEFAULT_WS_PORT = '8018'

const normalizeServerUrl = (value: string): string => {
  try {
    const url = new URL(value.trim())
    if (url.hostname === 'localhost' || url.hostname === '::1') url.hostname = '127.0.0.1'
    return url.toString().replace(/\/$/, '')
  } catch {
    return value.trim()
  }
}

const serverAddressKey = (value: string): string => {
  try {
    const url = new URL(normalizeServerUrl(value))
    const port = url.port || (url.protocol === 'https:' ? '443' : '80')
    return `${url.protocol}//${url.hostname}:${port}`.toLowerCase()
  } catch {
    return normalizeServerUrl(value).toLowerCase()
  }
}

const createWebSocketUrl = (serverUrl: string): string => {
  try {
    const url = new URL(serverUrl)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.port = DEFAULT_WS_PORT
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return serverUrl.replace(/^http/, 'ws')
  }
}

// 素材库配置接口
export interface ServerConfig {
  id: string
  name: string
  serverUrl: string
  websocketUrl: string
  isActive?: boolean
  createdAt: string
  updatedAt: string
  // 认证方式
  authToken?: string // API Token
  // 保存的登录凭据（加密存储）
  savedCredentials?: {
    username: string
    encryptedPassword: string // 加密后的密码
    lastLoginTime?: string
    autoLogin?: boolean
  }
  // SMB 相关配置
  smb?: {
    enabled: boolean
    mountPath?: string // 服务器挂载路径前缀
    smbPath?: string   // SMB路径输入地址
  }
}

/**
 * 素材库列表状态管理
 * 管理多个素材库的配置和选择
 */
export const useServerListStore = defineStore('serverList', () => {
  // 状态
  const services = ref<ServerConfig[]>([])
  const activeServerId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const activeServer = computed(() => {
    return services.value.find(lib => lib.id === activeServerId.value) || null
  })

  const totalLibraries = computed(() => services.value.length)

  /**
   * 获取所有素材库列表
   */
  const fetchLibraries = async () => {
    try {
      await restoreServerListState()
      return { success: true, data: services.value }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch services'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 添加新的素材库
   * @param config - 素材库配置，必须包含id
   */
  const addServer = async (config: Omit<ServerConfig, 'createdAt' | 'updatedAt'>) => {
    isLoading.value = true
    error.value = null

    try {
      const normalizedServerUrl = normalizeServerUrl(config.serverUrl)
      const newServer: ServerConfig = {
        ...config,
        id: config.id, // 必须提供ID
        serverUrl: normalizedServerUrl,
        websocketUrl: normalizeServerUrl(config.websocketUrl),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const sameAddress = services.value.filter(server =>
        server.id !== newServer.id && serverAddressKey(server.serverUrl) === serverAddressKey(newServer.serverUrl),
      )
      const previousActiveId = activeServerId.value
      services.value = services.value.filter(server =>
        server.id === newServer.id || !sameAddress.some(duplicate => duplicate.id === server.id),
      )
      const existingIndex = services.value.findIndex(server => server.id === newServer.id)
      if (existingIndex >= 0) services.value[existingIndex] = newServer
      else services.value.push(newServer)

      // 如果是第一个素材库，设为活跃状态
      if (services.value.length === 1) {
        activeServerId.value = newServer.id
      } else if (sameAddress.some(server => server.id === previousActiveId)) {
        activeServerId.value = newServer.id
      }

      await persistServerListState()
      
      return { success: true, data: newServer }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add server'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新素材库配置
   */
  const updateServer = async (id: string, updates: Partial<Omit<ServerConfig, 'id' | 'createdAt'>>) => {
    const index = services.value.findIndex(lib => lib.id === id)
    if (index === -1) {
      return { success: false, error: 'Server not found' }
    }

    try {
      const nextServerUrl = updates.serverUrl
        ? normalizeServerUrl(updates.serverUrl)
        : services.value[index].serverUrl
      services.value[index] = {
        ...services.value[index],
        ...updates,
        serverUrl: nextServerUrl,
        ...(updates.websocketUrl ? { websocketUrl: normalizeServerUrl(updates.websocketUrl) } : {}),
        updatedAt: new Date().toISOString()
      }
      const duplicateIds = services.value
        .filter((server, serverIndex) =>
          serverIndex !== index && serverAddressKey(server.serverUrl) === serverAddressKey(nextServerUrl),
        )
        .map(server => server.id)
      if (duplicateIds.length) {
        services.value = services.value.filter(server => !duplicateIds.includes(server.id))
        if (activeServerId.value && duplicateIds.includes(activeServerId.value)) {
          activeServerId.value = services.value.find(server => server.id === id)?.id || services.value[0]?.id || null
        }
      }

      await persistServerListState()
      
      return { success: true, data: services.value[index] }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update server'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 删除素材库
   */
  const deleteServer = async (id: string) => {
    const index = services.value.findIndex(lib => lib.id === id)
    if (index === -1) {
      return { success: false, error: 'Server not found' }
    }

    try {
      services.value.splice(index, 1)

      // 如果删除的是当前活跃的素材库，切换到第一个
      if (activeServerId.value === id) {
        activeServerId.value = services.value.length > 0 ? services.value[0].id : null
      }

      await persistServerListState()
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete server'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 设置活跃的素材库
   */
  const setActiveServer = async (id: string, options: { reconnect?: boolean } = {}) => {
    const server = services.value.find(lib => lib.id === id)
    if (!server) {
      return { success: false, error: 'Server not found' }
    }

    try {
      const previousServerId = activeServerId.value
      activeServerId.value = id
      await persistServerListState()

      if (previousServerId !== id && options.reconnect !== false) {
        await handleActiveServerChanged(server)
      }
      
      return { success: true, data: server }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active server'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  const handleActiveServerChanged = async (server: ServerConfig) => {
    const [
      { miraSDKService },
      { resetTabsForLibrary },
      { useAppState },
      { initializationService },
      { useFolderStore },
      { useTagStore },
      { useLibraryStore },
      { useAuthStore },
      { createTabScopeId }
    ] = await Promise.all([
      import('../services/MiraSDKService'),
      import('../composables/useTabs'),
      import('./appState'),
      import('../services/InitializationService'),
      import('./folder'),
      import('./tag'),
      import('./library'),
      import('./auth'),
      import('../composables/TabPersistence')
    ])

    await miraSDKService.disconnect()
    useFolderStore().cleanup()
    useTagStore().cleanup()
    await useLibraryStore().setCurrentLibrary(server as any)
    useAppState().resetAppState()

    const connectionResult = await miraSDKService.connect({
      serverUrl: server.serverUrl,
      websocketUrl: server.websocketUrl,
      timeout: 30000,
      ...(server.authToken && { apiKey: server.authToken }),
      ...(server.savedCredentials && {
        username: server.savedCredentials.username,
        password: server.savedCredentials.encryptedPassword
      })
    })

    if (!connectionResult.success) {
      throw new Error(connectionResult.message || 'Failed to reconnect active server')
    }

    await useAuthStore().initializeAuthAfterConnection()
    await initializationService.forceReinitialize()
    await resetTabsForLibrary(createTabScopeId(
      server.serverUrl,
      useLibraryStore().currentLibrary?.id || server.id
    ))
  }

  /**
   * 测试素材库连接
   */
  const testServerConnection = async (_config: Pick<ServerConfig, 'serverUrl'>) => {
    try {
      // 这里可以调用 electronService 来测试连接
      // const result = await electronService.testConnection()
      // 暂时返回成功，实际应该测试连接
      return { success: true, message: 'Connection test successful' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed'
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 持久化素材库列表状态
   */
  const persistServerListState = async () => {
    try {
      const serverListData = {
        services: services.value,
        activeServerId: activeServerId.value
      }

      await ConfigStorage.setItem('mira-servers', JSON.stringify(serverListData))
    } catch (err) {
      console.error('Failed to persist server list state:', err)
    }
  }

  /**
   * 从本地存储恢复素材库列表状态
   */
  const restoreServerListState = async () => {
    try {
      const stored = await ConfigStorage.getItem('mira-servers')
      if (!stored) {
        // 如果没有存储的数据，创建默认素材库
        await initializeDefaultLibraries()
        return
      }

      const serverListData = JSON.parse(stored)
      
      const normalizedServices = (serverListData.services || []).map((server: ServerConfig) => ({
        ...server,
        serverUrl: normalizeServerUrl(server.serverUrl),
        websocketUrl: normalizeServerUrl(server.websocketUrl),
      }))
      const seenAddresses = new Set<string>()
      services.value = normalizedServices.reverse().filter((server: ServerConfig) => {
        const key = serverAddressKey(server.serverUrl)
        if (seenAddresses.has(key)) return false
        seenAddresses.add(key)
        return true
      }).reverse()
      activeServerId.value = serverListData.activeServerId && services.value.some(server => server.id === serverListData.activeServerId)
        ? serverListData.activeServerId
        : (services.value.length > 0 ? services.value[0].id : null)
      
      // 如果没有素材库，创建默认的
      if (services.value.length === 0) {
        await initializeDefaultLibraries()
      }
    } catch (err) {
      console.error('Failed to restore server list state:', err)
      await initializeDefaultLibraries()
    }
  }

  /**
   * 初始化默认素材库
   */
  const initializeDefaultLibraries = async () => {
      const defaultServerUrl = 'http://127.0.0.1:8081'
      const defaultLibraries: ServerConfig[] = [
      {
        id: 'default-server', // 默认库ID
        name: i18n.global.t('stores.serverList.defaultLibraryName'),
        serverUrl: defaultServerUrl,
        websocketUrl: createWebSocketUrl(defaultServerUrl),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    services.value = defaultLibraries
    activeServerId.value = defaultLibraries[0].id
    await persistServerListState()
  }

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 初始化素材库列表
   */
  const initializeServerList = async () => {
    await restoreServerListState()
  }

  /**
   * 从服务器获取并同步素材库列表
   * 这个函数在连接到服务器后调用，用真实的服务器库ID替换本地生成的ID
   * @param serverUrl - 服务器URL
   * @returns Promise<{success: boolean, data?: ServerConfig[], error?: string}>
   */
  const fetchAndSyncLibrariesFromServer = async (serverUrl: string) => {
    isLoading.value = true
    error.value = null

    try {
      const normalizedServerUrl = normalizeServerUrl(serverUrl)
      // 导入MiraSDKService来获取库列表
      const { miraSDKService } = await import('../services/MiraSDKService')
      
      // 从服务器获取库列表
      const serverLibraries = await miraSDKService.getLibraries()
      
      // 将服务器库数据转换为ServerConfig格式
      const ServerConfigs: ServerConfig[] = serverLibraries.map(server => ({
        id: server.id, // 使用真实的服务器库ID
        name: server.name,
        serverUrl: normalizedServerUrl,
        websocketUrl: createWebSocketUrl(normalizedServerUrl),
        isActive: false,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt
      }))

      // 检查是否已存在相同服务器的库
      const existingServer = services.value.find(lib => serverAddressKey(lib.serverUrl) === serverAddressKey(normalizedServerUrl))
      
      if (existingServer) {
        // 更新现有服务器的库列表
        services.value = services.value.filter(lib => serverAddressKey(lib.serverUrl) !== serverAddressKey(normalizedServerUrl))
        services.value.push(...ServerConfigs)
      } else {
        // 添加新服务器的库
        services.value.push(...ServerConfigs)
      }

      // 如果当前没有活跃库，设置第一个为活跃
      if (!activeServerId.value && ServerConfigs.length > 0) {
        activeServerId.value = ServerConfigs[0].id
      }

      await persistServerListState()
      
      return { success: true, data: ServerConfigs }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch server services'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 添加服务器连接并获取其库列表
   * 这是连接新服务器时应该调用的主要方法
   * @param serverUrl - 服务器URL
   * @param authConfig - 可选的认证配置 (token 或 用户名密码)
   * @returns Promise<{success: boolean, data?: ServerConfig[], error?: string}>
   */
  const addServerConnection = async (
    serverUrl: string,
    authConfig?: {
      authToken?: string;
      username?: string;
      password?: string
    }
  ) => {
    try {
      // 直接使用SDK服务测试连接
      const { miraSDKService } = await import('../services/MiraSDKService')

      // 创建临时连接配置
      const tempConfig = {
        serverUrl,
        timeout: 30000,
        ...(authConfig?.authToken && { apiKey: authConfig.authToken }),
        ...(authConfig?.username && authConfig?.password && {
          username: authConfig.username,
          password: authConfig.password
        })
      }

      // 测试连接
      const connectionResult = await miraSDKService.connect(tempConfig)
      if (!connectionResult.success) {
        const errorMsg = connectionResult.message || 'Failed to connect to server'
        return { success: false, error: errorMsg }
      }

      // 连接成功，获取并同步库列表
      const result = await fetchAndSyncLibrariesFromServer(serverUrl)

      // 断开临时连接
      await miraSDKService.disconnect()

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add server connection'
      return { success: false, error: errorMessage }
    }
  }

  return {
    // 状态
    services,
    activeServerId,
    isLoading,
    error,
    
    // 计算属性
    activeServer,
    totalLibraries,
    
    // 操作
    fetchLibraries,
    addServer,
    updateServer,
    deleteServer,
    setActiveServer,
    testServerConnection,
    persistServerListState,
    restoreServerListState,
    initializeDefaultLibraries,
    clearError,
    initializeServerList,
    fetchAndSyncLibrariesFromServer,
    addServerConnection
  }
})
