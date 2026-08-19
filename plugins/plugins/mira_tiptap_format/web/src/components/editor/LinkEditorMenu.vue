<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import type { Editor as VueEditor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3'
import { Check, ExternalLink, Unlink } from 'lucide-vue-next'
import { onBeforeUnmount, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const props = defineProps<{ editor: VueEditor }>()
const url = ref('')

// 光标进出链接时同步输入框内容
function syncUrl () {
  const href = props.editor.getAttributes('link').href
  if (typeof href === 'string') url.value = href
}
props.editor.on('selectionUpdate', syncUrl)
onBeforeUnmount(() => props.editor.off('selectionUpdate', syncUrl))

// 仅在光标落入链接（折叠选区）时显示；选中文本时让位给格式气泡菜单
function shouldShow ({ editor, from, to }: { editor: Editor; from: number; to: number }) {
  return editor.isActive('link') && from === to
}
function apply () {
  const href = url.value.trim()
  if (href) {
    props.editor.chain().focus().extendMarkRange('link').setLink({ href: normalizeUrl(href) }).run()
  } else {
    remove()
  }
}

function remove () {
  props.editor.chain().focus().extendMarkRange('link').unsetLink().run()
}

function openExternal () {
  const href = props.editor.getAttributes('link').href
  if (typeof href === 'string' && href) window.open(href, '_blank', 'noopener')
}

function normalizeUrl (value: string) {
  return /^[a-z]+:/i.test(value) ? value : `https://${value}`
}
</script>

<template>
  <BubbleMenu
    :editor="editor"
    plugin-key="linkEditorMenu"
    :tippy-options="{ duration: 120, offset: [0, 8], interactive: true }"
    :should-show="shouldShow"
    class="w-72 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg"
  >
    <div class="flex items-center gap-1.5">
      <Input v-model="url" placeholder="编辑链接…" class="h-8 text-sm" @keyup.enter="apply" />
      <Button variant="ghost" size="icon-sm" title="浏览器打开" @click="openExternal">
        <ExternalLink />
      </Button>
      <Button variant="ghost" size="icon-sm" title="移除链接" @click="remove">
        <Unlink />
      </Button>
      <Button size="icon-sm" title="应用" @click="apply">
        <Check />
      </Button>
    </div>
  </BubbleMenu>
</template>
