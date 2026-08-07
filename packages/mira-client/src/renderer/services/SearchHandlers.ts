import { miraSDKService } from './MiraSDKService'
import { useRouter } from 'vue-router'
import { FileInfo } from '@/shared/types'

// 搜索类型接口
export interface SearchType {
  id: string
  title: string
  icon: string
  handler: (keyword: string) => Promise<any[]>
}

export class SearchHandlers {
  private static instance: SearchHandlers | null = null
  private isInitialized: boolean = false
  private registeredSearchTypes: Map<string, SearchType> = new Map()
  private router = useRouter()

  private constructor() {
    this.initializeDefaultSearchTypes()
    this.setupIpcListeners()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): SearchHandlers {
    if (!SearchHandlers.instance) {
      SearchHandlers.instance = new SearchHandlers()
    }
    return SearchHandlers.instance
  }

  /**
   * 初始化默认搜索类型
   */
  private initializeDefaultSearchTypes(): void {
    // 注册默认的搜索类型
    this.registeredSearchTypes.set('files', {
      id: 'files',
      title: '文件',
      icon: 'insert_drive_file',
      handler: this.searchFiles.bind(this)
    })

    this.registeredSearchTypes.set('tags', {
      id: 'tags',
      title: '标签',
      icon: 'label',
      handler: this.searchTags.bind(this)
    })

    this.registeredSearchTypes.set('folders', {
      id: 'folders',
      title: '文件夹',
      icon: 'folder',
      handler: this.searchFolders.bind(this)
    })
  }

