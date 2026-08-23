/**
 * 轻量 i18n（zh/en）：不引 vue-i18n，扁平 key 字典 + {x} 插值。
 * 初始语言：宿主 window.mira.app.locale（preload 注入，主窗口设置同步）→
 * 浏览器直开时回退 navigator.language；主窗口切换语言时经
 * window.mira.onLocaleChanged 实时更新（App.vue 中监听一处即可全局生效）。
 */
import { ref } from 'vue'

export type Locale = 'zh' | 'en'

const dict = {
  zh: {
    'app.title': 'PSD 分层查看器',
    'app.subtitle': 'ag-psd · 浏览器本地解析',
    'app.choosePsd': '选择 PSD',
    'app.selectFile': '选择文件',
    'app.dropHint': '拖放 PSD 文件到此处',
    'app.dropSub': '或点击下方按钮选择文件（仅本地解析，不上传）',
    'app.loading': '正在解析 {name} …',
    'app.layers': '图层',
    'app.showAll': '全部显示',
    'app.hideAll': '全部隐藏',
    'app.show': '显',
    'app.hide': '隐',
    'app.noLayers': '无图层数据',
    'app.noLayersShort': '无图层',
    'app.preview': '预览',
    'app.previewHint': '切换左侧可见性后自动重新合成（仅支持普通混合 + 透明度）',
    'app.unnamed': '(未命名)',
    'app.errFileType': '请选择 .psd 或 .psb 文件',
    'app.errUrl': '资源 URL 不完整',
    'app.errLoad': '加载 PSD 失败 ({status})',
    'app.errParse': '解析失败，请确认文件完整且为 RGB 模式',
  },
  en: {
    'app.title': 'PSD Layer Viewer',
    'app.subtitle': 'ag-psd · parsed locally in browser',
    'app.choosePsd': 'Open PSD',
    'app.selectFile': 'Choose file',
    'app.dropHint': 'Drop a PSD file here',
    'app.dropSub': 'or click the button below (parsed locally, never uploaded)',
    'app.loading': 'Parsing {name}…',
    'app.layers': 'Layers',
    'app.showAll': 'Show all',
    'app.hideAll': 'Hide all',
    'app.show': 'On',
    'app.hide': 'Off',
    'app.noLayers': 'No layers',
    'app.noLayersShort': 'No layers',
    'app.preview': 'Preview',
    'app.previewHint': 'Toggling visibility recomposites automatically (normal blend + opacity only)',
    'app.unnamed': '(unnamed)',
    'app.errFileType': 'Please choose a .psd or .psb file',
    'app.errUrl': 'Incomplete resource URL',
    'app.errLoad': 'Failed to load PSD ({status})',
    'app.errParse': 'Parse failed; make sure the file is intact and in RGB mode',
  },
} as const

export type I18nKey = keyof typeof dict.zh

export function parseLocale(tag: string | undefined | null): Locale {
  return String(tag || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** 初始语言：宿主注入的应用语言 → 浏览器语言 */
export function initialLocale(): Locale {
  const host = (typeof window !== 'undefined' && (window.mira || window.eagle)) || null
  const fromHost = (host as any)?.app?.locale
  if (fromHost) return parseLocale(fromHost)
  if (typeof navigator !== 'undefined') return parseLocale(navigator.language)
  return 'zh'
}

/** 共享单例：App / LayerTree 等组件共用同一 locale 状态 */
const sharedLocale = ref<Locale>(initialLocale())

export function useI18n() {
  const locale = sharedLocale

  /** 主窗口切换语言时调用（来自 window.mira.onLocaleChanged） */
  function setLocale(tag: string) {
    locale.value = parseLocale(tag)
  }

  function t(key: I18nKey, params?: Record<string, string | number>): string {
    let text: string = (dict[locale.value] as Record<string, string>)[key] ?? (dict.zh as Record<string, string>)[key] ?? key
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.split(`{${name}}`).join(String(value))
      }
    }
    return text
  }

  return { locale, setLocale, t }
}
