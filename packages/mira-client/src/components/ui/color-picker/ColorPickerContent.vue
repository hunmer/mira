<script setup lang="ts">
/**
 * ColorPicker 弹层内容
 * 移植自 HeroUI v3 color-picker（.color-picker__popover 样式槽）：
 * min-w-62 / px-2 pt-2 pb-3 / flex flex-col gap-3 / 隐藏滚动条 /
 * 缩放淡入（150ms）、按方向滑入 4px，退出 100ms 缩放淡出。
 * 默认 side="bottom" align="start"（对应 HeroUI placement "bottom left"）。
 */
import type { PopoverContentEmits, PopoverContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { PopoverContent, PopoverPortal, useForwardPropsEmits } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { computed } from "vue"
import { Motion } from "motion-v"
import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<PopoverContentProps & { class?: HTMLAttributes["class"] }>(),
  {
    align: "start",
    side: "bottom",
    sideOffset: 4,
  },
)
const emits = defineEmits<PopoverContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)

const initialTransform = computed(() => {
  switch (props.side) {
    case "top":
      return "translate3d(0, 4px, 0) scale(0.95)"
    case "left":
      return "translate3d(4px, 0, 0) scale(0.95)"
    case "right":
      return "translate3d(-4px, 0, 0) scale(0.95)"
    default:
      return "translate3d(0, -4px, 0) scale(0.95)"
  }
})
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      v-bind="{ ...$attrs, ...forwarded }"
      as-child
    >
      <Motion
        as="div"
        data-slot="color-picker-content"
        :initial="{ opacity: 0, transform: initialTransform }"
        :animate="{ opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }"
        :transition="{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }"
        :class="
          cn(
            'z-50 flex min-w-62 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain',
            'bg-white/65 dark:bg-muted/70 backdrop-blur-xl text-popover-foreground',
            'rounded-2xl border border-white/60 dark:border-border shadow-lg',
            'px-2 pt-2 pb-3 outline-hidden',
            'max-w-(--reka-popover-content-available-width) max-h-(--reka-popover-content-available-height)',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            'origin-(--reka-popover-content-transform-origin)',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            props.class,
          )
        "
      >
        <slot />
      </Motion>
    </PopoverContent>
  </PopoverPortal>
</template>
