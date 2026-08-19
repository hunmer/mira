import { Extension, type Editor, type Range } from '@tiptap/core'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
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
import SlashCommandMenu from './SlashCommandMenu.vue'

export interface SlashCommandItem {
  title: string
  description: string
  icon: unknown
  command: (props: { editor: Editor; range: Range }) => void
}

const items: SlashCommandItem[] = [
  {
    title: '文本',
    description: '普通段落文本',
    icon: Type,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: '标题 1',
    description: '大号章节标题',
    icon: Heading1,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: '标题 2',
    description: '中号章节标题',
    icon: Heading2,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: '标题 3',
    description: '小号章节标题',
    icon: Heading3,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: '待办列表',
    description: '用复选框跟踪任务',
    icon: CheckSquare,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: '无序列表',
    description: '简单的项目符号列表',
    icon: List,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: '有序列表',
    description: '带编号的列表',
    icon: ListOrdered,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: '引用',
    description: '捕获引用内容',
    icon: Quote,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: '代码块',
    description: '捕获代码片段',
    icon: Code2,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: '分割线',
    description: '视觉分割线',
    icon: Minus,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
]

export const SlashCommand = Extension.create<{
  suggestion: Omit<SuggestionOptions<SlashCommandItem>, 'editor'>
}>({
  name: 'slashCommand',

  addOptions () {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
      },
    }
  },

  addProseMirrorPlugins () {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }) => {
          const normalized = query.toLowerCase()
          return items.filter(item =>
            item.title.toLowerCase().includes(normalized) || item.description.toLowerCase().includes(normalized))
        },
        render: () => {
          let component: VueRenderer | null = null
          let popup: TippyInstance | null = null

          return {
            onStart: (props) => {
              component = new VueRenderer(SlashCommandMenu, { props, editor: props.editor })
              if (!props.clientRect) return
              popup = tippy(document.body, {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                trigger: 'manual',
                interactive: true,
                placement: 'bottom-start',
                offset: [0, 6],
                animation: 'fade',
                maxWidth: 'none',
                content: component.element as HTMLElement,
              })
            },
            onUpdate: (props) => {
              component?.updateProps(props)
              if (props.clientRect) popup?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return (component?.ref as unknown as { onKeyDown?: (p: typeof props) => boolean } | undefined)?.onKeyDown?.(props) ?? false
            },
            onExit: () => {
              popup?.destroy()
              popup = null
              component?.destroy()
              component = null
            },
          }
        },
      }),
    ]
  },
})
