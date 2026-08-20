<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Download, Eye, Search } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { t } from '@/lib/i18n'
import { openPreview, reSearch, saveItem, state } from '@/stores/tasks'
import type { ResultItem } from '@/types'

/**
 * 瀑布流单卡片（高度由 MediaWaterfall/Masonry 布局分配，卡片填满单元格）：
 * 懒加载缩略图 + 悬停操作（预览 Space / 保存 S / 反向搜索 F）。
 * 结果区已开启 SelectionBox 多选：点击卡片上抛 cardClick 由父级走选择逻辑
 * （data-selectable-id 供框选/连选定位），右键 = 保存，中键 = 反向搜索（与原版一致）。
 */
const props = defineProps<{ item: ResultItem; big: boolean; selected?: boolean }>()
const emit = defineEmits<{ (e: 'cardClick', event: MouseEvent): void }>()

const failed = ref(false)
const src = computed(() => {
  if (failed.value) return props.item.squareUrl
  return props.big ? (props.item.largeUrl || props.item.url) : props.item.url
})

function onMouseEnter() {
  state.hoveredKey = props.item.key
}
function onMouseLeave() {
  if (state.hoveredKey === props.item.key) state.hoveredKey = null
}
</script>

<template>
  <div
    :data-selectable-id="item.key"
    class="group relative h-full w-full cursor-pointer overflow-hidden rounded-lg bg-muted ring-offset-2 ring-offset-background transition-shadow"
    :class="selected && 'ring-2 ring-primary'"
    :title="item.title"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @click="emit('cardClick', $event)"
    @contextmenu.prevent="saveItem(item)"
    @auxclick.middle.prevent="reSearch(item)"
  >
    <img
      :src="src"
      :alt="item.title"
      loading="lazy"
      class="size-full object-cover transition-opacity"
      :class="failed ? 'opacity-40' : 'opacity-100'"
      @error="failed = true"
    >

    <!-- 多选角标 -->
    <span
      class="absolute top-1.5 left-1.5 z-10 flex size-5 items-center justify-center rounded-full shadow"
      :class="selected ? 'bg-primary text-primary-foreground' : 'bg-background/70 text-transparent'"
    >
      <Check class="size-3.5" />
    </span>

    <div class="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <Button
        variant="secondary"
        size="icon"
        class="size-7 rounded-md"
        :title="`${t('main.image.preview')} (Space)`"
        @click.stop="openPreview(item)"
      >
        <Eye class="size-3.5" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        class="size-7 rounded-md"
        :title="`${item.saved ? t('main.image.saved') : t('main.image.save')} (S)`"
        @click.stop="saveItem(item)"
      >
        <Check v-if="item.saved" class="size-3.5 text-primary" />
        <Download v-else class="size-3.5" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        class="size-7 rounded-md"
        :title="t('main.image.research')"
        @click.stop="reSearch(item)"
      >
        <Search class="size-3.5" />
      </Button>
    </div>

    <span
      v-if="item.saved"
      class="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground"
    >
      <Check class="size-3" />
      {{ t('main.image.saved') }}
    </span>
  </div>
</template>
