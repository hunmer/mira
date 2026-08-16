import { MiraClient, type PreviewViewer, type ServerWebPlugin } from 'mira-app-core/shared/sdk'
import { initializeWebSocket, webSocketService } from './WebSocketService'
import { useMediaStore } from '../stores/media'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { toFileUrl } from '../utils/fileUtils'
import { resolveServerUrl } from '../utils/serverUrl'
import { environment } from '../utils'
import i18n from '../i18n'

/** 给 HTTP 资源 URL 追加 token 参数（用于 <img>/<video> 等无法设 header 的场景） */
function appendToken(url: string | undefined): string | undefined {
  if (!url) return url
  if (!url.startsWith('http')) return url
  const token = useAuthStore().token
  if (!token) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}token=${encodeURIComponent(token)}`
}

function notifyDuplicateUpload(fileName: string): void {
  const settings = useSettingsStore().settings
  if (!settings.enableNotifications || !settings.enableImportNotifications) return

  window.electronAPI?.notificationWindow?.show({
    title: i18n.global.t('services.sdkService.duplicateUploadTitle'),
    body: i18n.global.t('services.sdkService.duplicateUploadBody', { name: fileName }),
    type: 'warning',
    icon: 'content_copy',
    duration: 6000,
  }).catch((err: Error) => {
    console.warn('Failed to show duplicate upload notification:', err.message)
  })
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
      const authStore = useAuthStore()
      useSettingsStore().setConnectionStatus('connecting')

      this.client = new MiraClient(config.serverUrl, {
        timeout: config.timeout || 30000,
        getToken: () => authStore.token ?? undefined
      })

      // 保存连接配置
      this.connectionConfig = config

      // 测试连接
      await this.client.system().getSystemInfo()
      this.isConnected = true
      useSettingsStore().setConnectionStatus('connected')

      // WebSocket 初始化延迟到 library 加载后执行（见 initializeHomeView）
      this._pendingWebsocketUrl = config.websocketUrl

      return { success: true, message: 'Connected to Mira server' }
    } catch (error) {
      console.error('MiraSDKService: Connection failed', error)
      this.isConnected = false
      useSettingsStore().setConnectionStatus('error')
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

      if (!connected) {
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
    description?: string,
    icon?: string
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.tags().create({
        libraryId,
        title: name,
        color,
        description,
        icon
      })
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to create tag', error)
      throw error
    }
  }

  async updateTag(libraryId: string, tagId: string | number, updates: { name?: string; color?: number; description?: string; icon?: string }): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      // 标签树节点 id 形如 "tag-123"，去掉前缀后才能转换为数字 ID
      const numericId = Number(String(tagId).replace(/^tag-/, ''))
      if (!Number.isFinite(numericId)) {
        throw new Error(`Invalid tag id: ${tagId}`)
      }
      const result = await this.client.tags().updateTag(libraryId, numericId, {
        title: updates.name,
        color: updates.color,
        description: updates.description,
        icon: updates.icon,
      })
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to update tag', error)
      throw error
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(libraryId: string, tagId: number): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.tags().delete({ libraryId, id: tagId })
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
      useSettingsStore().setConnectionStatus('disconnected')

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
      const loginResult = await this.client.auth().login(credentials.username, credentials.password)
      
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
      const result = await this.client.auth().register(userData.username, userData.password)

      // 转换为我们的 UserInfo 类型
      const userInfo: UserInfo = {
        id: result.data?.id?.toString() || `user_${Date.now()}`,
        username: userData.username,
        email: userData.email,
        realName: userData.realName,
        role: 'user'
      }

      return userInfo
    } catch (error) {
      console.error('MiraSDKService: Registration failed', error)
      throw error
    }
  }

  async logout(): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')
    
    try {
      const result = await this.client.auth().logout()
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

  async getLibraryStats(libraryId: string): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.libraries().stats(libraryId)
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


      // 获取部署环境信息
      const { useSettingsStore } = await import('../stores/settings')
      const settingsStore = useSettingsStore()
      if (!settingsStore.systemHealth) {
        await settingsStore.getSystemHealth()
      }
      const isDocker = settingsStore.systemHealth?.isDocker ?? false
      let smbConfig: { enabled?: boolean; smbPath?: string; mountPath?: string } | null = null
      if (isDocker) {
        const { useServerListStore } = await import('../stores/serverList')
        smbConfig = useServerListStore().activeServer?.smb ?? null
      }

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
        let localFile: string | undefined
        let thumbnailPath: string | undefined

        if (isDocker) {
          // Docker 环境：需要 SMB 映射才能访问本地路径，否则用 HTTP URL
          if (smbConfig?.enabled && smbConfig.smbPath) {
            const smbPath = smbConfig.smbPath
            const sep = smbPath.includes('/') ? '/' : '\\'
            const normalizedSmbPath = smbPath.endsWith(sep) ? smbPath : smbPath + sep

            if (smbConfig.mountPath && file.file_path) {
              const mountPrefix = smbConfig.mountPath.endsWith('/') ? smbConfig.mountPath : smbConfig.mountPath + '/'
              localFile = file.file_path.replace(mountPrefix, normalizedSmbPath).replace(/\//g, sep)
              if (file.thumb_path) {
                thumbnailPath = file.thumb_path.replace(mountPrefix, normalizedSmbPath).replace(/\//g, sep)
              }
            } else {
              // folder_name 为空串时表示未分类文件（存放在素材库根目录），直接拼根路径
              if (file.name) {
                localFile = file.folder_name
                  ? normalizedSmbPath + file.folder_name + sep + file.name
                  : normalizedSmbPath + file.name
              }
              const thumbFileName = file.hash ? `${file.hash}.png` : `${file.id}.png`
              thumbnailPath = normalizedSmbPath + 'thumbs' + sep + thumbFileName
            }
          }
          // Docker 无 SMB：localFile 和 thumbnailPath 都留空，回退到 HTTP URL
        } else if (environment.isElectron) {
          // 本地部署 + Electron：服务端路径就是本机路径，可直接 file:// 访问，省一次 HTTP
          localFile = file.file_path
          thumbnailPath = file.thumb_path
        }
        // 网页端：localFile/thumbnailPath 留空，回退到 HTTP URL（file.path / file.thumb）

        return {
          id: file.id.toString(),
          name: file.name,
          path: appendToken(toFileUrl(resolveServerUrl(file.path, this.connectionConfig?.serverUrl))),
          size: file.size,
          extension: file.extension || this.getFileExtension(file.name),
          mimeType: file.mime_type || this.getMimeTypeFromExtension(file.name),
          createdAt: file.created_at,
          updatedAt: file.updated_at || file.imported_at || file.created_at,
          tags: typeof file.tags === 'string' ? JSON.parse(file.tags || '[]') : (file.tags || []),
          folderId: file.folder_id?.toString(),
          website: file.website || '',
          stars: Number(file.stars ?? file.rating ?? 0),
          notes: file.notes || '',
          hash: file.hash || '',
          thumbnailPath: appendToken(toFileUrl(thumbnailPath || resolveServerUrl(file.thumb, this.connectionConfig?.serverUrl))),
          libraryId: libraryId,
          localFile: localFile || file.localFile || (() => {
            try {
              const mediaStore = useMediaStore()
              return mediaStore.getLocalFile(libraryId, file.id.toString())
            } catch (error) {
              return undefined
            }
          })()
        }
      })
      

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
      
      // 使用 SDK 的文件模块获取单个文件信息
      const file = await (this.client.files() as any).getFile(libraryId, fileId, webSocketService.getClientId())
      
      // 转换为 FileInfo 类型
      // 网页端不使用本地路径（浏览器禁止 file:// 访问）：
      //   - path 字段已是 HTTP URL（toFileUrl 对 http 原样返回），Electron/网页均安全
      //   - 缩略图：Electron 用本地 thumbnail_path 走 file://；网页回退到 HTTP thumb
      const useLocalThumb = environment.isElectron
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
        website: file.website || '',
        stars: Number(file.stars ?? file.rating ?? 0),
        notes: file.notes || '',
        hash: file.hash || '',
        thumbnailPath: appendToken(toFileUrl(useLocalThumb ? file.thumbnail_path : (file.thumb || undefined))),
        libraryId: libraryId
      }
      
      return fileInfo
    } catch (error) {
      console.error('MiraSDKService: Failed to get file', error)
      throw error
    }
  }

  /** 批量获取文件 metadata，供瀑布流等布局计算使用。 */
  async getFileMetadataByIds(
    libraryId: string,
    fileIds: Array<string | number>
  ): Promise<Array<{ id: string; metadata?: Record<string, any>; width?: number; height?: number }>> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().getMetadataByIds(libraryId, fileIds)
  }

  /** 获取当前文件可用的插件预览器。 */
  async getPreviewViewers(libraryId: string, fileId: string | number): Promise<PreviewViewer[]> {
    if (!this.client) throw new Error('Not connected to Mira server')
    const response = await (this.client.files() as any).getPreviewViewers(
      libraryId,
      fileId,
      webSocketService.getClientId()
    )
    return response?.viewers || []
  }

  async uploadFile(file: File, libraryId: string, metadata?: any): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')
    
    try {
      const result = await this.client.files().uploadFile(file, libraryId, metadata)
      const uploaded = result.results?.[0] as (NonNullable<typeof result.results>[number] & {
        operation?: string
      }) | undefined
      if (uploaded?.operation === 'duplicate') {
        notifyDuplicateUpload(uploaded.result?.name || file.name)
      }
      if (!uploaded?.success || !uploaded.result) {
        throw new Error(uploaded?.error || 'File upload failed')
      }
      return { success: true, message: 'File uploaded successfully', data: uploaded.result }
    } catch (error) {
      console.error('MiraSDKService: File upload failed', error)
      throw error
    }
  }

  async downloadFile(libraryId: string, fileId: string): Promise<Blob> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.files().download(libraryId, fileId)
      return result
    } catch (error) {
      console.error('MiraSDKService: File download failed', error)
      throw error
    }
  }

  /**
   * 从 URL 批量下载并入库（走后端下载执行器，按 host 匹配用户 cookie 站点）。
   * 返回 { batchId, total }。进度通过 WebSocket 事件 download::progress / download::item 推送。
   */
  async startDownloadFromUrl(
    libraryId: string,
    urls: string[],
    folderId?: number | null,
  ): Promise<{ batchId: string; total: number }> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return this.client.files().batchImportFromUrls(libraryId, urls, {
      folderId,
      clientId: webSocketService.getClientId(),
    })
  }

  async getExtraFileList(libraryId: string, fileId: string): Promise<string[]> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().getExtraFileList(libraryId, fileId)
  }

  async getExtraFile(libraryId: string, fileId: string, fileName: string): Promise<Blob> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().getExtraFile(libraryId, fileId, fileName)
  }

  getExtraFileUrl(libraryId: string, fileId: string, fileName: string): string {
    if (!this.client) throw new Error('Not connected to Mira server')
    return this.client.files().getExtraFileUrl(libraryId, fileId, fileName)
  }

  async writeFile(
    libraryId: string,
    fileId: string,
    content: Blob | string | ArrayBuffer,
    options?: { name?: string; contentType?: string }
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().writeFile(libraryId, fileId, content, options)
  }

  async setFileCover(libraryId: string, fileId: string, cover: Blob): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().setCover(libraryId, fileId, cover)
  }

  async deleteFile(libraryId: string, fileId: string, moveToRecycleBin: boolean = true): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.files().delete(libraryId, fileId, { moveToRecycleBin })
      return TypeAdapter.normalizeBaseResponse(result)
    } catch (error) {
      console.error('MiraSDKService: File deletion failed', error)
      throw error
    }
  }

  async batchDeleteFiles(
    libraryId: string,
    fileIds: (string | number)[],
    moveToRecycleBin: boolean = true
  ): Promise<{ success: boolean; message: string; deletedCount: number; deletedIds: number[]; failedIds: number[] }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      return await this.client.files().batchDelete(libraryId, fileIds, { moveToRecycleBin })
    } catch (error) {
      console.error('MiraSDKService: Batch file deletion failed', error)
      throw error
    }
  }

  async emptyTrash(libraryId: string): Promise<{ success: boolean; deletedCount: number; errors?: string[] }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.files().emptyTrash(libraryId)
      return result
    } catch (error) {
      console.error('MiraSDKService: Empty trash failed', error)
      throw error
    }
  }

  async restoreFile(libraryId: string, fileId: string): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.files().restoreFile(libraryId, fileId)
      return TypeAdapter.normalizeBaseResponse(result)
    } catch (error) {
      console.error('MiraSDKService: File restore failed', error)
      throw error
    }
  }

  async batchRestoreFiles(
    libraryId: string,
    fileIds: (string | number)[]
  ): Promise<{ success: boolean; message: string; recoveredCount: number; recoveredIds: number[]; failedIds: number[] }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      return await this.client.files().batchRestoreFiles(libraryId, fileIds)
    } catch (error) {
      console.error('MiraSDKService: Batch file restore failed', error)
      throw error
    }
  }

  async renameFile(libraryId: string, fileId: string | number, name: string): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().renameFile(libraryId, fileId, name)
  }

  async updateFile(libraryId: string, fileId: string | number, data: Record<string, any>): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().updateFile(libraryId, fileId, data)
  }


  /**
   * 库管理
   */
  async getLibraries(): Promise<LibraryInfo[]> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const libs = await this.client.libraries().getAll()
      // 适配本地 LibraryInfo 类型（补充 type 字段）
      return libs.map(lib => ({ ...lib, type: 'local' } as LibraryInfo))
    } catch (error) {
      console.error('MiraSDKService: Failed to get librarys', error)
      throw error
    }
  }

  async createLibrary(name: string, description?: string): Promise<LibraryInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      await this.client.libraries().createLocal(
        name,
        '', // path - 需要根据实际需求设置
        description || ''
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
        isDocker: !!(health as any).isDocker,
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

  async getServerWebPlugins(libraryId: string): Promise<ServerWebPlugin[]> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.plugins().getWeb(libraryId)
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
      const folders = await this.client.folders().getAll(libraryId)
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
    description?: string,
    icon?: string
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.folders().createFolder(libraryId, title, parentId, color, description, icon)
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
      icon?: string;
    }
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.folders().updateFolder(libraryId, folderId, updates)
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
      const result = await this.client.folders().deleteFolder(libraryId, folderId, deleteFiles)
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

      // 构建更新数据，正确处理null值
      const updateData: any = {}
      if (newParentId === null) {
        // 明确设置为null表示移动到根级别
        updateData.parent_id = null
      } else if (newParentId !== undefined) {
        // 设置具体的父级ID
        updateData.parent_id = newParentId
      }

      const result = await this.client.folders().updateFolder(libraryId, folderId, updateData)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to move folder', error)
      throw error
    }
  }

  /**
   * 批量更新文件夹排序 index
   */
  async updateFolderSortIndex(libraryId: string, items: { id: number; sort_index: number }[]): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.folders().updateSortIndex(libraryId, items)
  }

  /**
   * 批量更新标签排序 index
   */
  async updateTagSortIndex(libraryId: string, items: { id: number; sort_index: number }[]): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.tags().updateSortIndex(libraryId, items)
  }

  async moveFileToFolder(libraryId: string, fileId: number, folderId: number): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.folders().moveFileToFolder(libraryId, fileId, folderId)
  }

  async addTagsToFile(libraryId: string, fileId: number, tags: string[]): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.tags().addTagsToFile(libraryId, fileId, tags)
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

      // 首先获取原文件夹信息
      const folders = await this.getAllFolders(libraryId)
      const originalFolder = folders.find(f => f.id == folderId) // 使用 == 进行类型转换比较

      if (!originalFolder) {
        throw new Error('Original folder not found')
      }

      // 创建新文件夹
      const clonedTitle = newTitle || i18n.global.t('services.sdkService.folderCopySuffix', { name: originalFolder.title || originalFolder.label || originalFolder.name })
      const result = await this.createFolder(
        libraryId,
        clonedTitle,
        newParentId !== undefined ? newParentId : originalFolder.parent_id,
        originalFolder.color,
        originalFolder.description
      )

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

    } catch (error) {
      console.error('Failed to emit HTTP event:', error)
    }
  }
}

// 创建单例实例
export const miraSDKService = new MiraSDKService()
