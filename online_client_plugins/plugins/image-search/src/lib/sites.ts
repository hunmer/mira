/**
 * 网页搜图站点定义与种子图上传。
 *
 * 与 Pinterest 接口搜图不同，网页搜图站点（Google Lens / Bing / Yandex 等）
 * 需要「可公网访问的图片 URL」：种子图若为本地地址（data: / 内网 / Mira 文件服务），
 * 先上传到临时图床换成在线地址，再按各站点的 URL 反搜模板拼接后交给 webview 加载。
 * 图床沿用 Eagle search-by-image 同款 temp-image.foxdesk.app（CORS 全开放）。
 */

export interface SearchSite {
  id: string
  /** 展示名 */
  name: string
  /** 右侧栏徽标字符（无品牌图标库，用首字母/短字） */
  badge: string
  /** byURL 反搜模板，{u} 为 encodeURIComponent 后的图片在线地址 */
  searchUrl: (imageUrl: string) => string
}

/** 临时图床（同 Eagle search-by-image）：POST FormData(file) → { status, data: { url } } */
const TEMP_IMAGE_HOST = 'https://temp-image.foxdesk.app/upload-image'

/** 右侧站点栏：pinterest 为接口模式，其余为 webview 网页模式 */
export const SITES: SearchSite[] = [
  {
    id: 'google',
    name: 'Google',
    badge: 'G',
    searchUrl: (u) => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(u)}`,
  },
  {
    id: 'bing',
    name: 'Bing',
    badge: 'B',
    searchUrl: (u) => `https://www.bing.com/images/search?view=detailv2&iss=SBI&form=SBIIDP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(u)}`,
  },
  {
    id: 'yandex',
    name: 'Yandex',
    badge: 'Y',
    searchUrl: (u) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(u)}`,
  },
  {
    id: 'tineye',
    name: 'TinEye',
    badge: 'T',
    searchUrl: (u) => `https://tineye.com/search?url=${encodeURIComponent(u)}`,
  },
  {
    id: 'saucenao',
    name: 'SauceNAO',
    badge: 'S',
    searchUrl: (u) => `https://saucenao.com/search.php?db=999&url=${encodeURIComponent(u)}`,
  },
  {
    id: 'sogou',
    name: '搜狗',
    badge: '搜',
    searchUrl: (u) => `https://pic.sogou.com/ris?query=${encodeURIComponent(u)}&flag=1&drag=0`,
  },
]

export function getSite(id: string): SearchSite | undefined {
  return SITES.find((site) => site.id === id)
}

/** 是否本地/内网地址（Mira 文件服务、localhost 等），这类地址外站无法访问需上传图床 */
function isLocalUrl(url: string): boolean {
  if (url.startsWith('data:')) return true
  if (!/^https?:\/\//i.test(url)) return true
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host === '[::1]' || host.endsWith('.local')
      || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  } catch {
    return true
  }
}

/** 把种子图上传图床换取在线地址；已是公网 http(s) 地址则直接透传 */
export async function toOnlineUrl(seed: string): Promise<string> {
  if (!isLocalUrl(seed)) return seed
  let blob: Blob
  try {
    const response = await fetch(seed)
    if (!response.ok) throw new Error(String(response.status))
    blob = await response.blob()
  } catch (e) {
    throw new Error(`读取种子图失败：${e instanceof Error ? e.message : String(e)}`)
  }
  const formData = new FormData()
  formData.append('file', blob, 'image')
  let response: Response
  try {
    response = await fetch(TEMP_IMAGE_HOST, { method: 'POST', body: formData })
  } catch {
    throw new Error('无法连接临时图床，请检查网络')
  }
  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    // 非 JSON 响应按失败处理
  }
  if (!response.ok || payload?.status !== 'success' || !payload?.data?.url) {
    throw new Error(payload?.message || `图床上传失败（HTTP ${response.status}）`)
  }
  return payload.data.url as string
}
