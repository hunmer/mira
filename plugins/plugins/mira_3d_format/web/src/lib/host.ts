/**
 * 宿主桥接层：主题跟随（plugin-window-preload 注入的 window.mira）。
 * 浏览器直开（无宿主）时回退系统 prefers-color-scheme。
 * 本插件 token 结构为 :root/.dark 深色 + .light 浅色，故同时切换两个类。
 */
export const host: any = (typeof window !== 'undefined' && (window.mira || window.eagle)) || null

export function hostIsDark(): boolean {
  try {
    return Boolean(host?.app?.isDarkColors?.()) || host?.app?.theme === 'DARK'
  } catch {
    return false
  }
}

/** 主题切换：html.dark / html.light */
export function applyTheme(dark: boolean) {
  const el = document.documentElement
  el.classList.toggle('dark', dark)
  el.classList.toggle('light', !dark)
}

/** 应用初始主题并订阅宿主/系统变化；onChange 可额外接收深浅通知（如画布背景）；返回取消函数 */
export function watchTheme(onChange?: (dark: boolean) => void): () => void {
  const apply = (dark: boolean) => {
    applyTheme(dark)
    onChange?.(dark)
  }
  apply(hostIsDark())
  const off = host?.onThemeChanged?.((theme: string) => apply(theme === 'DARK'))
  if (typeof off === 'function') return off
  if (typeof matchMedia !== 'function') return () => {}
  const mq = matchMedia('(prefers-color-scheme: dark)')
  apply(mq.matches)
  const listener = (event: MediaQueryListEvent) => apply(event.matches)
  mq.addEventListener('change', listener)
  return () => mq.removeEventListener('change', listener)
}
