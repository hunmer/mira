import { ipcMain, Menu, dialog, app } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { logger } from '../utils/Logger'

/**
 * 菜单 IPC 处理器
 * 处理来自渲染进程的菜单相关请求
 */
export class MenuHandlers {
  private mainWindow: BrowserWindow | null = null

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
   * 注册 IPC 处理器
   */
  private registerHandlers(): void {
    // 更新应用菜单
    ipcMain.handle('menu:update', this.updateApplicationMenu.bind(this))
    
    // 处理菜单导航
    ipcMain.handle('menu:navigate', this.handleMenuNavigation.bind(this))
    
    // 处理菜单动作
    ipcMain.handle('menu:action', this.handleMenuAction.bind(this))

    logger.info('MenuHandlers', 'Menu IPC handlers registered')
  }

  /**
   * 移除所有处理器
   */
  public removeAllHandlers(): void {
    ipcMain.removeHandler('menu:update')
    ipcMain.removeHandler('menu:navigate')
    ipcMain.removeHandler('menu:action')
    
    logger.info('MenuHandlers', 'Menu IPC handlers removed')
  }

  /**
   * 更新应用菜单
   */
  private async updateApplicationMenu(_event: any, template: any[]): Promise<void> {
    try {
      // 为菜单项添加点击处理函数
      const processedTemplate = this.addClickHandlersToTemplate(template)
      
      const menu = Menu.buildFromTemplate(processedTemplate)
      Menu.setApplicationMenu(menu)
      logger.debug('MenuHandlers', 'Application menu updated')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('MenuHandlers', `Failed to update application menu: ${errorMessage}`)
      throw error
    }
  }

  /**
   * 为菜单模板添加点击处理函数
   */
  private addClickHandlersToTemplate(template: any[]): MenuItemConstructorOptions[] {
    return template.map(menuItem => {
      const processedItem: MenuItemConstructorOptions = {
        ...menuItem,
        submenu: menuItem.submenu ? this.addClickHandlersToSubmenu(menuItem.submenu) : undefined
      }
      return processedItem
    })
  }

  /**
   * 为子菜单添加点击处理函数
   */
  private addClickHandlersToSubmenu(submenu: any[]): MenuItemConstructorOptions[] {
    return submenu.map(item => {
      const processedItem: MenuItemConstructorOptions = {
        ...item,
        submenu: item.submenu ? this.addClickHandlersToSubmenu(item.submenu) : undefined
      }

      // 如果菜单项有路由或动作，添加点击处理函数
      if ((item.route || item.action) && !item.role) {
        processedItem.click = () => {
          if (item.route) {
            this.handleMenuNavigation(null, item.route)
          } else if (item.action) {
            this.handleMenuAction(null, item.action)
          }
        }
      }

      return processedItem
    })
  }

  /**
   * 处理菜单导航
   */
  private async handleMenuNavigation(_event: any, routeName: string): Promise<void> {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('menu:navigate', routeName)
        logger.debug('MenuHandlers', `Navigation request sent: ${routeName}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('MenuHandlers', `Failed to handle navigation: ${errorMessage}`)
      throw error
    }
  }

  /**
   * 处理菜单动作
   */
  private async handleMenuAction(_event: any, action: string): Promise<void> {
    try {
      switch (action) {
        case 'showConnectionDialog':
          await this.showConnectionDialog()
          break
        
        case 'disconnect':
          this.sendToRenderer('menu:disconnect')
          break
        
        case 'showImportDialog':
          await this.showImportDialog()
          break

        case 'showImportFromUrlDialog':
          this.sendToRenderer('files:import-from-url')
          break
        
        case 'exportSelected':
          this.sendToRenderer('menu:export')
          break
        
        case 'quit':
          app.quit()
          break
        
        case 'refresh':
          this.sendToRenderer('menu:refresh')
          break
        
        case 'showAbout':
          await this.showAboutDialog()
          break
        
        case 'showWindowStateInfo':
          await this.showWindowStateInfo()
          break
        
        case 'checkUpdates':
          await this.checkUpdates()
          break
        
        default:
          logger.warn('MenuHandlers', `Unknown menu action: ${action}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('MenuHandlers', `Failed to handle menu action: ${errorMessage}`)
      throw error
    }
  }

  /**
   * 发送消息到渲染进程
   */
  private sendToRenderer(channel: string, ...args: any[]): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args)
    }
  }

  /**
   * 显示连接对话框
   */
  private async showConnectionDialog(): Promise<void> {
    if (!this.mainWindow) return

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '连接到 Mira 服务器',
      message: '请在设置页面配置服务器连接信息',
      buttons: ['取消', '打开设置'],
      defaultId: 1
    })

    if (result.response === 1) {
      this.sendToRenderer('menu:navigate', 'Settings')
    }
  }

  /**
   * 显示导入对话框
   */
  private async showImportDialog(): Promise<void> {
    if (!this.mainWindow) return

    const result = await dialog.showOpenDialog(this.mainWindow, {
      title: '选择要导入的文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
        { name: '视频', extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'] },
        { name: '音频', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })

    if (!result.canceled && result.filePaths.length > 0) {
      this.sendToRenderer('files:import', result.filePaths)
    }
  }

  /**
   * 显示关于对话框
   */
  private async showAboutDialog(): Promise<void> {
    if (!this.mainWindow) return

    await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '关于 Mira Media Library',
      message: 'Mira Media Library',
      detail: `版本: ${app.getVersion()}\n基于 Electron ${process.versions.electron}\n\n专业的媒体资源管理工具`,
      buttons: ['确定']
    })
  }

  /**
   * 显示窗口状态信息
   */
  private async showWindowStateInfo(): Promise<void> {
    if (!this.mainWindow) return

    const stateInfo = this.getWindowStateInfo()
    const stateText = JSON.stringify(stateInfo, null, 2)

    await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '窗口状态信息',
      message: '当前窗口状态',
      detail: stateText,
      buttons: ['确定']
    })
  }

  /**
   * 检查更新
   */
  private async checkUpdates(): Promise<void> {
    if (!this.mainWindow) return

    // TODO: 实现真正的更新检查逻辑
    await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '检查更新',
      message: '当前已是最新版本',
      detail: `版本: ${app.getVersion()}`,
      buttons: ['确定']
    })
  }

  /**
   * 获取窗口状态信息
   */
  private getWindowStateInfo(): object {
    if (this.mainWindow) {
      const bounds = this.mainWindow.getBounds()
      return {
        ...bounds,
        isMaximized: this.mainWindow.isMaximized(),
        isMinimized: this.mainWindow.isMinimized(),
        isFullScreen: this.mainWindow.isFullScreen(),
        isVisible: this.mainWindow.isVisible()
      }
    }
    return {}
  }
}
