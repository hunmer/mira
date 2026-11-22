import { MiraClient } from 'mira-app-core/shared/sdk'
import { initializeWebSocket, webSocketService } from './WebSocketService'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import type {
  MiraConnectionConfig,
  BaseResponse
} from '../../shared/types'
import { MiraSDKServiceBase } from './sdk/MiraSDKServiceBase'
import { MiraSDKAuthPart } from './sdk/parts/AuthPart'
import { MiraSDKUserPart } from './sdk/parts/UserPart'
import { MiraSDKFilePart } from './sdk/parts/FilePart'
import { MiraSDKFolderPart } from './sdk/parts/FolderPart'
import { MiraSDKTagPart } from './sdk/parts/TagPart'
import { MiraSDKLibraryPart } from './sdk/parts/LibraryPart'
import { MiraSDKStatisticsPart } from './sdk/parts/StatisticsPart'
import { MiraSDKSystemPart } from './sdk/parts/SystemPart'
import { MiraSDKPluginPart } from './sdk/parts/PluginPart'

/**
 * Mira SDK 服务封装类
 * 直接使用 mira-server-sdk，支持 web 端和 Electron 端
 *
 * 按 core SDK 模块边界拆分为 partial（services/sdk/parts/*），本类为组合根：
 * - 连接/WebSocket/生命周期方法在本体
 * - AuthModule/UserModule/FileModule/FolderModule/TagModule/LibraryModule/
 *   StatisticsModule/SystemModule/PluginModule 分别在 parts/ 下与 Base 组合
 * - 运行时由 applyMixins 复制各 partial 原型（含 getter），
 *   类型上由下方 interface 声明合并，对外 API 与拆分前完全一致
 */
export class MiraSDKService extends MiraSDKServiceBase {
  /**
   * 连接到 Mira 服务器
   */
  async connect(config: MiraConnectionConfig): Promise<BaseResponse> {
    try {
      const authStore = useAuthStore()
      useSettingsStore().setConnectionStatus('connecting')

      this.client = new MiraClient(config.serverUrl, {
        timeout: config.timeout || 30000,
        getToken: () => authStore.token ?? undefined,
        onUnauthorized: async () => {
          const success = await authStore.reauthenticate()
          return success ? authStore.token ?? undefined : undefined
        }
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
   * 获取当前连接配置
   */
  getConnectionConfig(): MiraConnectionConfig | null {
    return this.connectionConfig
  }
}

/**
 * Partial 组合类型声明：MiraSDKService 同时具备各 SDK 模块 partial 的方法。
 * （与上方 class 同名声明合并；各 partial 与本类继承同一 MiraSDKServiceBase，
 * protected 成员同源，TS 视为等价 partial class 组合）
 */
export interface MiraSDKService extends
  MiraSDKAuthPart,
  MiraSDKUserPart,
  MiraSDKFilePart,
  MiraSDKFolderPart,
  MiraSDKTagPart,
  MiraSDKLibraryPart,
  MiraSDKStatisticsPart,
  MiraSDKSystemPart,
  MiraSDKPluginPart {}

/** 将各 partial 的原型成员（含 getter/setter 描述符）复制到组合类原型上 */
function applyMixins(derivedCtor: any, baseCtors: any[]): void {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      if (name === 'constructor') return
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
      )
    })
  })
}

applyMixins(MiraSDKService, [
  MiraSDKAuthPart,
  MiraSDKUserPart,
  MiraSDKFilePart,
  MiraSDKFolderPart,
  MiraSDKTagPart,
  MiraSDKLibraryPart,
  MiraSDKStatisticsPart,
  MiraSDKSystemPart,
  MiraSDKPluginPart
])

// 创建单例实例
export const miraSDKService = new MiraSDKService()
