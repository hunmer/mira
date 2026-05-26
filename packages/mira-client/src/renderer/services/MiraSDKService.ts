import { MiraClient } from 'mira-server-sdk'
import { initializeWebSocket, webSocketService } from './WebSocketService'
import { useMediaStore } from '../stores/media'
import { useAuthStore } from '../stores/auth'
import { toFileUrl } from '../utils/fileUtils'

/** 给 HTTP 资源 URL 追加 token 参数（用于 <img>/<video> 等无法设 header 的场景） */
function appendToken(url: string | undefined): string | undefined {
  if (!url) return url
  if (!url.startsWith('http')) return url
  const token = useAuthStore().token
  if (!token) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}token=${encodeURIComponent(token)}`
}
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
 * 类型转换适配器
 */
class TypeAdapter {
  static convertUserInfo(sdkUser: any): UserInfo {
    return {
      id: sdkUser?.id?.toString() || 'unknown',
      username: sdkUser?.username || 'unknown',
      realName: sdkUser?.realName,
      email: sdkUser?.email,
      avatar: sdkUser?.avatar,
      role: sdkUser?.role
    }
  }

  static convertSystemInfo(sdkInfo: any): SystemInfo {
    return {
      version: sdkInfo?.version || '1.0.0',
      platform: sdkInfo?.platform || (typeof window !== 'undefined' ? 'web' : 'unknown'),
      arch: sdkInfo?.arch || 'unknown',
      nodeVersion: sdkInfo?.nodeVersion || 'unknown',
      uptime: sdkInfo?.uptime || 0,
      memory: {
        total: sdkInfo?.memory?.total || 8000000000,
        used: sdkInfo?.memory?.used || 4000000000,
        available: sdkInfo?.memory?.available || 4000000000
      },
      disk: {
        total: 500000000000,
        used: 250000000000,
        available: 250000000000
      }
    }
  }

  static convertPluginInfo(sdkPlugin: any): PluginInfo {
    return {
      id: sdkPlugin?.id || 'unknown',
      name: sdkPlugin?.name || 'Unknown Plugin',
      version: sdkPlugin?.version || '1.0.0',
      description: sdkPlugin?.description,
      longDescription: sdkPlugin?.longDescription,
      author: sdkPlugin?.author,
      homepage: sdkPlugin?.homepage,
      installed: true, // 假设从 getAll 返回的都是已安装的
      enabled: sdkPlugin?.enabled !== false,
      installedAt: sdkPlugin?.installedAt,
      category: sdkPlugin?.category,
      tags: sdkPlugin?.tags,
      image: sdkPlugin?.image,
      rating: sdkPlugin?.rating,
      downloads: sdkPlugin?.downloads,
      fileSize: sdkPlugin?.fileSize,
      features: sdkPlugin?.features,
      requirements: sdkPlugin?.requirements,
      changelog: sdkPlugin?.changelog,
      screenshots: sdkPlugin?.screenshots
    }
  }

  static normalizeBaseResponse(sdkResponse: any): BaseResponse {
    return {
      success: sdkResponse?.success !== false,
      message: sdkResponse?.message || 'Operation completed',
      data: sdkResponse?.data
    }
  }
}

/**
 * Mira SDK 服务封装类
 * 直接使用 mira-server-sdk，支持 web 端和 Electron 端
 */
export class MiraSDKService {
  private client: MiraClient | null = null
  private isConnected: boolean = false
  private connectionConfig: MiraConnectionConfig | null = null
  private _pendingWebsocketUrl?: string

  /**
   * 连接到 Mira 服务器
   */
  async connect(config: MiraConnectionConfig): Promise<BaseResponse> {
    try {
      console.log('MiraSDKService: Connecting to Mira server', { serverUrl: config.serverUrl })

      const authStore = useAuthStore()

      this.client = new MiraClient(config.serverUrl, {
        timeout: config.timeout || 30000,
        getToken: () => authStore.token ?? undefined
      })

      // 保存连接配置
      this.connectionConfig = config

      // 测试连接
      await this.client.system().getSystemInfo()
      this.isConnected = true

      // WebSocket 初始化延迟到 library 加载后执行（见 initializeHomeView）
      this._pendingWebsocketUrl = config.websocketUrl

      console.log('MiraSDKService: Connected successfully')
      return { success: true, message: 'Connected to Mira server' }
    } catch (error) {
      console.error('MiraSDKService: Connection failed', error)
      this.isConnected = false
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  }

  /**
   * 在 library 加载完成后初始化 WebSocket（由 InitializationService 调用）
   */
  async initWebSocketForLibrary(libraryId: string): Promise<void> {
    const wsUrl = this._pendingWebsocketUrl
    if (!wsUrl) {
      console.log('MiraSDKService: No websocketUrl, skipping WebSocket init')
      return
    }
    try {
      await this.initializeWebSocket(wsUrl, libraryId)
    } catch (error) {
      console.warn('MiraSDKService: WebSocket init failed (non-fatal)', error)
    }
  }

  /**
   * 初始化WebSocket连接
   */
  async initializeWebSocket(websocketUrl: string, libraryId: string): Promise<boolean> {
    try {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      const connected = await initializeWebSocket({
        url: websocketUrl,
        clientId,
        libraryId
      })

      if (connected) {
        console.log('MiraSDKService: WebSocket connected successfully')
      } else {
        console.error('MiraSDKService: Failed to connect WebSocket')
      }

      return connected
    } catch (error) {
      console.error('MiraSDKService: WebSocket initialization failed', error)
      return false
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnectWebSocket(): void {
    webSocketService.disconnect()
  }

  /**
   * 获取WebSocket连接状态
   */
  get isWebSocketConnected(): boolean {
    return webSocketService.isConnected.value
  }

  /**
   * 创建标签
   */
  async createTag(
    libraryId: string,
    name: string,
    color?: number,
    description?: string
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Creating tag', { libraryId, name, color, description })
      const result = await this.client.tags().create({
        libraryId,
        title: name,
        color,
        description
      })
      console.log('MiraSDKService: Tag created successfully', result)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to create tag', error)
      throw error
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(libraryId: string, tagId: number): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Deleting tag', { libraryId, tagId })
      const result = await this.client.tags().delete({ libraryId, id: tagId })
      console.log('MiraSDKService: Tag deleted successfully', result)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to delete tag', error)
      throw error
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<BaseResponse> {
    try {
      this.disconnectWebSocket()
      this.client = null
      this.isConnected = false
      this.connectionConfig = null

      console.log('MiraSDKService: Disconnected')
      return { success: true, message: 'Disconnected from Mira server' }
    } catch (error) {
      console.error('MiraSDKService: Disconnect failed', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Disconnect failed' 
      }
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<BaseResponse> {
    if (!this.client) {
      return { success: false, message: 'Not connected to Mira server' }
    }

    try {
      await this.client.system().getSystemInfo()
      return { success: true, message: 'Connection test successful' }
    } catch (error) {
      console.error('MiraSDKService: Connection test failed', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      }
    }
  }

  /**
   * 获取连接状态
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null
  }

  /**
   * 辅助方法：从文件名提取扩展名
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.')
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : ''
  }

  /**
   * 辅助方法：根据扩展名获取 MIME 类型
   */
  private getMimeTypeFromExtension(fileName: string): string {
    const extension = this.getFileExtension(fileName)
    const mimeTypeMap: { [key: string]: string } = {
      // 图片
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
      
      // 视频
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      
      // 音频
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'flac': 'audio/flac',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg',
      
      // 文档
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // 文本
      'txt': 'text/plain',
      'json': 'application/json',
      'xml': 'application/xml',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      
      // 压缩文件
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip'
    }
    
    return mimeTypeMap[extension] || 'application/octet-stream'
  }

  /**
   * 认证相关
   */
  async login(credentials: LoginCredentials): Promise<{user: UserInfo, token: string}> {
    if (!this.client) throw new Error('Not connected to Mira server')
    
    try {
      console.log('MiraSDKService: User login attempt', { username: credentials.username })
      const loginResult = await this.client.auth().login(credentials.username, credentials.password)
      console.log('MiraSDKService: Login successful, got token:', !!loginResult.accessToken)
      
      // 获取用户信息
      const verifyResult = await this.client.auth().verify()
      const userInfo = TypeAdapter.convertUserInfo(verifyResult.user)
      
      return {
        user: userInfo,
        token: loginResult.accessToken
      }
    } catch (error) {
      console.error('MiraSDKService: Login failed', error)
      throw error
    }
  }

  async register(userData: {
    username: string;
    password: string;
    email?: string;
    realName?: string
  }): Promise<UserInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: User registration attempt', { username: userData.username })
      const result = await this.client.auth().register(userData.username, userData.password)

      // 转换为我们的 UserInfo 类型
      const userInfo: UserInfo = {
        id: result.data?.id?.toString() || `user_${Date.now()}`,
        username: userData.username,
        email: userData.email,
        realName: userData.realName,
        role: 'user'
      }

      console.log('MiraSDKService: Registration successful')
      return userInfo
    } catch (error) {
      console.error('MiraSDKService: Registration failed', error)
      throw error
    }
  }

  async logout(): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')
    
    try {
      console.log('MiraSDKService: User logout')
      const result = await this.client.auth().logout()
      console.log('MiraSDKService: Logout successful')
      return TypeAdapter.normalizeBaseResponse(result)
    } catch (error) {
      console.error('MiraSDKService: Logout failed', error)
      throw error
    }
  }

  async getCurrentUser(): Promise<UserInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')
    
    try {
      const result = await this.client.user().getInfo()
      return TypeAdapter.convertUserInfo(result)
    } catch (error) {
      console.error('MiraSDKService: Failed to get current user', error)
      throw error
    }
  }

  /**
   * 文件操作
   */
  async listFiles(
    libraryId: string,
    filters?: {
      title?: string;
      extension?: string;
      tags?: string[] | null;
      folder?: number;
      size_min?: number;
      size_max?: number;
      created_after?: string;
      created_before?: string;
      recycled?: number;
      sort?: string;
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
      category?: string; // 媒体类别：video, audio, image
    }
  ): Promise<{ files: FileInfo[], total: number, limit: number, offset: number }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const requestFilters = filters
        ? Object.fromEntries(
            Object.entries(filters).filter(([, value]) =>
              value !== null &&
              value !== undefined &&
              !(typeof value === 'number' && !Number.isFinite(value))
            )
          )
        : undefined

      console.log('MiraSDKService: Listing files', { libraryId, filters: requestFilters })

      // 获取素材库配置以检查 SMB 设置
      const { useServerListStore } = await import('../stores/serverList')
      const serverListStore = useServerListStore()
      const ServerConfig = serverListStore.activeServer

      // 使用 SDK 的文件模块获取文件列表
      let files: any;
      if (requestFilters && Object.keys(requestFilters).length > 0) {
        // 清理 null/undefined 值
        const cleanedFilters = Object.fromEntries(
          Object.entries(requestFilters).filter(([, v]) =>
            v !== null &&
            v !== undefined &&
            !(typeof v === 'number' && !Number.isFinite(v))
          )
        )
        // 使用带过滤器的方法
        files = await (this.client.files() as any).getFiles({
          libraryId,
          filters: cleanedFilters,
          clientId: webSocketService.getClientId()
        })
      } else {
        // 使用获取所有文件的方法
        files = await (this.client.files() as any).getFiles({
          libraryId,
          clientId: webSocketService.getClientId()
        })
      }
      // 转换为 FileInfo 类型
      const fileInfos: FileInfo[] = files.result.map((file: any) => {
        let filePath = file.path
        let thumbnailPath = file.thumb
        let localFilePath: string | undefined

        // 如果启用了 SMB，从文件元数据构建本地路径
        if (ServerConfig?.smb?.enabled && ServerConfig.smb.smbPath) {
          const smbPath = ServerConfig.smb.smbPath
          const sep = smbPath.includes('/') ? '/' : '\\'
          const normalizedSmbPath = smbPath.endsWith(sep) ? smbPath : smbPath + sep

          // 文件本地路径: smbPath/folder_name/name
          if (file.folder_name && file.name) {
            localFilePath = normalizedSmbPath + file.folder_name + sep + file.name
          }

          // 缩略图本地路径: smbPath/thumbs/{hash|id}.png
          const thumbFileName = file.hash ? `${file.hash}.png` : `${file.id}.png`
          thumbnailPath = normalizedSmbPath + 'thumbs' + sep + thumbFileName
        }

        return {
          id: file.id.toString(),
          name: file.name, // 使用 name 字段
          path: appendToken(toFileUrl(filePath)),
          size: file.size,
          extension: file.extension || this.getFileExtension(file.name), // 从文件名提取扩展名
          mimeType: file.mime_type || this.getMimeTypeFromExtension(file.name),
          createdAt: file.created_at,
          updatedAt: file.updated_at || file.imported_at || file.created_at,
          tags: typeof file.tags === 'string' ? JSON.parse(file.tags || '[]') : (file.tags || []),
          folderId: file.folder_id?.toString(),
          hash: file.hash || '',
          thumbnailPath: appendToken(toFileUrl(thumbnailPath)),
          libraryId: libraryId, // 添加 libraryId 到 fileInfo
          localFile: localFilePath || file.localFile || (() => {
            // 如果SMB未启用或构建失败，尝试从mediaStore获取
            try {
              const mediaStore = useMediaStore()
              return mediaStore.getLocalFile(libraryId, file.id.toString())
            } catch (error) {
              console.warn('从mediaStore获取localFile失败:', error)
              return undefined
            }
          })()
        }
      })
      
      console.log(`MiraSDKService: Found ${fileInfos.length} files`)

      // 发布HTTP请求成功事件
      this.emitHttpEvent('api/files/getFiles', 'success', {
        libraryId,
        filters,
        data: fileInfos,
        fileCount: fileInfos.length,
        total: files.total || fileInfos.length,
        timestamp: new Date().toISOString()
      })

      // 返回完整的分页信息
      const result = {
        files: fileInfos,
        total: files.total || fileInfos.length,
        limit: files.limit || filters?.limit || 999,
        offset: files.offset || filters?.offset || 0
      }

      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to list files', error)
      throw error
    }
  }

  /**
   * 获取单个文件信息
   */
  async getFile(libraryId: string, fileId: string | number): Promise<FileInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Getting file', { libraryId, fileId })
      
      // 使用 SDK 的文件模块获取单个文件信息
      const file = await (this.client.files() as any).getFile(libraryId, fileId, webSocketService.getClientId())
      
      // 转换为 FileInfo 类型
      const fileInfo: FileInfo = {
        id: file.id.toString(),
        name: file.title || file.name, // 优先使用 title，如果没有则使用 name
        path: appendToken(toFileUrl(file.path)),
        size: file.size,
        extension: file.extension || this.getFileExtension(file.title || file.name),
        mimeType: file.mime_type || this.getMimeTypeFromExtension(file.title || file.name),
        createdAt: file.created_at,
        updatedAt: file.updated_at || file.imported_at || file.created_at,
        tags: typeof file.tags === 'string' ? JSON.parse(file.tags || '[]') : (file.tags || []),
        folderId: file.folder_id?.toString(),
        hash: file.hash || '',
        thumbnailPath: appendToken(toFileUrl(file.thumbnail_path)),
        libraryId: libraryId
      }
      
      console.log('MiraSDKService: File retrieved successfully', fileInfo)
      return fileInfo
    } catch (error) {
      console.error('MiraSDKService: Failed to get file', error)
      throw error
    }
  }

  async uploadFile(file: File, libraryId: string, metadata?: any): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')
    
    try {
      console.log('MiraSDKService: Uploading file', { fileName: file.name, libraryId })
      const result = await this.client.files().uploadFile(file, libraryId, metadata)
      console.log('MiraSDKService: File upload successful')
      return TypeAdapter.normalizeBaseResponse(result)
    } catch (error) {
      console.error('MiraSDKService: File upload failed', error)
      throw error
    }
  }

  async downloadFile(libraryId: string, fileId: string): Promise<Blob> {
    if (!this.client) throw new Error('Not connected to Mira server')
    
    try {
      console.log('MiraSDKService: Downloading file', { libraryId, fileId })
      const result = await this.client.files().download(libraryId, fileId)
      console.log('MiraSDKService: File download successful')
      return result
    } catch (error) {
      console.error('MiraSDKService: File download failed', error)
      throw error
    }
  }

  async deleteFile(libraryId: string, fileId: string, moveToRecycleBin: boolean = true): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Deleting file', { libraryId, fileId, moveToRecycleBin })
      const result = await this.client.files().delete(libraryId, fileId, { moveToRecycleBin })
      console.log('MiraSDKService: File deletion successful')
      return TypeAdapter.normalizeBaseResponse(result)
    } catch (error) {
      console.error('MiraSDKService: File deletion failed', error)
      throw error
    }
  }

  async emptyTrash(libraryId: string): Promise<{ success: boolean; deletedCount: number; errors?: string[] }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Emptying trash', { libraryId })
      const result = await this.client.files().emptyTrash(libraryId)
      console.log('MiraSDKService: Trash emptied', result)
      return result
    } catch (error) {
      console.error('MiraSDKService: Empty trash failed', error)
      throw error
    }
  }


  /**
   * 库管理
   */
  async getLibraries(): Promise<LibraryInfo[]> {
    if (!this.client) throw new Error('Not connected to Mira server')
    
    try {
      return await this.client.libraries().getAll()
    } catch (error) {
      console.error('MiraSDKService: Failed to get librarys', error)
      throw error
    }
  }

  async createLibrary(name: string, description?: string): Promise<LibraryInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Creating library', { name })
      await this.client.libraries().createLocal(
        name,
        '', // path - 需要根据实际需求设置
        description || '',
        { type: 'local' }
      )

      // 转换为 LibraryInfo 类型
      const libraryInfo: LibraryInfo = {
        id: `library_${Date.now()}`,
        name,
        description,
        type: 'user',
        path: '',
        fileCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      console.log('MiraSDKService: Library created successfully')
      return libraryInfo
    } catch (error) {
      console.error('MiraSDKService: Library creation failed', error)
      throw error
    }
  }
  /**
   * 系统信息
   */
  async getSystemInfo(): Promise<SystemInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')
    
    try {
      const result = await this.client.system().getSystemInfo()
      return TypeAdapter.convertSystemInfo(result)
    } catch (error) {
      console.error('MiraSDKService: Failed to get system info', error)
      throw error
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const health = await this.client.system().getHealth()
      return {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        dashboardPort: (health as any).dashboardPort || 5173,
      }
    } catch (error) {
      console.error('MiraSDKService: Failed to get system health', error)
      return {
        status: 'error' as const,
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * 获取当前连接配置
   */
  getConnectionConfig(): MiraConnectionConfig | null {
    return this.connectionConfig
  }

  /**
   * 文件夹操作
   */

  /**
   * 获取所有文件夹
   */
  async getAllFolders(libraryId: string): Promise<any[]> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Getting all folders', { libraryId })
      const folders = await this.client.folders().getAll(libraryId)
      console.log(`MiraSDKService: Found ${folders.length} folders`)
      return folders
    } catch (error) {
      console.error('MiraSDKService: Failed to get folders', error)
      throw error
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(
    libraryId: string,
    title: string,
    parentId?: number,
    color?: number,
    description?: string
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Creating folder', { libraryId, title, parentId, color, description })
      const result = await this.client.folders().createFolder(libraryId, title, parentId, color, description)
      console.log('MiraSDKService: Folder created successfully', result)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to create folder', error)
      throw error
    }
  }

  /**
   * 更新文件夹
   */
  async updateFolder(
    libraryId: string,
    folderId: number,
    updates: {
      title?: string;
      color?: number;
      description?: string;
      parent_id?: number;
    }
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Updating folder', { libraryId, folderId, updates })
      const result = await this.client.folders().updateFolder(libraryId, folderId, updates)
      console.log('MiraSDKService: Folder updated successfully', result)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to update folder', error)
      throw error
    }
  }

  /**
   * 删除文件夹
   * @param deleteFiles 是否同时删除文件夹内的文件（默认 false，文件移至未分类）
   */
  async deleteFolder(libraryId: string, folderId: number, deleteFiles?: boolean): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Deleting folder', { libraryId, folderId, deleteFiles })
      const result = await this.client.folders().deleteFolder(libraryId, folderId, deleteFiles)
      console.log('MiraSDKService: Folder deleted successfully', result)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to delete folder', error)
      throw error
    }
  }

  /**
   * 移动文件夹
   */
  async moveFolder(
    libraryId: string,
    folderId: number,
    newParentId: number | null
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Moving folder', { libraryId, folderId, newParentId })

      // 构建更新数据，正确处理null值
      const updateData: any = {}
      if (newParentId === null) {
        // 明确设置为null表示移动到根级别
        updateData.parent_id = null
      } else if (newParentId !== undefined) {
        // 设置具体的父级ID
        updateData.parent_id = newParentId
      }

      console.log('MiraSDKService: Update data', updateData)
      const result = await this.client.folders().updateFolder(libraryId, folderId, updateData)
      console.log('MiraSDKService: Folder moved successfully', result)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to move folder', error)
      throw error
    }
  }

  /**
   * 克隆文件夹
   */
  async cloneFolder(
    libraryId: string,
    folderId: number,
    newTitle?: string,
    newParentId?: number
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      console.log('MiraSDKService: Cloning folder', { libraryId, folderId, newTitle, newParentId })

      // 首先获取原文件夹信息
      const folders = await this.getAllFolders(libraryId)
      const originalFolder = folders.find(f => f.id == folderId) // 使用 == 进行类型转换比较

      if (!originalFolder) {
        throw new Error('Original folder not found')
      }

      // 创建新文件夹
      const clonedTitle = newTitle || `${originalFolder.title || originalFolder.label || originalFolder.name} (副本)`
      const result = await this.createFolder(
        libraryId,
        clonedTitle,
        newParentId !== undefined ? newParentId : originalFolder.parent_id,
        originalFolder.color,
        originalFolder.description
      )

      console.log('MiraSDKService: Folder cloned successfully', result)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to clone folder', error)
      throw error
    }
  }

  /**
   * 发布HTTP请求事件，供插件系统监听
   */
  private emitHttpEvent(endpoint: string, type: 'start' | 'success' | 'error', data: any): void {
    try {
      const eventName = `mira_http_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`
      const eventData = {
        endpoint,
        type,
        data,
        timestamp: new Date().toISOString()
      }

      // 发布全局事件，插件可以监听
      const customEvent = new CustomEvent(eventName, {
        detail: eventData
      })
      window.dispatchEvent(customEvent)

      // 也发布通用的HTTP事件
      const genericEvent = new CustomEvent('mira_http_request', {
        detail: eventData
      })
      window.dispatchEvent(genericEvent)

      console.log(`[MiraSDKService] Emitted HTTP event: ${eventName}`, eventData)
    } catch (error) {
      console.error('Failed to emit HTTP event:', error)
    }
  }
}

// 创建单例实例
export const miraSDKService = new MiraSDKService()
