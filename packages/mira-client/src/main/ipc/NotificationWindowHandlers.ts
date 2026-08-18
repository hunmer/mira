import { ipcMain, BrowserWindow } from 'electron'
import {
  FloatingWindowHandler,
  type FloatingWindowPosition,
} from './FloatingWindowHandler'
import type { NotificationAnimation } from '../../shared/types'

/**
 * 通知窗口载荷（结构化字段 + 可选任意 HTML）
 */
export interface NotificationPayload {
  /** 窗口内部使用的稳定列表键 */
  __itemKey?: number
  /** 业务通知 ID；重复调用 show 时原位更新同一通知 */
  notificationId?: string
  /** 标题（必填） */
  title: string
  /** 正文 */
  body?: string
  /** 图标（Material Icons 名称或图片 URL） */
  icon?: string
  /** 多文件通知的缩略图 URL（最多展示 4 张） */
  icons?: string[]
  /** 附带图片通知：图片 URL 列表（卡片左侧展示，优先于 icons） */
  images?: string[]
  /** 通知类型，决定左侧色条颜色：info | success | warning | error | loading（loader 旋转图标） */
  type?: 'info' | 'success' | 'warning' | 'error' | 'loading'
  /** 操作按钮 [{ id, label }]，点击后通过 action 事件回传 id */
  actions?: { id: string; label: string }[]
  /** 任意自定义 HTML（存在时以 v-html 渲染，覆盖 body） */
  html?: string
  /** 自动消失时长（ms），0 表示常驻，默认 5000 */
  duration?: number
  /** 屏幕位置覆盖（默认右下角） */
  position?: FloatingWindowPosition
  /** 出现动画，默认 'slide' */
  animation?: NotificationAnimation
  /**
   * 业务自定义数据，点击/操作时原样回传给主渲染进程。
   * 例如导入通知携带 { fileId }，点击后据此跳转图片详情。
   */
  data?: Record<string, any>
}

/** 单条通知在池中的窗口槽位 */
interface NotificationSlot {
  /** 唯一 id（同时也是 IPC 通道后缀，避免冲突） */
  id: number
  /** 调用方约定的业务 ID，用于原位更新 */
  notificationId?: string
  /** 最近一次内容；窗口初次加载期间发生更新时，下发最终版本 */
  payload: NotificationPayload
  /** 同一位置窗口内的通知列表 */
  items: NotificationPayload[]
  /** 该通知专属的窗口处理器 */
  handler: FloatingWindowHandler
  /** 自动隐藏定时器 */
  timer: NodeJS.Timeout | null
  /** 配置的自动消失时长（ms），0 = 常驻 */
  duration: number
  /** 上次开始计时的时间戳（用于悬停暂停后恢复剩余时长） */
  startedAt: number
  /** 剩余时长（ms） */
  remaining: number
  /** 该通知的屏幕位置预设 */
  position: FloatingWindowPosition
}

/**
 * 通知窗口管理器
 *
 * 采用「窗口池」架构：每个位置创建一个 FloatingWindowHandler（独立 BrowserWindow），
 * 同一窗口内聚合该位置的多条通知，不同位置仍可并存并堆叠。
 *
 * 修复要点：
 *   - 不触发全屏 loading（showLoading: false）
 *   - 不在任务栏显示（skipTaskbar: true）
 *   - 窗口固定占满屏幕可用高度，通知增删不调整原生窗口尺寸
 *   - 每条通知独立实例，可并存
 *
 * IPC 通道（对外，供主渲染进程调用）：
 *   - notification:window-show         显示一条通知（带 NotificationPayload）
 *   - notification:window-dismiss      关闭指定/全部通知
 *   - notification:window-hide         隐藏全部（兼容）
 */
export class NotificationWindowHandlers {
  /** 活跃通知槽位 */
  private slots: NotificationSlot[] = []
  /** 自增 id */
  private nextId = 1
  /** 同窗口列表项稳定键 */
  private nextItemKey = 1
  /** 单条通知最大宽度 */
  private readonly WIDTH = 340
  /** 距屏幕边缘 */
  private readonly MARGIN = 20
  /** 最大并存数量 */
  private readonly MAX_SLOTS = 5
  /** 通知窗口最多直接展示的数量；超过后进入更多队列 */
  private readonly MAX_VISIBLE_ITEMS = 3

  constructor() {
    ipcMain.handle('notification:window-show', this.handleShowNotification.bind(this))
    ipcMain.handle('notification:window-dismiss', this.handleDismiss.bind(this))
    ipcMain.handle('notification:window-hide', this.handleHideAll.bind(this))
  }

