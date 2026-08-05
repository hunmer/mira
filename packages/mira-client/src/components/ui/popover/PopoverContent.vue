<script setup lang="ts">
import type { PopoverContentEmits, PopoverContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  PopoverContent,
  PopoverPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { computed } from "vue"
import { Motion } from "motion-v"
import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<PopoverContentProps & { class?: HTMLAttributes["class"] }>(),
  {
    align: "center",
    sideOffset: 4,
  },
)
const emits = defineEmits<PopoverContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)

const initialTransform = computed(() => {
  switch (props.side) {
    case "top":
      return "translate3d(0, 8px, 0) scale(0.95)"
    case "left":
      return "translate3d(8px, 0, 0) scale(0.95)"
    case "right":
      return "translate3d(-8px, 0, 0) scale(0.95)"
    default:
      return "translate3d(0, -8px, 0) scale(0.95)"
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
        data-slot="popover-content"
        :initial="{ opacity: 0, transform: initialTransform }"
        :animate="{ opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }"
        :transition="{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }"
        :class="
          cn(
            'bg-white/65 dark:bg-muted/70 backdrop-blur-xl text-popover-foreground data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-72 max-w-(--reka-popover-content-available-width) rounded-2xl border border-white/60 dark:border-border p-4 shadow-[0_12px_40px_rgba(99,102,241,0.12)] origin-(--reka-popover-content-transform-origin) outline-hidden',
            props.class,
          )
        "
      >
        <slot />
      </Motion>
    </PopoverContent>
  </PopoverPortal>
</template>
