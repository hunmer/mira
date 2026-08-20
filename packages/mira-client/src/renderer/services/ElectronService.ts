import type {
  ElectronAPI
} from '../../shared/types'

/**
 * Electron 服务封装类
 * 只处理系统级别的 API 调用（剪切板、文件系统、窗口管理等）
 */
export class ElectronService {
  private api: ElectronAPI

  constructor() {
    // 检查是否在 Electron 环境中运行
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.api = window.electronAPI
    } else {
        this.api = this.createMockAPI()
    }
  }

  /**
   * 创建模拟 API 用于开发环境
   */
  private createMockAPI(): ElectronAPI {
    return {
      // 开发环境 mock 仅实现基础字段，其余按需补全
      isDevelopment: false,
      isProduction: true,
      invoke: async () => ({ success: false, message: 'Mock API - not implemented' }),
      send: () => {},
      on: () => {},
      removeAllListeners: () => {},
      platform: 'win32',
      // 以下字段仅为满足 ElectronAPI 类型，开发环境 mock 暂未完整实现
      process: (typeof process !== 'undefined' ? process : {} as NodeJS.Process),

      // Protocol handling API
      protocol: {
        registerHandler: async () => ({ success: false, message: 'Mock API' }),
        unregisterHandler: async () => ({ success: false, message: 'Mock API' }),
        getHandlers: async () => [],
        createUrl: async () => 'mock://url'
      },
      
      // Tray management API
      tray: {
        updateSettings: async () => ({ success: false, message: 'Mock API' }),
        getSettings: async () => ({ enabled: false, clickAction: 'toggle' as const }),
        isSupported: async () => false,
        flash: async () => ({ success: false, message: 'Mock API' }),
        setTooltip: async () => ({ success: false, message: 'Mock API' })
      }
    } as unknown as ElectronAPI
  }

  /**
   * 获取平台信息
   */
  getPlatform(): string {
    return this.api.platform
  }

  /**
   * 检查是否在 Electron 环境中
   */
  isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI
  }

  /**
   * 系统级别的 API 调用
   */
  
  /**
   * 调用主进程方法
   */
  async invoke(channel: string, ...args: any[]): Promise<any> {
    return await this.api.invoke(channel, ...args)
  }

  /**
   * 剪切板操作
   */
  async writeToClipboard(text: string): Promise<void> {
    if (this.isElectron()) {
      await this.api.invoke('clipboard:writeText', text)
    } else {
      // Web 环境的剪切板 API
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        console.warn('Clipboard API not available')
      }
    }
  }

  async readFromClipboard(): Promise<string> {
    if (this.isElectron()) {
      return await this.api.invoke('clipboard:readText')
    } else {
      // Web 环境的剪切板 API
      if (navigator.clipboard) {
        return await navigator.clipboard.readText()
      } else {
        console.warn('Clipboard API not available')
        return ''
      }
    }
  }

  /**
   * 文件系统操作（仅 Electron）
   */
  async showOpenDialog(options?: any): Promise<any> {
    if (!this.isElectron()) {
      throw new Error('File dialog is only available in Electron environment')
    }
    return await this.api.invoke('dialog:showOpenDialog', options)
  }

  async showSaveDialog(options?: any): Promise<any> {
    if (!this.isElectron()) {
      throw new Error('File dialog is only available in Electron environment')
    }
    return await this.api.invoke('dialog:showSaveDialog', options)
  }

  /**
   * 窗口管理（仅 Electron）
   */
  async minimizeWindow(): Promise<void> {
    if (this.isElectron()) {
      await this.api.invoke('window:minimize')
    }
  }

  async maximizeWindow(): Promise<void> {
    if (this.isElectron()) {
      await this.api.invoke('window:maximize')
    }
  }

  async toggleWindowSize(): Promise<void> {
    if (this.isElectron()) {
      await this.api.invoke('window:toggleSize')
    }
  }

  async closeWindow(): Promise<void> {
    if (this.isElectron()) {
      await this.api.invoke('window:close')
    }
  }

  async setFullScreen(flag: boolean): Promise<void> {
    if (this.isElectron()) {
      await this.api.invoke('window:setFullScreen', flag)
    }
  }

  /**
   * 应用程序控制（仅 Electron）
   */
  async quitApp(): Promise<void> {
    if (this.isElectron()) {
      await this.api.invoke('app:quit')
    }
  }

  async getAppVersion(): Promise<string> {
    if (this.isElectron()) {
      return await this.api.invoke('app:getVersion')
    } else {
      return '1.0.0-web'
    }
  }

  /**
   * 事件监听
   */
  on(channel: string, callback: (...args: any[]) => void): void {
    this.api.on(channel, callback)
  }

  /**
   * 移除事件监听
   */
  removeAllListeners(channel: string): void {
    this.api.removeAllListeners(channel)
  }

  /**
   * 发送消息到主进程
   */
  send(channel: string, ...args: any[]): void {
    this.api.send(channel, ...args)
  }
}

// 创建单例实例
export const electronService = new ElectronService()
