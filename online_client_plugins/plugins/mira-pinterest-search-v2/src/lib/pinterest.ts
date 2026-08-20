import type { ResultItem } from '@/types'

/**
 * Pinterest 视觉搜索客户端（与原 Eagle 版保持同一端点与参数结构）：
 *   PUT https://api.pinterest.com/v3/visual_search/extension/image/?bookmark=<cursor>
 *   multipart/form-data: image=<blob>, x=0, y=0, w=1, h=1, page_size=200
 * 身份依赖窗口 session 中已有的 Pinterest Cookie；401 视为未登录。
 */

const SEARCH_ENDPOINT = 'https://api.pinterest.com/v3/visual_search/extension/image/'

export class PinterestError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

interface RawPin {
  id?: string
  title?: string
  image_medium_url?: string
  image_large_url?: string
  image_square_url?: string
  image_medium_size_pixels?: { width?: number; height?: number }
}

/** 把 URL 中的尺寸段（/236x/ 等）替换为 originals，探测 PNG/JPG 原图，失败回退原 URL */
export async function getLargeUrl(mediumUrl: string): Promise<string> {
  if (!mediumUrl) return mediumUrl
  const base = mediumUrl.replace(/\/\d+x\//g, '/originals/')
  if (base === mediumUrl) return mediumUrl
  const candidates = base.replace(/\.\w+$/, '.png')
  const list = [candidates, base.replace(/\.\w+$/, '.jpg')]
  for (const url of list) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3000)
      const response = await fetch(url, { method: 'HEAD', signal: controller.signal })
      clearTimeout(timer)
      if (response.ok) return url
    } catch {
      // 探测失败继续下一个候选
    }
  }
  return mediumUrl
}

export function pinUrl(id: string): string {
  return `https://www.pinterest.com/pin/${id}/`
}

function normalize(raw: RawPin): ResultItem | null {
  const url = raw.image_medium_url || raw.image_large_url || raw.image_square_url
  if (!url || !raw.id) return null
  return {
    key: crypto.randomUUID(),
    id: raw.id,
    title: raw.title || '',
    url,
    largeUrl: raw.image_large_url || url,
    squareUrl: raw.image_square_url || url,
    width: raw.image_medium_size_pixels?.width || 0,
    height: raw.image_medium_size_pixels?.height || 0,
    saved: false,
  }
}

/**
 * 执行一次视觉搜索。
 * @param seed 种子图（http(s) URL 或 data: URL），内部 fetch 为 blob 后上传
 * @param bookmark 分页游标（首页不传）
 */
export async function getVisualSearch(
  seed: string,
  bookmark?: string,
): Promise<{ results: ResultItem[]; bookmark?: string }> {
  let blob: Blob
  try {
    const response = await fetch(seed)
    if (!response.ok) throw new Error(String(response.status))
    blob = await response.blob()
  } catch {
    // 种子图拉取失败（跨域/本地文件/网络）按连接错误处理，保留原版语义
    throw new PinterestError('ENET', 'Failed to fetch')
  }

  const formData = new FormData()
  formData.append('image', blob)
  formData.append('x', '0')
  formData.append('y', '0')
  formData.append('w', '1')
  formData.append('h', '1')
  formData.append('page_size', '200')

  const apiURL = bookmark ? `${SEARCH_ENDPOINT}?bookmark=${encodeURIComponent(bookmark)}` : SEARCH_ENDPOINT
  let response: Response
  try {
    response = await fetch(apiURL, { method: 'PUT', body: formData, redirect: 'follow' })
  } catch {
    throw new PinterestError('ENET', 'Failed to fetch')
  }
  if (response.status === 401) throw new PinterestError('EAUTH', '401')

  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) throw new PinterestError('EHTTP', `HTTP ${response.status}`)
  if (payload?.status !== 'success') throw new PinterestError('EAPI', payload?.error_message || 'Pinterest API error')

  const results = ((payload.data || []) as RawPin[])
    .map(normalize)
    .filter((item): item is ResultItem => item !== null)
  if (results.length === 0) throw new PinterestError('ENOR', 'no results found')
  return { results, bookmark: payload.bookmark || undefined }
}
