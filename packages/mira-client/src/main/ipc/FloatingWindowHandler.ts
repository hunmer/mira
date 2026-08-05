import { ipcMain, BrowserWindow, MessageChannelMain, app } from 'electron'

/**
 * 通用浮动窗口管理器
 *
 * 抽取自 SearchWindowHandlers，提供一套可复用的"独立透明无边框 BrowserWindow + MessagePort 双向通信"模板。
 * 搜索窗口、通知窗口等均基于此实现，避免重复造轮子。
 *
 * 🏗️ 架构：
 *   渲染窗口 ←(MessagePort)→ FloatingWindowHandler ←(IPC)→ 主渲染进程（业务逻辑所在）
 *
 * 🎯 职责（通用）：
 *   - 透明无边框置顶 BrowserWindow 的创建 / 显示 / 隐藏 / 切换 / 销毁
 *   - 多种屏幕位置定位（四角 / 四边中点 / 中心 / 自定义坐标）
 *   - MessageChannelMain 双向通信建立
 *   - 主题同步（探测主渲染进程 dark/light 并下发）
 *   - 全屏 loading 状态管理（通过主窗口 show/hide-global-loading）
 *   - 开发/生产环境路径自动切换
 *
 * 🚫 不包含：
 *   - 具体业务消息处理（由各子类通过 messageHandlers 注入）
 */

/** 窗口位置预设 */
export type FloatingWindowPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'center'
  | { x: number; y: number }

/** 通用浮动窗口配置 */
export interface FloatingWindowOptions {
  /** 窗口标识名（日志/调试用），如 'search' | 'notification' */
  name: string
  /** 窗口标题 */
  title: string
  /** 窗口宽度 */
  width: number
  /** 窗口高度 */
  height: number
  /** 屏幕位置预设，默认 'bottom-right' */
  position?: FloatingWindowPosition
  /** 距屏幕边缘间距（px），默认 20 */
  margin?: number
  /** 最小宽度（可选） */
  minWidth?: number
  /** 最小高度（可选） */
  minHeight?: number
  /** 最大宽度（可选） */
  maxWidth?: number
  /** 最大高度（可选） */
  maxHeight?: number
  /** 是否可调整大小，默认 false */
  resizable?: boolean
  /** 是否可移动，默认 true */
  movable?: boolean
  /** 是否始终置顶，默认 true */
  alwaysOnTop?: boolean
  /** 是否在失焦时隐藏（通知窗口常用），默认 false */
  hideOnBlur?: boolean
  /** 渲染层 HTML 文件名，如 'search-window.html' */
  htmlFileName: string
  /** 渲染层 HTML 所在源目录名（如 'search-window'），开发态从 src/<htmlDirName>/ 加载 */
  htmlDirName: string
  /** preload 文件名，如 'search-preload.js' */
  preloadFileName: string
  /** IPC 通道前缀，如 'search-window'（最终注册 `<prefix>:show|hide|toggle`） */
  ipcChannelPrefix: string
  /** MessagePort 角色标识，下发到渲染层用于区分端口归属 */
  role: string
  /**
   * 业务消息处理器映射。
   * key = data.type，value = 处理函数；未命中时走 default 行为（转发主渲染进程）。
   */
  messageHandlers?: Record<string, (data: any, ctx: FloatingWindowMessageContext) => void>
}

/** 消息处理上下文，传递给业务 messageHandlers */
export interface FloatingWindowMessageContext {
  /** 当前窗口实例 */
  window: BrowserWindow | null
  /** 向当前窗口发送消息 */
  send: (message: any) => void
  /** 获取主渲染进程窗口（业务逻辑所在） */
  getMainWindow: () => BrowserWindow | null
  /** 隐藏当前窗口 */
  hide: () => void
}

/** 基类内置处理的消息类型（各业务不应与之冲突） */
const BUILTIN_TYPES = new Set([
  'floating-window-ready',
  'drag-start',
  'close-window',
  'toggle-devtools',
])

/**
 * 通用浮动窗口管理器
 */
