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
    'app.title': '格式转换',
    'app.subtitle': '批量转换图片 / 视频 / 音频格式，转换结果作为新文件保存回素材库',
    'app.ffmpegMissing': '服务器未安装 FFmpeg（视频/音频转换不可用）',
    'app.imMissing': '服务器未安装 ImageMagick（图片转换不可用）',
    'app.errConnect': '无法连接转换服务：{msg}',
    'app.pending': '待转换（{n}）',
    'app.converting': '转换中…',
    'app.emptyHint': '在素材库中选中素材 → 右键菜单「格式转换」<br />或从右侧栏插件入口打开后选中素材',
    'app.sourceDeleted': '源已删除',
    'app.waiting': '等待中',
    'app.importing': '入库中',
    'app.duplicate': '（库内已存在）',
    'app.remove': '移除',
    'cat.image': '图片',
    'cat.video': '视频',
    'cat.audio': '音频',
    'cat.unknown': '未知',
    'app.settings': '转换设置',
    'app.target': '目标格式',
    'app.targetPlaceholder': '选择目标格式',
    'app.noCommonTarget': '选中素材的格式组合没有共同支持的目标格式',
    'app.groupImage': '图片格式',
    'app.groupVideo': '视频格式',
    'app.groupAudio': '音频格式',
    'app.quality': '质量',
    'app.qualityHigh': '高（文件较大）',
    'app.qualityMedium': '中（推荐）',
    'app.qualityLow': '低（文件较小）',
    'app.scale': '分辨率（可选，只缩不放）',
    'scale.none': '原始尺寸',
    'scale.percent50': '50%',
    'scale.width1920': '宽 ≤ 1920',
    'scale.width1280': '宽 ≤ 1280',
    'scale.width640': '宽 ≤ 640',
    'app.inheritMeta': '继承原文件所在文件夹与标签',
    'app.start': '开始转换',
    'app.startCount': '开始转换（{n} 个文件）',
    'app.binaryMissing': '服务器未检测到 ImageMagick / FFmpeg，请先安装或设置 FFMPEG_PATH / IMAGEMAGICK_PATH 环境变量',
    'app.task': '转换任务',
    'app.progress': '进行中 {n}%',
    'app.doneCount': '成功 {n}',
    'app.failedCount': '失败 {n}',
    'app.taskParams': '目标格式 .{target} · 质量 {quality} · {meta}',
    'app.qualityHighShort': '高',
    'app.qualityMediumShort': '中',
    'app.qualityLowShort': '低',
    'app.metaInherit': '继承文件夹与标签',
    'app.metaNoInherit': '不继承元数据',
    'app.failedDetail': '失败明细（其余文件不受影响）',
    'app.savedToLibrary': '转换产物已保存回素材库{suffix}，可在素材库中查看。',
    'app.savedToLibraryInherit': '（原文件夹）',
    'app.deleting': '删除中…',
    'app.deleteSources': '删除已转换的源文件（{n} 个）',
    'app.sourcesDeleted': '源文件已移入回收站',
    'app.continue': '继续转换其他文件',
    'app.deleteTitle': '删除已转换的源文件？',
    'app.deleteDesc': '将删除 {n} 个已完成转换的源素材（移入回收站，可从回收站恢复），转换产物保留。',
    'app.cancel': '取消',
    'app.confirmDelete': '确认删除',
    'app.deleteFailed': '{n} 个源文件删除失败：{errors}',
  },
  en: {
    'app.title': 'Format Converter',
    'app.subtitle': 'Batch convert image / video / audio formats; results are saved back to the library as new files',
    'app.ffmpegMissing': 'FFmpeg not installed on the server (video/audio conversion unavailable)',
    'app.imMissing': 'ImageMagick not installed on the server (image conversion unavailable)',
    'app.errConnect': 'Cannot reach the conversion service: {msg}',
    'app.pending': 'Pending ({n})',
    'app.converting': 'Converting…',
    'app.emptyHint': 'Select items in the library → context menu “Format Converter”<br />or open the plugin from the right sidebar, then select items',
    'app.sourceDeleted': 'source deleted',
    'app.waiting': 'Waiting',
    'app.importing': 'Importing',
    'app.duplicate': ' (already in library)',
    'app.remove': 'Remove',
    'cat.image': 'Image',
    'cat.video': 'Video',
    'cat.audio': 'Audio',
    'cat.unknown': 'Unknown',
    'app.settings': 'Conversion settings',
    'app.target': 'Target format',
    'app.targetPlaceholder': 'Select target format',
    'app.noCommonTarget': 'The selected items have no common target format',
    'app.groupImage': 'Image formats',
    'app.groupVideo': 'Video formats',
    'app.groupAudio': 'Audio formats',
    'app.quality': 'Quality',
    'app.qualityHigh': 'High (larger files)',
    'app.qualityMedium': 'Medium (recommended)',
    'app.qualityLow': 'Low (smaller files)',
    'app.scale': 'Resolution (optional, downscale only)',
    'scale.none': 'Original size',
    'scale.percent50': '50%',
    'scale.width1920': 'Width ≤ 1920',
    'scale.width1280': 'Width ≤ 1280',
    'scale.width640': 'Width ≤ 640',
    'app.inheritMeta': 'Inherit the source folder and tags',
    'app.start': 'Start conversion',
    'app.startCount': 'Start conversion ({n} files)',
    'app.binaryMissing': 'ImageMagick / FFmpeg not detected on the server; install them or set FFMPEG_PATH / IMAGEMAGICK_PATH',
    'app.task': 'Conversion task',
    'app.progress': 'In progress {n}%',
    'app.doneCount': 'Succeeded {n}',
    'app.failedCount': 'Failed {n}',
    'app.taskParams': 'Target .{target} · quality {quality} · {meta}',
    'app.qualityHighShort': 'high',
    'app.qualityMediumShort': 'medium',
    'app.qualityLowShort': 'low',
    'app.metaInherit': 'inherit folder & tags',
    'app.metaNoInherit': 'no metadata inheritance',
    'app.failedDetail': 'Failures (other files are unaffected)',
    'app.savedToLibrary': 'Converted files were saved back to the library{suffix}.',
    'app.savedToLibraryInherit': ' (original folder)',
    'app.deleting': 'Deleting…',
    'app.deleteSources': 'Delete converted sources ({n})',
    'app.sourcesDeleted': 'Sources moved to trash',
    'app.continue': 'Convert other files',
    'app.deleteTitle': 'Delete converted source files?',
    'app.deleteDesc': 'This deletes {n} converted source items (moved to trash, restorable); converted outputs are kept.',
    'app.cancel': 'Cancel',
    'app.confirmDelete': 'Delete',
    'app.deleteFailed': '{n} source file(s) failed to delete: {errors}',
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
