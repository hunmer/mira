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
    'app.errUrl': '资源 URL 不完整（缺少 skel/atlas/png）',
    'app.errSkel': '加载 .skel/.json 失败 ({status})',
    'app.errAtlas': '加载 .atlas 失败 ({status})',
    'app.errLoad': 'Spine 资源加载失败',
    'app.loading': '加载中…',
    'app.noRes': '未提供资源',
    'app.noResHint': '请从媒体网格双击 .skel 文件打开预览。',
    'app.loadingRes': '正在加载 Spine 资源…',
    'app.readonlyHint': '骨骼动画预览（只读）',
    'app.fit': '适配视角',
    'app.badgeReadonly': '只读预览',
    'app.animations': '动画（{n}）',
    'app.pause': '暂停',
    'app.play': '播放',
    'app.noAnimations': '无动画',
    'app.speed': '倍速',
    'app.skins': '皮肤（{n}）',
    'app.bones': '骨骼（{n}）',
    'app.bonesEmpty': '加载角色后显示骨骼',
    'app.info': '资源信息',
    'app.bonesShort': '骨骼',
    'app.slots': '插槽',
    'app.animationsShort': '动画',
    'app.runtime': '4.2 运行时',
    'app.infoHint': '此预览器为只读模式：支持骨骼查看、显隐切换、动画/皮肤切换，不提供骨骼编辑能力。',
    'app.show': '显示',
    'app.hide': '隐藏',
  },
  en: {
    'app.errUrl': 'Incomplete resource URLs (missing skel/atlas/png)',
    'app.errSkel': 'Failed to load .skel/.json ({status})',
    'app.errAtlas': 'Failed to load .atlas ({status})',
    'app.errLoad': 'Failed to load Spine resource',
    'app.loading': 'Loading…',
    'app.noRes': 'No resource provided',
    'app.noResHint': 'Double-click a .skel file in the media grid to preview.',
    'app.loadingRes': 'Loading Spine resource…',
    'app.readonlyHint': 'Skeleton animation preview (read-only)',
    'app.fit': 'Fit view',
    'app.badgeReadonly': 'Read-only',
    'app.animations': 'Animations ({n})',
    'app.pause': 'Pause',
    'app.play': 'Play',
    'app.noAnimations': 'No animations',
    'app.speed': 'Speed',
    'app.skins': 'Skins ({n})',
    'app.bones': 'Bones ({n})',
    'app.bonesEmpty': 'Bones appear after a character is loaded',
    'app.info': 'Resource info',
    'app.bonesShort': 'Bones',
    'app.slots': 'Slots',
    'app.animationsShort': 'Animations',
    'app.runtime': '4.2 runtime',
    'app.infoHint': 'Read-only preview: view bones, toggle visibility, switch animation/skin; no bone editing.',
    'app.show': 'Show',
    'app.hide': 'Hide',
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

/** 共享单例：App / 面板等组件共用同一 locale 状态 */
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
