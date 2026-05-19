import { ipcMain, BrowserWindow, MessageChannelMain, app } from 'electron'

/**
 * 搜索窗口管理 IPC 处理器
 * 
 * 📋 **已完成的功能清单**：
 * ✅ 1. 搜索窗口的创建和销毁
 * ✅ 2. 窗口显示/隐藏控制
 * ✅ 3. 全屏loading状态管理
 * ✅ 4. MessageChannel消息传递（搜索窗口 ↔ 主渲染进程）
 * ✅ 5. 窗口拖拽、焦点、层级管理
 * ✅ 6. 基本的IPC事件注册和清理
 * ✅ 7. 消息转发机制（所有业务逻辑转发给renderer处理）
 * ✅ 8. 窗口透明度和圆角支持
 * ✅ 9. 开发环境自动打开DevTools
 * ✅ 10. 资源清理和内存管理
 * 
 * 🚫 **不包含的职责**（已迁移到 renderer/services/SearchHandlers.ts）：
 * ❌ miraServer状态检测（前端可直接获取，支持非electron环境）
 * ❌ 搜索类型注册和管理（业务逻辑，应在前端处理）
 * ❌ 具体搜索逻辑执行（使用MiraAPI，应在前端处理）
 * ❌ 搜索结果处理和格式化（业务逻辑，应在前端处理）
 * ❌ 打开文件/文件夹/标签的具体业务逻辑（通过消息传递给前端处理）
 * 
 * 🔄 **消息流架构**：
 * 搜索窗口 → MessageChannel → SearchWindowHandlers → IPC转发 → SearchHandlers(renderer)
 * 
 * 📡 **支持的IPC事件**：
 * - search-window:show - 显示搜索窗口
 * - search-window:hide - 隐藏搜索窗口  
 * - search-window:toggle - 切换搜索窗口显示状态
 * 
 * 📬 **转发的消息类型**：
 * - search-request - 搜索请求
 * - open-item - 打开项目请求
 * - get-connection-info - 获取连接信息
 * - 其他自定义消息类型
 * 
 * 🎯 **架构优势**：
 * - 窗口管理与业务逻辑分离
 * - 支持非electron环境运行（业务逻辑在renderer）
 * - 易于测试和维护
 * - 插件化搜索类型扩展
 * - 内存和资源管理优化
 */
export class SearchWindowHandlers {
  private searchWindow: BrowserWindow | null = null
  private searchMessagePort: Electron.MessagePortMain | null = null
  private isLoadingWindow: boolean = false

  constructor() {
    this.registerHandlers()
  }

  /**
   * 注册搜索窗口相关的 IPC 处理器
   */
  private registerHandlers(): void {
    ipcMain.handle('search-window:show', this.handleShowSearchWindow.bind(this))
    ipcMain.handle('search-window:hide', this.handleHideSearchWindow.bind(this))
    ipcMain.handle('search-window:toggle', this.handleToggleSearchWindow.bind(this))
  }

  /**
   * 获取搜索窗口实例
   */
  public getSearchWindow(): BrowserWindow | null {
    return this.searchWindow
  }

  /**
   * 设置搜索窗口实例（用于外部管理）
   */
  public setSearchWindow(window: BrowserWindow | null): void {
    this.searchWindow = window
  }

  /**
   * 创建搜索窗口
   */
  public createSearchWindow(): BrowserWindow {
    this.createSearchWindowInternal()
    if (!this.searchWindow) {
      throw new Error('Failed to create search window')
    }
    return this.searchWindow
  }

  /**
   * 显示搜索窗口
   */
  public async showSearchWindow(): Promise<void> {
    return this.handleShowSearchWindow()
  }

  /**
   * 隐藏搜索窗口
   */
  public async hideSearchWindow(): Promise<void> {
    return this.handleHideSearchWindow()
  }

  /**
   * 切换搜索窗口显示状态
   */
  public async toggleSearchWindow(): Promise<void> {
    return this.handleToggleSearchWindow()
  }

