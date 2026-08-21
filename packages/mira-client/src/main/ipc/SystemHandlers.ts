import { ipcMain, IpcMainInvokeEvent, clipboard, nativeImage } from 'electron'
import { execFile } from 'child_process'
import { stat } from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

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
    ipcMain.handle('clipboard:readHTML', this.handleClipboardReadHTML.bind(this))
    ipcMain.handle('clipboard:writeImage', this.handleClipboardWriteImage.bind(this))
    ipcMain.handle('clipboard:readImage', this.handleClipboardReadImage.bind(this))
    ipcMain.handle('clipboard:readFiles', this.handleClipboardReadFiles.bind(this))
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

  private async handleClipboardReadHTML(_event: IpcMainInvokeEvent): Promise<string> {
    return clipboard.readHTML()
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

  /**
   * Electron/Chromium 无法直接读取 Windows 资源管理器的 FileDropList。
   * 通过 STA PowerShell 调用系统剪切板 API，返回文件元数据供渲染进程惰性读取。
   */
  private async handleClipboardReadFiles(_event: IpcMainInvokeEvent): Promise<{
    success: boolean
    data?: Array<{ name: string; path: string; ext: string; size: number; isDir: false }>
    message?: string
  }> {
    if (process.platform !== 'win32') return { success: true, data: [] }

    try {
      const script = [
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
        'Add-Type -AssemblyName System.Windows.Forms',
        '$paths = @([Windows.Forms.Clipboard]::GetFileDropList() | ForEach-Object { [string]$_ })',
        '[Console]::Write((ConvertTo-Json -Compress -InputObject @($paths)))'
      ].join('; ')
      const encodedCommand = Buffer.from(script, 'utf16le').toString('base64')
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile(
          'powershell.exe',
          ['-STA', '-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand],
          { encoding: 'utf8', timeout: 5000, windowsHide: true },
          (error, output) => error ? reject(error) : resolve(output)
        )
      })
      const parsed = JSON.parse(stdout.trim() || '[]')
      const filePaths = (Array.isArray(parsed) ? parsed : [parsed]).filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      )
      const nodes = (await Promise.all(filePaths.map(async (filePath) => {
        try {
          const fileStat = await stat(filePath)
          if (!fileStat.isFile()) return null
          return {
            name: path.basename(filePath),
            path: filePath,
            ext: path.extname(filePath),
            size: fileStat.size,
            isDir: false as const
          }
        } catch {
          return null
        }
      }))).filter((node): node is NonNullable<typeof node> => node !== null)

      return { success: true, data: nodes }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to read files from clipboard'
      }
    }
  }
}
