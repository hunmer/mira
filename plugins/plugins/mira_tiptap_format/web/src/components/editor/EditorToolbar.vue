<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import {
  Bold,
  CheckSquare,
  Code,
  Code2,
  Italic,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Redo2,
  Save,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useEditorVersion } from '@/composables/useEditorVersion'

const props = defineProps<{ editor: Editor; status: string }>()
const emit = defineEmits<{ (event: 'save'): void }>()

const version = useEditorVersion(() => props.editor)
const editor = computed(() => { void version.value; return props.editor })

interface ToolButton {
  label: string
  icon?: unknown
  text?: string
  active?: boolean
  disabled?: boolean
  separatorBefore?: boolean
  run: () => void
}

const tools = computed<ToolButton[]>(() => {
  const e = editor.value
  const c = () => e.chain().focus()
  return [
    { label: '加粗', icon: Bold, active: e.isActive('bold'), run: () => c().toggleBold().run() },
    { label: '斜体', icon: Italic, active: e.isActive('italic'), run: () => c().toggleItalic().run() },
    { label: '下划线', icon: Underline, active: e.isActive('underline'), run: () => c().toggleUnderline().run() },
    { label: '删除线', icon: Strikethrough, active: e.isActive('strike'), run: () => c().toggleStrike().run() },
    { label: '行内代码', icon: Code, active: e.isActive('code'), run: () => c().toggleCode().run() },
    { label: 'H1', text: 'H1', active: e.isActive('heading', { level: 1 }), run: () => c().toggleHeading({ level: 1 }).run() },
    { label: 'H2', text: 'H2', active: e.isActive('heading', { level: 2 }), run: () => c().toggleHeading({ level: 2 }).run() },
    { label: 'H3', text: 'H3', active: e.isActive('heading', { level: 3 }), run: () => c().toggleHeading({ level: 3 }).run() },
    { label: '无序列表', icon: List, active: e.isActive('bulletList'), run: () => c().toggleBulletList().run() },
    { label: '有序列表', icon: ListOrdered, active: e.isActive('orderedList'), run: () => c().toggleOrderedList().run() },
    { label: '待办', icon: CheckSquare, active: e.isActive('taskList'), run: () => c().toggleTaskList().run() },
    { label: '代码块', icon: Code2, active: e.isActive('codeBlock'), run: () => c().toggleCodeBlock().run() },
    { label: '引用', icon: Quote, active: e.isActive('blockquote'), run: () => c().toggleBlockquote().run() },
    { label: '分割线', icon: Minus, run: () => c().setHorizontalRule().run() },
    { label: '撤销', icon: Undo2, disabled: !e.can().undo(), separatorBefore: true, run: () => c().undo().run() },
    { label: '重做', icon: Redo2, disabled: !e.can().redo(), run: () => c().redo().run() },
  ]
})

// 打开 / 命令菜单：在光标处插入 '/'
function openSlashMenu () {
  editor.value.commands.focus()
  editor.value.commands.insertContent('/')
}
</script>

<template>
  <header class="sticky top-0 z-20 flex items-center justify-center border-b bg-background/85 px-3 py-1.5 backdrop-blur">
    <div class="flex flex-wrap items-center justify-center gap-0.5">
      <template v-for="tool in tools" :key="tool.label">
        <span v-if="tool.separatorBefore" class="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          :title="tool.label"
          :disabled="tool.disabled"
          class="flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-20"
          :class="tool.active && 'bg-accent text-foreground'"
          @mousedown.prevent
          @click="tool.run()"
        >
          <component :is="tool.icon" v-if="tool.icon" class="size-4" />
          <span v-else class="text-xs font-semibold">{{ tool.text }}</span>
        </button>
      </template>
      <button
        type="button"
        title="/ 快捷命令"
        class="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-foreground transition-colors hover:bg-muted"
        @mousedown.prevent
        @click="openSlashMenu"
      >
        <Plus class="size-4" />
      </button>
    </div>
    <div class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
      <span class="text-xs text-muted-foreground">{{ status }}</span>
      <Button size="sm" class="gap-1.5" @click="emit('save')">
        <Save class="size-3.5" />
        保存
      </Button>
    </div>
  </header>
</template>
