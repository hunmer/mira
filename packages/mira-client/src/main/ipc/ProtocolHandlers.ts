import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ProtocolService } from '../services/ProtocolService'
import { BaseResponse } from '../../shared/types'

/**
 * 协议处理 IPC 处理器
 */
export class ProtocolHandlers {
  private protocolService: ProtocolService

  constructor() {
    this.protocolService = ProtocolService.getInstance()
    this.registerHandlers()
  }

  /**
   * 注册协议相关的 IPC 处理器
   */
  private registerHandlers(): void {
    // 协议处理
    ipcMain.handle('protocol:register-handler', this.handleRegisterProtocolHandler.bind(this))
    ipcMain.handle('protocol:unregister-handler', this.handleUnregisterProtocolHandler.bind(this))
    ipcMain.handle('protocol:get-handlers', this.handleGetProtocolHandlers.bind(this))
    ipcMain.handle('protocol:create-url', this.handleCreateProtocolUrl.bind(this))
  }

  /**
   * 处理注册协议处理器
   */
  private async handleRegisterProtocolHandler(
    _event: IpcMainInvokeEvent,
    type: string,
    handler: string
  ): Promise<BaseResponse> {
    try {
      // 将字符串形式的处理器转换为函数并注册
      const handlerFunction = new Function('data', handler) as (data: any) => Promise<void> | void
      this.protocolService.registerHandler(type, handlerFunction)
      return { success: true, message: 'Protocol handler registered successfully' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to register protocol handler'
      }
    }
  }

  /**
   * 处理取消注册协议处理器
   */
  private async handleUnregisterProtocolHandler(
    _event: IpcMainInvokeEvent,
    type: string
  ): Promise<BaseResponse> {
    try {
      this.protocolService.unregisterHandler(type)
      return { success: true, message: 'Protocol handler unregistered successfully' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unregister protocol handler'
      }
    }
  }

  /**
   * 处理获取协议处理器列表
   */
  private async handleGetProtocolHandlers(_event: IpcMainInvokeEvent): Promise<string[]> {
    try {
      return this.protocolService.getRegisteredHandlers()
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get protocol handlers')
    }
  }

  /**
   * 处理创建协议 URL
   */
  private async handleCreateProtocolUrl(
    _event: IpcMainInvokeEvent,
    type: string,
    data: any
  ): Promise<string> {
    try {
      return ProtocolService.createProtocolUrl(type, data)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create protocol URL')
    }
  }
}
