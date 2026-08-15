import i18n from '../i18n'

export interface MenuItemConfig {
  id: string
  label?: string
  accelerator?: string
  route?: string
  action?: string
  role?: string
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
  submenu?: MenuItemConfig[]
  checked?: boolean
  enabled?: boolean
  visible?: boolean
}

export interface MenuConfig {
  id: string
  label: string
  submenu: MenuItemConfig[]
}

/**
 * 菜单服务 - 管理应用菜单
 * 在渲染进程中运行，通过 IPC 与主进程通信
 */
export class MenuService {
  private static instance: MenuService | null = null
  private menus: Map<string, MenuConfig> = new Map()
  private initialized: boolean = false

  private constructor() {
    this.initializeDefaultMenus()
  }

  private t = i18n.global.t.bind(i18n.global)

  public static getInstance(): MenuService {
    if (!MenuService.instance) {
      MenuService.instance = new MenuService()
    }
    return MenuService.instance
  }

  /**
   * 初始化默认菜单
   */
  private initializeDefaultMenus(): void {
    // 文件菜单
    this.menus.set('file', {
      id: 'file',
      label: this.t('services.menu.file'),
      submenu: [
        {
          id: 'connect-server',
          label: this.t('services.menu.fileConnectServer'),
          accelerator: 'CmdOrCtrl+Shift+C',
          action: 'showConnectionDialog'
        },
        {
          id: 'disconnect-server',
          label: this.t('services.menu.fileDisconnect'),
          accelerator: 'CmdOrCtrl+Shift+D',
          action: 'disconnect'
        },
        { id: 'file-separator-1', type: 'separator' },
        {
          id: 'import-files',
          label: this.t('services.menu.fileImportFiles'),
          accelerator: 'CmdOrCtrl+I',
          action: 'showImportDialog'
        },
        {
          id: 'import-from-url',
          label: this.t('services.menu.fileImportFromUrl'),
          accelerator: 'CmdOrCtrl+Shift+I',
          action: 'showImportFromUrlDialog'
        },
        {
          id: 'export-selected',
          label: this.t('services.menu.fileExportSelected'),
          accelerator: 'CmdOrCtrl+E',
          action: 'exportSelected'
        },
      ]
    })

    // 编辑菜单
    this.menus.set('edit', {
      id: 'edit',
      label: this.t('services.menu.edit'),
      submenu: [
        { id: 'undo', label: this.t('services.menu.editUndo'), role: 'undo' },
        { id: 'redo', label: this.t('services.menu.editRedo'), role: 'redo' },
        { id: 'edit-separator-1', type: 'separator' },
        { id: 'cut', label: this.t('services.menu.editCut'), role: 'cut' },
        { id: 'copy', label: this.t('services.menu.editCopy'), role: 'copy' },
        { id: 'paste', label: this.t('services.menu.editPaste'), role: 'paste' },
        { id: 'select-all', label: this.t('services.menu.editSelectAll'), role: 'selectAll' }
      ]
    })

    // 视图菜单
    this.menus.set('view', {
      id: 'view',
      label: this.t('services.menu.view'),
      submenu: [
        {
          id: 'refresh',
          label: this.t('services.menu.viewRefresh'),
          accelerator: 'CmdOrCtrl+R',
          action: 'refresh'
        },
        { id: 'view-separator-1', type: 'separator' },
        { id: 'reload', label: this.t('services.menu.viewReload'), role: 'reload' },
        { id: 'force-reload', label: this.t('services.menu.viewForceReload'), role: 'forceReload' },
        { id: 'toggle-dev-tools', label: this.t('services.menu.viewDevTools'), role: 'toggleDevTools' },
        { id: 'view-separator-2', type: 'separator' },
        { id: 'reset-zoom', label: this.t('services.menu.viewActualSize'), role: 'resetZoom' },
        { id: 'zoom-in', label: this.t('services.menu.viewZoomIn'), role: 'zoomIn' },
        { id: 'zoom-out', label: this.t('services.menu.viewZoomOut'), role: 'zoomOut' },
        { id: 'view-separator-3', type: 'separator' },
        { id: 'toggle-fullscreen', label: this.t('services.menu.viewFullscreen'), role: 'togglefullscreen' }
      ]
    })

    // 导航菜单 - 基于路由动态生成
    this.menus.set('navigation', {
      id: 'navigation',
      label: this.t('services.menu.navigation'),
      submenu: [
        {
          id: 'nav-home',
          label: this.t('services.menu.navHome'),
          accelerator: 'CmdOrCtrl+1',
          route: 'Home'
        },
        {
          id: 'nav-file-preview',
          label: this.t('services.menu.navFilePreview'),
          accelerator: 'CmdOrCtrl+2',
          route: 'FilePreview'
        },
        {
          id: 'nav-plugins',
          label: this.t('services.menu.navPlugins'),
          accelerator: 'CmdOrCtrl+3',
          route: 'PluginMarketplace'
        },
        {
          id: 'nav-local-plugins',
          label: this.t('services.menu.navLocalPlugins'),
          accelerator: 'CmdOrCtrl+4',
          route: 'LocalPlugins'
        },
        {
          id: 'nav-upload',
          label: this.t('services.menu.navUpload'),
          accelerator: 'CmdOrCtrl+5',
          route: 'FileUpload'
        },
        {
          id: 'nav-settings',
          label: this.t('services.menu.navSettings'),
          accelerator: 'CmdOrCtrl+6',
          route: 'Settings'
        }
      ]
    })

    // 窗口菜单
    this.menus.set('window', {
      id: 'window',
      label: this.t('services.menu.window'),
      submenu: [
        { id: 'minimize', label: this.t('services.menu.windowMinimize'), role: 'minimize' },
        { id: 'close', label: this.t('services.menu.windowClose'), role: 'close' }
      ]
    })

    // 帮助菜单
    this.menus.set('help', {
      id: 'help',
      label: this.t('services.menu.help'),
      submenu: [
        {
          id: 'about',
          label: this.t('services.menu.helpAbout'),
          action: 'showAbout'
        },
        {
          id: 'window-state-info',
          label: this.t('services.menu.helpWindowStateInfo'),
          action: 'showWindowStateInfo'
        },
        {
          id: 'check-updates',
          label: this.t('services.menu.helpCheckUpdates'),
          action: 'checkUpdates'
        }
      ]
    })

    this.initialized = true
  }

