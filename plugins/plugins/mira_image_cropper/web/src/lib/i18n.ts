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
    'app.title': '多选区裁切',
    'app.zoomOut': '缩小',
    'app.zoomIn': '放大',
    'app.fit': '适应窗口',
    'app.undo': '撤销 (Ctrl+Z)',
    'app.redo': '重做 (Ctrl+Shift+Z)',
    'app.fromLibrary': '从素材库添加图片',
    'app.dropToAdd': '松开以添加图片',
    'app.images': '图片',
    'app.removeImage': '移除此图片',
    'app.addImage': '添加图片',
    'app.stageEmpty': '拖入图片、点击上方「上传」或从左侧栏添加图片',
    'app.stageLoading': '图片加载中…',
    'app.errNoImage': '图片未加载',
    'app.errNoSource': '图片来源缺失',
    'app.errDecode': '图片解码失败',
    'app.errBlob': 'toBlob 失败',
    'app.cropList': '裁切列表（{n}）',
    'app.addRegion': '添加选区',
    'app.clearRegions': '清空所有选区',
    'app.downloadRegion': '下载此选区',
    'app.removeRegion': '删除此选区',
    'app.cropEmpty': '选择左侧图片后在此查看裁切结果',
    'app.format': '格式',
    'app.formatPng': 'PNG（无损/透明）',
    'app.formatJpeg': 'JPG（体积小）',
    'app.quality': '质量',
    'app.prefix': '前缀',
    'app.prefixPlaceholder': '导出文件名前缀',
    'app.batchDownload': '批量下载（多个选区自动 zip 打包）',
    'app.download': '下载',
    'app.exportTo': '导出到',
    'app.exportToHint': '导出到素材库 / 文件夹',
    'app.preparing': '生成裁切结果',
    'app.errDrawFirst': '请先在图片上绘制选区',
    'app.errNoConn': '缺少服务器连接信息（请从 Mira 主窗口打开本插件）',
    'app.errImportFailed': '{failed}/{total} 个文件导入失败',
    'upload.title': '导出裁切结果',
    'upload.description': '选择素材库与文件夹，将全部裁切结果导入指定位置。',
    'upload.submit': '开始导入',
    'upload.cancel': '取消',
    'picker.title': '从素材库添加图片',
    'picker.confirm': '添加',
    'picker.cancel': '取消',
    'picker.selected': '已选 {n} 项（可框选/按住 Ctrl 多选）',
    'picker.missingAuth': '缺少服务器连接信息（server/token）',
    'picker.loadFailed': '素材库加载失败：{error}',
    'picker.loading': '正在加载素材库…',
    'picker.noLibrary': '暂无素材库',
  },
  en: {
    'app.title': 'Multi-region Crop',
    'app.zoomOut': 'Zoom out',
    'app.zoomIn': 'Zoom in',
    'app.fit': 'Fit window',
    'app.undo': 'Undo (Ctrl+Z)',
    'app.redo': 'Redo (Ctrl+Shift+Z)',
    'app.fromLibrary': 'Add images from library',
    'app.dropToAdd': 'Drop to add images',
    'app.images': 'Images',
    'app.removeImage': 'Remove this image',
    'app.addImage': 'Add image',
    'app.stageEmpty': 'Drop an image here, or add one from the left rail',
    'app.stageLoading': 'Loading image…',
    'app.errNoImage': 'Image not loaded',
    'app.errNoSource': 'Image source missing',
    'app.errDecode': 'Failed to decode image',
    'app.errBlob': 'toBlob failed',
    'app.cropList': 'Crops ({n})',
    'app.addRegion': 'Add region',
    'app.clearRegions': 'Clear all regions',
    'app.downloadRegion': 'Download this region',
    'app.removeRegion': 'Remove this region',
    'app.cropEmpty': 'Select an image on the left to see crops here',
    'app.format': 'Format',
    'app.formatPng': 'PNG (lossless/transparent)',
    'app.formatJpeg': 'JPG (smaller)',
    'app.quality': 'Quality',
    'app.prefix': 'Prefix',
    'app.prefixPlaceholder': 'Export filename prefix',
    'app.batchDownload': 'Batch download (multiple regions are zipped)',
    'app.download': 'Download',
    'app.exportTo': 'Export to',
    'app.exportToHint': 'Export to library / folder',
    'app.preparing': 'Rendering crops',
    'app.errDrawFirst': 'Draw regions on the image first',
    'app.errNoConn': 'Missing server connection (open this plugin from the Mira main window)',
    'app.errImportFailed': '{failed}/{total} file(s) failed to import',
    'upload.title': 'Export crops',
    'upload.description': 'Choose a library and folder to import all crops.',
    'upload.submit': 'Start import',
    'upload.cancel': 'Cancel',
    'picker.title': 'Add images from library',
    'picker.confirm': 'Add',
    'picker.cancel': 'Cancel',
    'picker.selected': '{n} selected (drag or Ctrl-click to multi-select)',
    'picker.missingAuth': 'Missing server connection info (server/token)',
    'picker.loadFailed': 'Failed to load libraries: {error}',
    'picker.loading': 'Loading libraries…',
    'picker.noLibrary': 'No libraries',
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
