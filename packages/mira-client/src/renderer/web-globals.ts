import { miraSDKService } from './services/MiraSDKService'

/**
 * 在 Web 环境中将 Mira SDK 暴露到全局 window 对象
 * 这样 web 端就可以直接使用 Mira 服务了
 */
export function exposeMiraSDKToWindow() {
  if (typeof window !== 'undefined') {
    // 将 Mira SDK 服务暴露到 window 对象
    ;(window as any).miraSDK = miraSDKService
    
    // 也可以暴露一个更简化的 API
    ;(window as any).mira = {
      // 连接管理
      connect: (config: any) => miraSDKService.connect(config),
      disconnect: () => miraSDKService.disconnect(),
      testConnection: () => miraSDKService.testConnection(),
      isConnected: () => miraSDKService.isClientConnected(),
      
      // 认证
      auth: {
        login: (credentials: any) => miraSDKService.login(credentials),
        register: (userData: any) => miraSDKService.register(userData),
        logout: () => miraSDKService.logout(),
        getCurrentUser: () => miraSDKService.getCurrentUser()
      },
      
      // 文件操作
      files: {
        list: (libraryId?: string, filters?: any) => {
          if (!libraryId) throw new Error('Library ID is required')
          return miraSDKService.listFiles(libraryId, filters)
        },
        upload: (file: File, libraryId: string, metadata?: any) => 
          miraSDKService.uploadFile(file, libraryId, metadata),
        download: (libraryId: string, fileId: string) => 
          miraSDKService.downloadFile(libraryId, fileId),
        delete: (libraryId: string, fileId: string) => 
          miraSDKService.deleteFile(libraryId, fileId)
      },
      
      // 库管理
      library: {
        getLibraries: () => miraSDKService.getLibraries(),
        createLibrary: (name: string, description?: string) => 
          miraSDKService.createLibrary(name, description),
        addToLibrary: (fileId: string, libraryId: string) => {
          console.warn('addToLibrary not implemented', { fileId, libraryId })
          return Promise.resolve({ success: false, message: 'Not implemented' })
        }
      },
      
      // 插件管理
      plugins: {
        list: () => {
          console.warn('plugins.list not implemented')
          return Promise.resolve([])
        },
        install: (pluginId: string) => {
          console.warn('plugins.install not implemented', { pluginId })
          return Promise.resolve({ success: false, message: 'Not implemented' })
        },
        uninstall: (pluginId: string) => {
          console.warn('plugins.uninstall not implemented', { pluginId })
          return Promise.resolve({ success: false, message: 'Not implemented' })
        },
        execute: (pluginId: string, args: any) => {
          console.warn('plugins.execute not implemented', { pluginId, args })
          return Promise.resolve({ success: false, message: 'Not implemented' })
        }
      },
      
      // 系统信息
      system: {
        info: () => miraSDKService.getSystemInfo(),
        health: () => miraSDKService.getSystemHealth()
      }
    }
  }
}

// 类型声明，让 TypeScript 知道这些全局对象的存在
declare global {
  interface Window {
    mira?: {
      connect: (config: any) => Promise<any>
      disconnect: () => Promise<any>
      testConnection: () => Promise<any>
      isConnected: () => boolean
      auth: {
        login: (credentials: any) => Promise<any>
        register: (userData: any) => Promise<any>
        logout: () => Promise<any>
        getCurrentUser: () => Promise<any>
      }
      files: {
        list: (libraryId?: string) => Promise<any>
        upload: (file: File, libraryId: string, metadata?: any) => Promise<any>
        download: (libraryId: string, fileId: string) => Promise<Blob>
        delete: (libraryId: string, fileId: string) => Promise<any>
      }
      library: {
        getLibraries: () => Promise<any>
        createLibrary: (name: string, description?: string) => Promise<any>
        addToLibrary: (fileId: string, libraryId: string) => Promise<any>
      }
      plugins: {
        list: () => Promise<any>
        install: (pluginId: string) => Promise<any>
        uninstall: (pluginId: string) => Promise<any>
        execute: (pluginId: string, args: any) => Promise<any>
      }
      system: {
        info: () => Promise<any>
        health: () => Promise<any>
      }
    }
    miraSDK?: typeof miraSDKService
  }
}

export { miraSDKService }
