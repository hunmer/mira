/**
 * 轻量 i18n（zh/en）：不引 vue-i18n，扁平 key 字典 + {x} 插值。
 * 初始语言：宿主 window.mira.app.locale（preload 注入，主窗口设置同步）→
 * 浏览器直开时回退 navigator.language；主窗口切换语言时经
 * window.mira.onLocaleChanged 实时更新。
 */
import { ref } from 'vue'

export type Locale = 'zh' | 'en'

const dict = {
  zh: {
    'app.title': 'AI 图片生成器',
    'app.noModel': '未选模型',
    'app.img2img': '图生图 × {n}',
    'app.mask': '蒙版',
    'app.generating': '生成中…',
    'app.import': '导入素材库',
    'app.importCount': '导入素材库（{n}）',
    'app.missingConn': '缺少服务器连接信息（请从 Mira 主窗口打开本插件）',
    'app.missingConnBanner': '缺少服务器连接信息（请从 Mira 主窗口打开本插件；浏览器调试时可带 ?server=&token=&libraryId=）',
    'app.provider': '服务商',
    'app.selectProvider': '选择服务商',
    'app.noProviders': '无可用服务商',
    'app.default': '（默认）',
    'app.model': '模型',
    'app.selectModel': '选择模型',
    'app.modelHint': '模型需为服务商配置中的图片模型（如 gpt-image-1 / seedream）',
    'app.size': '尺寸',
    'app.sizeAuto': '自动',
    'app.sizeSquare': '1024 × 1024 方形',
    'app.sizePortrait': '1024 × 1536 竖版',
    'app.sizeLandscape': '1536 × 1024 横版',
    'app.sizePortrait2': '1024 × 1792 竖版',
    'app.sizeLandscape2': '1792 × 1024 横版',
    'app.count': '数量',
    'app.prompt': '提示词',
    'app.promptPlaceholder': '描述要生成或编辑的图片，如：A cat on a roof, watercolor style',
    'app.promptHint': 'Ctrl + Enter 快速生成',
    'app.generate': '生成图片',
    'app.edit': '编辑图片',
    'app.refs': '参考图',
    'app.remove': '移除',
    'app.addRef': '添加参考图',
    'app.uploadLocal': '本地上传',
    'app.pickLibrary': '素材库选择',
    'app.redrawMask': '重新绘制蒙版',
    'app.maskHint': '绘制蒙版（涂抹区域将被重绘）',
    'app.empty': '输入提示词生成图片；添加参考图进入图生图 / 蒙版重绘模式',
    'app.selected': '已选',
    'app.download': '下载原图',
    'app.doneInfo': '生成 {n} 张，耗时 {sec}s',
    'app.ignored': '（服务商忽略: {list}）',
    'app.imported': '已导入 {n} 张到素材库',
    'picker.title': '从素材库选择参考图',
    'picker.confirm': '添加',
    'picker.cancel': '取消',
    'picker.selected': '已选 {n} 项（可框选/按住 Ctrl 多选）',
    'picker.missingAuth': '缺少服务器连接信息（server/token）',
    'picker.loadFailed': '素材库加载失败：{error}',
    'picker.loading': '正在加载素材库…',
    'picker.noLibrary': '暂无素材库',
    'upload.title': '导入生成结果',
    'upload.description': '选择素材库与文件夹，将选中的生成结果导入指定位置。',
    'upload.submit': '开始导入',
    'upload.cancel': '取消',
    'mask.title': '绘制蒙版',
    'mask.description': '涂抹区域将被 AI 重绘（导出后为透明区），其余区域保持原图不变。',
    'mask.clear': '清空',
    'mask.apply': '应用蒙版',
    'mask.none': '移除蒙版',
    'mask.alt': '参考图',
  },
  en: {
    'app.title': 'AI Image Generator',
    'app.noModel': 'no model',
    'app.img2img': 'img2img × {n}',
    'app.mask': 'mask',
    'app.generating': 'Generating…',
    'app.import': 'Import to library',
    'app.importCount': 'Import to library ({n})',
    'app.missingConn': 'Missing server connection (open this plugin from the Mira main window)',
    'app.missingConnBanner': 'Missing server connection (open from Mira main window; for browser debugging append ?server=&token=&libraryId=)',
    'app.provider': 'Provider',
    'app.selectProvider': 'Select provider',
    'app.noProviders': 'No providers',
    'app.default': ' (default)',
    'app.model': 'Model',
    'app.selectModel': 'Select model',
    'app.modelHint': 'Pick an image model from the provider config (e.g. gpt-image-1 / seedream)',
    'app.size': 'Size',
    'app.sizeAuto': 'Auto',
    'app.sizeSquare': '1024 × 1024 square',
    'app.sizePortrait': '1024 × 1536 portrait',
    'app.sizeLandscape': '1536 × 1024 landscape',
    'app.sizePortrait2': '1024 × 1792 portrait',
    'app.sizeLandscape2': '1792 × 1024 landscape',
    'app.count': 'Count',
    'app.prompt': 'Prompt',
    'app.promptPlaceholder': 'Describe the image to generate or edit, e.g. A cat on a roof, watercolor style',
    'app.promptHint': 'Ctrl + Enter to generate',
    'app.generate': 'Generate',
    'app.edit': 'Edit image',
    'app.refs': 'References',
    'app.remove': 'Remove',
    'app.addRef': 'Add reference image',
    'app.uploadLocal': 'Upload local image',
    'app.pickLibrary': 'Pick from library',
    'app.redrawMask': 'Redraw mask',
    'app.maskHint': 'Draw mask (painted areas will be repainted)',
    'app.empty': 'Enter a prompt to generate; add references for img2img / mask repainting',
    'app.selected': 'Selected',
    'app.download': 'Download',
    'app.doneInfo': '{n} image(s) in {sec}s',
    'app.ignored': ' (ignored by provider: {list})',
    'app.imported': 'Imported {n} image(s) to library',
    'picker.title': 'Pick references from library',
    'picker.confirm': 'Add',
    'picker.cancel': 'Cancel',
    'picker.selected': '{n} selected (drag or Ctrl-click to multi-select)',
    'picker.missingAuth': 'Missing server connection info (server/token)',
    'picker.loadFailed': 'Failed to load libraries: {error}',
    'picker.loading': 'Loading libraries…',
    'picker.noLibrary': 'No libraries',
    'upload.title': 'Import generated images',
    'upload.description': 'Choose a library and folder to import the selected results.',
    'upload.submit': 'Start import',
    'upload.cancel': 'Cancel',
    'mask.title': 'Draw mask',
    'mask.description': 'Painted areas will be repainted by AI (transparent in the exported mask); the rest stays unchanged.',
    'mask.clear': 'Clear',
    'mask.apply': 'Apply mask',
    'mask.none': 'Remove mask',
    'mask.alt': 'reference',
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

export function createI18n() {
  return useI18n()
}

/** 共享单例：App / MaskEditor 等组件共用同一 locale 状态 */
const sharedLocale = ref<Locale>(initialLocale())

export function useI18n() {
  const locale = sharedLocale

  /** 主窗口切换语言时调用（来自 window.mira.onLocaleChanged，监听一处即可全局生效） */
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
