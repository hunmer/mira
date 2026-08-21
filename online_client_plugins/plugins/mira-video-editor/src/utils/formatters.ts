/**
 * 格式化工具函数
 */

/**
 * 格式化时间显示 (秒 -> HH:MM:SS.ms)
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

/**
 * 格式化时长显示 (秒 -> X小时 Y分钟 Z秒)
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}小时 ${m}分钟 ${s}秒` : `${m}分钟 ${s}秒`
}

/**
 * 格式化文件大小
 */
export function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`
}

/**
 * 格式化比特率
 */
export function formatBitrate(bitrate: number): string {
  const kbps = bitrate / 1000
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(2)} Mbps` : `${kbps.toFixed(0)} kbps`
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

/**
 * 格式化缩略图 URL
 * 处理 file:// 协议的路径编码问题
 */
export function formatThumbnailUrl(thumbnailPath?: string): string | undefined {
  if (!thumbnailPath) return undefined

  // 已经是 URL 协议，直接返回
  if (/^[a-z][a-z0-9+.-]*:/i.test(thumbnailPath)) return thumbnailPath

  // Windows / Unix 绝对路径 → file:// URL
  if (/^[A-Za-z]:[\\/]/.test(thumbnailPath) || thumbnailPath.startsWith('/')) {
    const normalized = thumbnailPath.replace(/\\/g, '/')
    const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
    return `file://${encodeURI(withSlash).replace(/#/g, '%23')}`
  }

  // 其他（相对路径等）直接返回
  return thumbnailPath
}
