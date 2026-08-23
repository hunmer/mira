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
    'app.untitled': '无标题',
    'app.heading': '标题 {n}',
    'app.docPlaceholder': "输入 '/' 打开命令菜单，或直接开始书写…",
    'app.errNoLib': '未选择素材库',
    'app.errLoad': '加载失败 ({status})',
    'app.toggleWide': '切换为宽屏版式',
    'app.toggleCenter': '切换为居中版式',
    'save.title': '保存文档',
    'save.description': '选择素材库与文件夹，将文档保存到指定位置。',
    'tb.bold': '加粗',
    'tb.italic': '斜体',
    'tb.underline': '下划线',
    'tb.strike': '删除线',
    'tb.code': '行内代码',
    'tb.bulletList': '无序列表',
    'tb.orderedList': '有序列表',
    'tb.task': '待办',
    'tb.codeBlock': '代码块',
    'tb.quote': '引用',
    'tb.hr': '分割线',
    'tb.undo': '撤销',
    'tb.redo': '重做',
    'tb.file': '文件',
    'tb.openFile': '打开文件',
    'tb.saveAs': '另存为',
    'tb.slashHint': '/ 快捷命令',
    'tb.save': '保存',
    'sm.search': '搜索块命令',
    'sm.empty': '未找到对应块选项',
    'sm.groupBasic': '基本块',
    'sm.groupList': '列表',
    'sm.groupAdvanced': '高级',
    'sm.text': '文本',
    'sm.h1': '一级标题',
    'sm.h2': '二级标题',
    'sm.h3': '三级标题',
    'sm.taskList': '待办清单',
    'ol.title': '文档大纲',
    'ol.unnamed': '未命名章节',
    'ol.empty1': '暂无章节',
    'ol.empty2': '插入标题后在此定位',
    'od.title': '打开文档',
    'od.close': '关闭',
    'od.loading': '正在加载文档列表…',
    'od.empty': '当前素材库中没有 .tiptap 文档',
    'od.cancel': '取消',
    'le.placeholder': '编辑链接…',
    'le.openExternal': '浏览器打开',
    'le.remove': '移除链接',
    'le.apply': '应用',
    'bm.bold': '粗体 (Ctrl+B)',
    'bm.italic': '斜体 (Ctrl+I)',
    'bm.underline': '下划线 (Ctrl+U)',
    'bm.turnInto': '转换为',
    'bm.color': '文字颜色 / 高亮',
    'bm.textColor': '文字颜色',
    'bm.highlight': '背景高亮',
    'bm.align': '文本对齐',
    'bm.link': '链接',
    'bm.linkPlaceholder': '粘贴或输入链接，留空则移除',
    'bm.cancel': '取消',
    'bm.apply': '应用',
    'cv.change': '更换封面',
    'cv.remove': '移除',
    'cv.add': '添加封面',
    'cv.gradient': '渐变色',
    'cv.imageUrl': '图片链接',
    'cv.apply': '应用',
    'cv.removeCover': '移除封面',
    'ip.change': '更改图标',
    'ip.add': '添加图标',
    'ip.remove': '移除图标',
    'dh.insertBelow': '在下方插入块',
    'dh.drag': '拖拽移动块',
    'block.text': '文本',
    'block.h1': '标题 1',
    'block.h2': '标题 2',
    'block.h3': '标题 3',
    'block.taskList': '待办列表',
    'block.bulletList': '无序列表',
    'block.orderedList': '有序列表',
    'block.blockquote': '引用',
    'block.codeBlock': '代码块',
    'block.hr': '分割线',
    'color.default': '默认',
    'color.gray': '灰色',
    'color.brown': '棕色',
    'color.red': '红色',
    'color.orange': '橙色',
    'color.yellow': '黄色',
    'color.green': '绿色',
    'color.blue': '蓝色',
    'color.purple': '紫色',
    'color.pink': '粉色',
    'color.none': '无背景',
    'align.left': '左对齐',
    'align.center': '居中',
    'align.right': '右对齐',
    'align.justify': '两端对齐',
  },
  en: {
    'app.untitled': 'Untitled',
    'app.heading': 'Heading {n}',
    'app.docPlaceholder': "Type '/' for commands, or just start writing…",
    'app.errNoLib': 'No library selected',
    'app.errLoad': 'Failed to load ({status})',
    'app.toggleWide': 'Switch to wide layout',
    'app.toggleCenter': 'Switch to centered layout',
    'save.title': 'Save document',
    'save.description': 'Choose a library and folder to save the document.',
    'tb.bold': 'Bold',
    'tb.italic': 'Italic',
    'tb.underline': 'Underline',
    'tb.strike': 'Strikethrough',
    'tb.code': 'Inline code',
    'tb.bulletList': 'Bullet list',
    'tb.orderedList': 'Ordered list',
    'tb.task': 'Task list',
    'tb.codeBlock': 'Code block',
    'tb.quote': 'Quote',
    'tb.hr': 'Divider',
    'tb.undo': 'Undo',
    'tb.redo': 'Redo',
    'tb.file': 'File',
    'tb.openFile': 'Open file',
    'tb.saveAs': 'Save as',
    'tb.slashHint': '/ commands',
    'tb.save': 'Save',
    'sm.search': 'Search block commands',
    'sm.empty': 'No matching blocks',
    'sm.groupBasic': 'Basic blocks',
    'sm.groupList': 'Lists',
    'sm.groupAdvanced': 'Advanced',
    'sm.text': 'Text',
    'sm.h1': 'Heading 1',
    'sm.h2': 'Heading 2',
    'sm.h3': 'Heading 3',
    'sm.taskList': 'To-do list',
    'ol.title': 'Outline',
    'ol.unnamed': 'Untitled section',
    'ol.empty1': 'No headings yet',
    'ol.empty2': 'insert a heading to navigate here',
    'od.title': 'Open document',
    'od.close': 'Close',
    'od.loading': 'Loading documents…',
    'od.empty': 'No .tiptap documents in this library',
    'od.cancel': 'Cancel',
    'le.placeholder': 'Edit link…',
    'le.openExternal': 'Open in browser',
    'le.remove': 'Remove link',
    'le.apply': 'Apply',
    'bm.bold': 'Bold (Ctrl+B)',
    'bm.italic': 'Italic (Ctrl+I)',
    'bm.underline': 'Underline (Ctrl+U)',
    'bm.turnInto': 'Turn into',
    'bm.color': 'Text color / highlight',
    'bm.textColor': 'Text color',
    'bm.highlight': 'Highlight',
    'bm.align': 'Text align',
    'bm.link': 'Link',
    'bm.linkPlaceholder': 'Paste a link, empty to remove',
    'bm.cancel': 'Cancel',
    'bm.apply': 'Apply',
    'cv.change': 'Change cover',
    'cv.remove': 'Remove',
    'cv.add': 'Add cover',
    'cv.gradient': 'Gradients',
    'cv.imageUrl': 'Image URL',
    'cv.apply': 'Apply',
    'cv.removeCover': 'Remove cover',
    'ip.change': 'Change icon',
    'ip.add': 'Add icon',
    'ip.remove': 'Remove icon',
    'dh.insertBelow': 'Insert block below',
    'dh.drag': 'Drag to move block',
    'block.text': 'Text',
    'block.h1': 'Heading 1',
    'block.h2': 'Heading 2',
    'block.h3': 'Heading 3',
    'block.taskList': 'To-do list',
    'block.bulletList': 'Bullet list',
    'block.orderedList': 'Ordered list',
    'block.blockquote': 'Quote',
    'block.codeBlock': 'Code block',
    'block.hr': 'Divider',
    'color.default': 'Default',
    'color.gray': 'Gray',
    'color.brown': 'Brown',
    'color.red': 'Red',
    'color.orange': 'Orange',
    'color.yellow': 'Yellow',
    'color.green': 'Green',
    'color.blue': 'Blue',
    'color.purple': 'Purple',
    'color.pink': 'Pink',
    'color.none': 'No background',
    'align.left': 'Align left',
    'align.center': 'Center',
    'align.right': 'Align right',
    'align.justify': 'Justify',
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

/** 共享单例：App / 编辑器组件共用同一 locale 状态 */
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
