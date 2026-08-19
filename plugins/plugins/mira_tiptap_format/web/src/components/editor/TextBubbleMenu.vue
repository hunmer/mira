<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Check,
  ChevronDown,
  Code,
  Italic,
  Link2,
  Strikethrough,
  Underline,
  X,
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
import { Separator } from '@/components/ui/separator'
import { useEditorVersion } from '@/composables/useEditorVersion'
import {
  alignOptions,
  applyHighlight,
  applyTextColor,
  blockLabelOf,
  blockOptions,
  highlightColors,
  isBlockActive,
  setAlign,
  setBlock,
  textColors,
} from './block-options'

const props = defineProps<{ editor: Editor }>()
const version = useEditorVersion(() => props.editor)
const editor = computed(() => { void version.value; return props.editor })

const activeBtn = 'bg-accent text-accent-foreground'

const marks = [
  { name: 'bold', label: '粗体 (Ctrl+B)', icon: Bold, command: 'toggleBold' },
  { name: 'italic', label: '斜体 (Ctrl+I)', icon: Italic, command: 'toggleItalic' },
  { name: 'underline', label: '下划线 (Ctrl+U)', icon: Underline, command: 'toggleUnderline' },
  { name: 'strike', label: '删除线', icon: Strikethrough, command: 'toggleStrike' },
  { name: 'code', label: '行内代码', icon: Code, command: 'toggleCode' },
] as const

function runMark (command: string) {
  const chain = props.editor.chain().focus() as unknown as Record<string, { run: () => void }>
  chain[command]?.run()
}

const alignIcons = { AlignLeft, AlignCenter, AlignRight, AlignJustify }
function alignActive (key: string) {
  return key === 'left'
    ? !editor.value.isActive({ textAlign: 'center' }) && !editor.value.isActive({ textAlign: 'right' }) && !editor.value.isActive({ textAlign: 'justify' })
    : editor.value.isActive({ textAlign: key })
}
const currentAlignIcon = computed(() => {
  for (const option of alignOptions) {
    if (option.key !== 'left' && editor.value.isActive({ textAlign: option.key })) return alignIcons[option.icon]
  }
  return AlignLeft
})

/* ---------- 链接输入模式 ---------- */
const mode = ref<'format' | 'link'>('format')
const url = ref('')

function openLinkInput () {
  const href = editor.value.getAttributes('link').href
  url.value = typeof href === 'string' ? href : ''
  mode.value = 'link'
}

function applyLink () {
  const href = url.value.trim()
  if (href) {
    props.editor.chain().focus().setLink({ href: /^[a-z]+:/i.test(href) ? href : `https://${href}` }).run()
  } else {
    props.editor.chain().focus().unsetLink().run()
  }
  mode.value = 'format'
}

function hideLinkInput () {
  mode.value = 'format'
  props.editor.commands.focus()
}
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :tippy-options="{ duration: 120, offset: [0, 8], interactive: true }"
    class="flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
    :data-version="version"
  >
    <template v-if="mode === 'format'">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button type="button" class="flex h-7 items-center gap-1 rounded-md px-2 text-sm font-medium transition-colors hover:bg-accent/50" @mousedown.prevent>
            {{ blockLabelOf(editor) }}
            <ChevronDown class="size-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-48">
          <DropdownMenuLabel>转换为</DropdownMenuLabel>
          <DropdownMenuItem v-for="option in blockOptions" :key="option.key" @click="setBlock(editor, option.key)">
            <component :is="option.icon" class="size-4 text-muted-foreground" />
            {{ option.label }}
            <Check v-if="isBlockActive(editor, option.key)" class="ml-auto size-4" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" class="mx-1 !h-5" />

      <button
        v-for="mark in marks"
        :key="mark.name"
        type="button"
        :title="mark.label"
        class="flex size-7 items-center justify-center rounded-md transition-colors"
        :class="editor.isActive(mark.name) ? activeBtn : 'hover:bg-accent/50'"
        @mousedown.prevent
        @click="runMark(mark.command)"
      >
        <component :is="mark.icon" class="size-4" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button type="button" title="文字颜色 / 高亮" class="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-accent/50" @mousedown.prevent>
            <Baseline class="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-44">
          <DropdownMenuLabel>文字颜色</DropdownMenuLabel>
          <DropdownMenuItem v-for="color in textColors" :key="`t-${color.label}`" @click="applyTextColor(editor, color.value)">
            <span class="size-3.5 rounded-full border" :style="{ background: color.value || 'var(--foreground)' }" />
            {{ color.label }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>背景高亮</DropdownMenuLabel>
          <DropdownMenuItem v-for="color in highlightColors" :key="`h-${color.label}`" @click="applyHighlight(editor, color.value)">
            <span class="size-3.5 rounded border" :style="{ background: color.value || 'var(--muted)' }" />
            {{ color.label }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button type="button" title="文本对齐" class="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-accent/50" @mousedown.prevent>
            <component :is="currentAlignIcon" class="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-36">
          <DropdownMenuItem v-for="option in alignOptions" :key="option.key" @click="setAlign(editor, option.key)">
            <component :is="alignIcons[option.icon]" class="size-4 text-muted-foreground" />
            {{ option.label }}
            <Check v-if="alignActive(option.key)" class="ml-auto size-4" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        title="链接"
        class="flex size-7 items-center justify-center rounded-md transition-colors"
        :class="editor.isActive('link') ? activeBtn : 'hover:bg-accent/50'"
        @mousedown.prevent
        @click="openLinkInput"
      >
        <Link2 class="size-4" />
      </button>
    </template>

    <template v-else>
      <Input v-model="url" placeholder="粘贴或输入链接，留空则移除" class="h-7 w-64 text-sm" @keyup.enter="applyLink" @keyup.esc="hideLinkInput" />
      <Button variant="ghost" size="icon-sm" title="取消" @click="hideLinkInput">
        <X />
      </Button>
      <Button size="icon-sm" title="应用" @click="applyLink">
        <Check />
      </Button>
    </template>
  </BubbleMenu>
</template>
