/**
 * 服务端 API 层：插件窗口 query 由宿主 openPluginWindow 自动注入
 * ?server=<origin>&token=<jwt>&libraryId=<库 id>（见 openPluginWindow.ts）。
 * dev（纯浏览器）无这些参数：下载导出可用，入库导出禁用。
 */
export interface ServerConfig {
  server: string
  token: string
  libraryId: string
}

let cached: ServerConfig | null = null

export function getServerConfig(): ServerConfig {
  if (cached) return cached
  const params = new URLSearchParams(location.search)
  cached = {
    server: (params.get('server') || location.origin).replace(/\/+$/, ''),
    token: params.get('token') || localStorage.getItem('token') || '',
    libraryId: params.get('libraryId') || '',
  }
  return cached
}

export const canSaveToLibrary = () => {
  const cfg = getServerConfig()
  return Boolean(cfg.token && cfg.libraryId)
}

function authHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  const { token } = getServerConfig()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

/** 相对素材 URL → 服务器绝对 URL */
export function resolveUrl(url: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  try {
    return new URL(url, getServerConfig().server + '/').toString()
  } catch {
    return url
  }
}

/**
 * 拉取需要鉴权的原图：fetch + Authorization → blob URL（canvas 无跨域污染）。
 * 失败（公开资源 / 已带 token 的 URL）时回退原地址直连。
 */
export async function fetchAuthorizedImage(url: string): Promise<string> {
  const absolute = resolveUrl(url)
  try {
    const resp = await fetch(absolute, { headers: authHeaders(false) })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await resp.blob()
    if (!blob.type.startsWith('image/')) throw new Error(`非图片响应: ${blob.type}`)
    return URL.createObjectURL(blob)
  } catch {
    return absolute
  }
}

export interface SaveResult {
  success: boolean
  fileId?: string
  duplicate?: boolean
  error?: string
}

/** 调用服务端插件路由：POST /api/image-cropper/save 把裁切结果写入素材库 */
export async function saveCropToLibrary(fileName: string, dataUrl: string): Promise<SaveResult> {
  const cfg = getServerConfig()
  try {
    const resp = await fetch(`${cfg.server}/api/image-cropper/save`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ libraryId: cfg.libraryId, fileName, dataUrl }),
    })
    const body = await resp.json().catch(() => ({}))
    if (!resp.ok || !body.success) {
      return { success: false, error: body.error || `HTTP ${resp.status}` }
    }
    return { success: true, fileId: body.file?.id, duplicate: Boolean(body.file?.duplicate) }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
