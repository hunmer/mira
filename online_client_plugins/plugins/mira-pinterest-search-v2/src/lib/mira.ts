import type { MediaInput, MiraHostApi } from './types'

/**
 * 宿主桥接层：统一封装 window.mira（plugin-window-preload 注入的 Eagle 兼容 API）。
 * vite dev（纯浏览器）下无宿主，自动降级为 dev mock：
 *   - 选中项：解析 ?media= query（与宿主 preload 同一格式），支持 ?demo=1 加载示例图
 *   - openExternal → window.open
 *   - addFromURL → 打开原图链接（无宿主可写库）
 *   - 主题 → prefers-color-scheme
 */

function parseMediaQuery(): MediaInput[] {
  try {
    const raw = new URLSearchParams(location.search).get('media')
    if (!raw) return []
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return []
  }
}

function devIsDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

/** 开发环境示例图（picsum），用于无宿主时验证搜索/瀑布流 UI */
export const DEMO_MEDIA: MediaInput[] = [{
  id: 'demo-1',
  name: 'demo.jpg',
  ext: 'jpg',
  width: 800,
  height: 600,
  url: 'https://picsum.photos/seed/mira-pinterest/800/600',
  thumbnailURL: 'https://picsum.photos/seed/mira-pinterest/800/600',
}]

const isDev = import.meta.env.DEV

export const host: MiraHostApi = (typeof window !== 'undefined' && (window.mira || window.eagle)) || {
  // dev mock
  app: { theme: devIsDark() ? 'DARK' : 'LIGHT', isDarkColors: devIsDark },
  shell: { openExternal: async (url: string) => window.open(url, '_blank') },
  item: {
    getSelected: async () => {
      const media = parseMediaQuery()
      return media.length ? media : (new URLSearchParams(location.search).get('demo') ? DEMO_MEDIA : [])
    },
    addFromURL: async (url: string) => window.open(url, '_blank'),
  },
  window: {},
}

export const hasHost = Boolean(typeof window !== 'undefined' && (window.mira || window.eagle))

/** 读取宿主选中项（dev 下来自 ?media= / ?demo=1） */
export async function getSelectedItems(): Promise<MediaInput[]> {
  try {
    return (await host.item?.getSelected?.()) || []
  } catch (error) {
    host.log?.error?.('[mira-pinterest-search-v2] getSelected failed:', error)
    return []
  }
}

/** 在系统浏览器打开链接 */
export async function openExternal(url: string): Promise<void> {
  try {
    await host.shell?.openExternal?.(url)
  } catch {
    window.open(url, '_blank')
  }
}

/** 保存图片到 Mira 素材库（宿主 IPC 实现；dev mock 退化为打开原图） */
export async function saveToLibrary(url: string, options: { website?: string; name?: string }): Promise<void> {
  await host.item?.addFromURL?.(url, options)
}

export async function setAlwaysOnTop(flag: boolean): Promise<void> {
  await host.window?.setAlwaysOnTop?.(flag)
}

export async function isAlwaysOnTop(): Promise<boolean> {
  try {
    return Boolean(await host.window?.isAlwaysOnTop?.())
  } catch {
    return false
  }
}

/** 当前是否暗色（dev 下跟随系统） */
export function isDark(): boolean {
  try {
    return Boolean(host.app.isDarkColors?.()) || host.app.theme === 'DARK'
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

export { isDev }
