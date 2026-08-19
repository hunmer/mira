<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import type { ChainedCommands } from '@tiptap/core'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Check,
  CheckSquare,
  ChevronDown,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Save,
  Strikethrough,
  Type,
  Underline,
  Undo2,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { useEditorVersion } from '@/composables/useEditorVersion'

const props = defineProps<{ editor: Editor; status: string }>()
const emit = defineEmits<{ (event: 'save'): void }>()

// 依赖 version，使下方所有 isActive/can 计算随 transaction 刷新
const version = useEditorVersion(() => props.editor)
const editor = computed(() => { void version.value; return props.editor })

/* ---------- 转换为（Turn into） ---------- */
const blockItems = [
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
] as const

const blockLabel = computed(() => {
  const e = editor.value
  if (e.isActive('heading', { level: 1 })) return '标题 1'
  if (e.isActive('heading', { level: 2 })) return '标题 2'
  if (e.isActive('heading', { level: 3 })) return '标题 3'
  if (e.isActive('taskList')) return '待办列表'
  if (e.isActive('bulletList')) return '无序列表'
  if (e.isActive('orderedList')) return '有序列表'
  if (e.isActive('blockquote')) return '引用'
  if (e.isActive('codeBlock')) return '代码块'
  return '文本'
})

function isBlockActive (key: (typeof blockItems)[number]['key']) {
  const e = editor.value
  switch (key) {
    case 'paragraph': return e.isActive('paragraph') && blockLabel.value === '文本'
    case 'h1': return e.isActive('heading', { level: 1 })
    case 'h2': return e.isActive('heading', { level: 2 })
    case 'h3': return e.isActive('heading', { level: 3 })
    case 'taskList': return e.isActive('taskList')
    case 'bulletList': return e.isActive('bulletList')
    case 'orderedList': return e.isActive('orderedList')
    case 'blockquote': return e.isActive('blockquote')
    case 'codeBlock': return e.isActive('codeBlock')
    default: return false
  }
}

