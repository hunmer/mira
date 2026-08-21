/**
 * 服务端 API 层：
 *   - server/token 经 resolveMiraServerConfig 解析（query → localStorage 兜底，
 *     插件窗口 query 由宿主 openPluginWindow 自动注入 ?server=&token=&libraryId=）；
 *   - 素材原图优先走 /api/files/download/<lib>/<id>（带 Authorization fetch → blob），
 *     fetch 不可用时回退 ?token= 直链（鉴权中间件支持 query token）；
 *   - 批量入库走 /api/files/upload（multipart，batchImport 标记）。
 */
import { resolveMiraServerConfig, type MiraServerConfig } from 'mira-plugin-ui/src/library/serverAuth'

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

/** 素材原图直链（优先文件 id，缺省回退 url 字段） */
export function mediaSourceUrl(media: { id?: string; libraryId?: string; url?: string }): string {
  if (media.id && media.libraryId) {
    return `/api/files/file/${encodeURIComponent(media.libraryId)}/${encodeURIComponent(media.id)}`
  }
  return media.url || ''
}

/**
 * 拉取需要鉴权的原图：fetch + Authorization → blob URL（canvas 无跨域污染）。
 * 失败时回退 ?token= 直链（外链图直接返回原地址）。
 */
export async function fetchAuthorizedImage(url: string): Promise<string> {
  if (!url) throw new Error('图片地址为空')
  if (/^(data:|blob:)/i.test(url)) return url
  const absolute = resolveUrl(url)
  if (!/^https?:/i.test(absolute)) return absolute
  try {
    const resp = await fetch(absolute, { headers: authHeaders() })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await resp.blob()
    if (!blob.type.startsWith('image/')) throw new Error(`非图片响应: ${blob.type}`)
    return URL.createObjectURL(blob)
  } catch {
    return tokenizedUrl(url)
  }
}

// ── 批量上传（/api/files/upload，BatchUploadDialog 的 uploadFile 服务） ──

export interface UploadItem {
  file: File
  libraryId: string
  folderId?: string
  tags?: string[]
}

/** XHR 上传以获得进度回调（fetch 无上传进度） */
export function uploadFile(
  item: UploadItem,
  onProgress: (percent: number) => void,
): Promise<unknown> {
  const { server } = getServerConfig()
  const formData = new FormData()
  formData.append('files', item.file)
  formData.append('libraryId', item.libraryId)
  formData.append('batchImport', 'true')
  formData.append('payload', JSON.stringify({
    data: {
      tags: item.tags || [],
      folder_id: item.folderId || undefined,
    },
  }))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${server}/api/files/upload`)
    const { token } = getServerConfig()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          resolve(xhr.responseText)
        }
      } else {
        reject(new Error(`上传失败 HTTP ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('网络错误，上传失败'))
    xhr.send(formData)
  })
}

// ── 库 / 文件夹列表（BatchUploadDialog props） ──

export interface LibraryItem { id: string; name?: string; title?: string }
export interface FolderItem { id: string | number; title?: string; name?: string; parent_id?: string | number | null; color?: number }

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const resp = await fetch(`${getServerConfig().server}${path}`, { headers: authHeaders() })
    if (!resp.ok) return null
    const body = await resp.json()
    return (body.data ?? body) as T
  } catch {
    return null
  }
}

export async function fetchLibraries(): Promise<LibraryItem[]> {
  const data = await apiGet<any>('/api/libraries')
  const list = Array.isArray(data) ? data : data?.libraries || []
  return list.filter((item: any) => item && item.id != null)
}

export async function fetchFolders(libraryId: string): Promise<FolderItem[]> {
  const data = await apiGet<any>(`/api/folders/all?libraryId=${encodeURIComponent(libraryId)}`)
  return Array.isArray(data) ? data : []
}

/** 新建文件夹（BatchUploadDialog 的 createNode 服务） */
export async function createFolder(payload: { parentId: number; title: string; description?: string; color?: number }): Promise<number | undefined> {
  try {
    const { server } = getServerConfig()
    const resp = await fetch(`${server}/api/folders/create`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        libraryId: getServerConfig().libraryId,
        parent_id: payload.parentId,
        title: payload.title,
        description: payload.description,
        color: payload.color,
      }),
    })
    const body = await resp.json().catch(() => null)
    const result = body?.result ?? body?.data ?? body
    return result?.id != null ? Number(result.id) : undefined
  } catch {
    return undefined
  }
}
