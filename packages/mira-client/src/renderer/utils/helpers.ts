/**
 * 通用工具函数
 */

import pinyin from 'pinyin'

// 拼音缓存，避免重复计算
const pinyinCache = new Map<string, { full: string; first: string }>()

/**
 * 获取字符串的拼音（带缓存）
 */
function getPinyin(text: string): { full: string; first: string } {
  if (pinyinCache.has(text)) {
    return pinyinCache.get(text)!
  }

  try {
    const result = pinyin(text, { style: pinyin.STYLE_NORMAL })
    const full = result.map(arr => arr[0] || '').join('').toLowerCase()
    const first = result.map(arr => (arr[0] || '')[0] || '').join('').toLowerCase()
    const data = { full, first }
    pinyinCache.set(text, data)
    // 限制缓存大小
    if (pinyinCache.size > 1000) {
      const firstKey = pinyinCache.keys().next().value
      if (firstKey) pinyinCache.delete(firstKey)
    }
    return data
  } catch {
    return { full: text.toLowerCase(), first: text.toLowerCase() }
  }
}

/**
 * 拼音匹配 - 支持中文直接匹配、全拼匹配、首字母匹配
 * @param text 待匹配的文本
 * @param query 搜索关键词
 * @returns 是否匹配
 */
export function pinyinMatch(text: string, query: string): boolean {
  if (!text || !query) return false

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // 1. 直接包含匹配
  if (lowerText.includes(lowerQuery)) {
    return true
  }

  // 2. 拼音匹配
  const py = getPinyin(text)

  // 全拼匹配（支持部分匹配）
  if (py.full.includes(lowerQuery)) {
    return true
  }

  // 首字母匹配
  if (py.first.includes(lowerQuery)) {
    return true
  }

  return false
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let previous = 0
  
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    
    if (!previous) previous = now
    
    const remaining = wait - (now - previous)
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func.apply(this, args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now()
        timeout = null
        func.apply(this, args)
      }, remaining)
    }
  }
}

/**
 * 深度克隆
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as { [key: string]: any }
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone((obj as { [key: string]: any })[key])
      }
    }
    return cloned as T
  }
  
  return obj
}

/**
 * 格式化日期
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'time' | 'datetime' = 'datetime'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(d.getTime())) {
    return '无效日期'
  }
  
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  // 相对时间（7天内）
  if (diffDays === 0) {
    if (format === 'short') return '今天'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (hours > 0) return `${hours} 小时前`
    if (minutes > 0) return `${minutes} 分钟前`
    return '刚刚'
  }
  
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  
  // 绝对时间
  const options: Intl.DateTimeFormatOptions = {}
  
  switch (format) {
    case 'short':
      options.month = 'short'
      options.day = 'numeric'
      if (d.getFullYear() !== now.getFullYear()) {
        options.year = 'numeric'
      }
      break
    case 'long':
      options.year = 'numeric'
      options.month = 'long'
      options.day = 'numeric'
      break
    case 'time':
      options.hour = '2-digit'
      options.minute = '2-digit'
      break
    case 'datetime':
      options.year = 'numeric'
      options.month = 'short'
      options.day = 'numeric'
      options.hour = '2-digit'
      options.minute = '2-digit'
      break
  }
  
  return d.toLocaleDateString('zh-CN', options)
}

/**
 * 生成随机 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

/**
 * 安全地解析 JSON
 */
export function safeParseJSON<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString)
  } catch {
    return fallback
  }
}

/**
 * 检查对象是否为空
 */
export function isEmpty(obj: any): boolean {
  if (obj === null || obj === undefined) return true
  if (typeof obj === 'string') return obj.length === 0
  if (Array.isArray(obj)) return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 获取浏览器信息
 */
export function getBrowserInfo(): {
  name: string
  version: string
  platform: string
} {
  const ua = navigator.userAgent
  let name = 'Unknown'
  let version = 'Unknown'
  
  if (ua.includes('Chrome')) {
    name = 'Chrome'
    const match = ua.match(/Chrome\/(\d+\.\d+)/)
    if (match) version = match[1]
  } else if (ua.includes('Firefox')) {
    name = 'Firefox'
    const match = ua.match(/Firefox\/(\d+\.\d+)/)
    if (match) version = match[1]
  } else if (ua.includes('Safari')) {
    name = 'Safari'
    const match = ua.match(/Version\/(\d+\.\d+)/)
    if (match) version = match[1]
  }
  
  return {
    name,
    version,
    platform: navigator.platform
  }
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // 兼容旧浏览器
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    }
  } catch {
    return false
  }
}

/**
 * 创建下载链接
 */
export function createDownloadLink(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - suffix.length) + suffix
}

/**
 * 高亮搜索关键词
 */
export function highlightText(text: string, keyword: string): string {
  if (!keyword) return text
  
  const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * 转义正则表达式特殊字符
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 数组去重
 */
export function uniqueArray<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)]
  }
  
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}

/**
 * 对象转 URL 查询字符串
 */
export function objectToQuery(obj: Record<string, any>): string {
  const params = new URLSearchParams()
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  
  return params.toString()
}

/**
 * URL 查询字符串转对象
 */
export function queryToObject(query: string): Record<string, string> {
  const params = new URLSearchParams(query)
  const result: Record<string, string> = {}
  
  params.forEach((value, key) => {
    result[key] = value
  })
  
  return result
}