export class FloatingWindowHandler {
  protected window: BrowserWindow | null = null
  protected messagePort: Electron.MessagePortMain | null = null
  protected isLoadingWindow = false
  protected options: Required<
    Omit<FloatingWindowOptions, 'messageHandlers' | 'position' | 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight'>
  > & {
    messageHandlers?: Record<string, (data: any, ctx: FloatingWindowMessageContext) => void>
    position: FloatingWindowPosition
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
  }

  constructor(options: FloatingWindowOptions) {
    this.options = {
      position: 'bottom-right',
      margin: 20,
      resizable: false,
      movable: true,
      alwaysOnTop: true,
      hideOnBlur: false,
      ...options,
    }

    this.registerHandlers()
  }

  /**
   * 注册 IPC 处理器
   */
  private registerHandlers(): void {
    const prefix = this.options.ipcChannelPrefix
    ipcMain.handle(`${prefix}:show`, this.handleShow.bind(this))
    ipcMain.handle(`${prefix}:hide`, this.handleHide.bind(this))
    ipcMain.handle(`${prefix}:toggle`, this.handleToggle.bind(this))
  }

  // ============ 对外公共方法 ============

  public getWindow(): BrowserWindow | null {
    return this.window
  }

  public setWindow(win: BrowserWindow | null): void {
    this.window = win
  }

  /**
   * 计算窗口坐标（左上角 x, y）
   * @param overridePosition 可临时覆盖配置中的位置
   * @param offset 坐标偏移（用于通知窗口堆叠，向下方堆叠）
   */
  public computePosition(
    overridePosition?: FloatingWindowPosition,
    offset: { x?: number; y?: number } = {}
  ): { x: number; y: number } {
    const { screen: screenMod } = require('electron') as typeof import('electron')
    const primaryDisplay = screenMod.getPrimaryDisplay()
    const { x: workX, y: workY, width, height } = primaryDisplay.workArea
    const { width: winW, height: winH } = this.getWindowSize()
    const margin = this.options.margin
    const position = overridePosition ?? this.options.position

    let x: number
    let y: number

    if (typeof position === 'object') {
      x = position.x
      y = position.y
    } else {
      switch (position) {
        case 'top-left':
          x = workX + margin
          y = workY + margin
          break
        case 'top-right':
          x = workX + width - winW - margin
          y = workY + margin
          break
        case 'bottom-left':
          x = workX + margin
          y = workY + height - winH - margin
          break
        case 'bottom-right':
          x = workX + width - winW - margin
          y = workY + height - winH - margin
          break
        case 'top':
          x = workX + Math.round((width - winW) / 2)
          y = workY + margin
          break
        case 'bottom':
          x = workX + Math.round((width - winW) / 2)
          y = workY + height - winH - margin
          break
        case 'center':
        default:
          x = workX + Math.round((width - winW) / 2)
          y = workY + Math.round((height - winH) / 2)
          break
      }
    }

    return {
      x: Math.round(x + (offset.x ?? 0)),
      y: Math.round(y + (offset.y ?? 0)),
    }
  }

  /**
   * 获取窗口尺寸（子类可覆盖以支持动态尺寸）
   */
  protected getWindowSize(): { width: number; height: number } {
    return { width: this.options.width, height: this.options.height }
  }

  /**
   * 设置窗口位置（可带偏移）
   */
  public positionWindow(
    overridePosition?: FloatingWindowPosition,
    offset?: { x?: number; y?: number }
  ): void {
    if (!this.window || this.window.isDestroyed()) return
    const { x, y } = this.computePosition(overridePosition, offset)
    this.window.setPosition(x, y, false)
  }

  /**
   * 创建窗口（若不存在）
   */
  public createWindow(): BrowserWindow {
    this.createWindowInternal()
    if (!this.window) {
      throw new Error(`Failed to create ${this.options.name} window`)
    }
    return this.window
  }

  public async show(): Promise<void> {
    return this.handleShow()
  }

  public async hide(): Promise<void> {
    return this.handleHide()
  }

  public async toggle(): Promise<void> {
    return this.handleToggle()
  }

