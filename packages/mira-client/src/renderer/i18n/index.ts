import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export type AppLocale = 'zh-CN' | 'en-US'

export const SUPPORTED_LOCALES: AppLocale[] = ['zh-CN', 'en-US']

/**
 * vue-i18n 实例
 *
 * - 同步加载（Electron 桌面应用，切换即时生效）
 * - fallbackLocale: 'zh-CN'，缺 key 回退中文
 * - locale 初值用 localStorage 中持久化的设置（与 settings store 保持一致）
 */
const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

/**
 * 从持久化设置中同步读取初始语言，回退到 zh-CN
 *
 * 设置通过 ConfigStorage 持久化（key: 'mira-settings'）：生产环境 Electron
 * 走文件存储，但 setItem 时会同时写一份到 localStorage 作为备份（见
 * ConfigStorage.setItem）。因此模块加载时同步读 localStorage 即可拿到
 * 上次保存的语言；首启无值时默认 zh-CN。settings store 完成异步加载后
 * 会再次调用 setLocale 校正，保证最终一致。
 */
function getInitialLocale(): AppLocale {
  try {
    const raw = localStorage.getItem('mira-settings')
    if (raw) {
      const lang = JSON.parse(raw)?.language
      if (lang && SUPPORTED_LOCALES.includes(lang)) {
        return lang
      }
    }
  } catch {
    // ignore parse errors
  }
  return 'zh-CN'
}

/**
 * 运行时切换语言
 * @param locale 目标语言
 */
export function setLocale(locale: AppLocale) {
  if (SUPPORTED_LOCALES.includes(locale)) {
    i18n.global.locale.value = locale
  }
}

export default i18n
