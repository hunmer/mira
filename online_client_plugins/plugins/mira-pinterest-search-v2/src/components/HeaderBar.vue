<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Minus, Pin, PinOff, Plus, ScanSearch, X } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { t } from '@/lib/i18n'
import { isAlwaysOnTop, setAlwaysOnTop } from '@/lib/mira'

/**
 * 顶栏：标题 + 缩放滑杆（160~720 步进 40，对应瀑布流列宽）+ 置顶 + 关闭。
 * Shift+T 切换置顶（App.vue 快捷键转发 mps-v2:toggle-pin 事件）；
 * Ctrl/Alt/⌘+滚轮 在 App.vue 全局调缩放。
 */
const props = defineProps<{ scale: number }>()
const emit = defineEmits<{ zoom: [direction: 1 | -1]; scale: [value: number]; close: [] }>()

const pinned = ref(false)

async function togglePin() {
  pinned.value = !pinned.value
  await setAlwaysOnTop(pinned.value)
}

onMounted(async () => {
  pinned.value = await isAlwaysOnTop()
  window.addEventListener('mps-v2:toggle-pin', togglePin)
})

onBeforeUnmount(() => {
  window.removeEventListener('mps-v2:toggle-pin', togglePin)
})
</script>

<template>
  <header class="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
    <div class="flex min-w-0 items-center gap-2">
      <ScanSearch class="size-5 shrink-0 text-primary" />
      <span class="truncate text-sm font-medium">{{ t('app.title') }}</span>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <div class="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" class="size-7" :title="t('header.zoomOut')" @click="emit('zoom', -1)">
          <Minus class="size-4" />
        </Button>
        <input
          type="range"
          min="160"
          max="720"
          step="40"
          :value="props.scale"
          class="h-1.5 w-32 cursor-pointer accent-primary"
          :title="`${props.scale}px`"
          @input="emit('scale', ($event.target as HTMLInputElement).valueAsNumber)"
        >
        <Button variant="ghost" size="icon" class="size-7" :title="t('header.zoomIn')" @click="emit('zoom', 1)">
          <Plus class="size-4" />
        </Button>
        <span class="w-10 text-right text-xs tabular-nums text-muted-foreground">{{ props.scale }}px</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        :class="pinned ? 'text-primary' : 'text-muted-foreground'"
        :title="pinned ? t('header.pin.on') : t('header.pin.off')"
        @click="togglePin"
      >
        <PinOff v-if="pinned" class="size-4" />
        <Pin v-else class="size-4" />
      </Button>

      <Button variant="ghost" size="icon" class="size-7" :title="t('header.close')" @click="emit('close')">
        <X class="size-4" />
      </Button>
    </div>
  </header>
</template>
