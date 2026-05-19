import { ipcMain, IpcMainInvokeEvent, clipboard, nativeImage } from 'electron'
import * as os from 'os'

/**
 * 系统信息和剪贴板操作 IPC 处理器
 */
export class SystemHandlers {
  constructor() {
    this.registerHandlers()
  }

  /**
   * 注册系统相关的 IPC 处理器
   */
  private registerHandlers(): void {
    // 系统信息
    ipcMain.handle('system:getPlatform', this.handleSystemGetPlatform.bind(this))
    ipcMain.handle('system:getArch', this.handleSystemGetArch.bind(this))

    // 剪贴板操作
    ipcMain.handle('clipboard:writeText', this.handleClipboardWriteText.bind(this))
    ipcMain.handle('clipboard:readText', this.handleClipboardReadText.bind(this))
    ipcMain.handle('clipboard:writeImage', this.handleClipboardWriteImage.bind(this))
    ipcMain.handle('clipboard:readImage', this.handleClipboardReadImage.bind(this))
  }

  /**
   * 处理获取系统平台
   */
  private async handleSystemGetPlatform(_event: IpcMainInvokeEvent): Promise<string> {
    return os.platform()
  }

  /**
   * 处理获取系统架构
   */
  private async handleSystemGetArch(_event: IpcMainInvokeEvent): Promise<string> {
    return os.arch()
  }

  /**
   * 处理写入文本到剪贴板
   */
  private async handleClipboardWriteText(
    _event: IpcMainInvokeEvent,
    text: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      clipboard.writeText(text)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to write text to clipboard'
      }
    }
  }

  /**
   * 处理从剪贴板读取文本
   */
  private async handleClipboardReadText(_event: IpcMainInvokeEvent): Promise<string> {
    return clipboard.readText()
  }

  /**
   * 处理写入图片到剪贴板
   */
  private async handleClipboardWriteImage(
    _event: IpcMainInvokeEvent,
    imagePath: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const image = nativeImage.createFromPath(imagePath)
      clipboard.writeImage(image)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to write image to clipboard'
      }
    }
  }

  /**
   * 处理从剪贴板读取图片
   */
  private async handleClipboardReadImage(_event: IpcMainInvokeEvent): Promise<{
    success: boolean
    data?: string
    message?: string
  }> {
    try {
      const image = clipboard.readImage()
      if (image.isEmpty()) {
        return { success: false, message: 'No image in clipboard' }
      }
      
      // 转换为 base64
      const buffer = image.toPNG()
      const base64 = buffer.toString('base64')
      return { success: true, data: `data:image/png;base64,${base64}` }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to read image from clipboard'
      }
    }
  }
}
