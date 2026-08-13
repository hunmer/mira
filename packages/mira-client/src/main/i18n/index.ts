import { app } from 'electron'

/**
 * 主进程轻量 i18n
 *
 * 渲染进程使用 vue-i18n，但其 locale JSON 会被打包进 bundle，主进程无法
 * 以文件路径读取。因此主进程自带一份仅含主进程 UI 文案（如托盘菜单）的
 * 字典，保持零依赖、最小开销。与渲染进程通过 IPC（tray:set-locale）同步
 * 当前语言。
 */
export type MainLocale = 'zh-CN' | 'en-US'

const messages: Record<MainLocale, Record<string, string>> = {
  'zh-CN': {
    'tray.resetPosition': '重置位置',
    'tray.about': '关于 Mira',
    'tray.quit': '退出',
    'tray.tooltip': 'Mira 媒体库'
  },
  'en-US': {
    'tray.resetPosition': 'Reset Position',
    'tray.about': 'About Mira',
    'tray.quit': 'Quit',
    'tray.tooltip': 'Mira Media Library'
  }
}

const FALLBACK_LOCALE: MainLocale = 'zh-CN'

let currentLocale: MainLocale = FALLBACK_LOCALE

/**
 * 根据系统语言推断主进程初始语言（须在 app ready 后调用）
 */
export function detectLocale(): MainLocale {
  return app.getLocale().startsWith('en') ? 'en-US' : 'zh-CN'
}

/**
 * 翻译：当前语言 → 回退 zh-CN → 回退 key 本身
 */
export function t(key: string): string {
  return messages[currentLocale][key] ?? messages[FALLBACK_LOCALE][key] ?? key
}

export function setMainLocale(locale: MainLocale): void {
  if (messages[locale]) {
    currentLocale = locale
  }
}

export function getMainLocale(): MainLocale {
  return currentLocale
}