  /**
   * 向当前窗口发送消息（经 MessagePort）
   */
  public sendMessage(message: any): void {
    if (this.messagePort) {
      try {
        this.messagePort.postMessage(message)
      } catch (error) {
        console.error(`❌ [${this.options.name}] 消息发送失败:`, error)
      }
    } else {
      console.warn(`⚠️ [${this.options.name}] MessagePort 不可用，无法发送消息`)
    }
  }

  /**
   * 资源清理
   */
  public cleanup(): void {
    this.hideLoadingWindow()

    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy()
      this.window = null
    }

    if (this.messagePort) {
      this.messagePort.close()
      this.messagePort = null
    }

    const prefix = this.options.ipcChannelPrefix
    ipcMain.removeHandler(`${prefix}:show`)
    ipcMain.removeHandler(`${prefix}:hide`)
    ipcMain.removeHandler(`${prefix}:toggle`)
  }

  // ============ 内部实现 ============

  /**
   * 创建窗口（内部）
   * 子类可覆盖以添加业务窗口选项。
   */
  protected createWindowInternal(): void {
    const { x, y } = this.computePosition()
    const { width, height } = this.getWindowSize()
    const opts = this.options

    const browserOptions: Electron.BrowserWindowConstructorOptions = {
      width,
      height,
      x,
      y,
      movable: opts.movable,
      minWidth: opts.minWidth,
      minHeight: opts.minHeight,
      maxWidth: opts.maxWidth,
      maxHeight: opts.maxHeight,
      resizable: opts.resizable,
      minimizable: false,
      maximizable: false,
      closable: true,
      alwaysOnTop: opts.alwaysOnTop,
      frame: false,
      transparent: true,
      show: false,
      backgroundColor: '#00000000',
      hasShadow: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        sandbox: true,
        preload: app.isPackaged
          ? require('path').join(__dirname, `../dist-preload/${opts.preloadFileName}`)
          : require('path').join(__dirname, `../src/preload/${opts.preloadFileName}`),
      },
      title: opts.title,
    }

    this.window = new BrowserWindow(browserOptions)

    // 加载渲染层 HTML
    if (app.isPackaged) {
      const pagePath = require('path').join(__dirname, `../dist-float/${opts.htmlFileName}`)
      this.window.loadFile(pagePath)
    } else {
      const pagePath = require('path').join(
        __dirname,
        `../src/${opts.htmlDirName}/${opts.htmlFileName}`
      )
      this.window.loadFile(pagePath)
    }

    this.setupWindowEvents()
    this.setupMessageChannel()
  }

  /**
   * 设置窗口事件（子类可扩展，但应调用 super）
   */
  protected setupWindowEvents(): void {
    if (!this.window) return

    this.window.on('closed', () => {
      if (this.messagePort) {
        this.messagePort.close()
        this.messagePort = null
      }
      this.window = null
    })

    this.window.once('ready-to-show', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.show()
        this.window.focus()
        if (this.options.alwaysOnTop) {
          this.window.setAlwaysOnTop(true, 'screen-saver')
        }
        this.window.setVisibleOnAllWorkspaces(true)
        this.hideLoadingWindow()
      }
    })

    if (this.options.hideOnBlur) {
      this.window.on('blur', () => {
        this.handleHide().catch((err) => console.error(`[${this.options.name}] blur hide failed`, err))
      })
    }
  }

  /**
   * 建立 MessageChannel 通信
   */
  protected setupMessageChannel(): void {
    if (!this.window) return

    const { port1, port2 } = new MessageChannelMain()
    this.messagePort = port1

    this.messagePort.on('message', (event) => {
      this.handleMessage(event.data)
    })
    this.messagePort.start()

    this.window.webContents.once('did-finish-load', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.postMessage('connect', { role: this.options.role }, [port2])
        this.sendTheme()
      }
    })
  }

  /**
   * 处理来自浮动窗口的消息（内置 + 业务转发）
   */
  protected handleMessage(data: any): void {
    if (!data || !data.type) return

    const ctx: FloatingWindowMessageContext = {
      window: this.window,
      send: (msg) => this.sendMessage(msg),
      getMainWindow: () => this.getMainWindow(),
      hide: () => this.handleHide(),
    }

    try {
      // 1. 内置消息
      if (BUILTIN_TYPES.has(data.type)) {
        this.handleBuiltinMessage(data, ctx)
        return
      }

      // 2. 业务自定义消息
      const handler = this.options.messageHandlers?.[data.type]
      if (handler) {
        handler(data, ctx)
        return
      }

      // 3. 默认：转发给主渲染进程
      console.log(`🔄 [${this.options.name}] 转发消息给主渲染进程:`, data.type)
      this.forwardToMainRenderer(data)
    } catch (error) {
      console.error(`❌ [${this.options.name}] 处理消息失败:`, error)
    }
  }

  /**
   * 处理内置消息类型
   */
  protected handleBuiltinMessage(data: any, ctx: FloatingWindowMessageContext): void {
    switch (data.type) {
      case 'floating-window-ready':
        console.log(`✅ [${this.options.name}] 窗口已就绪`)
        break

      case 'drag-start':
        // 通过临时设置 app-region 启用原生拖拽
        if (ctx.window && !ctx.window.isDestroyed()) {
          ctx.window.webContents.executeJavaScript(`
            document.body.style['-webkit-app-region'] = 'drag'
            setTimeout(() => {
              document.body.style['-webkit-app-region'] = 'no-drag'
            }, 100)
          `)
        }
        break

      case 'close-window':
        ctx.hide()
        break

      case 'toggle-devtools':
        if (ctx.window && !ctx.window.isDestroyed()) {
          ctx.window.webContents.toggleDevTools()
        }
        break
    }
  }

  /**
   * 转发消息给主渲染进程
   */
  protected forwardToMainRenderer(data: any): void {
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`${this.options.role}-from-window`, data)
    }
  }

  /**
   * 获取主渲染进程窗口（业务逻辑所在，非本浮动窗口）
   */
  protected getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows()
    return windows.find((w) => w !== this.window) || null
  }

  /**
   * 探测主渲染进程主题并下发到浮动窗口
   */
  protected async sendTheme(): Promise<void> {
    try {
      const mainWindow = this.getMainWindow()
      if (!mainWindow || mainWindow.isDestroyed()) return
      const isDark = await mainWindow.webContents.executeJavaScript(
        `document.documentElement.classList.contains('dark')`
      )
      this.sendMessage({ type: 'theme-update', isDark })
    } catch (error) {
      console.error(`[${this.options.name}] 主题探测失败:`, error)
    }
  }

  protected async handleShow(): Promise<void> {
    try {
      if (!this.window || this.window.isDestroyed()) {
        this.showLoadingWindow()
        this.createWindowInternal()
      } else {
        this.window.show()
        this.window.focus()
        if (this.options.alwaysOnTop) {
          this.window.setAlwaysOnTop(true, 'screen-saver')
        }
        this.sendTheme()
      }
    } catch (error) {
      this.hideLoadingWindow()
      console.error(`[${this.options.name}] show failed:`, error)
      throw error
    }
  }

  protected async handleHide(): Promise<void> {
    try {
      if (this.window && !this.window.isDestroyed()) {
        this.window.hide()
      }
    } catch (error) {
      console.error(`[${this.options.name}] hide failed:`, error)
      throw error
    }
  }

  protected async handleToggle(): Promise<void> {
    try {
      if (!this.window || this.window.isDestroyed()) {
        await this.handleShow()
      } else if (this.window.isVisible()) {
        await this.handleHide()
      } else {
        await this.handleShow()
      }
    } catch (error) {
      console.error(`[${this.options.name}] toggle failed:`, error)
      throw error
    }
  }

  /**
   * 全屏 loading（复用主窗口的 global-loading 机制）
   */
  protected showLoadingWindow(): void {
    if (this.isLoadingWindow) return
    this.isLoadingWindow = true
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('show-global-loading', `正在加载${this.options.title}...`)
    }
  }

  protected hideLoadingWindow(): void {
    if (!this.isLoadingWindow) return
    this.isLoadingWindow = false
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hide-global-loading')
    }
  }
}
