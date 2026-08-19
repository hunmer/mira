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

/* ---------- 转换为（Turn into） ---------- */
export interface BlockOption {
  key: 'paragraph' | 'h1' | 'h2' | 'h3' | 'taskList' | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock' | 'hr'
  label: string
  icon: unknown
}

export const blockOptions: BlockOption[] = [
  { key: 'paragraph', label: '文本', icon: Type },
  { key: 'h1', label: '标题 1', icon: Heading1 },
  { key: 'h2', label: '标题 2', icon: Heading2 },
  { key: 'h3', label: '标题 3', icon: Heading3 },
  { key: 'taskList', label: '待办列表', icon: CheckSquare },
  { key: 'bulletList', label: '无序列表', icon: List },
  { key: 'orderedList', label: '有序列表', icon: ListOrdered },
  { key: 'blockquote', label: '引用', icon: Quote },
  { key: 'codeBlock', label: '代码块', icon: Code2 },
  { key: 'hr', label: '分割线', icon: Minus },
]

export function blockLabelOf (editor: Editor) {
  if (editor.isActive('heading', { level: 1 })) return '标题 1'
  if (editor.isActive('heading', { level: 2 })) return '标题 2'
  if (editor.isActive('heading', { level: 3 })) return '标题 3'
  if (editor.isActive('taskList')) return '待办列表'
  if (editor.isActive('bulletList')) return '无序列表'
  if (editor.isActive('orderedList')) return '有序列表'
  if (editor.isActive('blockquote')) return '引用'
  if (editor.isActive('codeBlock')) return '代码块'
  return '文本'
}

export function isBlockActive (editor: Editor, key: BlockOption['key']) {
  switch (key) {
    case 'paragraph': return editor.isActive('paragraph') && blockLabelOf(editor) === '文本'
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
export const textColors = [
  { label: '默认', value: '' },
  { label: '灰色', value: '#6B7280' },
  { label: '棕色', value: '#9B6B53' },
  { label: '红色', value: '#DC2626' },
  { label: '橙色', value: '#EA580C' },
  { label: '黄色', value: '#CA8A04' },
  { label: '绿色', value: '#16A34A' },
  { label: '蓝色', value: '#2563EB' },
  { label: '紫色', value: '#7C3AED' },
]

export const highlightColors = [
  { label: '无背景', value: '' },
  { label: '灰色', value: '#F1F1EF' },
  { label: '红色', value: '#FDEBEC' },
  { label: '橙色', value: '#FBEBDD' },
  { label: '黄色', value: '#FBF3DB' },
  { label: '绿色', value: '#EDF3EC' },
  { label: '蓝色', value: '#E7F3F8' },
  { label: '紫色', value: '#F6F3F9' },
  { label: '粉色', value: '#FAF1F5' },
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
export const alignOptions = [
  { key: 'left', label: '左对齐', icon: 'AlignLeft' },
  { key: 'center', label: '居中', icon: 'AlignCenter' },
  { key: 'right', label: '右对齐', icon: 'AlignRight' },
  { key: 'justify', label: '两端对齐', icon: 'AlignJustify' },
] as const

export function setAlign (editor: Editor, key: (typeof alignOptions)[number]['key']) {
  editor.chain().focus().setTextAlign(key).run()
}