  /**
   * 显示一条通知
   */
  public async showNotification(payload: NotificationPayload): Promise<void> {
    const position = payload.position ?? 'bottom-right'
    const existing = this.slots.find((slot) => this.samePosition(slot.position, position))
    if (existing) {
      const itemIndex = payload.notificationId
        ? existing.items.findIndex((item) => item.notificationId === payload.notificationId)
        : -1
      if (itemIndex >= 0) {
        existing.items[itemIndex] = {
          ...payload,
          __itemKey: existing.items[itemIndex].__itemKey,
        }
      } else {
        existing.items.push({ ...payload, __itemKey: this.nextItemKey++ })
      }
      existing.payload = payload
      // 溢出队列收到新通知时，整组通知重新开始倒计时；更新已有通知不重置。
      if (itemIndex < 0 && existing.items.length > this.MAX_VISIBLE_ITEMS) {
        existing.duration = payload.duration ?? existing.duration
        existing.remaining = existing.duration
        this.startAutoHide(existing)
      }
      existing.handler.sendMessage({
        type: 'notification-content',
        payload: {
          ...payload,
          __items: existing.items,
          __animDir: this.animDirOf(existing.position),
        },
      })
      return
    }

    // 超过上限时移除最早的一条
    if (this.slots.length >= this.MAX_SLOTS) {
      this.dismissSlot(this.slots[0])
    }

    const id = this.nextId++
    // 为该通知构建专属 handler。注意 IPC 通道前缀与 role 必须每条唯一，
    // 否则多个窗口会复用同一个 MessagePort / handle。
    const handler = this.createSlotHandler(id, position, payload)

    const duration = payload.duration ?? 5000
    const slot: NotificationSlot = {
      id,
      notificationId: payload.notificationId,
      payload,
      items: [{ ...payload, __itemKey: this.nextItemKey++ }],
      handler,
      timer: null,
      duration,
      startedAt: 0,
      remaining: duration,
      position,
    }
    this.slots.push(slot)

    // 创建窗口（ready-to-show 后由 onReadyToShow 控制显示时机）
    handler.createWindow()

    // 页面加载完成后下发通知内容。附带动画方向供渲染层选择 slide 方向。
    handler.getWindow()?.webContents.once('did-finish-load', () => {
      handler.sendMessage({
        type: 'notification-content',
        payload: {
          ...slot.payload,
          __items: slot.items,
          __animDir: this.animDirOf(position),
        },
      })
    })

    // 启动自动消失计时
    this.startAutoHide(slot)
  }

  private samePosition(a: FloatingWindowPosition, b: FloatingWindowPosition): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  /**
   * 启动/重启自动隐藏计时
   */
  private startAutoHide(slot: NotificationSlot): void {
    if (slot.timer) {
      clearTimeout(slot.timer)
      slot.timer = null
    }
    if (slot.remaining <= 0) return // 常驻
    slot.startedAt = Date.now()
    slot.timer = setTimeout(() => {
      slot.handler.sendMessage({ type: 'notification-auto-hide' })
      slot.timer = setTimeout(() => this.dismissSlot(slot), 280)
    }, slot.remaining)
  }

  /**
   * 悬停暂停：记录剩余时长并清除定时器
   */
  private pauseAutoHide(slot: NotificationSlot): void {
    if (!slot.timer) return
    const elapsed = Date.now() - slot.startedAt
    slot.remaining = Math.max(slot.remaining - elapsed, 0)
    clearTimeout(slot.timer)
    slot.timer = null
  }

  /**
   * 离开恢复：按剩余时长重启定时器
   */
  private resumeAutoHide(slot: NotificationSlot): void {
    if (slot.timer) return
    if (slot.remaining <= 0) {
      this.dismissSlot(slot)
      return
    }
    this.startAutoHide(slot)
  }

