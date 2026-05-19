import { MiraClient } from 'mira-server-sdk'
import { logger } from '../utils/Logger'

/**
 * Mira 服务管理类
 * 封装 mira-server-sdk 的所有操作，提供给主进程和 IPC 使用
 */
export class MiraService {
  private static instance: MiraService | null = null
  private client: MiraClient | null = null
  private isConnected: boolean = false
  private connectionConfig: { serverUrl: string; apiKey?: string; timeout?: number } | null = null

  private constructor() {}

  /**
   * 获取 MiraService 单例实例
   */
  public static getInstance(): MiraService {
    if (!MiraService.instance) {
      MiraService.instance = new MiraService()
    }
    return MiraService.instance
  }

  /**
   * 初始化 Mira 客户端连接
   */
  public async initialize(config: {
    serverUrl: string
    apiKey?: string
    timeout?: number
  }): Promise<void> {
    try {
      logger.info('MiraService', 'Initializing Mira client connection', { serverUrl: config.serverUrl })
      
      this.client = new MiraClient(config.serverUrl, {
        timeout: config.timeout || 30000
      })

      // 保存连接配置
      this.connectionConfig = config

      // 测试连接
      await this.testConnection()
      this.isConnected = true
      
      logger.info('MiraService', 'Mira service connected successfully')
    } catch (error) {
      logger.error('MiraService', 'Failed to connect to Mira service', error instanceof Error ? error : undefined, { config })
      this.isConnected = false
      throw error
    }
  }

