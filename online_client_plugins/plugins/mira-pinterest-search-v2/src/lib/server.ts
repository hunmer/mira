import { MiraClient } from 'mira-app-core/shared/sdk'

/**
 * Mira server 直连（批量导入素材库用）。
 * server/token 来源：宿主 openPluginWindow 注入的 query 优先，
 * 缺失时从主窗口共享的 localStorage 兜底（file:// 同源可读，与 mira-whiteboard 同一策略）：
 *   - mira-servers：{ activeServerId, services[].serverUrl }
 *   - {activeServerId}_mira_auth / 任意 *_mira_auth：{ token, tokenExpiration }
 */

export interface ServerConfig {
  server: string
  token: string
}

function isUsableToken(raw: string | null): string {
  try {
    const auth = raw ? JSON.parse(raw) : null
    if (!auth?.token) return ''
    if (auth.tokenExpiration && new Date(auth.tokenExpiration) <= new Date()) return ''
    return auth.token
  } catch {
    return ''
  }
}

/** 解析 server/token：query → localStorage 兜底；token 有效而 server 缺省时按默认端口回退 */
export function readServerConfig(): ServerConfig {
  const params = new URLSearchParams(location.search)
  const result: ServerConfig = {
    server: (params.get('server') || '').replace(/\/+$/, ''),
    token: params.get('token') || '',
  }
  try {
    let activeId: string | null = null
    const serversRaw = localStorage.getItem('mira-servers')
    if (serversRaw) {
      const data = JSON.parse(serversRaw)
      activeId = data.activeServerId || null
      const services = Array.isArray(data.services) ? data.services : []
      const active = services.find((s: any) => s.id === activeId) || services[0]
      result.server ||= String(active?.serverUrl || '').replace(/\/+$/, '')
    }
    result.token ||= isUsableToken(activeId ? localStorage.getItem(`${activeId}_mira_auth`) : null)
    if (!result.token) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !/_mira_auth$/.test(key)) continue
        const token = isUsableToken(localStorage.getItem(key))
        if (token) {
          result.token = token
          break
        }
      }
    }
    if (result.token && !result.server) result.server = 'http://127.0.0.1:8081'
  } catch {
    // localStorage 不可用时仅用 query
  }
  return result
}

/** 创建已鉴权的 SDK client；server/token 不全时返回 null（调用方提示） */
export function createClient(): MiraClient | null {
  const { server, token } = readServerConfig()
  if (!server || !token) return null
  const client = new MiraClient(server)
  client.setToken(token)
  return client
}
