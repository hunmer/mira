import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'node:path'
import { logger } from '../utils/Logger'

/**
 * 托盘设置接口
 */
export interface TraySettings {
  enabled: boolean
  clickAction: 'toggle' | 'show' | 'minimize'
}

/**
 * 托盘服务类 - 管理系统托盘
 */
export class TrayService {
  private static instance: TrayService | null = null
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null
  private showMainWindowCallback: (() => void) | null = null
  private settings: TraySettings = {
    enabled: true,
    clickAction: 'toggle'
  }

  private constructor() {}

  public static getInstance(): TrayService {
    if (!TrayService.instance) {
      TrayService.instance = new TrayService()
    }
    return TrayService.instance
  }

  /**
   * 初始化托盘
   */
  public init(mainWindow: BrowserWindow, showMainWindow: () => void): void {
    this.mainWindow = mainWindow
    this.showMainWindowCallback = showMainWindow
    
    if (this.settings.enabled) {
      this.createTray()
    }

    logger.info('TrayService', 'Tray service initialized', { enabled: this.settings.enabled })
  }

  /** 主窗口重建后刷新引用 */
  public setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow
  }

  /**
   * 设置托盘配置
   */
  public updateSettings(settings: Partial<TraySettings>): void {
    const oldEnabled = this.settings.enabled
    this.settings = { ...this.settings, ...settings }

    if (oldEnabled !== this.settings.enabled) {
      if (this.settings.enabled) {
        this.createTray()
      } else {
        this.destroyTray()
      }
    } else if (this.tray && this.settings.enabled) {
      // 如果托盘已存在且仍启用，更新上下文菜单
      this.updateContextMenu()
    }

    logger.info('TrayService', 'Tray settings updated', this.settings)
  }

  /**
   * 获取当前设置
   */
  public getSettings(): TraySettings {
    return { ...this.settings }
  }

  /**
   * 创建托盘
   */
  private createTray(): void {
    if (this.tray) {
      logger.debug('TrayService', 'Tray already exists, skipping creation')
      return
    }

    try {
      // 创建托盘图标
      const iconPath = this.getTrayIconPath()
      const trayIcon = nativeImage.createFromPath(iconPath)
      
      // 为不同平台调整图标大小
      if (process.platform === 'darwin') {
        trayIcon.setTemplateImage(true)
      }
      
      this.tray = new Tray(trayIcon)
      
      // 设置工具提示
      this.tray.setToolTip('Mira Media Library')
      
      // 设置上下文菜单
      this.updateContextMenu()
      
      // 设置单击事件
      this.tray.on('click', this.handleTrayClick.bind(this))
      
      // 设置双击事件
      this.tray.on('double-click', this.handleTrayDoubleClick.bind(this))

      logger.info('TrayService', 'Tray created successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('TrayService', `Failed to create tray: ${errorMessage}`)
    }
  }

  /**
   * 销毁托盘
   */
  private destroyTray(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
      logger.info('TrayService', 'Tray destroyed')
    }
  }

  /**
   * 更新上下文菜单
   */
  private updateContextMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          this.showMainWindow()
        }
      },
      {
        label: '隐藏窗口',
        click: () => {
          this.hideMainWindow()
        }
      },
      { type: 'separator' },
      {
        label: '关于 Mira',
        click: () => {
          this.showAbout()
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  /**
   * 处理托盘单击事件
   */
  private handleTrayClick(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.showMainWindow()
      return
    }

    switch (this.settings.clickAction) {
      case 'toggle':
        if (this.mainWindow.isVisible() && !this.mainWindow.isMinimized()) {
          this.hideMainWindow()
        } else {
          this.showMainWindow()
        }
        break
      case 'show':
        this.showMainWindow()
        break
      case 'minimize':
        this.hideMainWindow()
        break
    }
  }

  /**
   * 处理托盘双击事件
   */
  private handleTrayDoubleClick(): void {
    // 双击总是显示窗口
    this.showMainWindow()
  }

  /**
   * 显示主窗口
   */
  private showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.showMainWindowCallback?.()
      return
    }

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    
    this.mainWindow.show()
    this.mainWindow.focus()
    
    // macOS 特定：显示应用在 Dock 中
    if (process.platform === 'darwin') {
      app.dock?.show()
    }

    logger.debug('TrayService', 'Main window shown via tray')
  }

  /**
   * 隐藏主窗口
   */
  private hideMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    this.mainWindow.hide()
    
    // macOS 特定：隐藏应用在 Dock 中
    if (process.platform === 'darwin') {
      app.dock?.hide()
    }

    logger.debug('TrayService', 'Main window hidden via tray')
  }

  /**
   * 显示关于对话框
   */
  private showAbout(): void {
    // 发送消息到主窗口显示关于对话框
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('tray:show-about')
    }
  }

  /**
   * 获取托盘图标路径
   */
  private getTrayIconPath(): string {
    let iconName: string

    if (process.platform === 'win32') {
      iconName = 'tray-icon.ico'
    } else {
      iconName = 'tray-icon.png'
    }

    const assetsDir = app.isPackaged
      ? join(process.resourcesPath, 'assets')
      : join(__dirname, '../assets')
    const iconPath = join(assetsDir, iconName)
    logger.debug('TrayService', 'Tray icon path', { iconPath, isPackaged: app.isPackaged })

    return iconPath
  }

  /**
   * 设置托盘图标闪烁（用于通知）
   */
  public flashTray(duration = 3000): void {
    if (!this.tray) return

    let isFlashing = false
    const originalIconPath = this.getTrayIconPath()
    const originalImage = nativeImage.createFromPath(originalIconPath)
    
    const flashInterval = setInterval(() => {
      if (!this.tray) {
        clearInterval(flashInterval)
        return
      }
      
      if (isFlashing) {
        this.tray.setImage(originalImage)
      } else {
        // 创建一个空的图标用于闪烁效果
        const flashIcon = nativeImage.createEmpty()
        this.tray.setImage(flashIcon)
      }
      isFlashing = !isFlashing
    }, 500)

    setTimeout(() => {
      clearInterval(flashInterval)
      if (this.tray) {
        this.tray.setImage(originalImage)
      }
    }, duration)
  }

  /**
   * 更新托盘工具提示
   */
  public setToolTip(tooltip: string): void {
    if (this.tray) {
      this.tray.setToolTip(tooltip)
    }
  }

  /**
   * 检查托盘是否可用
   */
  public isSupported(): boolean {
    // 托盘在大多数桌面环境中都支持，除了一些特殊情况
    return process.platform !== 'linux' || !!process.env.DISPLAY
  }

  /** 托盘已创建且可作为窗口关闭后的入口 */
  public isActive(): boolean {
    return Boolean(this.tray && !this.tray.isDestroyed())
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.destroyTray()
    this.mainWindow = null
    this.showMainWindowCallback = null
    logger.info('TrayService', 'Tray service cleaned up')
  }
}
