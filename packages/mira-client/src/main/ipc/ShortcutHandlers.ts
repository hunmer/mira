import { ipcMain, globalShortcut, BrowserWindow } from 'electron'
import { logger } from '../utils/Logger'

/**
 * 快捷键处理器
 * 负责全局快捷键的注册、注销和事件分发
 */
export class ShortcutHandlers {
  private mainWindow: BrowserWindow | null = null
  private registeredShortcuts = new Map<string, string>() // shortcut -> actionId

  constructor() {
    this.registerHandlers()
  }

  /**
   * 设置主窗口引用
   */
  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * 注册IPC处理器
   */
  private registerHandlers(): void {
    // 注册全局快捷键
    ipcMain.handle('shortcut:register', this.handleRegisterShortcut.bind(this))

    // 注销全局快捷键
    ipcMain.handle('shortcut:unregister', this.handleUnregisterShortcut.bind(this))

    // 注销所有快捷键
    ipcMain.handle('shortcut:unregister-all', this.handleUnregisterAllShortcuts.bind(this))

    // 获取已注册的快捷键
    ipcMain.handle('shortcut:get-registered', this.handleGetRegisteredShortcuts.bind(this))

    logger.info('ShortcutHandlers', 'IPC handlers registered')
  }

  /**
   * 处理注册快捷键请求
   */
  private async handleRegisterShortcut(
    _event: Electron.IpcMainInvokeEvent,
    shortcut: string,
    actionId: string
  ): Promise<boolean> {
    try {
      logger.debug('ShortcutHandlers', 'Registering global shortcut', { shortcut, actionId })

      // 检查快捷键是否已经被注册
      if (this.registeredShortcuts.has(shortcut)) {
        logger.warn('ShortcutHandlers', 'Shortcut already registered, unregistering first', { shortcut })
        await this.unregisterShortcut(shortcut)
      }

      // 注册全局快捷键
      const success = globalShortcut.register(shortcut, () => {
        logger.debug('ShortcutHandlers', 'Global shortcut triggered', { shortcut, actionId })

        // 向渲染进程发送快捷键触发事件
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('shortcut:triggered', actionId)
        } else {
          logger.warn('ShortcutHandlers', 'Main window not available for shortcut event', { shortcut, actionId })
        }
      })

      if (success) {
        this.registeredShortcuts.set(shortcut, actionId)
        logger.info('ShortcutHandlers', 'Global shortcut registered successfully', { shortcut, actionId })
        return true
      } else {
        logger.error('ShortcutHandlers', 'Failed to register global shortcut', { shortcut, actionId })
        return false
      }
    } catch (error) {
      logger.error('ShortcutHandlers', 'Error registering global shortcut', { shortcut, actionId, error })
      return false
    }
  }

  /**
   * 处理注销快捷键请求
   */
  private async handleUnregisterShortcut(
    _event: Electron.IpcMainInvokeEvent,
    shortcut: string
  ): Promise<boolean> {
    try {
      return await this.unregisterShortcut(shortcut)
    } catch (error) {
      logger.error('ShortcutHandlers', 'Error unregistering shortcut', { shortcut, error })
      return false
    }
  }

  /**
   * 处理注销所有快捷键请求
   */
  private async handleUnregisterAllShortcuts(
    _event: Electron.IpcMainInvokeEvent
  ): Promise<boolean> {
    try {
      logger.info('ShortcutHandlers', 'Unregistering all global shortcuts')

      // 注销所有已注册的快捷键
      for (const shortcut of this.registeredShortcuts.keys()) {
        await this.unregisterShortcut(shortcut)
      }

      // 确保所有全局快捷键都被清理
      globalShortcut.unregisterAll()
      this.registeredShortcuts.clear()

      logger.info('ShortcutHandlers', 'All global shortcuts unregistered')
      return true
    } catch (error) {
      logger.error('ShortcutHandlers', 'Error unregistering all shortcuts', { error })
      return false
    }
  }

  /**
   * 处理获取已注册快捷键请求
   */
  private async handleGetRegisteredShortcuts(
    _event: Electron.IpcMainInvokeEvent
  ): Promise<Record<string, string>> {
    try {
      const shortcuts: Record<string, string> = {}
      for (const [shortcut, actionId] of this.registeredShortcuts.entries()) {
        shortcuts[shortcut] = actionId
      }

      logger.debug('ShortcutHandlers', 'Returning registered shortcuts', { count: Object.keys(shortcuts).length })
      return shortcuts
    } catch (error) {
      logger.error('ShortcutHandlers', 'Error getting registered shortcuts', { error })
      return {}
    }
  }

  /**
   * 注销单个快捷键的内部方法
   */
  private async unregisterShortcut(shortcut: string): Promise<boolean> {
    try {
      if (!this.registeredShortcuts.has(shortcut)) {
        logger.debug('ShortcutHandlers', 'Shortcut not registered, nothing to unregister', { shortcut })
        return true
      }

      const actionId = this.registeredShortcuts.get(shortcut)
      logger.debug('ShortcutHandlers', 'Unregistering global shortcut', { shortcut, actionId })

      // 从Electron全局快捷键中注销
      globalShortcut.unregister(shortcut)

      // 从本地记录中移除
      this.registeredShortcuts.delete(shortcut)

      logger.info('ShortcutHandlers', 'Global shortcut unregistered successfully', { shortcut, actionId })
      return true
    } catch (error) {
      logger.error('ShortcutHandlers', 'Error unregistering shortcut', { shortcut, error })
      return false
    }
  }

  /**
   * 清理所有快捷键（在应用退出时调用）
   */
  public cleanup(): void {
    try {
      logger.info('ShortcutHandlers', 'Cleaning up shortcuts on app exit')
      globalShortcut.unregisterAll()
      this.registeredShortcuts.clear()
      logger.info('ShortcutHandlers', 'Shortcuts cleanup completed')
    } catch (error) {
      logger.error('ShortcutHandlers', 'Error during shortcuts cleanup', { error })
    }
  }

  /**
   * 获取已注册快捷键的数量
   */
  public getRegisteredCount(): number {
    return this.registeredShortcuts.size
  }

  /**
   * 检查快捷键是否已注册
   */
  public isRegistered(shortcut: string): boolean {
    return this.registeredShortcuts.has(shortcut)
  }

  /**
   * 获取快捷键对应的动作ID
   */
  public getActionId(shortcut: string): string | undefined {
    return this.registeredShortcuts.get(shortcut)
  }

  /**
   * 重新注册所有快捷键（在主窗口重新创建时使用）
   */
  public async reregisterAll(): Promise<void> {
    try {
      logger.info('ShortcutHandlers', 'Re-registering all shortcuts')

      const shortcuts = Array.from(this.registeredShortcuts.entries())

      // 先清理所有现有快捷键
      globalShortcut.unregisterAll()
      this.registeredShortcuts.clear()

      // 重新注册所有快捷键
      for (const [shortcut, actionId] of shortcuts) {
        await this.handleRegisterShortcut({} as any, shortcut, actionId)
      }

      logger.info('ShortcutHandlers', 'All shortcuts re-registered', { count: shortcuts.length })
    } catch (error) {
      logger.error('ShortcutHandlers', 'Error re-registering shortcuts', { error })
    }
  }
}