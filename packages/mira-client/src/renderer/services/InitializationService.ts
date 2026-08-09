import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '@renderer/stores/settings'
import { useLibraryStore } from '../stores/library'
import { useMediaStore } from '../stores/media'
import { useFolderStore } from '../stores/folder'
import { useTagStore } from '../stores/tag'
import { useGlobalInitializationState } from '../composables/useInitializationState'
import { globalPluginManager } from './GlobalPluginManager'
import i18n from '../i18n'

const t = i18n.global.t.bind(i18n.global)

/* 应用初始化服务
 * 处理用户认证后的应用初始化流程
 */
export class InitializationService {
  private static instance: InitializationService
  private isInitializing = false
  private lastInitializationTime: Date | null = null
  
  public static getInstance(): InitializationService {
    if (!InitializationService.instance) {
      InitializationService.instance = new InitializationService()
    }
    return InitializationService.instance
  }

  private async setTabScope(libraryId: string | null | undefined): Promise<void> {
    const [
      { tabPersistence, createTabScopeId },
      { useServerListStore }
    ] = await Promise.all([
      import('../composables/TabPersistence'),
      import('../stores/serverList')
    ])

    const activeServer = useServerListStore().activeServer
    tabPersistence.setCurrentLibraryId(createTabScopeId(activeServer?.serverUrl, libraryId))
  }

