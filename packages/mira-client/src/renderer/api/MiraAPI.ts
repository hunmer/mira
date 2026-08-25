import { PluginService } from '../services/PluginService'
import { environment } from '../utils'
import { MiraClient } from 'mira-app-core/shared/sdk'
import type {
  MiraConnectionConfig,
  LoginCredentials,
  FileUploadRequest,
  UserInfo
} from '../../shared/types'

// 导入 MiraSDKService 来获取真实的连接状态
import { miraSDKService } from '../services/MiraSDKService'

// 导入菜单服务
import { menuService } from '../services/MenuService'
import type { MenuConfig, MenuItemConfig } from '../services/MenuService'

/**
 * Mira 通用 API
 * 统一前端的所有服务访问入口，支持 Electron 和 Web 环境
 */
export class MiraAPI {
  private static instance: MiraAPI | null = null
  
  // 服务实例
  public readonly pluginService: PluginService
  
  // Electron 原生 API（仅在 Electron 环境可用）
  public readonly electron: any = null

  // Mira Client 实例
  private miraClient: MiraClient | null = null
  private _isConnected: boolean = false
  private _connectionConfig: MiraConnectionConfig | null = null

  /** 当前是否已连接 Mira Server */
  public get isConnected(): boolean {
    return this._isConnected
  }

  /** 当前连接配置 */
  public get connectionConfig(): MiraConnectionConfig | null {
    return this._connectionConfig
  }

  private constructor() {
    // 初始化服务
    this.pluginService = PluginService.getInstance()
    
    // 仅在 Electron 环境中初始化原生 API
    if (environment.isElectron && window.electronAPI) {
      this.electron = window.electronAPI
    }
  }

  public static getInstance(): MiraAPI {
    if (!MiraAPI.instance) {
      MiraAPI.instance = new MiraAPI()
    }
    return MiraAPI.instance
  }
  
