/**
 * 浏览器环境的路径工具（替代 node:path，仅覆盖本插件用到的能力）。
 * 统一按分隔符拆分后用平台分隔符连接；Windows 下输出反斜杠。
 */

const IS_WINDOWS = typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent)

export function sep(): string {
  return IS_WINDOWS ? '\\' : '/'
}

export function normalizePath(p: string): string {
  if (!p) return p
  let normalized = p.replace(/[\\/]+/g, IS_WINDOWS ? '\\' : '/')
  if (IS_WINDOWS) {
    // 保留盘符大小写，去掉盘符后重复斜杠已由上面处理
    normalized = normalized.replace(/^([a-zA-Z]):\\?/, (_m, drive: string) => `${drive.toUpperCase()}:`)
  }
  return normalized
}

export function pathJoin(...parts: Array<string | undefined | null>): string {
  const filtered = parts.filter((part): part is string => typeof part === 'string' && part !== '')
  if (filtered.length === 0) return ''
  const joined = filtered.join(IS_WINDOWS ? '\\' : '/')
  return normalizePath(joined)
}

export function basename(p: string, removeExt?: string): string {
  const normalized = normalizePath(p)
  const name = normalized.split(/[\\/]/).pop() || ''
  if (removeExt && name.toLowerCase().endsWith('.' + removeExt.toLowerCase())) {
    return name.slice(0, -(removeExt.length + 1))
  }
  return name
}

export function extname(p: string): string {
  const name = basename(p)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot) : ''
}

export function dirname(p: string): string {
  const normalized = normalizePath(p)
  const idx = normalized.lastIndexOf(IS_WINDOWS ? '\\' : '/')
  if (idx <= 0) return normalized
  return normalized.slice(0, idx)
}

/** 本地绝对路径 → file:// URL（Windows 盘符处理） */
export function toFileUrl(p: string): string {
  if (!p) return ''
  if (p.startsWith('file://')) return p
  const normalized = normalizePath(p).replace(/\\/g, '/')
  const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
  return `file://${encodeURI(withSlash).replace(/#/g, '%23')}`
}

/** file:// / local-resource:// URL → 本地绝对路径 */
export function fromFileUrl(url: string): string {
  if (!url) return ''
  let p = url
  if (p.startsWith('local-resource://')) p = p.replace(/^local-resource:\/\//, '')
  else if (p.startsWith('file://')) p = p.replace(/^file:\/\//, '')
  try {
    p = decodeURIComponent(p)
  } catch {
    /* 保留原样 */
  }
  if (IS_WINDOWS && p.startsWith('/')) p = p.substring(1)
  return normalizePath(p)
}

/** 简单字符串哈希（文件名截断后缀用，非加密用途） */
export function shortHash(input: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x1000193
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 = (h1 ^ c) >>> 0
    h1 = Math.imul(h1, 0x01000193) >>> 0
    h2 = (h2 + c * 31) >>> 0
  }
  return (h1.toString(16) + h2.toString(16)).padStart(8, '0').slice(0, 8)
}

/** 清理文件名：移除特殊字符并限制长度 */
export function sanitizeFileName(fileName: string): string {
  let cleaned = fileName
    .replace(/[｜|]/g, '_')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 42) + '_' + shortHash(fileName)
  }
  return cleaned || 'video'
}
