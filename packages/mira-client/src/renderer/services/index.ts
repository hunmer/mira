// 服务层统一导出
// 集中管理所有服务模块

import { miraSDKService } from './MiraSDKService'
import { electronService } from './ElectronService'
import type { MoveFileResponse } from 'mira-app-core/shared/sdk'
import type {
  MiraConnectionConfig,
  LoginCredentials,
  UserInfo,
  FileInfo,
  LibraryInfo,
  PluginInfo,
  SystemInfo,
  SystemHealth,
  BaseResponse
} from '../../shared/types'

/**
 * 统一的应用服务接口
 * 自动检测环境并选择合适的实现方式
 */
export class AppService {
  /**
   * 检查是否在 Electron 环境中
   */
  get isElectron(): boolean {
    return electronService.isElectron()
  }

  /**
   * 获取平台信息
   */
  get platform(): string {
    return electronService.getPlatform()
  }

  /**
   * Mira 连接管理
   * 优先使用直接的 SDK 连接，支持 web 端
   */
  async connect(config: MiraConnectionConfig): Promise<BaseResponse> {
    return await miraSDKService.connect(config)
  }

  async disconnect(): Promise<BaseResponse> {
    return await miraSDKService.disconnect()
  }

  async testConnection(): Promise<BaseResponse> {
    return await miraSDKService.testConnection()
  }

  get isConnected(): boolean {
    return miraSDKService.isClientConnected()
  }

  /**
   * 认证相关
   */
  async login(credentials: LoginCredentials): Promise<UserInfo> {
    const result = await miraSDKService.login(credentials)
    return result.user
  }

  async register(userData: { 
    username: string; 
    password: string; 
    email?: string; 
    realName?: string 
  }): Promise<UserInfo> {
    return await miraSDKService.register(userData)
  }

  async logout(): Promise<BaseResponse> {
    return await miraSDKService.logout()
  }

  async getCurrentUser(): Promise<UserInfo> {
    return await miraSDKService.getCurrentUser()
  }

  /**
   * 文件操作
   */
  async listFiles(libraryId?: string, filters?: any): Promise<{ files: FileInfo[], total: number, limit: number, offset: number }> {
    if (!libraryId) {
      throw new Error('Library ID is required')
    }
    return await miraSDKService.listFiles(libraryId, filters)
  }

  async uploadFile(file: File, libraryId: string, metadata?: any): Promise<BaseResponse> {
    return await miraSDKService.uploadFile(file, libraryId, metadata)
  }

  async downloadFile(libraryId: string, fileId: string): Promise<Blob> {
    return await miraSDKService.downloadFile(libraryId, fileId)
  }

  async moveFile(sourceLibraryId: string, targetLibraryId: string, fileId: string | number): Promise<MoveFileResponse> {
    return await miraSDKService.moveFile(sourceLibraryId, targetLibraryId, fileId)
  }

  async writeFile(
    libraryId: string,
    fileId: string,
    content: Blob | string | ArrayBuffer,
    options?: { name?: string; contentType?: string }
  ): Promise<any> {
    return await miraSDKService.writeFile(libraryId, fileId, content, options)
  }

  async deleteFile(libraryId: string, fileId: string, moveToRecycleBin: boolean = true): Promise<BaseResponse> {
    return await miraSDKService.deleteFile(libraryId, fileId, moveToRecycleBin)
  }

  async batchDeleteFiles(
    libraryId: string,
    fileIds: (string | number)[],
    moveToRecycleBin: boolean = true
  ): Promise<{ success: boolean; message: string; deletedCount: number; deletedIds: number[]; failedIds: number[] }> {
    return await miraSDKService.batchDeleteFiles(libraryId, fileIds, moveToRecycleBin)
  }

  async restoreFile(libraryId: string, fileId: string): Promise<BaseResponse> {
    return await miraSDKService.restoreFile(libraryId, fileId)
  }

  async batchRestoreFiles(
    libraryId: string,
    fileIds: (string | number)[]
  ): Promise<{ success: boolean; message: string; recoveredCount: number; recoveredIds: number[]; failedIds: number[] }> {
    return await miraSDKService.batchRestoreFiles(libraryId, fileIds)
  }

