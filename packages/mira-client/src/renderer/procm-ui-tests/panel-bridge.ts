// UI 测试面板桥接（仅 DEV）：面板窗口(public/ui-test-panel.html) 经 BroadcastChannel
// 请求主窗口执行 __procmUiTests 中的测试，执行期间劫持 console 把日志流式转发回面板。
const CHANNEL = 'mira-ui-test-panel'

function formatLogValue(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

export function setupUiTestPanelBridge(): void {
  if (!import.meta.env.DEV) return
  const channel = new BroadcastChannel(CHANNEL)

  channel.onmessage = async (event: MessageEvent) => {
    const data = event.data as { source?: string; type?: string; id?: string; name?: string; args?: unknown[] }
    if (!data || data.source === 'bridge') return

    if (data.type === 'hello') {
      channel.postMessage({ source: 'bridge', type: 'tests', names: Object.keys(window.__procmUiTests ?? {}) })
      return
    }

    if (data.type === 'run') {
      const { id, name, args = [] } = data
      const post = (payload: Record<string, unknown>) => channel.postMessage({ source: 'bridge', id, ...payload })
      const test = window.__procmUiTests?.[name ?? '']
      if (typeof test !== 'function') {
        post({ type: 'result', ok: false, error: `unknown ui test: ${name}` })
        return
      }

      const levels = ['log', 'info', 'warn', 'error'] as const
      const originals = levels.map((level) => [level, console[level]] as const)
      const restoreConsole = () => originals.forEach(([level, fn]) => { console[level] = fn })
      levels.forEach((level) => {
        console[level] = (...parts: unknown[]) => {
          post({ type: 'log', level, text: parts.map(formatLogValue).join(' ') })
          originals.find(([l]) => l === level)![1](...parts)
        }
      })

      try {
        const result = await test(...args)
        post({ type: 'result', ok: true, result })
      } catch (error) {
        const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        post({ type: 'result', ok: false, error: message })
      } finally {
        restoreConsole()
      }
    }
  }
}
