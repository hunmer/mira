/**
 * 服务端 API 层（同 mira_image_cropper/web 模式）：
 *   - server/token 经 resolveMiraServerConfig 解析（query → localStorage 兜底，
 *     插件窗口 query 由宿主 openPluginWindow 自动注入 ?server=&token=&libraryId=）；
 *   - 素材原图走 /api/files/file/<lib>/<id>（带 Authorization fetch → dataURL，
 *     参考图需要 base64 提交给 /api/ai-sdk/image/generate）；
 *   - 生成入库走 /api/files/upload（multipart，batchImport 标记）。
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

export interface AiProvider {
  id: string
  name: string
  models: string[]
  isDefault: boolean
}

/** 已配置的 AI 服务商列表（mira_ai_sdk 服务端插件） */
export async function listProviders(): Promise<AiProvider[]> {
  const { server, libraryId } = getServerConfig()
  const resp = await fetch(`${server}/api/ai-sdk/providers/list?libraryId=${encodeURIComponent(libraryId)}`, {
    headers: authHeaders(),
  })
  const body = await resp.json().catch(() => null)
  if (!resp.ok || !body?.success) throw new Error(body?.error || `HTTP ${resp.status}`)
  return (body.providers || []) as AiProvider[]
}

export interface GenerateRequest {
  providerId?: string
  model: string
  prompt: string
  n?: number
  size?: string
  images?: string[]
  mask?: string
}

export interface GeneratedImage {
  url: string
  mediaType: string
  base64?: string
}

export interface GenerateResult {
  providerName: string
  model: string
  elapsed: number
  images: GeneratedImage[]
  warnings: Array<{ type?: string; feature?: string }>
}

/** 调用 mira_ai_sdk 的图片生成接口（带 images 走 /images/edits 编辑模式） */
export async function generateImage(req: GenerateRequest): Promise<GenerateResult> {
  const { server, libraryId } = getServerConfig()
  const resp = await fetch(`${server}/api/ai-sdk/image/generate`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ ...req, libraryId, returnBase64: true }),
  })
  const body = await resp.json().catch(() => null)
  if (!resp.ok || !body?.success) throw new Error(body?.error || `HTTP ${resp.status}`)
  return body as GenerateResult
}

/** 素材原图直链 */
export function mediaSourceUrl(media: { id?: string; libraryId?: string }): string {
  return `/api/files/file/${encodeURIComponent(media.libraryId || '')}/${encodeURIComponent(media.id || '')}`
}

/** 拉取需鉴权的素材原图 → dataURL（参考图需要 base64 提交给生成接口） */
export async function fetchAuthorizedImage(url: string): Promise<string> {
  if (!url) throw new Error('图片地址为空')
  if (/^(data:|blob:)/i.test(url)) return url
  const { server, token } = getServerConfig()
  const absolute = new URL(url, server + '/').toString()
  const resp = await fetch(absolute, { headers: authHeaders() })
  if (!resp.ok) throw new Error(`获取图片失败 HTTP ${resp.status}`)
  const blob = await resp.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(blob)
  })
}

// ── 批量上传（/api/files/upload，BatchUploadDialog 的 uploadFile 服务） ──

export interface UploadItem {
  file: File
  libraryId: string
  folderId?: string
  tags?: string[]
}

export function uploadFile(item: UploadItem, onProgress: (percent: number) => void): Promise<unknown> {
  const { server } = getServerConfig()
  const formData = new FormData()
  formData.append('files', item.file)
  formData.append('libraryId', item.libraryId)
  formData.append('batchImport', 'true')
  formData.append('payload', JSON.stringify({
    data: { tags: item.tags || [], folder_id: item.folderId || undefined },
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