  /**
   * 应用级别初始化（包含连接和认证）
   * @returns Promise<{success: boolean, error?: string}>
   */
  public async initializeApp(): Promise<{success: boolean, error?: string}> {
    const initState = useGlobalInitializationState()
    const authStore = useAuthStore()
    const settingsStore = useSettingsStore()
    
    try {
      // 显示全局加载器并执行初始化
      await initState.startInitialization([
        t('services.initialization.stepLoadLibraryConfig'),
        t('services.initialization.stepInitPlugins'),
        t('services.initialization.stepEnablePlugins'),
        t('services.initialization.stepConnectServer'),
        t('services.initialization.stepVerifyIdentity'),
        t('services.initialization.stepInitComplete')
      ])

      // 初始化插件系统
      initState.updateStep(t('services.initialization.stepInitPlugins'), 20)
      try {
        await globalPluginManager.initialize()
        // 标记插件系统已初始化，防止settings store重复初始化
        settingsStore.isPluginSystemInitialized = true
      } catch (error) {
        // 插件初始化失败不阻止应用启动
        // 插件初始化失败不阻止应用启动，只记录警告
      }
      initState.completeStep(t('services.initialization.stepInitPlugins'))

      // 启用所有插件
      initState.updateStep(t('services.initialization.stepEnablePlugins'), 40)
      try {
        const enableResult = await globalPluginManager.enableAllPlugins()
        if (!enableResult.success) {
          const errorMessage = t('services.initialization.pluginEnablePartialFailed', { errors: enableResult.errors.join(', ') })
          throw new Error(t('services.initialization.pluginEnableFailed', { message: errorMessage }))
        }
      } catch (error) {
        // 重新抛出错误，阻止应用启动
        throw error
      }
      initState.completeStep(t('services.initialization.stepEnablePlugins'))

      // 连接服务器
      initState.updateStep(t('services.initialization.stepConnectServer'), 60)
      const connectionResult = await this.connectToServer(initState)
      if (!connectionResult.success) {
        throw new Error(connectionResult.error || t('services.initialization.connectServerFailed'))
      }
      initState.completeStep(t('services.initialization.stepConnectServer'))

      // 认证初始化
      if (!authStore.isLoggedIn) {
        initState.updateStep(t('services.initialization.stepVerifyIdentity'), 90)
        await authStore.initializeAuthAfterConnection()
        if (!authStore.isLoggedIn) {
          throw new Error(t('services.initialization.authFailed'))
        }
        initState.completeStep(t('services.initialization.stepVerifyIdentity'))
      }

      // 初始化成功
      await initState.completeInitialization()
      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('services.initialization.appInitFailed')
      await initState.completeInitialization(false, errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 初始化主页所需的数据
   * @returns Promise<{success: boolean, error?: string}>
   */
  public async initializeHomeView(): Promise<{success: boolean, error?: string}> {
    const initState = useGlobalInitializationState()
    
    // 防止重复初始化
    if (this.isInitializing) {
      return { success: true }
    }
    
    // 检查是否需要重新初始化（5分钟内不重复初始化）
    if (this.lastInitializationTime) {
      const timeSinceLastInit = Date.now() - this.lastInitializationTime.getTime()
      if (timeSinceLastInit < 5 * 60 * 1000) { // 5分钟
        return { success: true }
      }
    }

    this.isInitializing = true
    
    // 定义初始化步骤
    const steps = [
      t('services.initialization.homeStepCheckAuth'),
      t('services.initialization.homeStepFetchLibraries'),
      t('services.initialization.homeStepSelectLibrary'),
      t('services.initialization.homeStepLoadFolders'),
      t('services.initialization.homeStepLoadTags')
    ]

    // 开始初始化
    initState.startInitialization(steps)

    try {
      const authStore = useAuthStore()
      const libraryStore = useLibraryStore()

      // 第一步：确保用户已认证
      initState.updateStep(t('services.initialization.homeStepCheckAuth'), 10)
      if (!authStore.isLoggedIn) {
        throw new Error('User not authenticated')
      }
      initState.completeStep(t('services.initialization.homeStepCheckAuth'))

      // 第二步：先恢复持久化的素材库选择，再从服务器获取列表
      initState.updateStep(t('services.initialization.homeStepFetchLibraries'), 30)
      await libraryStore.restoreLibraryState()
      const previousLibraryId = libraryStore.currentLibrary?.id

      // 同步 tab 持久化的 libraryId
      if (previousLibraryId) {
        await this.setTabScope(previousLibraryId)
      }

      const libraryResult = await libraryStore.fetchLibraries()

      if (!libraryResult.success) {
        initState.setStepError(t('services.initialization.homeStepFetchLibraries'), libraryResult.error || 'Unknown error')
        throw new Error(`Failed to fetch librarys: ${libraryResult.error}`)
      }

      // fetchLibraries 会覆盖 libraries 数组但保留 currentLibrary
      // 恢复之前选中的库（如果仍存在于新列表中）
      if (previousLibraryId && libraryStore.getLibraryById(previousLibraryId)) {
        libraryStore.currentLibrary = libraryStore.getLibraryById(previousLibraryId) as any
      }

      initState.completeStep(t('services.initialization.homeStepFetchLibraries'))

      // 第三步：确定要使用的素材库
      initState.updateStep(t('services.initialization.homeStepSelectLibrary'), 50)
      let selectedLibraryId = await this.selectLibrary(libraryStore)

      if (!selectedLibraryId) {
        initState.completeStep(t('services.initialization.homeStepSelectLibrary'))
        initState.completeInitialization(false, t('services.initialization.noLibraryAvailable'))
        this.lastInitializationTime = new Date()
        return { success: false, error: 'NO_LIBRARY_AVAILABLE' } // 返回特殊错误码，让UI处理
      }

      initState.completeStep(t('services.initialization.homeStepSelectLibrary'))

      // 设置当前素材库
      const selectedLibrary = libraryStore.getLibraryById(selectedLibraryId)
      if (selectedLibrary) {
        libraryStore.currentLibrary = selectedLibrary
        await this.setTabScope(selectedLibraryId)
      }

      // 第四步：加载文件夹结构
      initState.updateStep(t('services.initialization.homeStepLoadFolders'), 70)
      await this.loadFolderStructure(selectedLibraryId)
      initState.completeStep(t('services.initialization.homeStepLoadFolders'))

      // WebSocket 初始化（library 已确定）
      try {
        const { miraSDKService } = await import('../services/MiraSDKService')
        await miraSDKService.initWebSocketForLibrary(selectedLibraryId)
      } catch { /* non-fatal */ }

      // 素材库确定后同步其启用的服务端 Web 插件。
      try {
        const { usePluginStore } = await import('../stores/plugin')
        await usePluginStore().syncServerPlugins(selectedLibraryId)
      } catch (error) {
        console.warn('Failed to load server Web plugins:', error)
      }

      // 第五步：加载标签列表
      initState.updateStep(t('services.initialization.homeStepLoadTags'), 90)
      await this.loadTagList(selectedLibraryId)
      initState.completeStep(t('services.initialization.homeStepLoadTags'))
      
      this.lastInitializationTime = new Date()
      initState.completeInitialization(true)
      return { success: true }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error'
      initState.completeInitialization(false, errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * 选择要使用的素材库
   */
  private async selectLibrary(
    libraryStore: ReturnType<typeof useLibraryStore>
  ): Promise<string | null> {
    // 尝试使用当前选择的素材库
    let selectedLibraryId = libraryStore.currentLibrary?.id

    // 验证素材库是否存在
    if (selectedLibraryId && libraryStore.getLibraryById(selectedLibraryId)) {
      return selectedLibraryId
    }

    // 如果当前素材库不存在，选择第一个可用的
    const librarys = libraryStore.libraries
    if (librarys.length > 0) {
      selectedLibraryId = librarys[0].id

      // 设置为当前素材库
      try {
        await libraryStore.setCurrentLibrary(librarys[0])
        await this.setTabScope(selectedLibraryId)
      } catch (error) {
        // 设置当前素材库失败，忽略
      }

      return selectedLibraryId
    }

    return null
  }


  /**
   * 加载文件夹结构
   */
  private async loadFolderStructure(libraryId: string): Promise<void> {
    try {
      const folderStore = useFolderStore()
      const result = await folderStore.fetchFolders(libraryId)
      if (result.success) {
        // folders loaded
      } else {
        // Failed to load folders
      }
    } catch (error) {
      // Error loading folders
    }
  }

  /**
   * 加载标签列表
   */
  private async loadTagList(libraryId: string): Promise<void> {
    try {
      const tagStore = useTagStore()
      const result = await tagStore.fetchTags(libraryId)
      if (result.success) {
        // tags loaded
      } else {
        // Failed to load tags
      }
    } catch (error) {
      // Error loading tags
    }
  }

  /**
   * 检查是否需要重新初始化
   * 比如用户切换了素材库、登录状态改变等
   */
  public shouldReinitialize(
    currentLibraryId?: string,
    isAuthenticated: boolean = true
  ): boolean {
    if (!isAuthenticated) {
      return true
    }

    const libraryStore = useLibraryStore()

    // 如果当前素材库与存储中的当前素材库不一致
    if (currentLibraryId !== libraryStore.currentLibrary?.id) {
      return true
    }

    // 如果素材库数据为空
    if (libraryStore.libraries.length === 0) {
      return true
    }

    return false
  }

  /**
   * 强制重新初始化
   * 忽略缓存，重新加载所有数据
   */
  public async forceReinitialize(): Promise<{success: boolean, error?: string}> {
    this.lastInitializationTime = null
    this.isInitializing = false
    return this.initializeHomeView()
  }

  /**
   * 执行完整的初始化流程
   * @param updateMessage 更新消息的回调函数
   * @returns Promise<{success: boolean, error?: string}>
   */
  public async performInitialization(updateMessage?: (message: string) => void): Promise<{success: boolean, error?: string}> {
    try {
      // 步骤 1: 加载素材库列表
      updateMessage?.(t('services.initialization.loadingLibraryList'))

      const { useServerListStore } = await import('../stores/serverList')
      const serverListStore = useServerListStore()

      await serverListStore.initializeServerList()

      // 检查是否有活跃的素材库
      const activeLibrary = serverListStore.activeServer
      if (!activeLibrary) {
        return { success: false, error: t('services.initialization.noPreviousLibrary') }
      }

      // 步骤 2: 连接服务器
      updateMessage?.(t('services.initialization.connectingTo', { name: activeLibrary.name }))

      // 使用SDK服务直接连接
      const { miraSDKService } = await import('../services/MiraSDKService')

      // 构建完整的连接配置，同时支持token和用户名密码
      const connectionConfig = {
        serverUrl: activeLibrary.serverUrl,
        websocketUrl: activeLibrary.websocketUrl,
        timeout: 30000,
        ...(activeLibrary.authToken && { apiKey: activeLibrary.authToken }),
        ...(activeLibrary.savedCredentials && {
          username: activeLibrary.savedCredentials.username,
          password: activeLibrary.savedCredentials.encryptedPassword // 实际使用时需要解密
        })
      }

      let connectResult = await miraSDKService.connect(connectionConfig)

      // 如果token认证失败但有保存的凭据，尝试用用户名密码重新连接
      if (!connectResult.success && activeLibrary.authToken && activeLibrary.savedCredentials) {
        updateMessage?.(t('services.initialization.reconnectingWithCredentials', { name: activeLibrary.name }))

        const credentialConfig = {
          serverUrl: activeLibrary.serverUrl,
          websocketUrl: activeLibrary.websocketUrl,
          timeout: 30000,
          username: activeLibrary.savedCredentials.username,
          password: activeLibrary.savedCredentials.encryptedPassword // 实际使用时需要解密
        }

        connectResult = await miraSDKService.connect(credentialConfig)
      }

      if (!connectResult.success) {
        const errorMessage = connectResult.message || t('services.initialization.connectFailed')
        return { success: false, error: errorMessage }
      }

      // 步骤 3: 验证身份
      updateMessage?.(t('services.initialization.verifyingIdentity'))

      const authStore = useAuthStore()
      await authStore.initializeAuthAfterConnection()

      // 步骤 4: 完成
      updateMessage?.(t('services.initialization.initComplete'))

      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('services.initialization.initFailed')
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 连接到服务器
   * @param initState 初始化状态管理器
   * @returns Promise<{success: boolean, error?: string}>
   */
  private async connectToServer(initState: any): Promise<{success: boolean, error?: string}> {
    try {
      const { useServerListStore } = await import('../stores/serverList')
      const serverListStore = useServerListStore()

      // 加载素材库列表
      await serverListStore.initializeServerList()

      // 检查是否有活跃的素材库
      const activeLibrary = serverListStore.activeServer
      if (!activeLibrary) {
        return { success: false, error: t('services.initialization.noPreviousLibrary') }
      }

      initState.updateMessage?.(t('services.initialization.connectingTo', { name: activeLibrary.name }))

      // 使用SDK服务直接连接
      const { miraSDKService } = await import('../services/MiraSDKService')

      // 构建完整的连接配置，同时支持token和用户名密码
      const connectionConfig = {
        serverUrl: activeLibrary.serverUrl,
        websocketUrl: activeLibrary.websocketUrl,
        timeout: 30000,
        ...(activeLibrary.authToken && { apiKey: activeLibrary.authToken }),
        ...(activeLibrary.savedCredentials && {
          username: activeLibrary.savedCredentials.username,
          password: activeLibrary.savedCredentials.encryptedPassword // 实际使用时需要解密
        })
      }

      let connectResult = await miraSDKService.connect(connectionConfig)

      // 如果token认证失败但有保存的凭据，尝试用用户名密码重新连接
      if (!connectResult.success && activeLibrary.authToken && activeLibrary.savedCredentials) {
        initState.updateMessage?.(t('services.initialization.reconnectingWithCredentials', { name: activeLibrary.name }))

        const credentialConfig = {
          serverUrl: activeLibrary.serverUrl,
          websocketUrl: activeLibrary.websocketUrl,
          timeout: 30000,
          username: activeLibrary.savedCredentials.username,
          password: activeLibrary.savedCredentials.encryptedPassword // 实际使用时需要解密
        }

        connectResult = await miraSDKService.connect(credentialConfig)
      }

      if (!connectResult.success) {
        const errorMessage = connectResult.message || t('services.initialization.connectFailed')
        return { success: false, error: errorMessage }
      }

      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('services.initialization.connectServerFailed')
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 清理初始化状态
   * 用户登出时调用
   */
  public async cleanup(): Promise<void> {
    try {
      const libraryStore = useLibraryStore()
      const mediaStore = useMediaStore()
      const folderStore = useFolderStore()
      const tagStore = useTagStore()

      // 重置初始化状态
      this.isInitializing = false
      this.lastInitializationTime = null

      // 清理当前选择的素材库
      libraryStore.currentLibrary = null

      // 清理媒体数据
      mediaStore.filesMap = {}  // 清除所有 tab 的文件数据
      mediaStore.currentTabId = ''  // 清除当前 tab ID
      mediaStore.currentFile = null
      mediaStore.deselectAllFiles()
      mediaStore.setSearchQuery('')
      mediaStore.setFilterType('')

      // 清理文件夹数据
      folderStore.cleanup()

      // 清理标签数据
      tagStore.cleanup()
    } catch (error) {
      // cleanup failed silently
    }
  }
}

// 导出单例实例
export const initializationService = InitializationService.getInstance()
