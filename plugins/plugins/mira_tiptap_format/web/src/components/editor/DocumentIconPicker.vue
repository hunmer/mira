<script setup lang="ts">
import { SmilePlus } from 'lucide-vue-next'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const icon = defineModel<string>({ default: '' })
const open = ref(false)

const EMOJIS = [
  '📄', '📝', '📌', '✏️', '📚', '📖', '🗂️', '📁', '💡', '⭐',
  '🔥', '✨', '🚀', '🎯', '🏆', '🎉', '❤️', '😊', '🌈', '☀️',
  '🌙', '⚡', '🍀', '🌸', '🌊', '🎨', '🎵', '🎬', '📷', '🔍',
  '⏰', '📅', '✅', '🔔', '🔒', '💰', '📊', '📈', '🧠', '🧩',
  '⚙️', '🔧', '🌐', '💬', '☕', '🍕', '🐾', '🐬', '🦋', '🌱',
]

function pick (emoji: string) {
  icon.value = emoji
  open.value = false
}

function clear () {
  icon.value = ''
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        :title="icon ? '更改图标' : '添加图标'"
        class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-3xl leading-none transition-colors hover:bg-accent"
      >
        <span v-if="icon">{{ icon }}</span>
        <SmilePlus v-else class="size-6 text-muted-foreground/40" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-64 p-2" :side-offset="8">
      <div class="grid grid-cols-10 gap-0.5">
        <button
          v-for="emoji in EMOJIS"
          :key="emoji"
          type="button"
          class="flex size-6 cursor-pointer items-center justify-center rounded text-base transition-colors hover:bg-accent"
          :class="icon === emoji && 'bg-accent'"
          @click="pick(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
      <Button variant="ghost" size="sm" class="mt-1.5 w-full cursor-pointer" :disabled="!icon" @click="clear">
        移除图标
      </Button>
    </PopoverContent>
  </Popover>
</template>
