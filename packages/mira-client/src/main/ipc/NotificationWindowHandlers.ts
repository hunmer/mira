import { ipcMain, BrowserWindow } from 'electron'
import {
  FloatingWindowHandler,
  type FloatingWindowOptions,
  type FloatingWindowPosition,
} from './FloatingWindowHandler'

/**
 * 通知窗口载荷（结构化字段 + 可选任意 HTML）
 */
export interface NotificationPayload {
  /** 标题（必填） */
  title: string
  /** 正文 */
  body?: string
  /** 图标（Material Icons 名称或图片 URL） */
  icon?: string
  /** 通知类型，决定左侧色条颜色：info | success | warning | error */
  type?: 'info' | 'success' | 'warning' | 'error'
  /** 操作按钮 [{ id, label }]，点击后通过 action 事件回传 id */
  actions?: { id: string; label: string }[]
  /** 任意自定义 HTML（存在时以 v-html 渲染，覆盖 body） */
  html?: string
  /** 自动消失时长（ms），0 表示常驻，默认 5000 */
  duration?: number
  /** 屏幕位置覆盖（默认右下角） */
  position?: FloatingWindowPosition
}

/**
 * 通知窗口管理器
 *
 * 基于 FloatingWindowHandler，默认位于屏幕右下角，支持：
 *   - 多条通知堆叠（向下偏移）
 *   - 自动消失（duration，0 常驻）
 *   - 点击 / action 事件转发主渲染进程
 *
 * IPC 通道：
 *   - notification-window:show         显示窗口（基类通用，无载荷）
 *   - notification-window:hide         隐藏窗口（基类通用）
 *   - notification-window:toggle       切换显示（基类通用）
 *   - notification:window-show         显示一条通知（带 NotificationPayload 载荷）
 *   - notification:window-dismiss      主动关闭当前通知
 */
export class NotificationWindowHandlers {
  private handler: FloatingWindowHandler
  /** 当前堆叠偏移条数（用于多条通知向下堆叠） */
  private stackCount = 0
  /** 当前通知的位置覆盖（来自最近一次 payload） */
  private currentPosition: FloatingWindowPosition = 'bottom-right'
  /** 自动隐藏定时器 */
  private autoHideTimer: NodeJS.Timeout | null = null
  /** 单条通知高度估算（与 CSS 卡片高度一致，用于堆叠间距） */
  private readonly STACK_HEIGHT = 90

  constructor() {
    const options: FloatingWindowOptions = {
      name: 'notification',
      title: 'Mira 通知',
      width: 360,
      height: 80,
      position: 'bottom-right',
      margin: 20,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      // 通知卡片高度可变，窗口本身保持紧凑高度，由内部自适应
      htmlFileName: 'notification-window.html',
      htmlDirName: 'notification-window',
      preloadFileName: 'notification-preload.js',
      ipcChannelPrefix: 'notification-window',
      role: 'notification',
      hideOnBlur: false,
      messageHandlers: {
        'notification-ready': () => {
          /* 窗口就绪 */
        },
        dismiss: (_data, ctx) => {
          this.clearAutoHide()
          ctx.hide()
        },
        click: (data, _ctx) => {
          // 点击通知体，转发主渲染进程
          this.forwardToMainRenderer({ type: 'notification:click', data: data.data })
        },
        action: (data, _ctx) => {
          // 点击 action 按钮
          this.forwardToMainRenderer({
            type: 'notification:action',
            id: data.id,
            data: data.data,
          })
        },
      },
    }

    this.handler = new FloatingWindowHandler(options)

    // 额外注册业务专用 IPC（注意通道名避免与基类 notification-window:show|hide|toggle 冲突）
    ipcMain.handle('notification:window-show', this.handleShowNotification.bind(this))
    ipcMain.handle('notification:window-dismiss', this.handleDismiss.bind(this))
  }

  /**
   * 显示一条通知
   */
  public async showNotification(payload: NotificationPayload): Promise<void> {
    this.currentPosition = payload.position ?? 'bottom-right'
    const duration = payload.duration ?? 5000

    // 计算堆叠偏移
    this.stackCount = Math.min(this.stackCount + 1, 5) // 最多堆叠 5 条
    const offsetY = (this.stackCount - 1) * this.STACK_HEIGHT
    this.handler.positionWindow(this.currentPosition, { y: offsetY })

    // 发送内容到窗口
    this.handler.sendMessage({
      type: 'notification-content',
      payload,
    })

    // 确保窗口可见（若首次则创建）
    await this.handler.show()

    // 自动消失
    this.clearAutoHide()
    if (duration > 0) {
      this.autoHideTimer = setTimeout(() => {
        this.dismissCurrent()
      }, duration)
    }
  }

  /**
   * 隐藏通知窗口
   */
  public async hide(): Promise<void> {
    this.clearAutoHide()
    return this.handler.hide()
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.clearAutoHide()
    ipcMain.removeHandler('notification:window-show')
    ipcMain.removeHandler('notification:window-dismiss')
    this.handler.cleanup()
  }

  // ============ 内部 ============

  private dismissCurrent(): void {
    this.clearAutoHide()
    this.stackCount = 0
    this.handler.hide().catch((err) =>
      console.error('[NotificationWindow] dismiss failed', err)
    )
  }

  private clearAutoHide(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer)
      this.autoHideTimer = null
    }
  }

  private forwardToMainRenderer(data: any): void {
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('notification-from-window', data)
    }
  }

  private getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows()
    // 主窗口通过 aliasName 标识，回退到"非本通知窗口"的第一个
    const main = windows.find((w: any) => w.aliasName === 'Mira') as BrowserWindow | undefined
    if (main && !main.isDestroyed()) return main
    return windows.find((w) => w !== this.handler.getWindow()) || null
  }

  private async handleShowNotification(_event: any, payload: NotificationPayload): Promise<void> {
    return this.showNotification(payload)
  }

  private async handleDismiss(): Promise<void> {
    this.dismissCurrent()
  }
}
