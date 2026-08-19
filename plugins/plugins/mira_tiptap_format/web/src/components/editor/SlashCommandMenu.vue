<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
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
  Search,
  Type,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface CommandItem {
  title: string
  icon: unknown
  keywords: string[]
  action: () => void
}

const props = defineProps<{ editor: Editor }>()

const commandGroups: Array<{ label: string; items: CommandItem[] }> = [
  {
    label: '基本块',
    items: [
      { title: '文本', icon: Type, keywords: ['text', 'p', 'wenben'], action: () => props.editor.chain().focus().setParagraph().run() },
      { title: '一级标题', icon: Heading1, keywords: ['h1', 'heading1', 'biaoti1'], action: () => props.editor.chain().focus().toggleHeading({ level: 1 }).run() },
      { title: '二级标题', icon: Heading2, keywords: ['h2', 'heading2', 'biaoti2'], action: () => props.editor.chain().focus().toggleHeading({ level: 2 }).run() },
      { title: '三级标题', icon: Heading3, keywords: ['h3', 'heading3', 'biaoti3'], action: () => props.editor.chain().focus().toggleHeading({ level: 3 }).run() },
    ],
  },
  {
    label: '列表',
    items: [
      { title: '无序列表', icon: List, keywords: ['list', 'bullet', 'liebiao'], action: () => props.editor.chain().focus().toggleBulletList().run() },
      { title: '有序列表', icon: ListOrdered, keywords: ['ol', 'ordered', 'youxu'], action: () => props.editor.chain().focus().toggleOrderedList().run() },
      { title: '待办清单', icon: CheckSquare, keywords: ['todo', 'task', 'daiban'], action: () => props.editor.chain().focus().toggleTaskList().run() },
    ],
  },
  {
    label: '高级',
    items: [
      { title: '代码块', icon: Code2, keywords: ['code', 'daima'], action: () => props.editor.chain().focus().toggleCodeBlock().run() },
      { title: '引用', icon: Quote, keywords: ['quote', 'blockquote', 'yinyong'], action: () => props.editor.chain().focus().toggleBlockquote().run() },
      { title: '分割线', icon: Minus, keywords: ['hr', 'divider', 'fengexian'], action: () => props.editor.chain().focus().setHorizontalRule().run() },
    ],
  },
]

/** 展平的命令列表（定义顺序与分组渲染顺序一致，供键盘导航索引） */
const commands: CommandItem[] = commandGroups.flatMap(group => group.items)

const open = ref(false)
const query = ref('')
const indexOfSelected = ref(0)
const menu = ref<HTMLElement | null>(null)
const position = ref({ top: 0, left: 0 })

const filtered = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return commands
  return commands.filter(item =>
    item.title.toLowerCase().includes(q) || item.keywords.some(k => k.includes(q)))
})

/** 按分组渲染（顺序与 filtered 展平一致） */
const filteredGroups = computed(() => {
  const q = query.value.toLowerCase()
  const match = (item: CommandItem) =>
    !q || item.title.toLowerCase().includes(q) || item.keywords.some(k => k.includes(q))
  return commandGroups
    .map(group => ({ label: group.label, items: group.items.filter(match) }))
    .filter(group => group.items.length)
})

/** 编辑器内容变化时检测光标前是否处于 "/" 命令上下文 */
function handleUpdate () {
  const { selection, doc } = props.editor.state
  if (!selection.empty) { close(); return }
  const before = doc.textBetween(Math.max(0, selection.from - 32), selection.from, '\n', '\n')
  const si = before.lastIndexOf('/')
  if (si === -1) { close(); return }
  const q = before.slice(si + 1)
  if (q.includes(' ') || q.includes('\n')) { close(); return }
  open.value = true
  query.value = q.toLowerCase()
  if (indexOfSelected.value >= filtered.value.length) indexOfSelected.value = 0
  updatePosition()
}

/** 菜单钉在 "/" 字符出现的位置 */
function updatePosition () {
  const wrap = menu.value?.parentElement
  if (!wrap) return
  const anchor = Math.max(props.editor.state.selection.from - query.value.length - 1, 0)
  const coords = props.editor.view.coordsAtPos(anchor)
  const rect = wrap.getBoundingClientRect()
  position.value = { top: coords.top - rect.top + 20, left: coords.left - rect.left - 4 }
}

function close () {
  open.value = false
  query.value = ''
  indexOfSelected.value = 0
}

function run (item: CommandItem) {
  const to = props.editor.state.selection.from
  const from = to - query.value.length - 1
  props.editor.chain().focus().deleteRange({ from, to }).run()
  item.action()
  close()
}

/** capture 阶段拦截，优先于 ProseMirror 的按键处理 */
function onKeydown (event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
    props.editor.commands.focus()
    return
  }
  if (!filtered.value.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    event.stopPropagation()
    indexOfSelected.value = (indexOfSelected.value + 1) % filtered.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    event.stopPropagation()
    indexOfSelected.value = (indexOfSelected.value - 1 + filtered.value.length) % filtered.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    run(filtered.value[indexOfSelected.value])
  }
}

function onMousedown (event: MouseEvent) {
  if (open.value && menu.value && !menu.value.contains(event.target as Node)) close()
}

function handleSelectionUpdate () {
  // 光标移出 "/query" 上下文（仍为空选区）时也要关闭，避免 Enter 误触
  if (open.value) handleUpdate()
}

onMounted (() => {
  props.editor.on('update', handleUpdate)
  props.editor.on('selectionUpdate', handleSelectionUpdate)
  window.addEventListener('keydown', onKeydown, true)
  document.addEventListener('mousedown', onMousedown)
})

onBeforeUnmount (() => {
  props.editor.off('update', handleUpdate)
  props.editor.off('selectionUpdate', handleSelectionUpdate)
  window.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('mousedown', onMousedown)
})
</script>

<template>
  <div
    v-show="open"
    ref="menu"
    class="absolute z-40 w-72 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
    :style="{ top: `${position.top}px`, left: `${position.left}px` }"
  >
    <div class="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <Search class="size-3.5" />
      <span>搜索块命令</span>
      <span v-if="query" class="ml-auto rounded-md bg-muted px-1.5 py-0.5 font-mono text-foreground">/{{ query }}</span>
    </div>
    <div class="scroll-thin max-h-60 overflow-y-auto p-1.5">
      <template v-if="filtered.length">
        <template v-for="group in filteredGroups" :key="group.label">
          <div class="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {{ group.label }}
          </div>
          <button
            v-for="item in group.items"
            :key="item.title"
            type="button"
            class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors"
            :class="commands.indexOf(item) === indexOfSelected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'"
            @mousedown.prevent
            @click="run(item)"
            @mouseenter="indexOfSelected = commands.indexOf(item)"
          >
            <span class="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <component :is="item.icon" class="size-4" />
            </span>
            <span class="text-sm font-medium">{{ item.title }}</span>
          </button>
        </template>
      </template>
      <div v-else class="px-4 py-3 text-center text-sm italic text-muted-foreground">未找到对应块选项</div>
    </div>
  </div>
</template>
