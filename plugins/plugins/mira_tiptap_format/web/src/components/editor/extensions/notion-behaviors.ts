import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Notion 行为：文档末尾始终保持一个空段落，
 * 点击编辑器底部空白处总是可以继续输入。
 */
export const TrailingNode = Extension.create({
  name: 'trailingNode',

  addProseMirrorPlugins () {
    return [
      new Plugin({
        key: new PluginKey('trailingNode'),
        appendTransaction: (_, __, state) => {
          const { doc, tr, schema } = state
          const last = doc.lastChild
          if (last && last.type.name === 'paragraph' && last.content.size === 0) return null
          // 不进入撤销历史，避免污染 Ctrl+Z
          tr.setMeta('addToHistory', false)
          return tr.insert(doc.content.size, schema.nodes.paragraph.create())
        },
      }),
    ]
  },
})

/**
 * Notion 行为：在空的非文本块上按 Backspace 先降级为普通段落，
 * 而不是直接删除或无响应；列表项仍走默认的退出列表逻辑。
 */
export const NotionKeyboard = Extension.create({
  name: 'notionKeyboard',

  addKeyboardShortcuts () {
    return {
      Backspace: () => {
        const { selection } = this.editor.state
        const { $from, empty } = selection
        if (!empty || $from.parentOffset !== 0 || $from.parent.content.size > 0) return false
        const name = $from.parent.type.name
        if (name === 'heading' || name === 'blockquote' || name === 'codeBlock') {
          return this.editor.commands.clearNodes()
        }
        return false
      },
    }
  },
})
