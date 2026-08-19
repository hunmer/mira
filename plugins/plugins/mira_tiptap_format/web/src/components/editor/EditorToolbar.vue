<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { Redo2, Save, Undo2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useEditorVersion } from '@/composables/useEditorVersion'

const props = defineProps<{ editor: Editor; status: string }>()
const emit = defineEmits<{ (event: 'save'): void }>()

const version = useEditorVersion(() => props.editor)
const editor = computed(() => { void version.value; return props.editor })
</script>

<template>
  <header class="sticky top-0 z-20 flex items-center gap-1 border-b bg-background/85 px-3 py-1.5 backdrop-blur">
    <span class="px-1.5 text-sm font-medium">文档</span>
    <Separator orientation="vertical" class="mx-1 !h-5" />
    <Button variant="ghost" size="icon-sm" title="撤销 (Ctrl+Z)" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">
      <Undo2 />
    </Button>
    <Button variant="ghost" size="icon-sm" title="重做 (Ctrl+Shift+Z)" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">
      <Redo2 />
    </Button>
    <span class="ml-auto text-xs text-muted-foreground">{{ status }}</span>
    <Button size="sm" class="ml-2 gap-1.5" @click="emit('save')">
      <Save class="size-3.5" />
      保存
    </Button>
  </header>
</template>
