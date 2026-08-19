<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3'
import { Bold, Code, Italic, Strikethrough, Underline } from 'lucide-vue-next'
import { useEditorVersion } from '@/composables/useEditorVersion'

const props = defineProps<{ editor: Editor }>()
const version = useEditorVersion(() => props.editor)

const marks = [
  { name: 'bold', label: '粗体', icon: Bold },
  { name: 'italic', label: '斜体', icon: Italic },
  { name: 'underline', label: '下划线', icon: Underline },
  { name: 'strike', label: '删除线', icon: Strikethrough },
  { name: 'code', label: '行内代码', icon: Code },
] as const

function toggleMark (name: (typeof marks)[number]['name']) {
  props.editor.chain().focus().toggleMark(name).run()
}
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :tippy-options="{ duration: 120, offset: [0, 8] }"
    class="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
    :data-version="version"
  >
    <button
      v-for="mark in marks"
      :key="mark.name"
      type="button"
      :title="mark.label"
      class="flex size-7 items-center justify-center rounded-md transition-colors"
      :class="editor.isActive(mark.name) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'"
      @mousedown.prevent
      @click="toggleMark(mark.name)"
    >
      <component :is="mark.icon" class="size-4" />
    </button>
  </BubbleMenu>
</template>