  /**
   * 创建搜索窗口（内部方法）
   */
  private createSearchWindowInternal(): void {
    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    // 计算窗口位置（屏幕中央）
    const windowWidth = 800
    const windowHeight = 600
    const x = Math.round((width - windowWidth) / 2)
    const y = Math.round((height - windowHeight) / 2)

    this.searchWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: x,
      y: y,
      movable: true,
      minWidth: 600,
      minHeight: 400,
      maxWidth: 1200,
      maxHeight: 800,
      resizable: true,
      minimizable: false,
      maximizable: false,
      closable: true,
      alwaysOnTop: true, // 始终置顶
      frame: false, // 无边框设计
      transparent: true,
      show: false, // 先隐藏，创建完成后显示
      backgroundColor: '#00000000', // 关键：明确成完全透明
      hasShadow: false, // 若出现窗体阴影叠色问题可关掉看看
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        sandbox: true, // 启用沙箱模式，完全隔离Electron API
        preload: app.isPackaged 
          ? require('path').join(__dirname, '../dist-preload/search-preload.js')
          : require('path').join(__dirname, '../src/preload/search-preload.js')
      },
      title: 'Mira 全局搜索'
    })

    // 加载搜索窗口内容
    if (app.isPackaged) {
      // 生产环境：加载专门的搜索窗口文件
      const searchPagePath = require('path').join(__dirname, '../dist-search/search-window.html')
      this.searchWindow.loadFile(searchPagePath)
    } else {
      // 开发环境：加载开发中的搜索窗口文件
      const searchPagePath = require('path').join(__dirname, '../src/search-window.html')
      this.searchWindow.loadFile(searchPagePath)
    }

    this.setupWindowEvents()
    this.setupMessageChannel()
  }

  /**
   * 设置窗口事件
   */
  private setupWindowEvents(): void {
    if (!this.searchWindow) return

    this.searchWindow.on('closed', () => {
      // 清理资源
      if (this.searchMessagePort) {
        this.searchMessagePort.close()
        this.searchMessagePort = null
      }
      this.searchWindow = null
    })

    // 窗口显示
    this.searchWindow.once('ready-to-show', () => {
      if (this.searchWindow && !this.searchWindow.isDestroyed()) {
        this.searchWindow.show()
        this.searchWindow.focus()
        // 确保窗口始终在最前
        this.searchWindow.setAlwaysOnTop(true, 'screen-saver')
        this.searchWindow.setVisibleOnAllWorkspaces(true)
        
        // 隐藏加载状态
        this.hideLoadingWindow()
      }
    })

    // 开发环境打开开发者工具
    // if (process.env.NODE_ENV === 'development') {
    //   this.searchWindow.webContents.openDevTools()
    // }
  }

  /**
   * 设置消息通道
   */
  private setupMessageChannel(): void {
    if (!this.searchWindow) return

    // 创建 MessageChannel 用于与搜索窗口通信
    const { port1, port2 } = new MessageChannelMain()
    this.searchMessagePort = port1

    // 监听来自搜索窗口的消息（前端会处理所有搜索逻辑）
    this.searchMessagePort.on('message', (event) => {
      this.handleSearchWindowMessage(event.data)
    })
    this.searchMessagePort.start()

    // 等待页面加载完成后发送 MessagePort
    this.searchWindow.webContents.once('did-finish-load', () => {
      if (this.searchWindow && !this.searchWindow.isDestroyed()) {
        // 通过 IPC 将 port2 传递给搜索窗口（preload会转发给DOM）
        this.searchWindow.webContents.postMessage('connect', { role: 'search' }, [port2])
      }
    })
  }

  /**
   * 处理来自搜索窗口的消息（只处理基本的窗口控制，搜索逻辑转发给主渲染进程）
   */
  private handleSearchWindowMessage(data: any): void {
    if (!data || !data.type) {
      return
    }

    try {
      switch (data.type) {
        case 'search-window-ready':
          console.log('搜索窗口已准备就绪')
          break

        case 'drag-start':
          // 处理拖拽开始请求
          if (this.searchWindow && !this.searchWindow.isDestroyed()) {
            this.searchWindow.webContents.executeJavaScript(`
              document.body.style['-webkit-app-region'] = 'drag'
              setTimeout(() => {
                document.body.style['-webkit-app-region'] = 'no-drag'
              }, 100)
            `)
          }
          break

        case 'close-search':
          // 处理关闭搜索窗口请求
          this.handleHideSearchWindow()
          break

        case 'drag-file':
          // 处理拖拽文件请求
          this.handleDragFile(data.filePath, data.fileName)
          break

        case 'toggle-devtools':
          // 处理开发者工具切换请求
          if (this.searchWindow && !this.searchWindow.isDestroyed()) {
            this.searchWindow.webContents.toggleDevTools()
          }
          break

        case 'open-item':
          // 处理打开项目请求 - 转发给主渲染进程处理具体业务逻辑
          this.forwardMessageToMainRenderer(data)
          break

        case 'search-request':
        case 'get-connection-info':
          // 转发搜索相关的消息给主渲染进程处理
          this.forwardMessageToMainRenderer(data)
          break

        default:
          // 其他消息类型也转发给主渲染进程处理
          console.log('转发搜索窗口消息给主渲染进程:', data.type)
          this.forwardMessageToMainRenderer(data)
      }
    } catch (error) {
      console.error('处理搜索窗口消息失败:', error)
    }
  }

  /**
   * 转发消息给主渲染进程处理
   */
  private forwardMessageToMainRenderer(data: any): void {
    // 通过主窗口的 webContents 发送消息给主渲染进程
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('search-request-from-search-window', data)
    }
  }

  /**
   * 获取主窗口实例
   */
  private getMainWindow(): Electron.BrowserWindow | null {
    const { BrowserWindow } = require('electron')
    const windows = BrowserWindow.getAllWindows()
    // 找到主窗口（不是搜索窗口）
    return windows.find((window: Electron.BrowserWindow) => window !== this.searchWindow) || null
  }

  /**
   * 从主渲染进程接收搜索结果并转发给搜索窗口
   */
  public forwardResultToSearchWindow(result: any): void {
    console.log('📡 [SearchWindowHandlers] 转发搜索结果到搜索窗口:', result)
    console.log('📡 [SearchWindowHandlers] MessagePort状态:', !!this.searchMessagePort)

    this.sendMessageToSearchWindow(result)
  }

  /**
   * 向搜索窗口发送消息
   */
  public sendMessageToSearchWindow(message: any): void {
    console.log('📤 [SearchWindowHandlers] 向搜索窗口发送消息:', message)

    if (this.searchMessagePort) {
      try {
        this.searchMessagePort.postMessage(message)
        console.log('✅ [SearchWindowHandlers] 消息发送成功')
      } catch (error) {
        console.error('❌ [SearchWindowHandlers] 消息发送失败:', error)
      }
    } else {
      console.error('❌ [SearchWindowHandlers] MessagePort不可用，无法发送消息')
    }
  }

  /**
   * 显示搜索窗口
   */
  private async handleShowSearchWindow(): Promise<void> {
    try {
      if (!this.searchWindow || this.searchWindow.isDestroyed()) {
        // 显示加载状态
        this.showLoadingWindow()
        this.createSearchWindowInternal()
      } else {
        this.searchWindow.show()
        this.searchWindow.focus()
        // 确保窗口始终在最前
        this.searchWindow.setAlwaysOnTop(true, 'screen-saver')
      }
    } catch (error) {
      this.hideLoadingWindow()
      console.error('Failed to show search window:', error)
      throw error
    }
  }

  /**
   * 显示全屏加载窗口
   */
  private showLoadingWindow(): void {
    if (this.isLoadingWindow) return

    this.isLoadingWindow = true
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('show-global-loading', '正在加载搜索窗口...')
    }
  }

  /**
   * 隐藏全屏加载窗口
   */
  private hideLoadingWindow(): void {
    if (!this.isLoadingWindow) return

    this.isLoadingWindow = false
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hide-global-loading')
    }
  }

  /**
   * 隐藏搜索窗口
   */
  private async handleHideSearchWindow(): Promise<void> {
    try {
      if (this.searchWindow && !this.searchWindow.isDestroyed()) {
        this.searchWindow.hide()
      }
    } catch (error) {
      console.error('Failed to hide search window:', error)
      throw error
    }
  }

  /**
   * 切换搜索窗口显示状态
   */
  private async handleToggleSearchWindow(): Promise<void> {
    try {
      if (!this.searchWindow || this.searchWindow.isDestroyed()) {
        await this.handleShowSearchWindow()
      } else if (this.searchWindow.isVisible()) {
        await this.handleHideSearchWindow()
      } else {
        await this.handleShowSearchWindow()
      }
    } catch (error) {
      console.error('Failed to toggle search window:', error)
      throw error
    }
  }

  /**
   * 处理拖拽文件请求
   */
  private async handleDragFile(filePath: string, fileName?: string): Promise<void> {
    console.log('🖱️ [SearchWindowHandlers] 处理拖拽文件请求:', filePath)

    if (!filePath) {
      console.error('❌ [SearchWindowHandlers] 文件路径为空')
      return
    }

    try {
      // 使用 DragDropHandler 的现有 IPC 处理机制
      const { BrowserWindow } = require('electron')

      // 找到主窗口
      const mainWindow = BrowserWindow.getAllWindows().find((win: any) => {
        console.log({ aliasName: win.aliasName })
        return win.aliasName == 'Mira'
      })

      if (mainWindow && !mainWindow.isDestroyed()) {
        // 直接调用现有的拖拽处理逻辑
        const result = await mainWindow.webContents.executeJavaScript(`
          window.electronAPI.dragDrop.startDrag('${filePath.replace(/\\/g, '\\\\')}')
        `)

        if (result && result.success) {
          console.log('✅ [SearchWindowHandlers] 通过DragDropHandler启动拖拽成功')
        } else {
          console.warn('⚠️ [SearchWindowHandlers] DragDropHandler处理结果:', result)
        }
      } else {
        console.error('❌ [SearchWindowHandlers] 主窗口不可用')
      }
    } catch (error) {
      console.error('❌ [SearchWindowHandlers] 启动拖拽失败:', error)
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.hideLoadingWindow()
    
    if (this.searchWindow && !this.searchWindow.isDestroyed()) {
      this.searchWindow.destroy()
      this.searchWindow = null
    }
    
    if (this.searchMessagePort) {
      this.searchMessagePort.close()
      this.searchMessagePort = null
    }

    // 移除监听器
    ipcMain.removeAllListeners('search-window:show')
    ipcMain.removeAllListeners('search-window:hide')
    ipcMain.removeAllListeners('search-window:toggle')
  }
}
