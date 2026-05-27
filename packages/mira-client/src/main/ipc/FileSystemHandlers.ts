import { ipcMain, IpcMainInvokeEvent, dialog, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 文件系统操作 IPC 处理器
 */
export class FileSystemHandlers {
  constructor() {
    this.registerHandlers()
  }

  /**
   * 注册文件系统相关的 IPC 处理器
   */
  private registerHandlers(): void {
    // 文件系统操作
    ipcMain.handle('fs:readDir', this.handleFsReadDir.bind(this))
    ipcMain.handle('fs:readFile', this.handleFsReadFile.bind(this))
    ipcMain.handle('fs:writeFile', this.handleFsWriteFile.bind(this))
    ipcMain.handle('fs:exists', this.handleFsExists.bind(this))
    ipcMain.handle('fs:selectDirectory', this.handleFsSelectDirectory.bind(this))
    ipcMain.handle('fs:selectFile', this.handleFsSelectFile.bind(this))
    ipcMain.handle('fs:mkdir', this.handleFsMkdir.bind(this))
    ipcMain.handle('fs:copyFile', this.handleFsCopyFile.bind(this))
    ipcMain.handle('fs:showItemInFolder', this.handleShowItemInFolder.bind(this))
  }

  /**
   * 处理读取目录
   */
  private async handleFsReadDir(
    _event: IpcMainInvokeEvent,
    dirPath: string
  ): Promise<{ success: boolean; data?: string[]; message?: string }> {
    try {
      const items = await fs.promises.readdir(dirPath)
      return { success: true, data: items }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to read directory'
      }
    }
  }

  /**
   * 处理读取文件
   */
  private async handleFsReadFile(
    _event: IpcMainInvokeEvent,
    filePath: string,
    encoding: BufferEncoding = 'utf8'
  ): Promise<{ success: boolean; data?: string; message?: string }> {
    try {
      const data = await fs.promises.readFile(filePath, encoding)
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to read file'
      }
    }
  }

  /**
   * 处理写入文件
   */
  private async handleFsWriteFile(
    _event: IpcMainInvokeEvent,
    filePath: string,
    data: string,
    encoding: BufferEncoding = 'utf8'
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // 确保目录存在
      const dir = path.dirname(filePath)
      await fs.promises.mkdir(dir, { recursive: true })
      
      await fs.promises.writeFile(filePath, data, encoding)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to write file'
      }
    }
  }

  /**
   * 处理检查文件是否存在
   */
  private async handleFsExists(
    _event: IpcMainInvokeEvent,
    filePath: string
  ): Promise<boolean> {
    try {
      await fs.promises.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 处理选择目录
   */
  private async handleFsSelectDirectory(
    _event: IpcMainInvokeEvent,
    title?: string
  ): Promise<{ success: boolean; path?: string; message?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title: title || 'Select Directory',
        properties: ['openDirectory'],
        buttonLabel: 'Select'
      })

      if (result.canceled) {
        return { success: false, message: 'Selection canceled' }
      }

      return { success: true, path: result.filePaths[0] }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to select directory'
      }
    }
  }

  /**
   * 处理选择文件
   */
  private async handleFsSelectFile(
    _event: IpcMainInvokeEvent,
    title?: string,
    filters?: { name: string; extensions: string[] }[]
  ): Promise<{ success: boolean; path?: string; message?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title: title || 'Select File',
        properties: ['openFile'],
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
        buttonLabel: 'Select'
      })

      if (result.canceled) {
        return { success: false, message: 'Selection canceled' }
      }

      return { success: true, path: result.filePaths[0] }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to select file'
      }
    }
  }

  /**
   * 处理创建目录
   */
  private async handleFsMkdir(
    _event: IpcMainInvokeEvent,
    dirPath: string,
    recursive: boolean = true
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await fs.promises.mkdir(dirPath, { recursive })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create directory'
      }
    }
  }

  /**
   * 处理复制文件
   */
  private async handleFsCopyFile(
    _event: IpcMainInvokeEvent,
    src: string,
    dest: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // 确保目标目录存在
      const dir = path.dirname(dest)
      await fs.promises.mkdir(dir, { recursive: true })

      await fs.promises.copyFile(src, dest)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to copy file'
      }
    }
  }

  private handleShowItemInFolder(
    _event: IpcMainInvokeEvent,
    filePath: string
  ): Promise<boolean> {
    return shell.showItemInFolder(filePath)
  }
}