  /**
   * 库管理
   */
  async getLibraries(): Promise<LibraryInfo[]> {
    return await miraSDKService.getLibraries()
  }

  async createLibrary(name: string, description?: string): Promise<LibraryInfo> {
    return await miraSDKService.createLibrary(name, description)
  }

  async addToLibrary(fileId: string, libraryId: string): Promise<BaseResponse> {
    // TODO: Implement addToLibrary in MiraSDKService
    console.warn('addToLibrary not implemented yet', { fileId, libraryId })
    return { success: false, message: 'Not implemented' }
  }

  /**
   * 插件管理
   */
  async getPlugins(): Promise<PluginInfo[]> {
    // TODO: Implement getPlugins in MiraSDKService
    console.warn('getPlugins not implemented yet')
    return []
  }

  async installPlugin(pluginId: string): Promise<BaseResponse> {
    // TODO: Implement installPlugin in MiraSDKService
    console.warn('installPlugin not implemented yet', { pluginId })
    return { success: false, message: 'Not implemented' }
  }

  async uninstallPlugin(pluginId: string): Promise<BaseResponse> {
    // TODO: Implement uninstallPlugin in MiraSDKService
    console.warn('uninstallPlugin not implemented yet', { pluginId })
    return { success: false, message: 'Not implemented' }
  }

  async executePlugin(pluginId: string, args: any): Promise<any> {
    // TODO: Implement executePlugin in MiraSDKService
    console.warn('executePlugin not implemented yet', { pluginId, args })
    return { success: false, message: 'Not implemented' }
  }

  /**
   * 系统信息
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return await miraSDKService.getSystemInfo()
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return await miraSDKService.getSystemHealth()
  }

  /**
   * 系统级别的操作（仅 Electron）
   */
  
  /**
   * 剪切板操作
   */
  async writeToClipboard(text: string): Promise<void> {
    return await electronService.writeToClipboard(text)
  }

  async readFromClipboard(): Promise<string> {
    return await electronService.readFromClipboard()
  }

  /**
   * 文件对话框（仅 Electron）
   */
  async showOpenDialog(options?: any): Promise<any> {
    return await electronService.showOpenDialog(options)
  }

  async showSaveDialog(options?: any): Promise<any> {
    return await electronService.showSaveDialog(options)
  }

  /**
   * 窗口管理（仅 Electron）
   */
  async minimizeWindow(): Promise<void> {
    return await electronService.minimizeWindow()
  }

  async maximizeWindow(): Promise<void> {
    return await electronService.maximizeWindow()
  }

  async toggleWindowSize(): Promise<void> {
    return await electronService.toggleWindowSize()
  }

  async closeWindow(): Promise<void> {
    return await electronService.closeWindow()
  }

  async setFullScreen(flag: boolean): Promise<void> {
    return await electronService.setFullScreen(flag)
  }

  /**
   * 应用程序控制
   */
  async quitApp(): Promise<void> {
    return await electronService.quitApp()
  }

  async getAppVersion(): Promise<string> {
    return await electronService.getAppVersion()
  }

  /**
   * 事件管理
   */
  on(channel: string, callback: (...args: any[]) => void): void {
    electronService.on(channel, callback)
  }

  removeAllListeners(channel: string): void {
    electronService.removeAllListeners(channel)
  }

  send(channel: string, ...args: any[]): void {
    electronService.send(channel, ...args)
  }

  /**
   * 直接调用主进程方法（仅 Electron）
   */
  async invoke(channel: string, ...args: any[]): Promise<any> {
    return await electronService.invoke(channel, ...args)
  }
}

// 创建单例实例
export const appService = new AppService()

// 为了兼容性，也导出原有的服务
export { electronService } from './ElectronService'
export { miraSDKService } from './MiraSDKService'

// 服务配置
export const SERVICE_CONFIG = {
  apiTimeout: 30000,
  retryAttempts: 3,
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
  maxFileSize: 100 * 1024 * 1024, // 100MB
  supportedFormats: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav'
  ]
}

// 服务状态枚举
export enum ServiceStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// 服务错误类型
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public service: string
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}