function setBlock (key: (typeof blockItems)[number]['key']) {
  const chain = props.editor.chain().focus()
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

/* ---------- 行内标记 ---------- */
const marks: Array<{
  name: string
  label: string
  icon: unknown
  run: (chain: ChainedCommands) => ChainedCommands
}> = [
  { name: 'bold', label: '粗体 (Ctrl+B)', icon: Bold, run: chain => chain.toggleBold() },
  { name: 'italic', label: '斜体 (Ctrl+I)', icon: Italic, run: chain => chain.toggleItalic() },
  { name: 'underline', label: '下划线 (Ctrl+U)', icon: Underline, run: chain => chain.toggleUnderline() },
  { name: 'strike', label: '删除线', icon: Strikethrough, run: chain => chain.toggleStrike() },
  { name: 'code', label: '行内代码', icon: Code, run: chain => chain.toggleCode() },
]

function runMark (mark: (typeof marks)[number]) {
  mark.run(props.editor.chain().focus()).run()
}

/* ---------- 颜色与高亮 ---------- */
const textColors = [
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
const highlightColors = [
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

function applyTextColor (value: string) {
  const chain = props.editor.chain().focus()
  if (value) chain.setColor(value).run()
  else chain.unsetColor().run()
}

function applyHighlight (value: string) {
  const chain = props.editor.chain().focus()
  if (value) chain.setHighlight({ color: value }).run()
  else chain.unsetHighlight().run()
}

/* ---------- 对齐 ---------- */
const aligns = [
  { key: 'left', label: '左对齐', icon: AlignLeft },
  { key: 'center', label: '居中', icon: AlignCenter },
  { key: 'right', label: '右对齐', icon: AlignRight },
  { key: 'justify', label: '两端对齐', icon: AlignJustify },
] as const

function setAlign (key: (typeof aligns)[number]['key']) {
  props.editor.chain().focus().setTextAlign(key).run()
}

/* ---------- 链接 ---------- */
const linkPopoverOpen = ref(false)
const linkUrl = ref('')

function onLinkPopoverChange (open: boolean) {
  linkPopoverOpen.value = open
  if (open) {
    const href = editor.value.getAttributes('link').href
    linkUrl.value = typeof href === 'string' ? href : ''
  }
}

function applyLink () {
  const href = linkUrl.value.trim()
  if (href) {
    props.editor.chain().focus().setLink({ href: /^[a-z]+:/i.test(href) ? href : `https://${href}` }).run()
  } else {
    props.editor.chain().focus().unsetLink().run()
  }
  linkPopoverOpen.value = false
}

const activeBtn = 'bg-accent text-accent-foreground'
</script>

<template>
  <header class="sticky top-0 z-20 flex items-center gap-1 border-b bg-background/85 px-3 py-1.5 backdrop-blur">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="sm" class="gap-1 px-2.5 font-medium">
          {{ blockLabel }}
          <ChevronDown class="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-48">
        <DropdownMenuLabel>转换为</DropdownMenuLabel>
        <DropdownMenuItem
          v-for="item in blockItems"
          :key="item.key"
          @click="setBlock(item.key)"
        >
          <component :is="item.icon" class="size-4 text-muted-foreground" />
          {{ item.label }}
          <Check v-if="isBlockActive(item.key)" class="ml-auto size-4" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Separator orientation="vertical" class="mx-1 !h-5" />

    <Button
      v-for="mark in marks"
      :key="mark.name"
      variant="ghost"
      size="icon-sm"
      :title="mark.label"
      :class="editor.isActive(mark.name) && activeBtn"
      @click="runMark(mark)"
    >
      <component :is="mark.icon" />
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon-sm" title="文字颜色 / 高亮">
          <Baseline />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-44">
        <DropdownMenuLabel>文字颜色</DropdownMenuLabel>
        <DropdownMenuItem v-for="color in textColors" :key="`t-${color.label}`" @click="applyTextColor(color.value)">
          <span class="size-3.5 rounded-full border" :style="{ background: color.value || 'var(--foreground)' }" />
          {{ color.label }}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>背景高亮</DropdownMenuLabel>
        <DropdownMenuItem v-for="color in highlightColors" :key="`h-${color.label}`" @click="applyHighlight(color.value)">
          <span class="size-3.5 rounded border" :style="{ background: color.value || 'var(--muted)' }" />
          {{ color.label }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="icon-sm"
          title="文本对齐"
          :class="(editor.isActive({ textAlign: 'center' }) || editor.isActive({ textAlign: 'right' }) || editor.isActive({ textAlign: 'justify' })) && activeBtn"
        >
          <component :is="editor.isActive({ textAlign: 'center' }) ? AlignCenter : editor.isActive({ textAlign: 'right' }) ? AlignRight : editor.isActive({ textAlign: 'justify' }) ? AlignJustify : AlignLeft" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-36">
        <DropdownMenuItem v-for="align in aligns" :key="align.key" @click="setAlign(align.key)">
          <component :is="align.icon" class="size-4 text-muted-foreground" />
          {{ align.label }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Popover :open="linkPopoverOpen" @update:open="onLinkPopoverChange">
      <PopoverTrigger as-child>
        <Button variant="ghost" size="icon-sm" title="链接" :class="editor.isActive('link') && activeBtn">
          <Link2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" class="w-80 p-3" :side-offset="8">
        <Input v-model="linkUrl" placeholder="粘贴或输入链接，留空则移除" @keyup.enter="applyLink" />
        <div class="mt-2.5 flex items-center justify-end gap-2">
          <Button v-if="editor.isActive('link')" variant="ghost" size="sm" @click="linkUrl = ''; applyLink()">移除</Button>
          <Button size="sm" :disabled="!linkUrl.trim()" @click="applyLink">应用</Button>
        </div>
      </PopoverContent>
    </Popover>

    <Button variant="ghost" size="icon-sm" title="清除格式" @click="editor.chain().focus().unsetAllMarks().clearNodes().run()">
      <RemoveFormatting />
    </Button>

    <Separator orientation="vertical" class="mx-1 !h-5" />

    <Button variant="ghost" size="icon-sm" title="撤销" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">
      <Undo2 />
    </Button>
    <Button variant="ghost" size="icon-sm" title="重做" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">
      <Redo2 />
    </Button>

    <span class="ml-auto text-xs text-muted-foreground">{{ status }}</span>
    <Button size="sm" class="ml-2 gap-1.5" @click="emit('save')">
      <Save class="size-3.5" />
      保存
    </Button>
  </header>
</template>
