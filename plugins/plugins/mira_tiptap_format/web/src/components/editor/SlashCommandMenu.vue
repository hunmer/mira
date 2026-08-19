<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SlashCommandItem } from './slash-command'

const props = defineProps<{
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}>()

const selectedIndex = ref(0)

watch(() => props.items, () => { selectedIndex.value = 0 })

function selectItem (index: number) {
  const item = props.items[index]
  if (item) props.command(item)
}

function onKeyDown ({ event }: { event: KeyboardEvent }) {
  if (event.key === 'ArrowUp') {
    upHandler()
    return true
  }
  if (event.key === 'ArrowDown') {
    downHandler()
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

function upHandler () {
  selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
}

function downHandler () {
  selectedIndex.value = (selectedIndex.value + 1) % props.items.length
}

defineExpose({ onKeyDown })
</script>

<template>
  <div class="w-60 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
    <template v-if="items.length">
      <button
        v-for="(item, index) in items"
        :key="item.title"
        type="button"
        class="flex w-full items-center gap-3 px-2 py-1.5 text-left transition-colors"
        :class="index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'"
        @click="selectItem(index)"
        @mouseenter="selectedIndex = index"
      >
        <span class="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/50">
          <component :is="item.icon" class="size-4" />
        </span>
        <span class="flex min-w-0 flex-col">
          <span class="text-sm font-medium leading-tight">{{ item.title }}</span>
          <span class="truncate text-xs leading-tight text-muted-foreground">{{ item.description }}</span>
        </span>
      </button>
    </template>
    <div v-else class="px-3 py-6 text-center text-sm text-muted-foreground">没有匹配的命令</div>
  </div>
</template>
