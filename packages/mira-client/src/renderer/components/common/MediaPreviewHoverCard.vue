<template>
  <HoverCard :open-delay="200" :close-delay="150">
    <HoverCardTrigger as-child>
      <button
        data-media-preview-hovercard-trigger
        :class="[
          'z-10 rounded-bl-full bg-black/55 text-white flex items-end justify-start p-0.5',
          'hover:bg-black/75 transition-opacity opacity-0 group-hover:opacity-100',
          buttonClass
        ]"
        :title="$t('commonUi.mediaPreviewHoverCard.preview')"
        @pointerenter="emit('preview-enter')"
        @click.stop
        @pointerdown.stop
      >
        <span class="material-icons inline-block translate-x-[3px] -translate-y-[3px]" :class="iconClass">search</span>
      </button>
    </HoverCardTrigger>
    <HoverCardContent
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      class="w-auto border-0 bg-transparent p-0 shadow-none"
    >
      <MediaPreviewContent :item="item" />
    </HoverCardContent>
  </HoverCard>
</template>

<script setup lang="ts">
import type { FileInfo } from '../../../shared/types'
import MediaPreviewContent from '@renderer/components/common/MediaPreviewContent.vue'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'

const emit = defineEmits<{
  (e: 'preview-enter'): void
}>()

interface Props {
  /** 预览目标 */
  item: FileInfo
  /** 触发按钮的定位/尺寸 class（需父级含 `group` 才会随 hover 显示） */
  buttonClass?: string
  /** 触发按钮内图标尺寸 class */
  iconClass?: string
  /** 弹出方向 */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end'
  /** 弹层与触发元素的间距 */
  sideOffset?: number
}

withDefaults(defineProps<Props>(), {
  buttonClass: 'absolute bottom-12 right-2 w-7 h-7',
  iconClass: 'text-base',
  side: 'top',
  align: 'end',
  sideOffset: 8
})
</script>
