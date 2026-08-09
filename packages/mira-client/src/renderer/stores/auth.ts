import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { miraSDKService } from '../services/MiraSDKService'
import { LibraryStorage } from '../utils/LibraryStorage'
import type { UserInfo, LoginCredentials } from '../../shared/types'
import i18n from '../i18n'

/**
 * Mira助手类
 * 提供统一的消息处理和错误转换功能
 */
class MiraHelper {
  /**
   * 获取用户友好的响应消息
   * @param error - 错误对象或消息
   * @returns 用户友好的错误消息
   */
  static getResponseMessage(error: any): string {
    let errorMessage = 'Operation failed'
    
    // 处理不同类型的错误
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      // 处理SDK返回的错误对象
      if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message
      } else if ('error' in error && typeof error.error === 'string') {
        errorMessage = error.error
      } else if ('data' in error && typeof error.data === 'string') {
        errorMessage = error.data
      }
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    // 将技术错误转换为用户友好的消息
    if (errorMessage.includes('HTTP_ERROR') || errorMessage.includes('用户名或密码错误')) {
      return i18n.global.t('stores.auth.invalidCredentials')
    } else if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('网络')) {
      return i18n.global.t('stores.auth.networkFailed')
    } else if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return i18n.global.t('stores.auth.timeout')
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      return i18n.global.t('stores.auth.unauthorized')
    } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
      return i18n.global.t('stores.auth.forbidden')
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return i18n.global.t('stores.auth.notFound')
    } else if (errorMessage.includes('server') || errorMessage.includes('500')) {
      return i18n.global.t('stores.auth.serverError')
    }

    return errorMessage
  }
}

/**
 * 认证状态管理
 * 处理用户登录、登出、令牌管理和认证状态持久化
 */
