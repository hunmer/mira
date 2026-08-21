/**
 * 服务端 API 层：
 *   - server/token 经 resolveMiraServerConfig 解析（query → localStorage 兜底，
 *     插件窗口 query 由宿主 openPluginWindow 自动注入 ?server=&token=&libraryId=）；
 *   - capabilities / convert / status 三个接口均带 Authorization Bearer token。
 */
import { resolveMiraServerConfig, type MiraServerConfig } from 'mira-plugin-ui/src/library/serverAuth'
import type { Capabilities, MediaInput, ScaleKey, TaskState } from '@/types'
import { scalePayload } from '@/types'

export interface ServerConfig extends MiraServerConfig {
  libraryId: string
}

export function getServerConfig(): ServerConfig {
  const params = new URLSearchParams(location.search)
  return {
    ...resolveMiraServerConfig(),
    libraryId: params.get('libraryId') || '',
  }
}

function authHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  const { token } = getServerConfig()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

/** 相对 URL → 服务器绝对 URL */
export function resolveUrl(url: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  try {
    return new URL(url, getServerConfig().server + '/').toString()
  } catch {
    return url
  }
}

/** 附加 ?token= 的直链（img 标签无法带 Authorization 时的兜底） */
export function tokenizedUrl(url: string): string {
  const absolute = resolveUrl(url)
  const { token } = getServerConfig()
  if (!token || /^(data:|blob:)/i.test(absolute)) return absolute
  try {
    const u = new URL(absolute)
    if (!u.searchParams.has('token')) u.searchParams.set('token', token)
    return u.toString()
  } catch {
    return absolute
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${getServerConfig().server}${path}`, { headers: authHeaders() })
  const body = await resp.json().catch(() => null)
  if (!resp.ok || !body?.success) throw new Error(body?.error || `HTTP ${resp.status}`)
  return body.data as T
}

async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const resp = await fetch(`${getServerConfig().server}${path}`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  })
  const body = await resp.json().catch(() => null)
  if (!resp.ok || !body?.success) throw new Error(body?.error || `HTTP ${resp.status}`)
  return body.data as T
}

/** 探测服务器 ffmpeg / imagemagick 与支持的目标格式 */
export function fetchCapabilities(): Promise<Capabilities> {
  return apiGet<Capabilities>('/api/format-converter/capabilities')
}

/** 创建转换任务，返回 taskId */
export function startConvert(options: {
  files: MediaInput[]
  target: string
  quality: string
  scale: ScaleKey
  inheritMeta: boolean
}): Promise<string> {
  return apiPost<{ taskId: string }>('/api/format-converter/convert', {
    files: options.files.map((f) => ({ fileId: f.id })),
    target: options.target,
    quality: options.quality,
    scale: scalePayload(options.scale),
    inheritMeta: options.inheritMeta,
  }).then((data) => data.taskId)
}

/** 查询任务进度 */
export function fetchTaskStatus(taskId: string): Promise<TaskState> {
  return apiGet<TaskState>(`/api/format-converter/status?taskId=${encodeURIComponent(taskId)}`)
}
