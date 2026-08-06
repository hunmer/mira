import { ipcMain, BrowserWindow, app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { logger } from '../utils/Logger'
import type { PluginHandler } from '../handlers/PluginHandler'

/**
 * 打开插件窗口的参数（与 shared/types.ts 的 PluginWindowOpenOptions 对齐）
 */
export interface PluginWindowOpenOptions {
  /** 插件 id（用于在 pluginsDirectory/<pluginId>/ 下定位） */
  pluginId: string
  /** 入口文件相对插件目录的路径，默认 'dist/index.html' */
  entry?: string
  /** 窗口标题 */
  title?: string
  /** 窗口宽度，默认 1200 */
  width?: number
  /** 窗口高度，默认 800 */
  height?: number
  /** 传递给窗口页面的查询参数（拼到 URL query 上） */
  query?: Record<string, string>
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
 *     HTML 走 dist-float，需要专门的 preload。
 *   - 本处理器面向「插件提供的内容」（标准带 frame 窗口），HTML 直接来自插件
 *     pluginsDirectory/<pluginId>/<entry>，不需要专门的 preload（contextIsolation:true）。
 *
 * 窗口复用策略：以 windowId = `${pluginId}:${projectId||'default'}` 为 key，
 * 已存在则聚焦并重新 loadURL（切换 query），否则新建。
 */
export class PluginWindowHandlers {
  /** windowId → BrowserWindow */
  private windows = new Map<string, BrowserWindow>()
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
    logger.info('PluginWindowHandlers', 'Plugin window IPC handlers registered')
  }

  /**
   * 解析插件入口文件绝对路径。
   *
   * 插件目录名不一定等于 pluginId（可能是 mira-whiteboard 这类语义目录名），
   * 因此通过 PluginHandler.getPluginActualDirectory 取扫描到的 actualDirectory，
   * 再拼上 entry。该路径随后会在 handleOpen 中做存在性校验。
   */
  private async resolveEntryPath(pluginId: string, entry: string): Promise<string> {
    const base = await this.pluginHandler.getPluginActualDirectory(pluginId)
    if (!base) {
      // 兜底：按 pluginId 作为目录名（极少走到）
      const pluginsDir = (this.pluginHandler as any).config?.pluginsDirectory as string | undefined
      return pluginsDir ? path.join(pluginsDir, pluginId, entry) : path.join(pluginId, entry)
    }
    return path.join(base, entry)
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
      const entryPath = await this.resolveEntryPath(opts.pluginId, entry)

      // 复用已存在的窗口：聚焦并重新加载（切换 query）
      const existing = this.windows.get(windowId)
      if (existing && !existing.isDestroyed()) {
        existing.show()
        existing.focus()
        await this.loadEntry(existing, entryPath, opts.query)
        return { success: true, windowId }
      }

      // 校验入口文件存在，给出清晰错误
      try {
        await fs.access(entryPath)
      } catch {
        const msg = `插件入口文件不存在: ${entryPath}（请先在插件目录执行构建，例如 pnpm install && pnpm build 生成 dist）`
        logger.error('PluginWindowHandlers', msg)
        return { success: false, message: msg }
      }

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
        },
      })

      this.windows.set(windowId, win)

      // 窗口关闭后清理引用
      win.on('closed', () => {
        this.windows.delete(windowId)
      })

      win.once('ready-to-show', () => {
        win.show()
        win.focus()
      })

      await this.loadEntry(win, entryPath, opts.query)

      logger.info('PluginWindowHandlers', `Opened plugin window: ${windowId} -> ${entryPath}`)
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
    entryPath: string,
    query?: Record<string, string>
  ): Promise<void> {
    if (win.isDestroyed()) return
    const loadOpts: Electron.LoadFileOptions = {}
    if (query && Object.keys(query).length > 0) {
      loadOpts.query = query
    }
    await win.loadFile(entryPath, loadOpts)
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
  }
}
