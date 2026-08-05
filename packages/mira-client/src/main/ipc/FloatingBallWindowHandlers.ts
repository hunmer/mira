import { ipcMain, BrowserWindow, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { FloatingWindowHandler } from './FloatingWindowHandler'

/**
 * 悬浮球窗口管理器（单实例）
 *
 * 基于 FloatingWindowHandler 通用模板，承载悬浮球特有逻辑：
 *   - 自定义全向拖拽（nt-drag-*），松手 clamp 到屏幕内并持久化坐标
 *   - 接收文件拖放（fb-file-drop），转发主渲染进程触发 FileUploadDialog
 *   - 单击行为可配置（fb-click）：打开上传对话框 / 切换主窗口
 *
 * 位置持久化：写 userData/floating-ball-state.json，与 AppSettings 解耦。
 *
 * IPC 通道（对外，供主渲染进程调用）：
 *   - floating-ball:show / :hide / :toggle
 *   - floating-ball:set-position（null=重置）
 *   - floating-ball:get-state（读取当前坐标）
 *
 * 主渲染进程 → 悬浮球：通过 floating-ball-from-window 通道下发业务消息。
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
    this.handler = new (class extends FloatingWindowHandler {
      constructor() {
        super({
          name: 'floating-ball',
          title: 'Mira 悬浮球',
          width: 64,
          height: 64,
          position: 'bottom-right',
          margin: 24,
          movable: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          showLoading: false,
          htmlFileName: 'floating-ball-window.html',
          htmlDirName: 'floating-ball-window',
          preloadFileName: 'floating-ball-preload.js',
          ipcChannelPrefix: 'floating-ball',
          role: 'floating-ball',
          messageHandlers: {
            'fb-ready': () => {
              /* 窗口已就绪 */
            },
            'fb-click': (_data, ctx) => {
              // 点击行为由主渲染进程的设置决定；这里先转发一个统一 click 消息，
              // 由主渲染进程根据 floatingBallClickAction 决定具体动作，
              // 避免 main 进程反向查询渲染进程设置（解耦）。
              ctx.send && forwardToMain({ type: 'fb-click' })
            },
            'fb-file-drop': (data, ctx) => {
              const files = Array.isArray(data.files) ? data.files : []
              if (files.length === 0) return
              forwardToMain({ type: 'file-drop', files })
              ctx.getMainWindow?.()?.show()
            },
            // 自定义全向拖拽（无轴向/方向限制）
            'nt-drag-start': (_data, _ctx) => {
              const win = this.handler.getWindow()
              if (win && !win.isDestroyed()) {
                const b = win.getBounds()
                this.dragStartPos = { x: b.x, y: b.y }
              }
            },
            'nt-drag-move': (data, _ctx) => {
              const win = this.handler.getWindow()
              if (!win || win.isDestroyed() || !this.dragStartPos) return
              const dx = Number(data.deltaX || 0)
              const dy = Number(data.deltaY || 0)
              const nx = this.dragStartPos.x + dx
              const ny = this.dragStartPos.y + dy
              win.setPosition(Math.round(nx), Math.round(ny), false)
            },
            'nt-drag-end': (_data, _ctx) => {
              this.dragStartPos = null
              const win = this.handler.getWindow()
              if (!win || win.isDestroyed()) return
              this.handler.clampToScreen()
              this.persistPosition()
            },
          },
        })
      }

      protected onReadyToShow(): void {
        // 创建后恢复上次位置（若已持久化）
        this.restorePosition()
        this.doShow()
      }
    })()

    // 自有业务 IPC
    ipcMain.handle('floating-ball:set-position', (_e, pos) => this.setPosition(pos))
    ipcMain.handle('floating-ball:get-state', () => this.getState())
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

  public getHandler(): FloatingWindowHandler {
    return this.handler
  }

  public cleanup(): void {
    ipcMain.removeHandler('floating-ball:set-position')
    ipcMain.removeHandler('floating-ball:get-state')
    // 基类清理 :show/:hide/:toggle 及窗口、MessagePort
    this.handler.cleanup()
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

  // ============ 主窗口定位 ============

  private getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows()
    const main = windows.find((w: any) => w.aliasName === 'Mira') as BrowserWindow | undefined
    if (main && !main.isDestroyed()) return main
    // 回退：排除当前悬浮球窗口
    const selfWin = this.handler.getWindow()
    return windows.find((w) => w !== selfWin && !w.isDestroyed()) || null
  }
}

// 模块内闭包辅助：在 messageHandlers 中转发给主渲染进程
function forwardToMain(data: any): void {
  // 通过临时访问主进程的所有窗口找到主渲染窗口
  const windows = BrowserWindow.getAllWindows()
  const main =
    windows.find((w: any) => w.aliasName === 'Mira') as BrowserWindow | undefined ||
    windows[0]
  if (main && !main.isDestroyed()) {
    main.webContents.send('floating-ball-from-window', data)
  }
}
