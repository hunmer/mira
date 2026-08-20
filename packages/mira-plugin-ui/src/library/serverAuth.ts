/**
 * 宿主 server/token 通用解析（供直连 Mira server 的 library 组件使用）。
 *
 * 解析顺序：入参 partial（组件 props）→ 窗口 query（宿主 openPluginWindow
 * 注入 server/token）→ 主窗口共享 localStorage（file:// 同源可读）：
 *   - mira-servers：{ activeServerId, services[].serverUrl }
 *   - {activeServerId}_mira_auth / 任意 *_mira_auth：{ token, tokenExpiration }
 * token 有效而 server 缺省时按默认端口 8081 兜底。
 */

export interface MiraServerConfig {
  /** server 根地址（如 http://127.0.0.1:8081，末尾斜杠已去除） */
  server: string
  /** 登录 token（资源 URL 直链拼接与 API 鉴权用） */
  token: string
}

function usableToken(raw: string | null): string {
  try {
    const auth = raw ? JSON.parse(raw) : null
    if (!auth?.token) return ''
    if (auth.tokenExpiration && new Date(auth.tokenExpiration) <= new Date()) return ''
    return auth.token
  } catch {
    return ''
  }
}

export function resolveMiraServerConfig(partial?: Partial<MiraServerConfig>): MiraServerConfig {
  const result: MiraServerConfig = {
    server: (partial?.server || '').replace(/\/+$/, ''),
    token: partial?.token || '',
  }
  try {
    const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null
    result.server ||= (params?.get('server') || '').replace(/\/+$/, '')
    result.token ||= params?.get('token') || ''

    let activeId: string | null = null
    const serversRaw = localStorage.getItem('mira-servers')
    if (serversRaw) {
      const data = JSON.parse(serversRaw)
      activeId = data.activeServerId || null
      const services = Array.isArray(data.services) ? data.services : []
      const active = services.find((s: any) => s.id === activeId) || services[0]
      result.server ||= String(active?.serverUrl || '').replace(/\/+$/, '')
    }
    result.token ||= usableToken(activeId ? localStorage.getItem(`${activeId}_mira_auth`) : null)
    if (!result.token) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !/_mira_auth$/.test(key)) continue
        const token = usableToken(localStorage.getItem(key))
        if (token) {
          result.token = token
          break
        }
      }
    }
    if (result.token && !result.server) result.server = 'http://127.0.0.1:8081'
  } catch {
    // localStorage/query 不可用时仅用 partial
  }
  return result
}
