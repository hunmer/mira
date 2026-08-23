import type { Editor } from '@tiptap/core'
import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Quote,
  Type,
} from 'lucide-vue-next'
import type { I18nKey } from '@/lib/i18n'

/* ---------- 转换为（Turn into） ---------- */
export interface BlockOption {
  key: 'paragraph' | 'h1' | 'h2' | 'h3' | 'taskList' | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock' | 'hr'
  /** i18n key（block.*），由使用处 t() 渲染 */
  label: I18nKey
  icon: unknown
}

export const blockOptions: BlockOption[] = [
  { key: 'paragraph', label: 'block.text', icon: Type },
  { key: 'h1', label: 'block.h1', icon: Heading1 },
  { key: 'h2', label: 'block.h2', icon: Heading2 },
  { key: 'h3', label: 'block.h3', icon: Heading3 },
  { key: 'taskList', label: 'block.taskList', icon: CheckSquare },
  { key: 'bulletList', label: 'block.bulletList', icon: List },
  { key: 'orderedList', label: 'block.orderedList', icon: ListOrdered },
  { key: 'blockquote', label: 'block.blockquote', icon: Quote },
  { key: 'codeBlock', label: 'block.codeBlock', icon: Code2 },
  { key: 'hr', label: 'block.hr', icon: Minus },
]

/** 当前块类型对应的 i18n key（block.*） */
export function blockLabelOf (editor: Editor): I18nKey {
  if (editor.isActive('heading', { level: 1 })) return 'block.h1'
  if (editor.isActive('heading', { level: 2 })) return 'block.h2'
  if (editor.isActive('heading', { level: 3 })) return 'block.h3'
  if (editor.isActive('taskList')) return 'block.taskList'
  if (editor.isActive('bulletList')) return 'block.bulletList'
  if (editor.isActive('orderedList')) return 'block.orderedList'
  if (editor.isActive('blockquote')) return 'block.blockquote'
  if (editor.isActive('codeBlock')) return 'block.codeBlock'
  return 'block.text'
}

export function isBlockActive (editor: Editor, key: BlockOption['key']) {
  switch (key) {
    case 'paragraph': return editor.isActive('paragraph') && blockLabelOf(editor) === 'block.text'
    case 'h1': return editor.isActive('heading', { level: 1 })
    case 'h2': return editor.isActive('heading', { level: 2 })
    case 'h3': return editor.isActive('heading', { level: 3 })
    case 'taskList': return editor.isActive('taskList')
    case 'bulletList': return editor.isActive('bulletList')
    case 'orderedList': return editor.isActive('orderedList')
    case 'blockquote': return editor.isActive('blockquote')
    case 'codeBlock': return editor.isActive('codeBlock')
    default: return false
  }
}

export function setBlock (editor: Editor, key: BlockOption['key']) {
  const chain = editor.chain().focus()
  switch (key) {
    case 'paragraph': chain.clearNodes().setParagraph().run(); break
    case 'h1': chain.clearNodes().setNode('heading', { level: 1 }).run(); break
    case 'h2': chain.clearNodes().setNode('heading', { level: 2 }).run(); break
    case 'h3': chain.clearNodes().setNode('heading', { level: 3 }).run(); break
    case 'taskList': chain.clearNodes().toggleTaskList().run(); break
    case 'bulletList': chain.clearNodes().toggleBulletList().run(); break
    case 'orderedList': chain.clearNodes().toggleOrderedList().run(); break
    case 'blockquote': chain.clearNodes().toggleBlockquote().run(); break
    case 'codeBlock': chain.clearNodes().toggleCodeBlock().run(); break
    case 'hr': chain.setHorizontalRule().run(); break
  }
}

/* ---------- 颜色与高亮（Notion 色板） ---------- */
export interface ColorOption { label: I18nKey; value: string }

export const textColors: ColorOption[] = [
  { label: 'color.default', value: '' },
  { label: 'color.gray', value: '#6B7280' },
  { label: 'color.brown', value: '#9B6B53' },
  { label: 'color.red', value: '#DC2626' },
  { label: 'color.orange', value: '#EA580C' },
  { label: 'color.yellow', value: '#CA8A04' },
  { label: 'color.green', value: '#16A34A' },
  { label: 'color.blue', value: '#2563EB' },
  { label: 'color.purple', value: '#7C3AED' },
]

export const highlightColors: ColorOption[] = [
  { label: 'color.none', value: '' },
  { label: 'color.gray', value: '#F1F1EF' },
  { label: 'color.red', value: '#FDEBEC' },
  { label: 'color.orange', value: '#FBEBDD' },
  { label: 'color.yellow', value: '#FBF3DB' },
  { label: 'color.green', value: '#EDF3EC' },
  { label: 'color.blue', value: '#E7F3F8' },
  { label: 'color.purple', value: '#F6F3F9' },
  { label: 'color.pink', value: '#FAF1F5' },
]

export function applyTextColor (editor: Editor, value: string) {
  const chain = editor.chain().focus()
  if (value) chain.setColor(value).run()
  else chain.unsetColor().run()
}

export function applyHighlight (editor: Editor, value: string) {
  const chain = editor.chain().focus()
  if (value) chain.setHighlight({ color: value }).run()
  else chain.unsetHighlight().run()
}

/* ---------- 对齐 ---------- */
export interface AlignOption {
  key: 'left' | 'center' | 'right' | 'justify'
  /** i18n key（align.*），由使用处 t() 渲染 */
  label: I18nKey
  icon: string
}

export const alignOptions: AlignOption[] = [
  { key: 'left', label: 'align.left', icon: 'AlignLeft' },
  { key: 'center', label: 'align.center', icon: 'AlignCenter' },
  { key: 'right', label: 'align.right', icon: 'AlignRight' },
  { key: 'justify', label: 'align.justify', icon: 'AlignJustify' },
]

export function setAlign (editor: Editor, key: AlignOption['key']) {
  editor.chain().focus().setTextAlign(key).run()
}