  /**
   * 文件系统操作
   */
  public readonly fs = {
    readDir: async (dirPath: string) => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('fs:readDir', dirPath)
      } else {
        return { success: false, message: 'File system operations not supported in web environment' }
      }
    },

    readFile: async (filePath: string, encoding: BufferEncoding = 'utf8') => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('fs:readFile', filePath, encoding)
      } else {
        return { success: false, message: 'File system operations not supported in web environment' }
      }
    },

    writeFile: async (filePath: string, data: string, encoding: BufferEncoding = 'utf8') => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('fs:writeFile', filePath, data, encoding)
      } else {
        return { success: false, message: 'File system operations not supported in web environment' }
      }
    },

    exists: async (filePath: string) => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('fs:exists', filePath)
      } else {
        return { success: false, message: 'File system operations not supported in web environment' }
      }
    },

    selectDirectory: async (title?: string) => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('fs:selectDirectory', title)
      } else {
        return { success: false, message: 'Directory selection not supported in web environment' }
      }
    },

    selectFile: async (title?: string, filters?: { name: string; extensions: string[] }[]) => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('fs:selectFile', title, filters)
      } else {
        return { success: false, message: 'File selection not supported in web environment' }
      }
    }
  }

  /**
   * 系统信息
   */
  public readonly system = {
    getPlatform: async () => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('system:getPlatform')
      } else {
        return navigator.platform
      }
    },

    getArch: async () => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('system:getArch')
      } else {
        return 'unknown'
      }
    },

    getVersion: async () => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('app:getVersion')
      } else {
        return '1.0.0-web'
      }
    }
  }

  /**
   * 菜单管理
   */
  public readonly menu = {
    // 初始化菜单服务
    initialize: async () => {
      if (environment.isElectron) {
        return await menuService.initialize()
      }
    },

    // 添加菜单
    addMenu: (menu: MenuConfig) => {
      return menuService.addMenu(menu)
    },

    // 移除菜单
    removeMenu: (menuId: string) => {
      return menuService.removeMenu(menuId)
    },

    // 更新菜单
    updateMenu: (menuId: string, menu: MenuConfig) => {
      return menuService.updateMenu(menuId, menu)
    },

    // 获取菜单
    getMenu: (menuId: string) => {
      return menuService.getMenu(menuId)
    },

    // 获取所有菜单
    getAllMenus: () => {
      return menuService.getAllMenus()
    },

    // 添加菜单项
    addMenuItem: (menuId: string, menuItem: MenuItemConfig, position?: number) => {
      return menuService.addMenuItem(menuId, menuItem, position)
    },

    // 移除菜单项
    removeMenuItem: (menuId: string, itemId: string) => {
      return menuService.removeMenuItem(menuId, itemId)
    },

    // 更新菜单项
    updateMenuItem: (menuId: string, itemId: string, updates: Partial<MenuItemConfig>) => {
      return menuService.updateMenuItem(menuId, itemId, updates)
    },

    // 启用/禁用菜单项
    setMenuItemEnabled: (menuId: string, itemId: string, enabled: boolean) => {
      return menuService.setMenuItemEnabled(menuId, itemId, enabled)
    },

    // 显示/隐藏菜单项
    setMenuItemVisible: (menuId: string, itemId: string, visible: boolean) => {
      return menuService.setMenuItemVisible(menuId, itemId, visible)
    },

    // 根据路由更新导航菜单
    updateNavigationFromRoutes: (routes: any[]) => {
      return menuService.updateNavigationFromRoutes(routes)
    }
  }

  /**
   * Mira Server 连接管理
   */
  public readonly mira = {
    // 连接管理
    connect: async (config: MiraConnectionConfig): Promise<{ success: boolean; message: string }> => {
      try {
        console.log('[MiraAPI] Connecting to Mira server', { serverUrl: config.serverUrl })
        
        this.miraClient = new MiraClient(config.serverUrl, {
          timeout: config.timeout || 30000
        })

        // 保存连接配置
        this._connectionConfig = config

        // 测试连接
        await this.mira.testConnection()
        this._isConnected = true
        
        console.log('[MiraAPI] Connected successfully')
        return { success: true, message: 'Connected successfully' }
      } catch (error) {
        console.error('[MiraAPI] Connection failed:', error)
        this._isConnected = false
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    },

    disconnect: async (): Promise<{ success: boolean }> => {
      this.miraClient = null
      this._isConnected = false
      this._connectionConfig = null
      console.log('[MiraAPI] Disconnected')
      return { success: true }
    },

    testConnection: async (): Promise<{ success: boolean; message: string }> => {
      if (!this.miraClient) {
        return { success: false, message: 'Mira client not initialized' }
      }

      try {
        console.log('[MiraAPI] Testing connection')
        // 尝试获取系统信息来测试连接
        await this.miraClient.system().getSystemInfo()
        console.log('[MiraAPI] Connection test successful')
        return {
          success: true,
          message: 'Connection successful'
        }
      } catch (error) {
        console.error('[MiraAPI] Connection test failed:', error)
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    },

    isClientConnected: (): boolean => {
      // 使用 MiraSDKService 的连接状态，因为它是实际管理连接的服务
      return miraSDKService.isClientConnected()
    },

    // 认证相关
    auth: {
      login: async (credentials: LoginCredentials): Promise<any> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] User login attempt', { username: credentials.username })
          const result = await this.miraClient.auth().login(credentials.username, credentials.password)
          console.log('[MiraAPI] User login successful', { username: credentials.username })
          return result
        } catch (error) {
          console.error('[MiraAPI] User login failed:', error, { username: credentials.username })
          throw error
        }
      },

      register: async (userData: { 
        username: string; 
        password: string; 
        email?: string; 
        realName?: string 
      }): Promise<any> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] User registration attempt', { username: userData.username })
          const result = await this.miraClient.auth().register(userData.username, userData.password)
          console.log('[MiraAPI] User registration successful', { username: userData.username })
          return result
        } catch (error) {
          console.error('[MiraAPI] User registration failed:', error, { username: userData.username })
          throw error
        }
      },

      logout: async (): Promise<void> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] User logout')
          await this.miraClient.auth().logout()
          console.log('[MiraAPI] User logout successful')
        } catch (error) {
          console.error('[MiraAPI] User logout failed:', error)
          throw error
        }
      },

      getUser: async (): Promise<UserInfo> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')

        try {
          console.log('[MiraAPI] Getting current user info')
          const result = await this.miraClient.user().getInfo()
          console.log('[MiraAPI] Got current user info successfully')
          // 适配本地 UserInfo 类型（sdk 中 id 为 number，本地为 string）
          return {
            id: String(result.id),
            username: result.username,
            realName: result.realName,
            avatar: result.avatar,
            role: result.role
          } as UserInfo
        } catch (error) {
          console.error('[MiraAPI] Failed to get current user info:', error)
          throw error
        }
      }
    },

    // 文件操作
    files: {
      list: async (libraryId?: string): Promise<any[]> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Listing files', { libraryId })
          if (!libraryId) {
            throw new Error('Library ID is required for listing files')
          }
          const result = await this.miraClient.files().getAllFiles(libraryId)
          console.log('[MiraAPI] Files listed successfully')
          return result
        } catch (error) {
          console.error('[MiraAPI] Failed to list files:', error)
          throw error
        }
      },

      upload: async (request: FileUploadRequest): Promise<any> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Uploading file', { name: request.name, type: request.type })
          // 创建 File 对象
          const blob = new Blob([request.buffer], { type: request.type })
          const file = new File([blob], request.name, { type: request.type })
          
          const result = await this.miraClient.files().uploadFile(file, request.libraryId, request.metadata)
          console.log('[MiraAPI] File uploaded successfully', { name: request.name })
          return result
        } catch (error) {
          console.error('[MiraAPI] Failed to upload file:', error)
          throw error
        }
      },

      download: async (libraryId: string, fileId: string): Promise<Blob> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Downloading file', { libraryId, fileId })
          const result = await this.miraClient.files().download(libraryId, fileId)
          console.log('[MiraAPI] File downloaded successfully', { libraryId, fileId })
          return result
        } catch (error) {
          console.error('[MiraAPI] Failed to download file:', error)
          throw error
        }
      },

      delete: async (libraryId: string, fileId: string): Promise<void> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Deleting file', { libraryId, fileId })
          await this.miraClient.files().delete(libraryId, fileId)
          console.log('[MiraAPI] File deleted successfully', { libraryId, fileId })
        } catch (error) {
          console.error('[MiraAPI] Failed to delete file:', error)
          throw error
        }
      }
    },

    // 库管理
    library: {
      getLibraries: async (): Promise<any[]> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Getting librarys')
          const result = await this.miraClient.libraries().getAll()
          console.log('[MiraAPI] Librarys retrieved successfully')
          return result
        } catch (error) {
          console.error('[MiraAPI] Failed to get librarys:', error)
          throw error
        }
      },

      createLibrary: async (name: string, description?: string, path: string = ''): Promise<any> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')

        try {
          console.log('[MiraAPI] Creating library', { name, description })
          const result = await this.miraClient.libraries().create({
            name,
            path,
            description: description || ''
          })
          console.log('[MiraAPI] Library created successfully', { name })
          return result
        } catch (error) {
          console.error('[MiraAPI] Failed to create library:', error)
          throw error
        }
      },

      addToLibrary: async (fileId: string, libraryId: string): Promise<void> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Adding file to library', { fileId, libraryId })
          // 注意：Mira SDK 没有直接的 addFileToLibrary 方法，这里可能需要其他实现
          console.warn('[MiraAPI] addToLibrary not implemented in SDK - this operation is not supported')
          throw new Error('Add file to library operation is not supported by the current SDK')
        } catch (error) {
          console.error('[MiraAPI] Failed to add file to library:', error)
          throw error
        }
      }
    },

    // 插件管理
    plugins: {
      list: async (): Promise<any[]> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Getting plugins')
          const result = await this.miraClient.plugins().getAll()
          console.log('[MiraAPI] Plugins retrieved successfully')
          return result
        } catch (error) {
          console.error('[MiraAPI] Failed to get plugins:', error)
          throw error
        }
      },

      install: async (pluginId: string): Promise<void> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Installing plugin', { pluginId })
          // 注意：需要更多参数来安装插件
          await this.miraClient.plugins().install({ name: pluginId, version: 'latest', libraryId: '' })
          console.log('[MiraAPI] Plugin installed successfully', { pluginId })
        } catch (error) {
          console.error('[MiraAPI] Failed to install plugin:', error)
          throw error
        }
      },

      uninstall: async (pluginId: string): Promise<void> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Uninstalling plugin', { pluginId })
          await this.miraClient.plugins().uninstall(pluginId)
          console.log('[MiraAPI] Plugin uninstalled successfully', { pluginId })
        } catch (error) {
          console.error('[MiraAPI] Failed to uninstall plugin:', error)
          throw error
        }
      },

      execute: async (pluginId: string, args: any): Promise<any> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Executing plugin', { pluginId, args })
          // 注意：SDK 中没有 executePlugin 方法，这可能需要其他实现
          console.warn('[MiraAPI] executePlugin not implemented in SDK - this operation is not supported')
          throw new Error('Execute plugin operation is not supported by the current SDK')
        } catch (error) {
          console.error('[MiraAPI] Failed to execute plugin:', error)
          throw error
        }
      }
    },

    // 系统信息
    system: {
      info: async (): Promise<any> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Getting system info')
          const result = await this.miraClient.system().getSystemInfo()
          console.log('[MiraAPI] System info retrieved successfully')
          return result
        } catch (error) {
          console.error('[MiraAPI] Failed to get system info:', error)
          throw error
        }
      },

      health: async (): Promise<any> => {
        if (!this.miraClient) throw new Error('Mira client not initialized')
        
        try {
          console.log('[MiraAPI] Getting system health')
          const result = await this.miraClient.system().getHealth()
          console.log('[MiraAPI] System health retrieved successfully')
          return result
        } catch (error) {
          console.error('[MiraAPI] Failed to get system health:', error)
          throw error
        }
      }
    }
  }

  /**
   * 剪贴板操作
   */
  public readonly clipboard = {
    writeText: async (text: string) => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('clipboard:writeText', text)
      } else if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text)
          return { success: true }
        } catch (error) {
          return { success: false, message: error instanceof Error ? error.message : 'Failed to write to clipboard' }
        }
      } else {
        return { success: false, message: 'Clipboard API not supported' }
      }
    },

    readText: async () => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('clipboard:readText')
      } else if (navigator.clipboard) {
        try {
          const text = await navigator.clipboard.readText()
          return text
        } catch (error) {
          return ''
        }
      } else {
        return ''
      }
    },

    writeImage: async (imagePath: string) => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('clipboard:writeImage', imagePath)
      } else {
        return { success: false, message: 'Image clipboard operations not supported in web environment' }
      }
    },

    readImage: async () => {
      if (environment.isElectron) {
        return await window.electronAPI.invoke('clipboard:readImage')
      } else {
        return { success: false, message: 'Image clipboard operations not supported in web environment' }
      }
    }
  }
}

// 创建全局实例
export const miraAPI = MiraAPI.getInstance()

// 暴露到全局对象
declare global {
  interface Window {
    miraAPI: MiraAPI
  }
}

// 在 window 对象上暴露 MiraAPI
if (typeof window !== 'undefined') {
  window.miraAPI = miraAPI
}
