/**
 * Mira 服务 - 前端版本
 * 处理与 Mira 服务器的连接和业务逻辑
 */
export class MiraService {
  private static instance: MiraService | null = null
  private serverUrl: string = ''
  private apiKey: string = ''
  private isConnected: boolean = false
  private timeout: number = 10000

  private constructor() {}

  public static getInstance(): MiraService {
    if (!MiraService.instance) {
      MiraService.instance = new MiraService()
    }
    return MiraService.instance
  }

  /**
   * 初始化连接
   */
  public async initialize(config: { serverUrl: string; apiKey?: string; timeout?: number }): Promise<void> {
    this.serverUrl = config.serverUrl
    this.apiKey = config.apiKey || ''
    this.timeout = config.timeout || 10000

    // 测试连接
    await this.testConnection()
    this.isConnected = true
  }

  /**
   * 测试连接
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout)
      })
      return response.ok
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    this.isConnected = false
    this.serverUrl = ''
    this.apiKey = ''
  }

  /**
   * 检查客户端连接状态
   */
  public isClientConnected(): boolean {
    return this.isConnected
  }

  /**
   * 登录
   */
  public async login(credentials: { username: string; password: string }): Promise<any> {
    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
    return response
  }

  /**
   * 注册
   */
  public async register(userData: { username: string; password: string; email?: string; realName?: string }): Promise<any> {
    const response = await this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
    return response
  }

  /**
   * 登出
   */
  public async logout(): Promise<any> {
    const response = await this.makeRequest('/api/auth/logout', {
      method: 'POST'
    })
    this.disconnect()
    return response
  }

  /**
   * 获取当前用户
   */
  public async getCurrentUser(): Promise<any> {
    return await this.makeRequest('/api/auth/me')
  }

  /**
   * 获取文件列表
   */
  public async listFiles(libraryId?: string): Promise<any> {
    const url = libraryId ? `/api/files?libraryId=${libraryId}` : '/api/files'
    return await this.makeRequest(url)
  }

  /**
   * 上传文件
   */
  public async uploadFile(file: File, libraryId: string, metadata?: any): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('libraryId', libraryId)
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }

    const response = await this.makeRequest('/api/files/upload', {
      method: 'POST',
      body: formData
    }, false) // 不设置 Content-Type，让浏览器自动设置
    return response
  }

  /**
   * 下载文件
   */
  public async downloadFile(libraryId: string, fileId: string): Promise<any> {
    return await this.makeRequest(`/api/files/${libraryId}/${fileId}/download`)
  }

  /**
   * 删除文件
   */
  public async deleteFile(libraryId: string, fileId: string): Promise<any> {
    return await this.makeRequest(`/api/files/${libraryId}/${fileId}`, {
      method: 'DELETE'
    })
  }

  /**
   * 获取收藏夹
   */
  public async getLibraries(): Promise<any> {
    return await this.makeRequest('/api/librarys')
  }

  /**
   * 创建收藏夹
   */
  public async createLibrary(name: string, description?: string): Promise<any> {
    return await this.makeRequest('/api/librarys', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    })
  }

  /**
   * 添加文件到收藏夹
   */
  public async addFileToLibrary(fileId: string, libraryId: string): Promise<any> {
    return await this.makeRequest(`/api/librarys/${libraryId}/files`, {
      method: 'POST',
      body: JSON.stringify({ fileId })
    })
  }

  /**
   * 获取插件列表
   */
  public async getPlugins(): Promise<any> {
    return await this.makeRequest('/api/plugins')
  }

  /**
   * 安装插件
   */
  public async installPlugin(pluginId: string): Promise<any> {
    return await this.makeRequest(`/api/plugins/${pluginId}/install`, {
      method: 'POST'
    })
  }

  /**
   * 卸载插件
   */
  public async uninstallPlugin(pluginId: string): Promise<any> {
    return await this.makeRequest(`/api/plugins/${pluginId}/uninstall`, {
      method: 'POST'
    })
  }

  /**
   * 执行插件
   */
  public async executePlugin(pluginId: string, args: any): Promise<any> {
    return await this.makeRequest(`/api/plugins/${pluginId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ args })
    })
  }

  /**
   * 获取系统信息
   */
  public async getSystemInfo(): Promise<any> {
    return await this.makeRequest('/api/system/info')
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    
    return headers
  }

  /**
   * 发起请求
   */
  private async makeRequest(endpoint: string, options?: RequestInit, setContentType: boolean = true): Promise<any> {
    const url = `${this.serverUrl}${endpoint}`
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...(setContentType ? this.getHeaders() : { 'Authorization': this.getHeaders()['Authorization'] }),
        ...options?.headers
      },
      signal: AbortSignal.timeout(this.timeout)
    }

    try {
      const response = await fetch(url, requestOptions)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      } else {
        return await response.text()
      }
    } catch (error) {
      console.error(`Request failed: ${endpoint}`, error)
      throw error
    }
  }
}
