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

/**
 * libraryId 两级兜底：窗口 query（宿主注入）→ 右键菜单序列化的 media 首项。
 * 库级路由（registerRounter）按 libraryId 匹配，缺失时接口返回 400。
 */
let activeLibraryId = ''

export function setActiveLibraryId(libraryId: string): void {
  if (libraryId) activeLibraryId = String(libraryId)
}

export function getLibraryId(): string {
  return new URLSearchParams(location.search).get('libraryId') || activeLibraryId || ''
}

export function getServerConfig(): ServerConfig {
  return {
    ...resolveMiraServerConfig(),
    libraryId: getLibraryId(),
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

/**
 * 缩略图 HTTP 直链。
 * 注意：FileInfo.thumbnailPath 是服务器本地绝对路径（如 C:\...\thumbs\43.png），
 * new URL() 会把盘符 'C:' 解析成 scheme，浏览器将其映射为 file:/// 被拦截——
 * 必须改走 /api/files/thumb/<lib>/<id>。
 */
export function thumbUrl(media: { id: string; libraryId?: string }): string {
  const libraryId = media.libraryId || getLibraryId()
  if (!media.id || !libraryId) return ''
  return tokenizedUrl(`/api/files/thumb/${encodeURIComponent(libraryId)}/${encodeURIComponent(media.id)}`)
}

async function apiGet<T>(path: string): Promise<T> {
  const url = `${getServerConfig().server}${path}${path.includes('?') ? '&' : '?'}libraryId=${encodeURIComponent(getLibraryId())}`
  const resp = await fetch(url, { headers: authHeaders() })
  const body = await resp.json().catch(() => null)
  if (!resp.ok || !body?.success) throw new Error(body?.error || `HTTP ${resp.status}`)
  return body.data as T
}

async function apiPost<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const resp = await fetch(`${getServerConfig().server}${path}?libraryId=${encodeURIComponent(getLibraryId())}`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ ...payload, libraryId: getLibraryId() }),
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
    files: options.files.map((f) => ({ fileId: f.id, name: f.name })),
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

/** 删除已完成转换的源素材（移入回收站） */
export function deleteSourceFiles(fileIds: Array<string | number>): Promise<{ deleted: number[]; failed: Array<{ id: number; error: string }> }> {
  return apiPost<{ deleted: number[]; failed: Array<{ id: number; error: string }> }>('/api/format-converter/delete', {
    fileIds: fileIds.map((id) => Number(id)),
  })
}