  /**
   * 关闭指定通知（按 id），未指定则关闭全部
   */
  public dismissNotification(id?: number): void {
    if (id !== undefined) {
      const slot = this.slots.find((s) => s.id === id)
      if (slot) this.dismissSlot(slot)
    } else {
      this.dismissAll()
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.dismissAll()
    ipcMain.removeHandler('notification:window-show')
    ipcMain.removeHandler('notification:window-dismiss')
    ipcMain.removeHandler('notification:window-hide')
  }

  // ============ 内部 ============

  /**
   * 为单条通知创建专属 FloatingWindowHandler
   */
  private createSlotHandler(
    id: number,
    position: FloatingWindowPosition,
    _payload: NotificationPayload
  ): FloatingWindowHandler {
    const self = this

    // 每条通知唯一 IPC 前缀（基类会注册 <prefix>:show|hide|toggle，必须唯一避免冲突）
    const ipcChannelPrefix = `notification-slot-${id}`
    // role 保持统一，渲染层 bridge 用同一 role 过滤；每个窗口的 MessagePort 已天然隔离
    const role = 'notification'

    // 创建子类实例：通过方法覆盖承载业务逻辑，避免 messageHandlers 闭包循环引用
    const handler = new (class NotificationSlotHandler extends FloatingWindowHandler {
      /** 是否已显示 */
      private shown = false

      constructor() {
        super({
          name: `notification-${id}`,
          title: 'Mira 通知',
          width: self.WIDTH,
          height: 80, // ready-to-show 时扩展为屏幕工作区高度
          position,
          margin: self.MARGIN,
          resizable: false,
          movable: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          acceptFirstMouse: true,
          showLoading: false,
          // 渲染器应用多页入口（vue-sonner 通知页面），dev 走 dev server，生产走 dist-renderer
          rendererEntry: 'notification-window.html',
          preloadFileName: 'notification-preload.js',
          ipcChannelPrefix,
          role,
          messageHandlers: {
            'notification-ready': () => {},
            // 渲染层按指针是否位于卡片上动态切换：卡片可交互，空白区域点击穿透到底层应用
            'set-mouse-events': (data) => {
              this.setMousePassthrough(!!data.ignore)
            },
            dismiss: () => {
              const slot = self.slots.find((s) => s.handler === this)
              if (slot) self.dismissSlot(slot)
            },
            click: (data) => {
              self.forwardToMainRenderer({ type: 'notification:click', id, data: data.data })
            },
            'dismiss-item': (data) => {
              const slot = self.slots.find((s) => s.handler === this)
              if (slot) self.dismissItem(slot, data.notificationId, data.index)
            },
            action: (data) => {
              console.info('[NotificationDebug][main] action received', { id, data })
              const slot = self.slots.find((s) => s.handler === this)
              console.info('[NotificationDebug][main] dismissing slot', { id, slotFound: !!slot })
              if (slot) self.dismissSlot(slot)
              self.forwardToMainRenderer({
                type: 'notification:action',
                id,
                actionId: data.id,
                data: data.data,
              })
            },
            'hover-pause': () => {
              const slot = self.slots.find((s) => s.handler === this)
              if (slot) self.pauseAutoHide(slot)
            },
            'hover-resume': () => {
              const slot = self.slots.find((s) => s.handler === this)
              if (slot) self.resumeAutoHide(slot)
            },
          },
        })
      }

      /**
       * 切换鼠标穿透。Windows/Linux 用 forward 模式：穿透时仍把 mousemove
       * 转发给页面，渲染层据此在卡片上切回可交互。macOS 不支持 forward，
       * 穿透后无法切回，因此保持不穿透。
       */
      private setMousePassthrough(ignore: boolean): void {
        const win = this.getWindow()
        if (!win || win.isDestroyed()) return
        if (process.platform === 'darwin') {
          if (!ignore) win.setIgnoreMouseEvents(false)
        } else {
          win.setIgnoreMouseEvents(ignore, { forward: true })
        }
      }

      /** 只显示一次 */
      private doShowOnce(): void {
        if (this.shown) return
        this.shown = true
        this.doShow()
      }

      protected onReadyToShow(): void {
        // ready-to-show 时固定覆盖屏幕工作区高度；
        // 默认整体鼠标穿透（forward 模式），渲染层按指针位置动态切回可交互。
        self.positionSlot(this, position)
        this.setMousePassthrough(true)
        const win = this.getWindow()
        if (win && !win.isDestroyed()) {
          win.setSkipTaskbar(true)
        }
        this.doShowOnce()
      }
    })()

    return handler
  }

  /**
   * 固定通知窗口为贯穿屏幕工作区的纵向透明条。
   * 通知列表在条内按 position 锚定，空白区域由鼠标穿透逻辑处理。
   */
  private positionSlot(
    handler: FloatingWindowHandler,
    position: FloatingWindowPosition,
  ): void {
    const win = handler.getWindow()
    if (!win || win.isDestroyed()) return
    const bounds = win.getBounds()
    const { screen: screenMod } = require('electron') as typeof import('electron')
    const wa = screenMod.getDisplayMatching(bounds).workArea
    const margin = this.MARGIN
    const w = bounds.width
    const h = wa.height

    // 每个 position 只有一个聚合窗口，窗口内通知由 vue-sonner 自己堆叠。
    // 这里不能再按 slots 索引累计高度，否则不同 position 会互相污染坐标。
    let x: number
    let y: number
    const pos = position
    if (typeof pos === 'object') {
      x = pos.x
      y = wa.y
    } else {
      // 水平
      if (pos === 'top-left' || pos === 'bottom-left') x = wa.x + margin
      else if (pos === 'top-right' || pos === 'bottom-right') x = wa.x + wa.width - w - margin
      else x = wa.x + Math.round((wa.width - w) / 2) // top/bottom/center
      y = wa.y
    }

    win.setBounds({ x: Math.round(x), y: Math.round(y), width: w, height: h }, false)
  }

  /**
   * 关闭单个槽位并从池中移除，随后重排剩余通知
   */
  private dismissSlot(slot: NotificationSlot): void {
    if (slot.timer) {
      clearTimeout(slot.timer)
      slot.timer = null
    }
    const idx = this.slots.indexOf(slot)
    if (idx >= 0) this.slots.splice(idx, 1)

    // 销毁窗口（FloatingWindowHandler.cleanup 会 destroy 窗口并移除其 IPC handle）
    slot.handler.cleanup()

    // 重排剩余通知（收缩堆叠间隙）
    this.relayout()
  }

  private dismissItem(slot: NotificationSlot, notificationId?: string, index?: number): void {
    const itemIndex = notificationId
      ? slot.items.findIndex((item) => item.notificationId === notificationId)
      : Number.isInteger(index) ? index! : -1
    if (itemIndex < 0 || itemIndex >= slot.items.length) return
    slot.items.splice(itemIndex, 1)
    if (slot.items.length === 0) {
      this.dismissSlot(slot)
      return
    }
    slot.payload = slot.items[slot.items.length - 1]
    slot.handler.sendMessage({
      type: 'notification-content',
      payload: {
        ...slot.payload,
        __items: slot.items,
        __animDir: this.animDirOf(slot.position),
      },
    })
  }

  /**
   * 关闭全部
   */
  private dismissAll(): void {
    for (const slot of [...this.slots]) {
      this.dismissSlot(slot)
    }
  }

  /**
   * 重新排列所有活跃通知（保持各自 position 预设，重新计算堆叠偏移）
   */
  private relayout(): void {
    for (const slot of this.slots) {
      this.positionSlot(slot.handler, slot.position)
    }
  }

  /**
   * 根据通知位置返回 slide 出现动画的方向。
   */
  private animDirOf(position: FloatingWindowPosition): 'left' | 'right' | 'up' | 'down' {
    if (typeof position === 'object') return 'right'
    switch (position) {
      case 'top-left':
      case 'bottom-left':
        return 'left'
      case 'top-right':
      case 'bottom-right':
        return 'right'
      case 'top':
      case 'center':
        return 'down' // 顶部/居中从上方滑入
      case 'bottom':
        return 'up' // 底部从下方滑入
      default:
        return 'right'
    }
  }

  private forwardToMainRenderer(data: any): void {
    const mainWindow = this.getMainWindow()
    console.info('[NotificationDebug][main] forwarding to main renderer', {
      data,
      mainWindowFound: !!mainWindow,
      mainWindowDestroyed: mainWindow?.isDestroyed() ?? null,
    })
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('notification-from-window', data)
      console.info('[NotificationDebug][main] notification-from-window sent', data)
    }
  }

  private getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows()
    const main = windows.find((w: any) => w.aliasName === 'Mira') as BrowserWindow | undefined
    if (main && !main.isDestroyed()) return main
    // 回退：排除当前池中的通知窗口
    const slotWindows = new Set(
      this.slots.map((s) => s.handler.getWindow()).filter(Boolean) as BrowserWindow[]
    )
    return windows.find((w) => !slotWindows.has(w) && !w.isDestroyed()) || null
  }

  private async handleShowNotification(_event: any, payload: NotificationPayload): Promise<void> {
    return this.showNotification(payload)
  }

  private async handleDismiss(_event: any, id?: number): Promise<void> {
    this.dismissNotification(id)
  }

  private async handleHideAll(): Promise<void> {
    this.dismissAll()
  }
}
