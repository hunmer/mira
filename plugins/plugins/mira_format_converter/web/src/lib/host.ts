import type { MediaInput } from '@/types'

/**
 * 宿主桥接层：封装 window.mira（plugin-window-preload 注入的 Eagle 兼容 API）。
 * vite dev（纯浏览器）下无宿主自动降级：
 *   - 选中项：解析 ?media= query（与宿主右键菜单同一格式）
 *   - 主题：跟随系统 prefers-color-scheme
 */
const host = (typeof window !== 'undefined' && (window.mira || window.eagle)) || {
  app: { theme: 'LIGHT', isDarkColors: () => false },
  item: { getSelected: async (): Promise<MediaInput[]> => parseMediaQuery() },
  log: undefined,
}

function parseMediaQuery(): MediaInput[] {
  try {
    const raw = new URLSearchParams(location.search).get('media')
    if (!raw) return []
    return JSON.parse(decodeURIComponent(raw))
  } catch (error) {
    logError('[format-converter] parse media query failed:', error)
    return []
  }
}

/** 读取宿主选中项（dev 下来自 ?media=） */
export async function getSelectedItems(): Promise<MediaInput[]> {
  try {
    return ((await host.item?.getSelected?.()) as MediaInput[]) || parseMediaQuery()
  } catch (error) {
    logError('[format-converter] getSelected failed:', error)
    return parseMediaQuery()
  }
}

/** 当前是否暗色（dev 下跟随系统） */
export function isDark(): boolean {
  try {
    const app = host.app
    return Boolean(app?.isDarkColors?.()) || app?.theme === 'DARK'
  } catch {
    return false
  }
}

/** 订阅主题变化（dev 下监听 prefers-color-scheme） */
export function onThemeChanged(callback: (dark: boolean) => void): () => void {
  const viaHost = host.onThemeChanged?.((theme: string) => callback(theme === 'DARK'))
  if (viaHost !== undefined) return () => {}
  if (typeof matchMedia !== 'function') return () => {}
  const mq = matchMedia('(prefers-color-scheme: dark)')
  const listener = (event: MediaQueryListEvent) => callback(event.matches)
  mq.addEventListener('change', listener)
  return () => mq.removeEventListener('change', listener)
}

export function logInfo(...args: any[]) {
  host.log?.info?.(...args)
}

export function logError(...args: any[]) {
  host.log?.error?.(...args)
}

/** 订阅宿主语言变化（主窗口切换语言时广播）；无宿主时为空操作 */
export function onLocaleChanged(callback: (locale: string) => void): () => void {
  const off = host.onLocaleChanged?.(callback)
  if (off !== undefined) return () => {}
  return () => {}
}
