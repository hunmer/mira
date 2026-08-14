import { ipcMain, BrowserWindow, Menu, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { FloatingWindowHandler } from './FloatingWindowHandler'

/**
 * 悬浮球窗口管理器（单实例）
 *
 * 基于 FloatingWindowHandler 通用模板，承载悬浮球特有逻辑：
 *   - 自定义全向拖拽（nt-drag-*），松手 clamp 到屏幕内并持久化坐标
 *   - 接收文件拖放（fb-file-drop），转发主渲染进程触发 FileUploadDialog
 *   - 单击行为可配置（fb-click）：由主渲染进程按设置决定（打开上传 / 切换主窗口）
 *
 * 位置持久化：写 userData/floating-ball-state.json，与 AppSettings 解耦。
 *
 * IPC 通道（对外，供主渲染进程调用）：
 *   - floating-ball:show / :hide / :toggle
 *   - floating-ball:set-position（null=重置）
 *   - floating-ball:get-state（读取当前坐标）
 *
 * 主渲染进程 ← 悬浮球：通过 floating-ball-from-window 通道下发业务消息。
 */

/** 悬浮球点击行为（与 AppSettings.floatingBallClickAction 对齐） */
export type FloatingBallClickAction = 'openUpload' | 'toggleMain'

/** 持久化的窗口位置 */
export interface FloatingBallState {
  x: number
  y: number
}

const STATE_FILE = 'floating-ball-state.json'

export class FloatingBallWindowHandlers {
  private handler: FloatingWindowHandler
  /** 拖拽期间记录的窗口起始位置（nt-drag-start 时写入） */
  private dragStartPos: { x: number; y: number } | null = null

  constructor() {
    // 用 self 捕获外层实例，供 messageHandlers 内的箭头函数访问
    // （参考 NotificationWindowHandlers.createSlotHandler 的写法）
    const self = this

    this.handler = new (class FloatingBallHandler extends FloatingWindowHandler {
      constructor() {
        super({
          name: 'floating-ball',
          title: 'Mira 悬浮球',
          width: 130,
          height: 110,
          position: 'bottom-right',
          margin: 24,
          movable: true,
          // macOS 透明窗口首次接收 Finder 拖拽时需要允许窗口激活。
          acceptFirstMouse: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          showLoading: false,
          // 渲染器应用多页入口（悬浮球页面），dev 走 dev server，生产走 dist-renderer
          rendererEntry: 'floating-ball-window.html',
          preloadFileName: 'floating-ball-preload.js',
          ipcChannelPrefix: 'floating-ball',
          role: 'floating-ball',
          messageHandlers: {
            'fb-ready': () => {
              /* 窗口已就绪 */
            },
            // 点击行为由主渲染进程按 floatingBallClickAction 设置决定
            // （main 进程不反向查询渲染进程设置，保持解耦）
            'fb-click': () => {
              const main = self.getMainWindow()
              const mainWasHidden = !!main && (main.isMinimized() || !main.isVisible())
              if (mainWasHidden) self.showMainWindow()
              self.forwardToMain({ type: 'fb-click', mainWasHidden })
            },
            // 右键菜单：原生 Menu.popup。
            // 不传 x/y，让 Electron 使用当前鼠标位置；显式坐标会被当作窗口内坐标。
            'fb-context-menu': () => {
              const win = self.handler.getWindow()
              if (!win || win.isDestroyed()) return
              const menu = Menu.buildFromTemplate([
                {
                  label: '隐藏本次',
                  click: () => self.hide(),
                },
                {
                  label: '始终隐藏',
                  click: () => self.forwardToMain({ type: 'fb-hide-always' }),
                },
                { type: 'separator' },
                {
                  label: '打开设置',
                  click: () => self.openSettings(),
                },
              ])
              menu.popup({ window: win })
            },
            // 接收文件拖放：转发主渲染进程，并激活主窗口
            'fb-file-drop': (data) => {
              const files = Array.isArray(data.files) ? data.files : []
              if (files.length === 0) return
              self.forwardToMain({ type: 'file-drop', files })
              self.handler.sendMessage({ type: 'fb-drop-accepted' })
              self.showMainWindow()
            },
            // 自定义全向拖拽（无轴向/方向限制）
            'nt-drag-start': () => {
              const win = self.handler.getWindow()
              if (win && !win.isDestroyed()) {
                const b = win.getBounds()
                self.dragStartPos = { x: b.x, y: b.y }
              }
            },
            'nt-drag-move': (data) => {
              const win = self.handler.getWindow()
              if (!win || win.isDestroyed() || !self.dragStartPos) return
              const dx = Number(data.deltaX || 0)
              const dy = Number(data.deltaY || 0)
              const nx = self.dragStartPos.x + dx
              const ny = self.dragStartPos.y + dy
              win.setPosition(Math.round(nx), Math.round(ny), false)
            },
            'nt-drag-end': () => {
              self.dragStartPos = null
              const win = self.handler.getWindow()
              if (!win || win.isDestroyed()) return
              self.handler.clampToScreen()
              self.persistPosition()
            },
          },
        })
      }

      protected onReadyToShow(): void {
        // 创建后恢复上次位置（若已持久化）
        self.restorePosition()
        this.doShow()
        this.applyInteractiveWindowLevel()
      }

      protected async handleShow(): Promise<void> {
        await super.handleShow()
        this.applyInteractiveWindowLevel()
      }

      private applyInteractiveWindowLevel(): void {
        if (process.platform !== 'darwin' || !this.window || this.window.isDestroyed()) return
        // screen-saver 层用于纯展示覆盖；Finder 不会把它稳定视为拖放目标。
        this.window.setAlwaysOnTop(true, 'floating')
        this.window.setFocusable(true)
        this.window.setIgnoreMouseEvents(false)
      }

      protected setupWindowEvents(): void {
        super.setupWindowEvents()
        // macOS 对透明无边框窗口偶尔不派发 HTML5 drop，而把文件作为导航目标传入。
        // 拦截 file:// 导航作为原生兜底，避免页面被文件路径替换。
        this.window?.webContents.on('will-navigate', (event, url) => {
          if (process.platform !== 'darwin' || !url.startsWith('file://')) return
          event.preventDefault()
          try {
            const fileUrl = new URL(url)
            const filePath = decodeURIComponent(fileUrl.pathname)
            const name = path.basename(filePath)
            if (!filePath || !name) return
            self.forwardToMain({
              type: 'file-drop',
              files: [{ name, path: filePath, isDir: false, size: 0, ext: path.extname(name).slice(1).toLowerCase() }],
            })
            self.handler.sendMessage({ type: 'fb-drop-accepted' })
            self.showMainWindow()
          } catch (error) {
            console.error('[floating-ball] macOS 原生拖放解析失败:', error)
          }
        })
      }
    })()

    // 自有业务 IPC
    ipcMain.handle('floating-ball:set-position', (_e, pos) => this.setPosition(pos))
    ipcMain.handle('floating-ball:get-state', () => this.getState())
    ipcMain.handle('floating-ball:toggle-main', () => this.toggleMainWindow())
    ipcMain.handle('floating-ball:show-main', () => this.showMainWindow())
  }

  // ============ 对外公共方法 ============

  public async show(): Promise<void> {
    return this.handler.show()
  }

  public async hide(): Promise<void> {
    return this.handler.hide()
  }

  public async toggle(): Promise<void> {
    return this.handler.toggle()
  }

  /**
   * 设置位置；传 null 重置到默认（右下角）并清除持久化文件。
   */
  public async setPosition(pos: FloatingBallState | null): Promise<void> {
    const win = this.handler.getWindow()
    if (!win || win.isDestroyed()) return
    if (pos === null) {
      this.clearPersistedPosition()
      this.handler.positionWindow('bottom-right')
      this.handler.clampToScreen()
      this.persistPosition()
      return
    }
    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') return
    win.setPosition(Math.round(pos.x), Math.round(pos.y), false)
    this.handler.clampToScreen()
    this.persistPosition()
  }

  public getState(): FloatingBallState | null {
    const win = this.handler.getWindow()
    if (win && !win.isDestroyed()) {
      const b = win.getBounds()
      return { x: b.x, y: b.y }
    }
    return this.readPersistedPosition()
  }

  /**
   * 切换主渲染窗口的显示状态：
   * 最小化/隐藏时显示并聚焦，否则最小化。
   */
  public async toggleMainWindow(): Promise<void> {
    const main = this.getMainWindow()
    if (!main || main.isDestroyed()) return
    if (main.isMinimized() || !main.isVisible()) {
      main.restore()
      main.show()
      main.focus()
    } else {
      main.minimize()
    }
  }

  public getHandler(): FloatingWindowHandler {
    return this.handler
  }

  public cleanup(): void {
    ipcMain.removeHandler('floating-ball:set-position')
    ipcMain.removeHandler('floating-ball:get-state')
    ipcMain.removeHandler('floating-ball:toggle-main')
    ipcMain.removeHandler('floating-ball:show-main')
    // 基类清理 :show/:hide/:toggle 及窗口、MessagePort
    this.handler.cleanup()
  }

  // ============ 主渲染进程通信 ============

  private forwardToMain(data: any): void {
    const main = this.getMainWindow()
    if (main && !main.isDestroyed()) {
      main.webContents.send('floating-ball-from-window', data)
    }
  }

  /** 显示并聚焦主渲染窗口（拖入文件后把用户引导回主界面） */
  private showMainWindow(): void {
    const main = this.getMainWindow()
    if (!main || main.isDestroyed()) return
    if (main.isMinimized()) main.restore()
    main.show()
    main.focus()
  }

  /** 打开设置：唤起主窗口并通知主渲染进程跳转到设置页 */
  private openSettings(): void {
    this.showMainWindow()
    this.forwardToMain({ type: 'fb-open-settings' })
  }

  private getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows()
    const main = windows.find((w: any) => w.aliasName === 'Mira') as BrowserWindow | undefined
    if (main && !main.isDestroyed()) return main
    // 回退：排除当前悬浮球窗口
    const selfWin = this.handler.getWindow()
    return windows.find((w) => w !== selfWin && !w.isDestroyed()) || null
  }

  // ============ 位置持久化 ============

  private getStateFilePath(): string {
    return path.join(app.getPath('userData'), STATE_FILE)
  }

  private readPersistedPosition(): FloatingBallState | null {
    try {
      const file = this.getStateFilePath()
      if (!fs.existsSync(file)) return null
      const raw = fs.readFileSync(file, 'utf-8')
      const parsed = JSON.parse(raw)
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return { x: parsed.x, y: parsed.y }
      }
      return null
    } catch {
      return null
    }
  }

  private persistPosition(): void {
    const win = this.handler.getWindow()
    if (!win || win.isDestroyed()) return
    const b = win.getBounds()
    try {
      fs.writeFileSync(
        this.getStateFilePath(),
        JSON.stringify({ x: Math.round(b.x), y: Math.round(b.y) }),
        'utf-8'
      )
    } catch (err) {
      console.error('[floating-ball] 持久化位置失败:', err)
    }
  }

  private clearPersistedPosition(): void {
    try {
      const file = this.getStateFilePath()
      if (fs.existsSync(file)) fs.unlinkSync(file)
    } catch {
      /* ignore */
    }
  }

  /**
   * 恢复上次持久化的位置；不存在或越界则保持基类默认（右下角）。
   */
  private restorePosition(): void {
    const persisted = this.readPersistedPosition()
    if (!persisted) return
    const win = this.handler.getWindow()
    if (!win || win.isDestroyed()) return
    win.setPosition(Math.round(persisted.x), Math.round(persisted.y), false)
    // 切换分辨率/显示器后可能越界，clamp 一次
    this.handler.clampToScreen()
  }
}