  /**
   * 获取所有菜单配置
   */
  public getAllMenus(): MenuConfig[] {
    return Array.from(this.menus.values())
  }

  /**
   * 获取指定菜单
   */
  public getMenu(menuId: string): MenuConfig | undefined {
    return this.menus.get(menuId)
  }

  /**
   * 添加菜单
   */
  public addMenu(menu: MenuConfig): void {
    this.menus.set(menu.id, menu)
    this.updateApplicationMenu()
  }

  /**
   * 移除菜单
   */
  public removeMenu(menuId: string): void {
    this.menus.delete(menuId)
    this.updateApplicationMenu()
  }

  /**
   * 更新菜单
   */
  public updateMenu(menuId: string, menu: MenuConfig): void {
    this.menus.set(menuId, menu)
    this.updateApplicationMenu()
  }

  /**
   * 添加菜单项到指定菜单
   */
  public addMenuItem(menuId: string, menuItem: MenuItemConfig, position?: number): void {
    const menu = this.menus.get(menuId)
    if (!menu) {
      throw new Error(`Menu ${menuId} not found`)
    }

    if (position !== undefined && position >= 0 && position <= menu.submenu.length) {
      menu.submenu.splice(position, 0, menuItem)
    } else {
      menu.submenu.push(menuItem)
    }

    this.updateApplicationMenu()
  }

  /**
   * 移除菜单项
   */
  public removeMenuItem(menuId: string, itemId: string): void {
    const menu = this.menus.get(menuId)
    if (!menu) {
      throw new Error(`Menu ${menuId} not found`)
    }

    const index = menu.submenu.findIndex(item => item.id === itemId)
    if (index >= 0) {
      menu.submenu.splice(index, 1)
      this.updateApplicationMenu()
    }
  }