  /**
   * 检查Mira设备连接状态
   */
  public checkMiraConnection(): { connected: boolean; message?: string } {
    try {
      // 使用MiraSDKService检查连接状态
      const isConnected = miraSDKService.isClientConnected()
      return {
        connected: isConnected,
        message: isConnected ? 'Mira设备已连接' : 'Mira设备未连接'
      }
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : '检查连接状态失败'
      }
    }
  }

  /**
   * 注册搜索类型（供外部插件使用）
   */
  public registerSearchType(searchType: SearchType): boolean {
    try {
      if (!searchType.id || !searchType.title || !searchType.handler) {
        console.error('搜索类型配置不完整')
        return false
      }

      this.registeredSearchTypes.set(searchType.id, searchType)
      return true
    } catch (error) {
      console.error('注册搜索类型失败:', error)
      return false
    }
  }

  /**
   * 获取所有注册的搜索类型
   */
  public getRegisteredSearchTypes(): SearchType[] {
    return Array.from(this.registeredSearchTypes.values()).map(type => ({
      id: type.id,
      title: type.title,
      icon: type.icon,
      // 不返回handler函数
      handler: undefined as any
    }))
  }

  /**
   * 设置 IPC 监听器
   */
  private setupIpcListeners(): void {
    if (this.isInitialized) {
      return
    }

    // 监听来自主进程转发的搜索窗口消息
    if (window.electronAPI) {
      window.electronAPI.on('search-request-from-search-window', this.handleSearchWindowRequest.bind(this))
      this.isInitialized = true
    }
  }

  /**
   * 处理来自搜索窗口的请求
   */
  private async handleSearchWindowRequest(data: any): Promise<void> {
    try {
      let result: any = null

      switch (data.type) {
        case 'search-request':
          result = await this.handleSearch(data.keyword, data.searchType)

          // 返回搜索结果
          const searchResponse = {
            type: 'search-results',
            results: result,
            requestId: data.requestId,
            timestamp: Date.now()
          }
          await this.sendResultToSearchWindow(searchResponse)
          break

        case 'open-item':
          await this.handleOpenItem(data.item)
          // 返回成功消息
          await this.sendResultToSearchWindow({
            type: 'item-opened',
            success: true,
            item: data.item,
            requestId: data.requestId,
            timestamp: Date.now()
          })
          break

        case 'get-connection-info':
          result = this.getConnectionInfo()
          // 返回连接信息
          await this.sendResultToSearchWindow({
            type: 'connection-info',
            info: result,
            requestId: data.requestId,
            timestamp: Date.now()
          })
          break

        default:
          await this.sendResultToSearchWindow({
            type: 'error',
            error: `未知的请求类型: ${data.type}`,
            requestId: data.requestId,
            timestamp: Date.now()
          })
      }
    } catch (error) {
      console.error('处理搜索窗口请求失败:', error)
      // 发送错误响应
      await this.sendResultToSearchWindow({
        type: 'error',
        error: error instanceof Error ? error.message : '处理请求失败',
        requestId: data.requestId,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 向搜索窗口发送结果
   */
  private async sendResultToSearchWindow(result: any): Promise<void> {
    if (window.electronAPI) {
      try {
        await window.electronAPI.invoke('search-result-from-main-renderer', result)
      } catch (error) {
        console.error('IPC调用失败:', error)
      }
    }
  }

  /**
   * 处理搜索请求
   */
  public async handleSearch(keyword: string, searchType: string = 'all'): Promise<any[]> {
    if (!keyword || !keyword.trim()) {
      return []
    }

    try {
      let results: any[] = []

      // 使用注册的搜索类型进行搜索
      if (searchType === 'all') {
        // 搜索所有注册的类型
        const searchPromises = Array.from(this.registeredSearchTypes.values()).map(async (searchHandler) => {
          try {
            return await searchHandler.handler(keyword)
          } catch (error) {
            console.error(`搜索类型 ${searchHandler.id} 失败:`, error)
            return []
          }
        })
        
        const allResults = await Promise.all(searchPromises)
        results = allResults.flat()
      } else {
        // 搜索指定类型
        const searchHandler = this.registeredSearchTypes.get(searchType)
        if (!searchHandler) {
          throw new Error(`未知的搜索类型: ${searchType}`)
        }
        
        results = await searchHandler.handler(keyword)
      }

      return results
    } catch (error) {
      console.error('搜索失败:', error)
      throw error
    }
  }

  /**
   * 搜索文件
   */
  private async searchFiles(keyword: string): Promise<any[]> {
    try {
      if (!miraSDKService.isClientConnected()) {
        return []
      }

      // 获取当前库ID
      const { useMediaStore } = await import('../stores/media')
      const mediaStore = useMediaStore()
      const currentLibraryId = mediaStore.currentLibraryId || null
      
      if (!currentLibraryId) {
        return []
      }

      // 使用 MiraSDKService 搜索文件
      const {files} = await miraSDKService.listFiles(currentLibraryId, {
        title: keyword, // 使用关键词作为标题搜索
        limit: 20 // 限制结果数量
      })
      if (!files || !Array.isArray(files)) {
        return []
      }

      // 进一步过滤匹配关键词的文件（客户端过滤）
      return files
        .filter((file: any) => 
          file.name?.toLowerCase().includes(keyword.toLowerCase()) ||
          file.title?.toLowerCase().includes(keyword.toLowerCase()) ||
          file.description?.toLowerCase().includes(keyword.toLowerCase())
        )
        .map((file: FileInfo) => ({
          type: 'file',
          title: file.name || '未知文件',
          path: file.path || file.url || '',
          size: file.size ? this.formatFileSize(file.size) : undefined,
          modifiedTime: file.updatedAt,
          id: file.id,
          thumbnail: file.thumbnailPath,
          mimeType: file.mimeType,
          libraryId: currentLibraryId,
          localFile: file.localFile // 传递SMB映射器插件添加的本地文件路径
        }))
    } catch (error) {
      console.error('搜索文件失败:', error)
      return []
    }
  }

  /**
   * 搜索文件夹/收藏夹
   */
  private async searchFolders(keyword: string): Promise<any[]> {
    try {
      if (!miraSDKService.isClientConnected()) {
        return []
      }

      // 使用 folderStore 获取可用文件夹
      const { useFolderStore } = await import('../stores/folder')
      const folderStore = useFolderStore()
      const availableFolders = folderStore.folders || []

      // 过滤匹配关键词的文件夹
      const filteredFolders = availableFolders
        .filter((folder: any) => {
          const matchName = folder.title?.toLowerCase().includes(keyword.toLowerCase()) ||
                           folder.name?.toLowerCase().includes(keyword.toLowerCase())
          const matchDescription = folder.description?.toLowerCase().includes(keyword.toLowerCase())
          return matchName || matchDescription
        })
        .map((folder: any) => ({
          type: 'folder',
          title: folder.title || folder.name || '未知文件夹',
          path: `/folders/${folder.id}`,
          itemCount: folder.fileCount || 0,
          modifiedTime: folder.updatedAt || folder.createdAt,
          id: folder.id,
          description: folder.description || '无描述',
          libraryId: folder.libraryId
        }))
        .slice(0, 10) // 限制结果数量

      return filteredFolders
    } catch (error) {
      console.error('搜索文件夹失败:', error)
      return []
    }
  }

  /**
   * 搜索标签
   */
  private async searchTags(keyword: string): Promise<any[]> {
    try {
      if (!miraSDKService.isClientConnected()) {
        return []
      }

      // 使用 tagStore 获取可用标签
      const { useTagStore } = await import('../stores/tag')
      const tagStore = useTagStore()
      const availableTags = tagStore.tags || []

      // 过滤匹配关键词的标签
      const filteredTags = availableTags
        .filter((tag: any) => {
          const matchTitle = tag.title?.toLowerCase().includes(keyword.toLowerCase())
          const matchName = tag.name?.toLowerCase().includes(keyword.toLowerCase())
          const matchDescription = tag.description?.toLowerCase().includes(keyword.toLowerCase())
          return matchTitle || matchName || matchDescription
        })
        .map((tag: any) => ({
          type: 'tag',
          title: tag.title || tag.name || '未知标签',
          path: `/tags/${tag.id}`,
          id: tag.id,
          color: tag.color || '#666666',
          description: tag.description || '无描述',
          fileCount: tag.fileCount || 0,
          libraryId: tag.libraryId
        }))
        .slice(0, 10) // 限制结果数量

      return filteredTags
    } catch (error) {
      console.error('搜索标签失败:', error)
      return []
    }
  }

  /**
   * 处理打开搜索项目
   */
  public async handleOpenItem(item: any): Promise<void> {
    if (!item || !item.type) {
      return
    }

    try {
      switch (item.type) {
        case 'file':
          await this.openFile(item)
          break

        case 'folder':
        case 'library':
          await this.openFolder(item)
          break

        case 'tag':
          await this.openTag(item)
          break

        default:
      }

    } catch (error) {
      console.error('打开搜索项目失败:', error)
      throw error
    }
  }

  /**
   * 打开文件 - 触发路由跳转到file-preview
   */
  private async openFile(item: any): Promise<void> {
    try {
      // 验证必要参数
      if (!item.id) {
        throw new Error('文件ID不能为空')
      }

      // 获取当前库ID作为fallback
      let libraryId = item.libraryId
      if (!libraryId) {
        const { useMediaStore } = await import('../stores/media')
        const mediaStore = useMediaStore()
        libraryId = mediaStore.currentLibraryId
        
        if (!libraryId) {
          throw new Error('无法确定库ID，请先选择一个媒体库')
        }
      }

      // 使用类的router实例
      await this.router.push({
        path: '/file-preview',
        query: {
          id: item.id,
          libraryId: libraryId,
          title: item.title || item.name || '未知文件',
          path: item.path || '',
          mimeType: item.mimeType || 'application/octet-stream'
        }
      })
    } catch (error) {
      console.error('❌ 打开文件失败:', error)
      throw new Error(`无法打开文件 "${item.title || item.name || '未知文件'}": ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 打开文件夹/收藏夹 - 跳转到根路由并传递文件夹参数
   */
  private async openFolder(item: any): Promise<void> {
    
    try {
      // 验证必要参数
      if (!item.id) {
        throw new Error('文件夹ID不能为空')
      }

      // 获取当前库ID作为fallback
      let libraryId = item.libraryId
      if (!libraryId) {
        const { useMediaStore } = await import('../stores/media')
        const mediaStore = useMediaStore()
        libraryId = mediaStore.currentLibraryId
        
        if (!libraryId) {
          throw new Error('无法确定库ID，请先选择一个媒体库')
        }
      }

      // 使用类的router实例
      await this.router.push({
        path: '/',
        query: {
          folder: item.id,
          libraryId: libraryId,
          title: item.title || item.name || '未知文件夹'
        }
      })
    } catch (error) {
      console.error('❌ 打开文件夹失败:', error)
      throw new Error(`无法打开文件夹 "${item.title || item.name || '未知文件夹'}": ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 打开标签视图 - 跳转到根路由并传递标签参数
   */
  private async openTag(item: any): Promise<void> {
    
    try {
      // 验证必要参数
      if (!item.id) {
        throw new Error('标签ID不能为空')
      }

      // 获取当前库ID作为fallback
      let libraryId = item.libraryId
      if (!libraryId) {
        const { useMediaStore } = await import('../stores/media')
        const mediaStore = useMediaStore()
        libraryId = mediaStore.currentLibraryId
        
        if (!libraryId) {
          throw new Error('无法确定库ID，请先选择一个媒体库')
        }
      }

      // 使用类的router实例
      await this.router.push({
        path: '/',
        query: {
          tag: item.id,
          libraryId: libraryId,
          title: item.title || item.name || '未知标签',
          color: item.color || '#666666'
        }
      })
    } catch (error) {
      console.error('❌ 打开标签失败:', error)
      throw new Error(`无法打开标签 "${item.title || item.name || '未知标签'}": ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  /**
   * 获取连接状态
   */
  public isConnected(): boolean {
    return miraSDKService.isClientConnected()
  }

  /**
   * 获取连接状态信息
   */
  public getConnectionInfo(): any {
    return {
      connected: miraSDKService.isClientConnected(),
      serverUrl: 'Connected to Mira Server' // 简化显示
    }
  }
}