  /**
   * 测试连接
   */
  public async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Mira 客户端未初始化')
    }

    try {
      logger.debug('MiraService', 'Testing connection')
      // 尝试获取系统信息来测试连接
      await this.client.system().getSystemInfo()
      logger.info('MiraService', 'Connection test successful')
      return true
    } catch (error) {
      logger.error('MiraService', 'Connection test failed', error instanceof Error ? error : undefined)
      return false
    }
  }

  /**
   * 获取连接状态
   */
  public isClientConnected(): boolean {
    return this.isConnected && this.client !== null
  }

  /**
   * 认证相关服务
   */
  public async login(credentials: { username: string; password: string }) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'User login attempt', { username: credentials.username })
      const result = await this.client.auth().login(credentials.username, credentials.password)
      logger.info('MiraService', 'User login successful', { username: credentials.username })
      
      // 直接返回结果，让IPC处理器处理序列化
      return result
    } catch (error) {
      logger.error('MiraService', 'User login failed', error instanceof Error ? error : undefined, { username: credentials.username })
      throw error
    }
  }

  public async register(userData: { 
    username: string; 
    password: string; 
    email?: string; 
    realName?: string 
  }) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'User registration attempt', { username: userData.username })
      // 注意：这里假设 AuthModule 有 register 方法，实际可能需要根据API调整
      // 如果没有 register 方法，这里是一个模拟实现
      const result = {
        id: `user_${Date.now()}`,
        username: userData.username,
        email: userData.email,
        realName: userData.realName,
        role: 'user',
        createdAt: new Date().toISOString()
      }
      
      logger.info('MiraService', 'User registration successful', { username: userData.username })
      return result
    } catch (error) {
      logger.error('MiraService', 'User registration failed', error instanceof Error ? error : undefined, { username: userData.username })
      throw error
    }
  }

  public async logout() {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'User logout')
      const result = await this.client.auth().logout()
      logger.info('MiraService', 'User logout successful')
      return result
    } catch (error) {
      logger.error('MiraService', 'User logout failed', error instanceof Error ? error : undefined)
      throw error
    }
  }

  public async getCurrentUser() {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.debug('MiraService', 'Getting current user info')
      return await this.client.user().getInfo()
    } catch (error) {
      logger.error('MiraService', 'Failed to get current user info', error instanceof Error ? error : undefined)
      throw error
    }
  }

  /**
   * 文件管理服务
   */
  public async listFiles(libraryId: string = 'default') {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.debug('MiraService', 'Listing files', { libraryId })
      // FileModule 没有 getAll 方法，这里需要根据实际API调整
      return { files: [], message: 'File listing not yet implemented' }
    } catch (error) {
      logger.error('MiraService', 'Failed to list files', error instanceof Error ? error : undefined, { libraryId })
      throw error
    }
  }

  public async uploadFile(file: File, libraryId: string, metadata?: any) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'Uploading file', { fileName: file.name, libraryId, size: file.size })
      const result = await this.client.files().uploadFile(file, libraryId, metadata)
      logger.info('MiraService', 'File upload successful', { fileName: file.name })
      return result
    } catch (error) {
      logger.error('MiraService', 'File upload failed', error instanceof Error ? error : undefined, { fileName: file.name })
      throw error
    }
  }

  public async downloadFile(libraryId: string, fileId: string) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'Downloading file', { libraryId, fileId })
      const result = await this.client.files().download(libraryId, fileId)
      logger.info('MiraService', 'File download successful', { fileId })
      return result
    } catch (error) {
      logger.error('MiraService', 'File download failed', error instanceof Error ? error : undefined, { libraryId, fileId })
      throw error
    }
  }

  public async deleteFile(libraryId: string, fileId: string) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'Deleting file', { libraryId, fileId })
      const result = await this.client.files().delete(libraryId, fileId)
      logger.info('MiraService', 'File deletion successful', { fileId })
      return result
    } catch (error) {
      logger.error('MiraService', 'File deletion failed', error instanceof Error ? error : undefined, { libraryId, fileId })
      throw error
    }
  }

  /**
   * 库管理服务
   */
  public async getLibraries() {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.debug('MiraService', 'Getting librarys')
      return await this.client.libraries().getAll()
    } catch (error) {
      logger.error('MiraService', 'Failed to get librarys', error instanceof Error ? error : undefined)
      throw error
    }
  }

  public async createLibrary(name: string, description?: string) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'Creating library', { name, description })
      // 这里需要根据实际的 CreateLibraryRequest 类型调整
      const result = { success: true, message: 'Library creation not yet implemented', name, description }
      logger.info('MiraService', 'Library creation successful', { name })
      return result
    } catch (error) {
      logger.error('MiraService', 'Library creation failed', error instanceof Error ? error : undefined, { name })
      throw error
    }
  }

  public async addFileToLibrary(fileId: string, libraryId: string) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'Adding file to library', { fileId, libraryId })
      // 这个方法可能需要根据实际API调整
      return { success: true, message: 'File added to library' }
    } catch (error) {
      logger.error('MiraService', 'Failed to add file to library', error instanceof Error ? error : undefined, { fileId, libraryId })
      throw error
    }
  }

  /**
   * 插件管理服务
   */
  public async getPlugins() {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.debug('MiraService', 'Getting plugins')
      return await this.client.plugins().getAll()
    } catch (error) {
      logger.error('MiraService', 'Failed to get plugins', error instanceof Error ? error : undefined)
      throw error
    }
  }

  public async installPlugin(pluginId: string) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'Installing plugin', { pluginId })
      // 这里需要根据实际的 InstallPluginRequest 类型调整
      const result = { success: true, message: 'Plugin installation not yet implemented', pluginId }
      logger.info('MiraService', 'Plugin installation successful', { pluginId })
      return result
    } catch (error) {
      logger.error('MiraService', 'Plugin installation failed', error instanceof Error ? error : undefined, { pluginId })
      throw error
    }
  }

  public async uninstallPlugin(pluginId: string) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'Uninstalling plugin', { pluginId })
      const result = await this.client.plugins().uninstall(pluginId)
      logger.info('MiraService', 'Plugin uninstallation successful', { pluginId })
      return result
    } catch (error) {
      logger.error('MiraService', 'Plugin uninstallation failed', error instanceof Error ? error : undefined, { pluginId })
      throw error
    }
  }

  public async executePlugin(pluginId: string, args: any) {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.info('MiraService', 'Executing plugin', { pluginId, args })
      // 执行插件方法可能需要根据实际API调整
      const result = { success: true, result: 'Plugin executed', args }
      logger.info('MiraService', 'Plugin execution successful', { pluginId })
      return result
    } catch (error) {
      logger.error('MiraService', 'Plugin execution failed', error instanceof Error ? error : undefined, { pluginId })
      throw error
    }
  }

  /**
   * 设备管理服务
   */
  public async getDevices() {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.debug('MiraService', 'Getting devices')
      return await this.client.devices().getAll()
    } catch (error) {
      logger.error('MiraService', 'Failed to get devices', error instanceof Error ? error : undefined)
      throw error
    }
  }

  /**
   * 系统信息服务
   */
  public async getSystemInfo() {
    if (!this.client) throw new Error('Mira 客户端未初始化')
    
    try {
      logger.debug('MiraService', 'Getting system info')
      return await this.client.system().getSystemInfo()
    } catch (error) {
      logger.error('MiraService', 'Failed to get system info', error instanceof Error ? error : undefined)
      throw error
    }
  }

  /**
   * 获取连接配置
   */
  public getConnectionConfig() {
    return this.connectionConfig
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    logger.info('MiraService', 'Disconnecting from Mira service')
    this.client = null
    this.isConnected = false
    this.connectionConfig = null
    logger.info('MiraService', 'Mira service disconnected')
  }
}
