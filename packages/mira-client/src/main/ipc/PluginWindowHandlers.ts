import { ipcMain, BrowserWindow, Menu, app, clipboard, nativeImage, nativeTheme, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { mkdirSync, writeFileSync } from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'
import { randomUUID } from 'node:crypto'
import { logger } from '../utils/Logger'
import type { PluginHandler } from '../handlers/PluginHandler'
import { downloadService } from '../services/DownloadService'

/**
 * 打开插件窗口的参数（与 shared/types.ts 的 PluginWindowOpenOptions 对齐）
 */
export interface PluginWindowOpenOptions {
  /** 插件 id（用于在 pluginsDirectory/<pluginId>/ 下定位） */
  pluginId: string
  /** 入口文件相对插件目录的路径，默认 'dist/index.html' */
  entry?: string
  /** 服务端 Web 插件入口 URL，仅允许 /server-plugins/ 路径 */
  url?: string
  /** 窗口标题 */
  title?: string
  /** 窗口宽度，默认 1200 */
  width?: number
  /** 窗口高度，默认 800 */
  height?: number
  /** 传递给窗口页面的查询参数（拼到 URL query 上） */
  query?: Record<string, string>
}

interface PluginWindowImagePayload {
  data: ArrayBuffer | Uint8Array
  previewData: ArrayBuffer | Uint8Array
  fileName: string
  mimeType: string
}

/**
 * 插件窗口处理器
 *
 * 提供一个通用的「插件 BrowserWindow」机制：插件可以通过
 *   window.electronAPI.pluginWindow.open({ pluginId, entry, ... })
 * 弹出一个独立的、带 frame 的窗口，加载该插件目录下的 dist（或其他 entry）。
 *
 * 与 FloatingWindowHandler 的区别：
 *   - FloatingWindowHandler 面向应用内置的透明无边框浮动窗口（搜索/通知/悬浮球），
 *     页面走渲染器应用的 Vite 多页入口（dist-renderer），需要专门的 preload。
 *   - 本处理器面向「插件提供的内容」（标准带 frame 窗口），HTML 直接来自插件
 *     pluginsDirectory/<pluginId>/<entry>，不需要专门的 preload（contextIsolation:true）。
 *
 * 窗口复用策略：以 windowId = `${pluginId}:${projectId||'default'}` 为 key，
 * 已存在则聚焦并重新 loadURL（切换 query），否则新建。
 */
export class PluginWindowHandlers {
  /** windowId → BrowserWindow */
  private windows = new Map<string, BrowserWindow>()
  private importRequests = new Map<string, { resolve: (value: any) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }>()
  /** 注入的 PluginHandler，用于读取 pluginsDirectory 与插件实际目录 */
  private pluginHandler: PluginHandler

  constructor(pluginHandler: PluginHandler) {
    this.pluginHandler = pluginHandler
  }

  /**
   * 注册 IPC 处理器
   */
  public registerHandlers(): void {
    ipcMain.handle('plugin-window:open', this.handleOpen.bind(this))
    ipcMain.handle('plugin-window:close', this.handleClose.bind(this))
    ipcMain.handle('plugin-window:send', this.handleSend.bind(this))
    ipcMain.handle('plugin-window:copy-image', this.handleCopyImage.bind(this))
    ipcMain.on('plugin-window:start-image-drag', this.handleStartImageDrag.bind(this))
    // 设置发起窗口的专属菜单栏（per-window menu）。
    // 插件窗口默认继承全局 Menu.setApplicationMenu，这里允许每个窗口
    // 用 win.setMenu 替换成自己的模板（Windows/Linux 生效）。
    ipcMain.handle('plugin-window:set-menu', this.handleSetMenu.bind(this))
    ipcMain.on('plugin-window:mira-app-info', this.handleMiraAppInfo.bind(this))
    ipcMain.handle('plugin-window:mira-window', this.handleMiraWindow.bind(this))
    ipcMain.handle('plugin-window:mira-shell', this.handleMiraShell.bind(this))
    ipcMain.on('plugin-window:mira-clipboard', this.handleMiraClipboard.bind(this))
    ipcMain.on('plugin-window:mira-log', this.handleMiraLog.bind(this))
    ipcMain.handle('plugin-window:mira-item-add-from-url', this.handleMiraItemAddFromUrl.bind(this))
    ipcMain.on('plugin-window:mira-item-add-from-url-result', this.handleMiraItemAddFromUrlResult.bind(this))
    logger.info('PluginWindowHandlers', 'Plugin window IPC handlers registered')
  }

  /**
   * 解析插件根目录绝对路径。
   *
   * 插件目录名不一定等于 pluginId（可能是 mira-whiteboard 这类语义目录名），
   * 因此通过 PluginHandler.getPluginActualDirectory 取扫描到的 actualDirectory。
   * 找不到时按 pluginId 作为目录名兜底。
   */
  private async resolvePluginBase(pluginId: string): Promise<string> {
    const base = await this.pluginHandler.getPluginActualDirectory(pluginId)
    if (base) return base
    const pluginsDir = (this.pluginHandler as any).config?.pluginsDirectory as string | undefined
    return pluginsDir ? path.join(pluginsDir, pluginId) : pluginId
  }

  /**
   * 解析插件入口文件绝对路径（pluginBase + entry）。
   * 该路径随后会在 handleOpen 中做存在性校验。
   */
  private async resolveEntryPath(pluginId: string, entry: string): Promise<string> {
    const base = await this.resolvePluginBase(pluginId)
    return path.join(base, entry)
  }

  /**
   * 解析插件窗口图标绝对路径（若有）。
   *
   * 读取插件 actualDirectory 与 plugin.json 的 icon 字段，拼出图标文件绝对路径，
   * 并校验文件确实存在。返回 null 表示该插件未声明图标或图标文件缺失，
   * 调用方应回退到默认窗口图标（不设置 BrowserWindow.icon）。
   *
   * 入参为已解析好的插件目录，避免重复扫描 discoverPlugins。
   */
  private async resolveIconPath(pluginId: string, baseDir: string): Promise<string | null> {
    try {
      // 读取 plugin.json 中的 icon 字段
      const pluginJsonPath = path.join(baseDir, 'plugin.json')
      const content = await fs.readFile(pluginJsonPath, 'utf-8')
      const config = JSON.parse(content) as { icon?: string }
      const iconFile = config?.icon?.trim()
      if (!iconFile) return null

      // icon 可能是绝对路径或相对插件目录的路径
      const iconPath = path.isAbsolute(iconFile) ? iconFile : path.join(baseDir, iconFile)
      try {
        await fs.access(iconPath)
        return iconPath
      } catch {
        logger.warn('PluginWindowHandlers', `Plugin ${pluginId} icon declared but file missing: ${iconPath}`)
        return null
      }
    } catch {
      // plugin.json 读取/解析失败：交由 resolveEntryPath 单独报错，这里静默
      return null
    }
  }

  /**
   * 计算 windowId
   * 同时纳入 entry，避免「主界面窗口」与「画布窗口」这类同插件不同入口的窗口互相覆盖复用。
   */
  private getWindowId(pluginId: string, entry: string, query?: Record<string, string>): string {
    const projectId = query?.projectId || query?.id || 'default'
    return `${pluginId}:${entry}:${projectId}`
  }

  /**
   * 处理打开窗口请求
   */
  private async handleOpen(
    _event: Electron.IpcMainInvokeEvent,
    opts: PluginWindowOpenOptions
  ): Promise<{ success: boolean; windowId?: string; message?: string }> {
    try {
      if (!opts?.pluginId) {
        return { success: false, message: 'pluginId 不能为空' }
      }

      const entry = opts.entry || 'dist/index.html'
      const windowId = this.getWindowId(opts.pluginId, entry, opts.query)
      const remoteUrl = opts.url ? this.resolveServerPluginUrl(opts.url, opts.query) : undefined
      const entryPath = remoteUrl ? undefined : await this.resolveEntryPath(opts.pluginId, entry)

      // 复用已存在的窗口：聚焦并重新加载（切换 query）
      const existing = this.windows.get(windowId)
      if (existing && !existing.isDestroyed()) {
        existing.show()
        existing.focus()
        await this.loadEntry(existing, entryPath, opts.query, remoteUrl)
        return { success: true, windowId }
      }

      // 校验入口文件存在，给出清晰错误
      if (entryPath) {
        try {
          await fs.access(entryPath)
        } catch {
          const msg = `插件入口文件不存在: ${entryPath}（请先在插件目录执行构建，例如 pnpm install && pnpm build 生成 dist）`
          logger.error('PluginWindowHandlers', msg)
          return { success: false, message: msg }
        }
      }

      // 解析插件图标（若有）：从插件根目录读 plugin.json 的 icon 字段
      const baseDir = await this.resolvePluginBase(opts.pluginId)
      const iconPath = await this.resolveIconPath(opts.pluginId, baseDir)

      const width = opts.width && opts.width > 0 ? opts.width : 1200
      const height = opts.height && opts.height > 0 ? opts.height : 800
      const title = opts.title || '插件窗口'

      const win = new BrowserWindow({
        width,
        height,
        title,
        frame: true,
        show: false,
        backgroundColor: '#ffffff',
        // 插件声明的图标（plugin.json 的 icon 字段）；缺省回退到默认窗口图标
        ...(iconPath ? { icon: iconPath } : {}),
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
          // 注入专用 preload：暴露最小化的 electronAPI.pluginWindow，
          // 让插件主界面能够再次打开子窗口（例如画板管理 → 画布窗口）。
          // sandbox 须为 false，否则 preload 无法 require('electron')。
          preload: app.isPackaged
            ? path.join(__dirname, '../dist-preload/plugin-window-preload.js')
            : path.join(__dirname, '../src/preload/plugin-window-preload.js'),
          additionalArguments: [
            `--mira-plugin-id=${opts.pluginId}`,
            `--mira-plugin-name=${encodeURIComponent(title)}`,
            `--mira-plugin-path=${encodeURIComponent(baseDir)}`,
          ],
        },
      })

      // 插件窗口不应继承主窗口的全局菜单；插件可稍后通过 setMenu(template) 设置自己的菜单。
      win.setMenu(null)

      this.windows.set(windowId, win)

      const sendEvent = (name: string, value?: any) => {
        if (!win.isDestroyed()) win.webContents.send('plugin-window:mira-event', name, value)
      }
      const themeListener = () => sendEvent('theme', nativeTheme.shouldUseDarkColors ? 'DARK' : 'LIGHT')
      nativeTheme.on('updated', themeListener)
      // 窗口关闭后清理引用
      win.on('closed', () => {
        this.windows.delete(windowId)
        nativeTheme.removeListener('updated', themeListener)
      })
      win.on('show', () => sendEvent('show'))
      win.on('hide', () => sendEvent('hide'))
      win.on('close', () => sendEvent('beforeExit'))
      win.on('focus', () => sendEvent('show'))
      win.on('blur', () => sendEvent('hide'))

      win.once('ready-to-show', () => {
        win.show()
        win.focus()
      })

      // 调试:插件窗口自动打开 DevTools(分离窗口)。排查完成后删除此行。
      win.webContents.once('did-finish-load', () => {
        // win.webContents.openDevTools({ mode: 'detach' })
      })

      await this.loadEntry(win, entryPath, opts.query, remoteUrl)

      logger.info('PluginWindowHandlers', `Opened plugin window: ${windowId} -> ${remoteUrl || entryPath}`)
      return { success: true, windowId }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('PluginWindowHandlers', `Failed to open plugin window: ${msg}`)
      return { success: false, message: msg }
    }
  }

  /**
   * 加载入口文件（带 query）
   * loadFile 的 query 会附加到 document.location.search，dist 可通过 location.search 读取参数。
   */
  private async loadEntry(
    win: BrowserWindow,
    entryPath: string | undefined,
    query?: Record<string, string>,
    remoteUrl?: string
  ): Promise<void> {
    if (win.isDestroyed()) return
    if (remoteUrl) {
      await win.loadURL(remoteUrl)
      return
    }
    if (!entryPath) throw new Error('插件入口不能为空')
    const loadOpts: Electron.LoadFileOptions = {}
    if (query && Object.keys(query).length > 0) {
      loadOpts.query = query
    }
    await win.loadFile(entryPath, loadOpts)
  }

  private resolveServerPluginUrl(value: string, query?: Record<string, string>): string {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || !url.pathname.includes('/server-plugins/')) {
      throw new Error('仅允许打开服务端插件 URL')
    }
    // 兼容服务端插件清单只返回插件根 URL 的情况。
    // Web 插件窗口必须加载构建产物，而不是目录路径。
    const marker = '/server-plugins/'
    const relative = url.pathname.slice(url.pathname.indexOf(marker) + marker.length)
    if (relative && !relative.endsWith('/') && !/\.[^/]+$/.test(relative)) {
      url.pathname = `${url.pathname.replace(/\/+$/, '')}/dist/index.html`
    }
    Object.entries(query || {}).forEach(([key, item]) => url.searchParams.set(key, String(item)))
    logger.info('PluginWindowHandlers', `Resolved server plugin URL: ${url.toString().replace(/([?&]token=)[^&]+/, '$1<redacted>')}`)
    return url.toString()
  }

  /**
   * 处理关闭窗口请求
   */
  private async handleClose(
    _event: Electron.IpcMainInvokeEvent,
    windowId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const win = this.windows.get(windowId)
      if (win && !win.isDestroyed()) {
        win.close()
      }
      this.windows.delete(windowId)
      return { success: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return { success: false, message: msg }
    }
  }

  private async handleSend(
    _event: Electron.IpcMainInvokeEvent,
    pluginId: string,
    entry: string,
    channel: string,
    data: any
  ): Promise<{ success: boolean; delivered: boolean }> {
    const prefix = `${pluginId}:${entry}:`
    const targets = Array.from(this.windows.entries())
      .filter(([id, win]) => id.startsWith(prefix) && !win.isDestroyed())
      .map(([, win]) => win)
    const target = targets.find(win => win.isFocused()) || targets[targets.length - 1]
    if (!target) return { success: true, delivered: false }
    target.webContents.send('plugin-window:message', channel, data)
    target.show()
    target.focus()
    return { success: true, delivered: true }
  }

  private toImageBuffer(payload: PluginWindowImagePayload, field: 'data' | 'previewData'): Buffer {
    const value = payload?.[field]
    const buffer = value instanceof ArrayBuffer
      ? Buffer.from(value)
      : value instanceof Uint8Array
        ? Buffer.from(value.buffer, value.byteOffset, value.byteLength)
        : Buffer.alloc(0)
    if (!payload?.mimeType?.startsWith('image/') || buffer.length === 0 || buffer.length > 100 * 1024 * 1024) {
      throw new Error('无效的图片数据')
    }
    return buffer
  }

  private async handleCopyImage(
    _event: Electron.IpcMainInvokeEvent,
    payload: PluginWindowImagePayload
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const image = nativeImage.createFromBuffer(this.toImageBuffer(payload, 'previewData'))
      if (image.isEmpty()) throw new Error('无法解析图片数据')
      clipboard.writeImage(image)
      return { success: true }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  }

  private handleStartImageDrag(event: Electron.IpcMainEvent, payload: PluginWindowImagePayload): void {
    try {
      const data = this.toImageBuffer(payload, 'data')
      const preview = nativeImage.createFromBuffer(this.toImageBuffer(payload, 'previewData'))
      if (preview.isEmpty()) throw new Error('无法解析图片数据')

      const safeName = path.basename(payload.fileName || 'image.png')
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .slice(0, 160) || 'image.png'
      const tempDir = path.join(app.getPath('temp'), 'mira-whiteboard-drag')
      mkdirSync(tempDir, { recursive: true })
      const filePath = path.join(tempDir, `${process.pid}-${safeName}`)
      writeFileSync(filePath, data)

      const size = preview.getSize()
      const scale = Math.min(1, 48 / Math.max(size.width, size.height))
      const icon = scale < 1
        ? preview.resize({ width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) })
        : preview
      event.sender.startDrag({ file: filePath, icon })
    } catch (error) {
      logger.warn('PluginWindowHandlers', `Failed to start image drag: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 为发起请求的插件窗口设置专属菜单栏。
   *
   * 背景：插件窗口默认继承全局应用菜单（Menu.setApplicationMenu），
   * 但全局菜单的点击事件硬编码转发到主窗口（见 MenuHandlers），
   * 对插件窗口毫无意义。这里让插件窗口能把自己的菜单模板发给主进程，
   * 主进程按字段挂 click 后用 win.setMenu 替换该窗口的菜单栏。
   *
   * 模板字段约定（与渲染进程 MenuService 的 route/action 风格对齐）：
   *   - { action, ...payload } → click 时把 { action, ...payload } 通过
   *     'plugin-window:menu-action' channel 发回本窗口的渲染进程，由插件 SPA 自行处理。
   *   - { role }                → 原样透传给 Electron（reload/devTools/zoom/minimize/close…）。
   *   - { type: 'separator' }   → 分隔符。
   *   - { type: 'radio'|'checkbox', checked } → 透传（用于"当前工程"勾选态）。
   *
   * 注意：win.setMenu 只在 Windows / Linux 生效；macOS 仍走全局菜单
   * （Electron 限制）。本应用主平台为 win32，可接受。
   */
  private async handleSetMenu(
    event: Electron.IpcMainInvokeEvent,
    template: any[]
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win || win.isDestroyed()) {
        return { success: false, message: '发起窗口已销毁' }
      }
      const processed = this.buildMenuTemplate(template, win)
      if (processed.length === 0) {
        win.setMenu(null)
      } else {
        win.setMenu(Menu.buildFromTemplate(processed))
      }
      return { success: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('PluginWindowHandlers', `Failed to set plugin window menu: ${msg}`)
      return { success: false, message: msg }
    }
  }

  private handleMiraAppInfo(event: Electron.IpcMainEvent): void {
    event.returnValue = {
      version: app.getVersion(),
      locale: app.getLocale(),
      arch: process.arch,
      platform: process.platform,
      theme: nativeTheme.shouldUseDarkColors ? 'DARK' : 'LIGHT',
      isDark: nativeTheme.shouldUseDarkColors,
    }
  }

  private async handleMiraWindow(event: Electron.IpcMainInvokeEvent, action: string, ...args: any[]): Promise<any> {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) throw new Error('插件窗口已关闭')
    switch (action) {
      case 'show': win.show(); win.focus(); return undefined
      case 'showInactive': win.showInactive(); return undefined
      case 'hide': win.hide(); return undefined
      case 'focus': win.focus(); return undefined
      case 'minimize': win.minimize(); return undefined
      case 'isMinimized': return win.isMinimized()
      case 'restore': win.restore(); return undefined
      case 'maximize': win.maximize(); return undefined
      case 'unmaximize': win.unmaximize(); return undefined
      case 'isMaximized': return win.isMaximized()
      case 'setFullScreen': win.setFullScreen(Boolean(args[0])); return undefined
      case 'isFullScreen': return win.isFullScreen()
      case 'setSize': win.setSize(Number(args[0]), Number(args[1])); return undefined
      case 'getSize': return win.getSize()
      case 'setBounds': win.setBounds(args[0] || {}); return undefined
      case 'getBounds': return win.getBounds()
      case 'setResizable': win.setResizable(Boolean(args[0])); return undefined
      case 'isResizable': return win.isResizable()
      case 'setAlwaysOnTop': win.setAlwaysOnTop(Boolean(args[0])); return undefined
      case 'isAlwaysOnTop': return win.isAlwaysOnTop()
      case 'setPosition': win.setPosition(Number(args[0]), Number(args[1])); return undefined
      case 'getPosition': return win.getPosition()
      case 'setOpacity': win.setOpacity(Math.max(0, Math.min(1, Number(args[0])))); return undefined
      case 'getOpacity': return win.getOpacity()
      case 'flashFrame': win.flashFrame(Boolean(args[0])); return undefined
      default: throw new Error(`不支持的窗口操作: ${action}`)
    }
  }

  private async handleMiraShell(_event: Electron.IpcMainInvokeEvent, action: string, value?: string): Promise<any> {
    if (action === 'beep') return undefined
    if (typeof value !== 'string' || !value) throw new Error('路径或 URL 不能为空')
    if (action === 'openExternal') {
      const url = new URL(value)
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error('仅允许打开 http/https/mailto URL')
      await shell.openExternal(value)
      return undefined
    }
    if (action === 'openPath') return shell.openPath(value)
    if (action === 'showItemInFolder') return shell.showItemInFolder(value)
    throw new Error(`不支持的 shell 操作: ${action}`)
  }

  private handleMiraClipboard(event: Electron.IpcMainEvent, action: string, value?: any): void {
    switch (action) {
      case 'clear': clipboard.clear(); event.returnValue = undefined; return
      case 'has': event.returnValue = clipboard.availableFormats().includes(String(value)); return
      case 'writeText': clipboard.writeText(String(value ?? '')); event.returnValue = undefined; return
      case 'readText': event.returnValue = clipboard.readText(); return
      case 'writeHTML': clipboard.writeHTML(String(value ?? '')); event.returnValue = undefined; return
      case 'readHTML': event.returnValue = clipboard.readHTML(); return
      case 'readImage': {
        const image = clipboard.readImage()
        event.returnValue = {
          size: image.getSize(),
          png: image.toPNG(),
          jpeg: image.toJPEG(100),
        }
        return
      }
      default: throw new Error(`不支持的剪贴板操作: ${action}`)
    }
  }

  private handleMiraLog(_event: Electron.IpcMainEvent, level: string, args: any[]): void {
    const message = (args || []).map((arg) => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ')
    const log = ({ debug: logger.debug, info: logger.info, warn: logger.warn, error: logger.error } as any)[level] || logger.info
    log('PluginWindow', message)
  }

  private async handleMiraItemAddFromUrl(_event: Electron.IpcMainInvokeEvent, url: string, options: any): Promise<any> {
    let parsed: URL
    try {
      parsed = new URL(String(url))
    } catch {
      throw new Error('素材 URL 无效')
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('仅支持 http/https 素材 URL')

    const buffer = await downloadService.downloadFile(parsed.toString())
    if (buffer.length === 0 || buffer.length > 100 * 1024 * 1024) throw new Error('素材为空或超过 100MB 限制')
    const mainWindow = BrowserWindow.getAllWindows().find(
      (win) => !win.isDestroyed() && (win as BrowserWindow & { aliasName?: string }).aliasName === 'Mira'
    )
    if (!mainWindow) throw new Error('Mira 主窗口不可用')

    const requestId = randomUUID()
    const result = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.importRequests.delete(requestId)
        reject(new Error('等待 Mira 上传结果超时'))
      }, 120000)
      this.importRequests.set(requestId, { resolve, reject, timer })
    })
    const name = this.getDownloadName(parsed, options)
    mainWindow.webContents.send('plugin-window:mira-item-add-from-url', {
      requestId,
      url: parsed.toString(),
      name,
      mimeType: this.getMimeType(name),
      data: buffer,
      options: options && typeof options === 'object' ? options : {},
    })
    return result
  }

  private handleMiraItemAddFromUrlResult(_event: Electron.IpcMainEvent, requestId: string, result: any): void {
    const request = this.importRequests.get(requestId)
    if (!request) return
    clearTimeout(request.timer)
    this.importRequests.delete(requestId)
    if (result?.success === false) request.reject(new Error(result.message || 'Mira 上传失败'))
    else request.resolve(result)
  }

  private getDownloadName(url: URL, options: any): string {
    const requested = typeof options?.name === 'string' ? options.name.trim() : ''
    const fromUrl = path.basename(url.pathname).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    return (requested || fromUrl || `mira-${Date.now()}.jpg`).slice(0, 180)
  }

  private getMimeType(name: string): string {
    const ext = path.extname(name).toLowerCase()
    return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif' } as Record<string, string>)[ext] || 'application/octet-stream'
  }

  /**
   * 递归处理菜单模板：按字段挂 click（action → 转发回窗口渲染进程），
   * role / separator / radio / checkbox 原样透传。
   */
  private buildMenuTemplate(template: any[], win: BrowserWindow): MenuItemConstructorOptions[] {
    return (template || []).map((item) => {
      const processed: MenuItemConstructorOptions = { label: item.label }
      if (item.type) processed.type = item.type
      if (item.accelerator) processed.accelerator = item.accelerator
      if (item.enabled === false) processed.enabled = false
      if (item.visible === false) processed.visible = false
      if (item.checked === true) processed.checked = true
      if (item.role) processed.role = item.role
      if (Array.isArray(item.submenu)) {
        processed.submenu = this.buildMenuTemplate(item.submenu, win)
      }
      // 带自定义 action 的项：click 时把整个 payload（含 action 与任意附加字段，
      // 如 projectId）通过专用 channel 发回该窗口的渲染进程。
      if (item.action && !item.role) {
        processed.click = () => {
          if (!win.isDestroyed()) {
            win.webContents.send('plugin-window:menu-action', item)
          }
        }
      }
      return processed
    })
  }

  /**
   * 资源清理：关闭所有插件窗口并移除 IPC 处理器
   */
  public cleanup(): void {
    for (const [, win] of this.windows) {
      if (!win.isDestroyed()) {
        win.destroy()
      }
    }
    this.windows.clear()

    ipcMain.removeHandler('plugin-window:open')
    ipcMain.removeHandler('plugin-window:close')
    ipcMain.removeHandler('plugin-window:send')
    ipcMain.removeHandler('plugin-window:copy-image')
    ipcMain.removeAllListeners('plugin-window:start-image-drag')
    ipcMain.removeHandler('plugin-window:set-menu')
    ipcMain.removeHandler('plugin-window:mira-window')
    ipcMain.removeHandler('plugin-window:mira-shell')
    ipcMain.removeHandler('plugin-window:mira-item-add-from-url')
    ipcMain.removeAllListeners('plugin-window:mira-item-add-from-url-result')
    for (const request of this.importRequests.values()) {
      clearTimeout(request.timer)
      request.reject(new Error('插件窗口服务已关闭'))
    }
    this.importRequests.clear()
    ipcMain.removeAllListeners('plugin-window:mira-app-info')
    ipcMain.removeAllListeners('plugin-window:mira-clipboard')
    ipcMain.removeAllListeners('plugin-window:mira-log')
  }
}