  /**
   * 更新菜单项
   */
  public updateMenuItem(menuId: string, itemId: string, updates: Partial<MenuItemConfig>): void {
    const menu = this.menus.get(menuId)
    if (!menu) {
      throw new Error(`Menu ${menuId} not found`)
    }

    const item = menu.submenu.find(item => item.id === itemId)
    if (!item) {
      throw new Error(`Menu item ${itemId} not found in menu ${menuId}`)
    }

    Object.assign(item, updates)
    this.updateApplicationMenu()
  }

  /**
   * 启用/禁用菜单项
   */
  public setMenuItemEnabled(menuId: string, itemId: string, enabled: boolean): void {
    this.updateMenuItem(menuId, itemId, { enabled })
  }

  /**
   * 显示/隐藏菜单项
   */
  public setMenuItemVisible(menuId: string, itemId: string, visible: boolean): void {
    this.updateMenuItem(menuId, itemId, { visible })
  }

  /**
   * 转换为 Electron MenuTemplate 格式
   */
  private convertToElectronMenuTemplate(): any[] {
    const template: any[] = []

    for (const menu of this.menus.values()) {
      template.push({
        label: menu.label,
        submenu: this.convertSubmenuToElectron(menu.submenu)
      })
    }

    return template
  }

  /**
   * 转换子菜单为 Electron 格式
   */
  private convertSubmenuToElectron(submenu: MenuItemConfig[]): any[] {
    return submenu
      .filter(item => item.visible !== false)
      .map(item => {
        const electronItem: any = {
          id: item.id,
          label: item.label,
          type: item.type || 'normal',
          enabled: item.enabled !== false
        }

        if (item.accelerator) {
          electronItem.accelerator = item.accelerator
        }

        if (item.role) {
          electronItem.role = item.role
        }

        if (item.type === 'checkbox' || item.type === 'radio') {
          electronItem.checked = item.checked
        }

        if (item.submenu) {
          electronItem.submenu = this.convertSubmenuToElectron(item.submenu)
        }

        // 添加自定义属性，用于主进程处理点击事件
        if (item.route) {
          electronItem.route = item.route
        }

        if (item.action) {
          electronItem.action = item.action
        }

        return electronItem
      })
  }

  /**
   * 更新应用菜单
   */
  private async updateApplicationMenu(): Promise<void> {
    if (!this.initialized) return

    try {
      const template = this.convertToElectronMenuTemplate()
      await window.electronAPI?.invoke('menu:update', template)
    } catch (error) {
      console.error('Failed to update application menu:', error)
    }
  }

  /**
   * 初始化菜单
   */
  public async initialize(): Promise<void> {
    if (!window.electronAPI) {
      console.warn('ElectronAPI not available, menu service disabled')
      return
    }

    try {
      await this.updateApplicationMenu()
    } catch (error) {
      console.error('Failed to initialize menu service:', error)
    }
  }

  /**
   * 根据路由信息动态更新导航菜单
   */
  public updateNavigationFromRoutes(routes: any[]): void {
    const navigationMenu = this.menus.get('navigation')
    if (!navigationMenu) return

    // 清空现有导航项
    navigationMenu.submenu = []

    // 根据路由生成导航项
    let acceleratorIndex = 1
    for (const route of routes) {
      if (route.meta?.hideInNav) continue

      const accelerator = acceleratorIndex <= 9 ? `CmdOrCtrl+${acceleratorIndex}` : undefined
      
      navigationMenu.submenu.push({
        id: `nav-${route.name?.toLowerCase() || 'unknown'}`,
        label: route.meta?.title || route.name || this.t('services.menu.unknownPage'),
        accelerator,
        route: route.name
      })

      acceleratorIndex++
    }

    this.updateApplicationMenu()
  }
}

export const menuService = MenuService.getInstance()
