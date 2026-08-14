/**
 * 通知窗口与主进程的 MessagePort 通信包装器。
 *
 * 主进程 FloatingWindowHandler 在 did-finish-load 时经 notification-preload 转发
 * 'connect' DOM 消息（携带 MessagePort）。本模块接收端口后建立双向通信：
 *   - 主进程 → 渲染层：notification-content / notification-auto-hide / theme-update
 *   - 渲染层 → 主进程：click / action / dismiss-item / measure-ready / hover-pause / hover-resume
 */

export interface NotificationBridgeOptions {
  /** MessagePort 角色标识，用于过滤 connect 消息 */
  role: string
  /** 收到主进程业务消息 */
  onMessage?: (data: any) => void
  /** MessagePort 建立完成 */
  onReady?: () => void
  /** 主题更新（dark / light） */
  onTheme?: (isDark: boolean) => void
}

export interface NotificationBridge {
  start: () => void
  send: (message: any) => void
  isReady: () => boolean
}

export function createNotificationBridge(options: NotificationBridgeOptions): NotificationBridge {
  let port: MessagePort | null = null

  function applyTheme(isDark: boolean): void {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(isDark ? 'dark' : 'light')
  }

  function start(): void {
    window.addEventListener('message', (event) => {
      const data = event.data || {}
      const ports = event.ports || []
      if (data.role !== options.role || !ports[0]) return

      port = ports[0]
      port.start()
      port.onmessage = (e) => {
        const message = e.data
        if (!message) return
        if (message.type === 'theme-update') {
          applyTheme(!!message.isDark)
          options.onTheme?.(!!message.isDark)
          return
        }
        options.onMessage?.(message)
      }
      options.onReady?.()
    })
  }

  function send(message: any): void {
    if (port) {
      port.postMessage(message)
    } else {
      console.warn('[notification] MessagePort 未初始化，消息未发送:', message)
    }
  }

  function isReady(): boolean {
    return !!port
  }

  return { start, send, isReady }
}
