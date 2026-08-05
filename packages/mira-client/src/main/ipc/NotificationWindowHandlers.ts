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
 * 采用「窗口池」架构：每条通知创建独立的 FloatingWindowHandler（独立 BrowserWindow），
 * 支持**多实例并存**，从默认右下角向上堆叠。
 *
 * 修复要点：
 *   - 不触发全屏 loading（showLoading: false）
 *   - 不在任务栏显示（skipTaskbar: true）
 *   - 内容渲染完成后才定位 + 显示（onReadyToShow → measure-ready）
 *   - 支持拖拽，拖拽后 clamp 到屏幕内
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
  /** 单条通知最大宽度 */
  private readonly WIDTH = 340
  /** 堆叠间距（含间隙） */
  private readonly STACK_GAP = 12
  /** 距屏幕边缘 */
  private readonly MARGIN = 20
  /** 最大并存数量 */
  private readonly MAX_SLOTS = 5
  /** 拖拽后判定关闭的阈值：窗口在屏幕内的可见面积低于此比例则关闭（拖动约 25% 即隐藏） */
  private readonly DISMISS_VISIBLE_RATIO = 0.75

  constructor() {
    ipcMain.handle('notification:window-show', this.handleShowNotification.bind(this))
    ipcMain.handle('notification:window-dismiss', this.handleDismiss.bind(this))
    ipcMain.handle('notification:window-hide', this.handleHideAll.bind(this))
  }

  /**
   * 显示一条通知
   */
  public async showNotification(payload: NotificationPayload): Promise<void> {
    // 超过上限时移除最早的一条
    if (this.slots.length >= this.MAX_SLOTS) {
      this.dismissSlot(this.slots[0])
    }

    const id = this.nextId++
    const position = payload.position ?? 'bottom-right'
    const stackIndex = this.slots.length

    // 为该通知构建专属 handler。注意 IPC 通道前缀与 role 必须每条唯一，
    // 否则多个窗口会复用同一个 MessagePort / handle。
    const handler = this.createSlotHandler(id, position, stackIndex, payload)

    const duration = payload.duration ?? 5000
    const slot: NotificationSlot = {
      id,
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

    // 页面加载完成后下发通知内容，渲染层测量高度后回传 measure-ready，
    // 此时 onReadyToShow 负责定位 + 显示。
    // 附带动画方向与可拖拽提示，供渲染层选择 slide 方向、决定是否启用拖拽。
    handler.getWindow()?.webContents.once('did-finish-load', () => {
      handler.sendMessage({
        type: 'notification-content',
        payload: {
          ...payload,
          __animDir: this.animDirOf(position),
          __draggable: this.isDraggable(position),
        },
      })
    })

    // 启动自动消失计时
    this.startAutoHide(slot)
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
    slot.timer = setTimeout(() => this.dismissSlot(slot), slot.remaining)
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
    stackIndex: number,
    _payload: NotificationPayload
  ): FloatingWindowHandler {
    const self = this

    // 每条通知唯一 IPC 前缀（基类会注册 <prefix>:show|hide|toggle，必须唯一避免冲突）
    const ipcChannelPrefix = `notification-slot-${id}`
    // role 保持统一，渲染层 bridge 用同一 role 过滤；每个窗口的 MessagePort 已天然隔离
    const role = 'notification'

    // 创建子类实例：通过方法覆盖承载业务逻辑，避免 messageHandlers 闭包循环引用
    const handler = new (class NotificationSlotHandler extends FloatingWindowHandler {
      private measured = false
      /** 拖拽期间记录的窗口起始位置（nt-drag-start 时写入） */
      private dragStartPos: { x: number; y: number } | null = null

      constructor() {
        super({
          name: `notification-${id}`,
          title: 'Mira 通知',
          width: self.WIDTH,
          height: 80, // 初始估计值，渲染后由 measure-ready 校正
          position,
          margin: self.MARGIN,
          resizable: false,
          movable: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          showLoading: false,
          htmlFileName: 'notification-window.html',
          htmlDirName: 'notification-window',
          preloadFileName: 'notification-preload.js',
          ipcChannelPrefix,
          role,
          messageHandlers: {
            'notification-ready': () => {},
            'measure-ready': (data) => {
              const h = Number(data.height)
              if (h > 0) this.resizeHeight(h)
              // 高度校正后重定位（保持堆叠）
              if (!this.measured) {
                this.measured = true
                self.positionSlot(this, position, stackIndex)
              }
            },
            dismiss: () => {
              const slot = self.slots.find((s) => s.handler === this)
              if (slot) self.dismissSlot(slot)
            },
            click: (data) => {
              self.forwardToMainRenderer({ type: 'notification:click', id, data: data.data })
            },
            action: (data) => {
              self.forwardToMainRenderer({
                type: 'notification:action',
                id,
                actionId: data.id,
                data: data.data,
              })
              const slot = self.slots.find((s) => s.handler === this)
              if (slot) self.dismissSlot(slot)
            },
            // 自定义 JS 拖拽：仅水平、且只允许朝所在边缘外侧的单方向拖动
            'nt-drag-start': () => {
              const win = this.getWindow()
              if (win && !win.isDestroyed()) {
                const b = win.getBounds()
                this.dragStartPos = { x: b.x, y: b.y }
              }
            },
            'nt-drag-move': (data) => {
              const win = this.getWindow()
              if (!win || win.isDestroyed() || !this.dragStartPos) return
              const axis = self.dragAxis(position)
              if (axis.axis === 'vertical') {
                // 垂直拖拽（top/bottom/center）：仅应用 deltaY，按方向限定符号
                const dy = Number(data.deltaY || 0)
                const allowedDy = axis.sign === 0 ? dy : Math.sign(axis.sign) * Math.max(Math.sign(axis.sign) * dy, 0)
                const nx = this.dragStartPos.x // 水平锁定
                const ny = this.dragStartPos.y + allowedDy
                win.setPosition(Math.round(nx), Math.round(ny), false)
              } else {
                // 水平拖拽（四角/左右边缘）：仅应用 deltaX，按方向限定符号
                const dx = Number(data.deltaX || 0)
                const allowedDx = axis.sign === 0 ? dx : Math.sign(axis.sign) * Math.max(Math.sign(axis.sign) * dx, 0)
                const nx = this.dragStartPos.x + allowedDx
                const ny = this.dragStartPos.y // 垂直锁定
                win.setPosition(Math.round(nx), Math.round(ny), false)
              }
            },
            'nt-drag-end': () => {
              this.dragStartPos = null
              // 拖出屏幕过半则关闭，否则 clamp 回屏幕内
              self.handleDropAfterDrag(this, id)
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

      protected onReadyToShow(): void {
        // ready-to-show 时内容尚未应用（高度未知），先按堆叠初步定位并显示，
        // 待 measure-ready 回调再校正高度并重定位。
        self.positionSlot(this, position, stackIndex)
        this.doShow()
      }
    })()

    return handler
  }

  /**
   * 计算某个槽位在堆叠中的位置并直接定位窗口。
   * 从默认位置（如右下角）向上堆叠：offset 越大越靠上。
   *
   * 直接基于窗口实际 bounds 与屏幕 workArea 计算，避免基类 computePosition
   * 使用配置尺寸（measure-ready 后会过时）导致的偏差。
   */
  private positionSlot(
    handler: FloatingWindowHandler,
    position: FloatingWindowPosition,
    stackIndex: number
  ): void {
    const win = handler.getWindow()
    if (!win || win.isDestroyed()) return
    const bounds = win.getBounds()
    const { screen: screenMod } = require('electron') as typeof import('electron')
    const wa = screenMod.getDisplayMatching(bounds).workArea
    const margin = this.MARGIN
    const w = bounds.width
    const h = bounds.height

    // 堆叠偏移：累加所有"下方"通知的高度（本通知之下）+ 间隙。
    // 简化处理：以 slot 在数组中的相对顺序决定层级，靠后的通知在底部。
    const myIdx = this.slots.findIndex((s) => s.handler === handler)
    let offsetUp = 0
    for (let i = myIdx + 1; i < this.slots.length; i++) {
      const b = this.slots[i].handler.getWindow()?.getBounds()
      offsetUp += (b ? b.height : h) + this.STACK_GAP
    }
    if (offsetUp === 0) offsetUp = stackIndex * (h + this.STACK_GAP) // fallback

    // 计算基础 x/y（按 position 预设），再应用向上偏移
    let x: number
    let y: number
    const pos = position
    if (typeof pos === 'object') {
      x = pos.x
      y = pos.y - offsetUp
    } else {
      // 水平
      if (pos === 'top-left' || pos === 'bottom-left') x = wa.x + margin
      else if (pos === 'top-right' || pos === 'bottom-right') x = wa.x + wa.width - w - margin
      else x = wa.x + Math.round((wa.width - w) / 2) // top/bottom/center
      // 垂直（含堆叠偏移）
      if (pos === 'center') {
        // 屏幕居中：垂直也居中，堆叠时整体向上偏移
        y = wa.y + Math.round((wa.height - h) / 2) - offsetUp
      } else if (pos === 'top-left' || pos === 'top-right' || pos === 'top') {
        y = wa.y + margin + offsetUp // 顶部预设时向下堆叠
      } else {
        y = wa.y + wa.height - h - margin - offsetUp // 底部预设时向上堆叠
      }
    }

    win.setPosition(Math.round(x), Math.round(y), false)
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
      this.positionSlot(slot.handler, slot.position, this.slots.indexOf(slot))
    }
  }

  /**
   * 拖拽结束后处理：若窗口在屏幕内的可见面积低于阈值则关闭该通知，
   * 否则 clamp 回屏幕可视区域。
   */
  private handleDropAfterDrag(handler: FloatingWindowHandler, id: number): void {
    const win = handler.getWindow()
    if (!win || win.isDestroyed()) return

    if (this.computeVisibleRatio(win) < this.DISMISS_VISIBLE_RATIO) {
      // 拖出过半，关闭该通知
      const slot = this.slots.find((s) => s.id === id)
      if (slot) this.dismissSlot(slot)
    } else {
      // 仍在屏幕内，clamp 回可视区域
      handler.clampToScreen()
    }
  }

  /**
   * 根据通知位置返回拖拽轴与方向符号。
   * - 四角 / 左右边缘 → 水平轴，朝所在水平边缘外侧滑（左边缘 sign=-1，右边缘 sign=+1）
   * - top → 垂直轴，向上滑（sign=-1）；bottom → 垂直轴，向下滑（sign=+1）
   * - center → 垂直轴，上下均可（sign=0）
   * sign 约定：+1 表示沿正方向（右/下），-1 表示负方向（左/上），0 表示双向。
   */
  private dragAxis(
    position: FloatingWindowPosition
  ): { axis: 'horizontal' | 'vertical'; sign: number } {
    if (typeof position === 'object') return { axis: 'horizontal', sign: 0 }
    switch (position) {
      case 'top-left':
      case 'bottom-left':
        return { axis: 'horizontal', sign: -1 } // 向左
      case 'top-right':
      case 'bottom-right':
        return { axis: 'horizontal', sign: 1 } // 向右
      case 'top':
        return { axis: 'vertical', sign: -1 } // 向上
      case 'bottom':
        return { axis: 'vertical', sign: 1 } // 向下
      case 'center':
      default:
        return { axis: 'vertical', sign: 0 } // 上下均可
    }
  }

  /**
   * 是否允许拖拽。屏幕居中（center）禁止拖拽，其余位置允许（按各自轴向滑出关闭）。
   */
  private isDraggable(position: FloatingWindowPosition): boolean {
    return !(typeof position === 'string' && position === 'center')
  }

  /**
   * 根据通知位置返回 slide 出现动画的方向。
   * 与拖拽轴一致：水平边缘位置从对应侧水平滑入，top/bottom/center 从上/下滑入。
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

  /**
   * 计算窗口在所在屏幕 workArea 内的可见面积占比（0~1）
   */
  private computeVisibleRatio(win: BrowserWindow): number {
    const { screen: screenMod } = require('electron') as typeof import('electron')
    const bounds = win.getBounds()
    const wa = screenMod.getDisplayMatching(bounds).workArea

    // 重叠矩形
    const overlapX = Math.max(
      0,
      Math.min(bounds.x + bounds.width, wa.x + wa.width) - Math.max(bounds.x, wa.x)
    )
    const overlapY = Math.max(
      0,
      Math.min(bounds.y + bounds.height, wa.y + wa.height) - Math.max(bounds.y, wa.y)
    )
    const overlapArea = overlapX * overlapY
    const windowArea = bounds.width * bounds.height
    if (windowArea <= 0) return 0
    return overlapArea / windowArea
  }

  private forwardToMainRenderer(data: any): void {
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('notification-from-window', data)
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
