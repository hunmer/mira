<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ExternalLink, Minus, Pin, PinOff, Plus, RotateCw, ScanSearch, X } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { t } from '@/lib/i18n'
import { isAlwaysOnTop, openExternal, setAlwaysOnTop } from '@/lib/mira'
import { currentPageUrl, isWebMode } from '@/stores/engine'

/**
 * 顶栏：标题 + 搜索模式相关控件 + 置顶 + 关闭。
 *   - Pinterest 接口模式：缩放滑杆（160~720 步进 40，对应瀑布流列宽）
 *   - 网页搜图模式：当前页面地址（只读）+ 刷新 + 用浏览器打开
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

/** 刷新当前站点 webview（WebPanel 监听执行） */
function refreshPage() {
  window.dispatchEvent(new CustomEvent('image-search:web-refresh'))
}
</script>

<template>
  <header class="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
    <div class="flex min-w-0 items-center gap-2">
      <ScanSearch class="size-5 shrink-0 text-primary" />
      <span class="truncate text-sm font-medium">{{ t('app.title') }}</span>
    </div>

    <!-- 网页搜图模式：当前页面地址 + 刷新 + 外链 -->
    <div v-if="isWebMode" class="flex min-w-0 flex-1 items-center justify-center gap-1.5">
      <div
        class="min-w-0 max-w-2xl flex-1 truncate rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
        :title="currentPageUrl()"
      >
        {{ currentPageUrl() || t('web.noTask') }}
      </div>
      <Button variant="ghost" size="icon" class="size-7" :title="t('web.refresh')" @click="refreshPage">
        <RotateCw class="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        :title="t('web.openExternal')"
        :disabled="!currentPageUrl()"
        @click="currentPageUrl() && openExternal(currentPageUrl())"
      >
        <ExternalLink class="size-4" />
      </Button>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <!-- 缩放控件仅 Pinterest 接口模式显示（网页模式无瀑布流） -->
      <div v-if="!isWebMode" class="flex items-center gap-1.5">
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
