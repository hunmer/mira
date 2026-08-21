/**
 * 宿主（plugin-window-preload）访问桥。
 * 所有本机能力（exec/fs/shell/item）都从这里取；纯浏览器 dev 模式下降级为 null。
 */

import { toFileUrl } from './path'

export function getHost(): MiraPluginWindowApi | null {
  return window.mira || window.eagle || null
}

export function isHostAvailable(): boolean {
  const host = getHost()
  return Boolean(host?.exec?.run && host?.fs?.getTempDir)
}

export function isWindows(): boolean {
  const platform = getHost()?.app?.platform
  if (platform) return platform === 'win32'
  return /win/i.test(navigator.userAgent)
}

/** 视频源归一化：本地路径 → file:// URL；http(s)/blob 直用 */
export function resolveVideoSrc(path: string): string {
  if (!path) return ''
  if (/^(https?|blob|file|local-resource):/i.test(path)) {
    return path.replace(/^local-resource:/i, 'file:')
  }
  // Windows 盘符或 Unix 绝对路径
  return toFileUrl(path)
}
