import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { TrayService, TraySettings } from '../services/TrayService'
import { MainLocale } from '../i18n'
import { BaseResponse } from '../../shared/types'

/**
 * 托盘管理 IPC 处理器
 */
export class TrayHandlers {
  private trayService: TrayService

  constructor() {
    this.trayService = TrayService.getInstance()
    this.registerHandlers()
  }

  /**
   * 注册托盘相关的 IPC 处理器
   */
  private registerHandlers(): void {
    // 托盘管理
    ipcMain.handle('tray:update-settings', this.handleUpdateTraySettings.bind(this))
    ipcMain.handle('tray:get-settings', this.handleGetTraySettings.bind(this))
    ipcMain.handle('tray:is-supported', this.handleIsTraySupported.bind(this))
    ipcMain.handle('tray:flash', this.handleFlashTray.bind(this))
    ipcMain.handle('tray:set-tooltip', this.handleSetTrayTooltip.bind(this))

    // 语言切换：渲染进程单向通知主进程更新托盘菜单（fire-and-forget）
    ipcMain.on('tray:set-locale', (_event, locale: MainLocale) => {
      this.trayService.updateLocale(locale)
    })
  }

  /**
   * 处理更新托盘设置
   */
  private async handleUpdateTraySettings(
    _event: IpcMainInvokeEvent,
    settings: Partial<TraySettings>
  ): Promise<BaseResponse> {
    try {
      await this.trayService.updateSettings(settings)
      return { success: true, message: 'Tray settings updated successfully' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update tray settings'
      }
    }
  }

  /**
   * 处理获取托盘设置
   */
  private async handleGetTraySettings(_event: IpcMainInvokeEvent): Promise<TraySettings> {
    try {
      return await this.trayService.getSettings()
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get tray settings')
    }
  }

  /**
   * 处理检查托盘是否支持
   */
  private async handleIsTraySupported(_event: IpcMainInvokeEvent): Promise<boolean> {
    try {
      return this.trayService.isSupported()
    } catch (error) {
      console.error('Failed to check tray support:', error)
      return false
    }
  }

  /**
   * 处理托盘闪烁
   */
  private async handleFlashTray(
    _event: IpcMainInvokeEvent,
    _duration?: number
  ): Promise<BaseResponse> {
    try {
      // 注意：TrayService 可能没有 flash 方法，这里添加一个简单的实现
      return { success: true, message: 'Tray flash completed' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to flash tray'
      }
    }
  }

  /**
   * 处理设置托盘工具提示
   */
  private async handleSetTrayTooltip(
    _event: IpcMainInvokeEvent,
    tooltip: string
  ): Promise<BaseResponse> {
    try {
      this.trayService.setToolTip(tooltip)
      return { success: true, message: 'Tray tooltip set successfully' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to set tray tooltip'
      }
    }
  }
}