export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<UserInfo | null>(null)
  const isLoggedIn = computed(() => {
    return !!(user.value && token.value && !isTokenExpired.value)
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const token = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const tokenExpiration = ref<Date | null>(null)

  // 计算属性
  const userDisplayName = computed(() => {
    if (!user.value) return ''
    return user.value.realName || user.value.username || 'Unknown User'
  })

  const hasRole = computed(() => {
    return (role: string) => {
      return user.value?.role === role
    }
  })

  const isTokenExpired = computed(() => {
    if (!tokenExpiration.value) return true
    return new Date() >= tokenExpiration.value
  })

  /**
   * 用户登录
   * @param credentials - 登录凭据，包含用户名和密码
   * @param serverConfig - 服务器配置
   * @param saveCredentials - 是否保存登录凭据，默认为true
   * @returns Promise<{success: boolean, data?: UserInfo, error?: string}>
   */
  const login = async (
    credentials: LoginCredentials, 
    serverConfig?: { serverUrl: string; websocketUrl: string },
    saveCredentials = true
  ) => {
    isLoading.value = true
    error.value = null
    
    try {
      // 如果提供了服务器配置，先初始化连接
      if (serverConfig) {
        const connectResult = await miraSDKService.connect({
          serverUrl: serverConfig.serverUrl,
          websocketUrl: serverConfig.websocketUrl,
          timeout: 10000
        })

        if (!connectResult.success) {
          throw new Error(i18n.global.t('stores.auth.connectServerFailed', { message: connectResult.message }))
        }
      }

      const loginResult = await miraSDKService.login(credentials)
      
      // 成功登录，更新状态
      user.value = loginResult.user
      token.value = loginResult.token
      // 设置token过期时间（假设1天后过期）
      tokenExpiration.value = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      console.log('Login successful, isLoggedIn computed to:', isLoggedIn.value)
      console.log('Token set:', !!token.value)
      
      // 如果提供了服务器配置，更新settings store的连接状态
      if (serverConfig) {
        // 连接状态同步功能已移至serverList store
        // 如需要同步连接状态，可通过serverList store管理
      }
      
      // 持久化认证状态
      await persistAuthState()
      console.log('Auth state persisted to localStorage')

      // 保存登录凭据到当前活跃的素材库（如果用户选择记住登录）
      if (saveCredentials) {
        try {
          const { useServerListStore } = await import('./serverList')
          const serverListStore = useServerListStore()
          const activeLibrary = serverListStore.activeServer

          if (activeLibrary) {
            await saveCredentialsToLibrary(credentials, activeLibrary.id)
          }
        } catch (saveError) {
          console.warn('Failed to save credentials to library:', saveError)
        }
      }

      return { success: true, data: loginResult.user }
    } catch (err) {
      const errorMessage = MiraHelper.getResponseMessage(err)
      error.value = errorMessage
      console.error('Login failed:', err)
      
      // 清除认证状态
      await clearAuthState()
      
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 用户注册
   * @param registrationData - 注册数据
   * @param serverConfig - 服务器配置
   * @returns Promise<{success: boolean, data?: UserInfo, error?: string}>
   */
  const register = async (
    registrationData: { username: string; password: string; email?: string; realName?: string },
    serverConfig?: { serverUrl: string; websocketUrl: string }
  ) => {
    isLoading.value = true
    error.value = null
    
    try {
      // 如果提供了服务器配置，先初始化连接
      if (serverConfig) {
        const connectResult = await miraSDKService.connect({
          serverUrl: serverConfig.serverUrl,
          websocketUrl: serverConfig.websocketUrl,
          timeout: 10000
        })

        if (!connectResult.success) {
          throw new Error(i18n.global.t('stores.auth.connectServerFailed', { message: connectResult.message }))
        }
      }

      // 注意: 这里假设 electronService 有 register 方法
      // 实际上需要在 ElectronService 中添加这个方法
      // const userInfo = await electronService.register(registrationData)
      
      // 临时实现：直接返回注册信息（实际应该调用后端API）
      const userInfo: UserInfo = {
        id: `user_${Date.now()}`,
        username: registrationData.username,
        email: registrationData.email,
        realName: registrationData.realName,
        role: 'user'
      }
      
      // 成功注册，更新状态（注册不设置token，需要重新登录）
      user.value = userInfo
      // 注册后不自动登录，用户需要手动登录获取token
      
      // 持久化认证状态
      await persistAuthState()
      
      return { success: true, data: userInfo }
    } catch (err) {
      const errorMessage = MiraHelper.getResponseMessage(err)
      error.value = errorMessage
      
      // 清除认证状态
      await clearAuthState()
      
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 用户登出
   * @returns Promise<{success: boolean, error?: string}>
   */
  const logout = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      await miraSDKService.logout()
      
      // 清除所有认证状态
      await clearAuthState()
      
      // 清理应用初始化状态
      try {
        const { initializationService } = await import('../services/InitializationService')
        await initializationService.cleanup()
      } catch (cleanupError) {
        console.warn('Failed to cleanup initialization state:', cleanupError)
      }
      
      return { success: true }
    } catch (err) {
      const errorMessage = MiraHelper.getResponseMessage(err)
      error.value = errorMessage
      
      // 即使服务器登出失败，也清除本地状态
      await clearAuthState()
      
      // 尝试清理初始化状态
      try {
        const { initializationService } = await import('../services/InitializationService')
        await initializationService.cleanup()
      } catch (cleanupError) {
        console.warn('Failed to cleanup initialization state:', cleanupError)
      }
      
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取当前用户信息
   * @returns Promise<UserInfo>
   */
  const getCurrentUser = async (forceRefresh = false) => {
    if (!forceRefresh && isLoggedIn.value && user.value && !isTokenExpired.value) {
      return user.value
    }

    isLoading.value = true
    error.value = null
    
    try {
      const userInfo = await miraSDKService.getCurrentUser()
      user.value = userInfo
      // isLoggedIn 现在是computed属性，会根据token状态自动计算
      
      // 持久化状态
      await persistAuthState()
      
      return userInfo
    } catch (err) {
      const errorMessage = MiraHelper.getResponseMessage(err)
      error.value = errorMessage
      
      // 清除无效的认证状态
      await clearAuthState()
      
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 刷新认证令牌
   * @returns Promise<{success: boolean, error?: string}>
   */
  const refreshAuthToken = async () => {
    if (!refreshToken.value) {
      return { success: false, error: 'No refresh token available' }
    }

    try {
      // 这里应该调用 API 刷新令牌
      // const newTokens = await electronService.refreshToken(refreshToken.value)
      // token.value = newTokens.accessToken
      // refreshToken.value = newTokens.refreshToken
      // tokenExpiration.value = new Date(Date.now() + newTokens.expiresIn * 1000)
      
      await persistAuthState()
      return { success: true }
    } catch (err) {
      const errorMessage = MiraHelper.getResponseMessage(err)
      error.value = errorMessage
      
      // 令牌刷新失败，清除认证状态
      await clearAuthState()
      
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 持久化认证状态到本地存储
   * @returns Promise<void>
   */
  const persistAuthState = async () => {
    try {
      const authData = {
        user: user.value,
        isLoggedIn: isLoggedIn.value,
        token: token.value,
        refreshToken: refreshToken.value,
        tokenExpiration: tokenExpiration.value?.toISOString()
      }

      await LibraryStorage.setItem('auth', JSON.stringify(authData))
    } catch (err) {
      console.error('Failed to persist auth state:', err)
    }
  }

  /**
   * 从本地存储恢复认证状态
   * @returns Promise<void>
   */
  const restoreAuthState = async () => {
    try {
      // 如果当前已经有有效的登录状态，不要覆盖
      if (isLoggedIn.value && user.value) {
        console.log('Current auth state is valid, skipping restore')
        return
      }

      const stored = await LibraryStorage.getItem('auth')
      if (!stored) return

      const authData = JSON.parse(stored)
      console.log('Restoring auth state from localStorage:', authData)
      
      user.value = authData.user
      token.value = authData.token
      refreshToken.value = authData.refreshToken
      tokenExpiration.value = authData.tokenExpiration ? new Date(authData.tokenExpiration) : null
      // isLoggedIn 现在是computed属性，会根据token状态自动计算

      // 检查令牌是否过期
      if (isTokenExpired.value && refreshToken.value) {
        await refreshAuthToken()
      } else if (isTokenExpired.value) {
        await clearAuthState()
      }
    } catch (err) {
      console.error('Failed to restore auth state:', err)
      await clearAuthState()
    }
  }

  /**
   * 清除认证状态
   * @returns Promise<void>
   */
  const clearAuthState = async () => {
    user.value = null
    token.value = null
    refreshToken.value = null
    tokenExpiration.value = null
    // isLoggedIn 现在是computed属性，会根据token状态自动计算为false

    try {
      await LibraryStorage.removeItem('auth')
    } catch (err) {
      console.error('Failed to clear auth state:', err)
    }
  }

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 设置错误信息
   */
  const setError = (message: string) => {
    error.value = message
  }

  /**
   * 保存登录凭据到素材库配置
   * @param credentials - 登录凭据
   * @param libraryId - 素材库ID
   */
  const saveCredentialsToLibrary = async (credentials: LoginCredentials, libraryId: string) => {
    try {
      const { useServerListStore } = await import('./serverList')
      const serverListStore = useServerListStore()
      
      const library = serverListStore.services.find(lib => lib.id === libraryId)
      if (!library) {
        console.warn('Library not found for saving credentials:', libraryId)
        return
      }
      
      // 更新库配置
      const updatedLibrary = {
        ...library,
        savedCredentials: {
          username: credentials.username,
          encryptedPassword: credentials.password,
          lastLoginTime: new Date().toISOString(),
          autoLogin: true
        },
        updatedAt: new Date().toISOString()
      }
      
      await serverListStore.updateServer(library.id, updatedLibrary)
      console.log('Credentials saved to library:', library.name)
      
    } catch (error) {
      console.error('Failed to save credentials to library:', error)
    }
  }

  /**
   * 从素材库配置中获取保存的凭据
   * @param libraryId - 素材库ID
   * @returns 解密后的登录凭据
   */
  const getCredentialsFromLibrary = async (libraryId: string): Promise<LoginCredentials | null> => {
    try {
      const { useServerListStore } = await import('./serverList')
      const serverListStore = useServerListStore()
      
      const library = serverListStore.services.find(lib => lib.id === libraryId)
      if (!library || !library.savedCredentials) {
        return null
      }
      
      const { username, encryptedPassword, autoLogin } = library.savedCredentials

      if (!autoLogin) {
        return null
      }

      return { username, password: encryptedPassword }
      
    } catch (error) {
      console.error('Failed to get credentials from library:', error)
      return null
    }
  }

  /**
   * 自动登录（使用保存的凭据）
   * @param libraryId - 素材库ID
   * @returns 登录结果
   */
  const autoLogin = async (libraryId: string): Promise<{ success: boolean; data?: UserInfo; error?: string }> => {
    console.log('🔄 Attempting auto-login for library:', libraryId)
    
    try {
      // 获取保存的凭据
      const credentials = await getCredentialsFromLibrary(libraryId)
      if (!credentials) {
        return { success: false, error: 'No saved credentials found' }
      }
      
      console.log('🔑 Found saved credentials for user:', credentials.username)
      
      // 使用保存的凭据登录
      const result = await login(credentials)
      
      if (result.success) {
        console.log('✅ Auto-login successful')
        // 更新最后登录时间
        await saveCredentialsToLibrary(credentials, libraryId)
      } else {
        console.log('❌ Auto-login failed:', result.error)
      }
      
      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Auto-login failed'
      console.error('💥 Auto-login error:', error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 清除保存的凭据
   * @param libraryId - 素材库ID
   */
  const clearSavedCredentials = async (libraryId: string) => {
    try {
      const { useServerListStore } = await import('./serverList')
      const serverListStore = useServerListStore()
      
      const library = serverListStore.services.find(lib => lib.id === libraryId)
      if (!library) {
        return
      }
      
      const updatedLibrary = {
        ...library,
        savedCredentials: undefined,
        updatedAt: new Date().toISOString()
      }
      
      await serverListStore.updateServer(library.id, updatedLibrary)
      console.log('Cleared saved credentials for library:', library.name)
      
    } catch (error) {
      console.error('Failed to clear saved credentials:', error)
    }
  }

  /**
   * 连接后的认证初始化
   * 专门用于在服务器连接后进行认证状态恢复和自动登录
   */
  const initializeAuthAfterConnection = async () => {
    console.log('🔐 Initializing auth after server connection...')
    
    // 如果当前已经登录且token有效，直接返回
    if (isLoggedIn.value && user.value && !isTokenExpired.value) {
      try {
        await getCurrentUser()
        console.log('✅ Existing auth state is valid')
        return
      } catch {
        // 验证失败，继续下面的流程
        console.log('❌ Existing auth state validation failed')
        await clearAuthState()
      }
    }
    
    // 尝试从localStorage恢复
    await restoreAuthState()
    
    if (isLoggedIn.value && !isTokenExpired.value) {
      try {
        await getCurrentUser()
        console.log('✅ Auth restored from localStorage successfully')
        return
      } catch {
        console.log('❌ Token validation failed, will try auto-login')
        await clearAuthState()
      }
    }
    
    // 尝试自动登录
    try {
      const { useServerListStore } = await import('./serverList')
      const serverListStore = useServerListStore()
      await serverListStore.initializeServerList()
      
      const activeLibrary = serverListStore.activeServer
      if (activeLibrary) {
        console.log('🔄 Attempting auto-login for library:', activeLibrary.name)
        const autoLoginResult = await autoLogin(activeLibrary.id)
        
        if (autoLoginResult.success) {
          console.log('✅ Auto-login successful after connection')
          return
        } else {
          console.log('❌ Auto-login failed:', autoLoginResult.error)
        }
      }
    } catch (autoLoginError) {
      console.warn('Auto-login attempt failed:', autoLoginError)
    }
    
    // 如果所有方式都失败，确保状态被清除
    await clearAuthState()
    throw new Error('Authentication failed')
  }

  /**
   * 初始化认证状态
   * 从本地存储恢复状态，并验证用户身份
   * @returns Promise<void>
   */
  const initializeAuth = async () => {
    // 如果当前已经登录，不需要从localStorage恢复状态
    if (isLoggedIn.value && user.value) {
      console.log('Auth already initialized, skipping restore')
      return
    }
    
    await restoreAuthState()
    
    // 如果从localStorage恢复的状态有效，直接返回
    if (isLoggedIn.value && !isTokenExpired.value) {
      try {
        // 验证当前用户状态（需要先检查是否已连接）
        const { useSettingsStore } = await import('./settings')
        const settingsStore = useSettingsStore()
        
        if (!settingsStore.isConnected) {
          console.log('⚠️ Not connected to server, cannot validate auth state')
          // 不清除状态，等待连接后再验证
          return
        }
        
        await getCurrentUser()
        console.log('✅ Auth restored from localStorage successfully')
        return
      } catch (error) {
        console.log('❌ Token validation failed, will try auto-login')
        // 清除无效状态，继续尝试自动登录
        await clearAuthState()
      }
    }
    
    // 如果localStorage恢复失败，尝试自动登录（仅在已连接时）
    try {
      const { useSettingsStore } = await import('./settings')
      const settingsStore = useSettingsStore()
      
      if (!settingsStore.isConnected) {
        console.log('⚠️ Not connected to server, skipping auto-login')
        return
      }
      
      const { useServerListStore } = await import('./serverList')
      const serverListStore = useServerListStore()
      await serverListStore.initializeServerList()
      
      const activeLibrary = serverListStore.activeServer
      if (activeLibrary) {
        console.log('🔄 Attempting auto-login for library:', activeLibrary.name)
        const autoLoginResult = await autoLogin(activeLibrary.id)
        
        if (autoLoginResult.success) {
          console.log('✅ Auto-login successful')
          return
        } else {
          console.log('❌ Auto-login failed:', autoLoginResult.error)
        }
      }
    } catch (autoLoginError) {
      console.warn('Auto-login attempt failed:', autoLoginError)
    }
    
    // 如果所有恢复方式都失败，清除认证状态
    await clearAuthState()
  }

  /**
   * 带重试机制的登录
   * @param credentials - 登录凭据
   * @param maxRetries - 最大重试次数，默认为3
   * @returns Promise<{success: boolean, data?: UserInfo, error?: string}>
   */
  const loginWithRetry = async (credentials: LoginCredentials, maxRetries = 3) => {
    let lastError = ''
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await login(credentials)
      
      if (result.success) {
        return result
      }
      
      lastError = result.error || 'Unknown error'
      
      if (attempt < maxRetries) {
        // 等待一定时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    
    return { success: false, error: `Login failed after ${maxRetries} attempts: ${lastError}` }
  }

  return {
    // 状态
    user,
    isLoggedIn,
    isLoading,
    error,
    token,
    refreshToken,
    tokenExpiration,
    
    // 计算属性
    userDisplayName,
    hasRole,
    isTokenExpired,
    
    // 操作
    login,
    register,
    logout,
    getCurrentUser,
    refreshAuthToken,
    persistAuthState,
    restoreAuthState,
    clearAuthState,
    clearError,
    setError,
    initializeAuth,
    initializeAuthAfterConnection,
    loginWithRetry,
    autoLogin,
    saveCredentialsToLibrary,
    getCredentialsFromLibrary,
    clearSavedCredentials
  }
})

// 导出MiraHelper类供其他模块使用
export { MiraHelper }
