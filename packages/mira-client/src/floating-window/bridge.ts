/**
 * 浮动窗口与主进程的 MessagePort 通信包装器（搜索 / 通知 / 悬浮球窗口共用）。
 *
 * 主进程 FloatingWindowHandler 在 did-finish-load 时经各窗口 preload 转发
 * 'connect' DOM 消息（携带 MessagePort）。本模块接收端口后建立双向通信，
 * 并统一处理主题同步（dark / light class 应用到 <html>）。
 */

export interface FloatingWindowBridgeOptions {
  /** MessagePort 角色标识，用于过滤 connect 消息 */
  role: string
  /** 收到主进程业务消息 */
  onMessage?: (data: any) => void
  /** MessagePort 建立完成 */
  onReady?: () => void
  /** 主题更新（dark / light） */
  onTheme?: (isDark: boolean) => void
}

export interface FloatingWindowBridge {
  start: () => void
  send: (message: any) => void
  isReady: () => boolean
  /** 请求原生拖拽（drag-handle 区域使用） */
  requestDrag: () => void
  /** 请求关闭/隐藏窗口 */
  requestClose: () => void
  /** 切换开发者工具 */
  toggleDevtools: () => void
}

export function createFloatingWindowBridge(
  options: FloatingWindowBridgeOptions
): FloatingWindowBridge {
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
      console.warn(`[${options.role}] MessagePort 未初始化，消息未发送:`, message)
    }
  }

  function isReady(): boolean {
    return !!port
  }

  function requestDrag(): void {
    send({ type: 'drag-start', timestamp: Date.now() })
  }

  function requestClose(): void {
    send({ type: 'close-window', timestamp: Date.now() })
  }

  function toggleDevtools(): void {
    send({ type: 'toggle-devtools', timestamp: Date.now() })
  }

  return { start, send, isReady, requestDrag, requestClose, toggleDevtools }
}
