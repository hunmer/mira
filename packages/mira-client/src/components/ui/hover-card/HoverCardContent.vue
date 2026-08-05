<script setup lang="ts">
import type { HoverCardContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  HoverCardContent,
  HoverCardPortal,
  useForwardProps,
} from "reka-ui"
import { computed } from "vue"
import { Motion } from "motion-v"
import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<HoverCardContentProps & { class?: HTMLAttributes["class"] }>(),
  {
    sideOffset: 4,
  },
)

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)

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
  <HoverCardPortal>
    <HoverCardContent
      v-bind="{ ...$attrs, ...forwardedProps }"
      as-child
    >
      <Motion
        as="div"
        data-slot="hover-card-content"
        :initial="{ opacity: 0, transform: initialTransform }"
        :animate="{ opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }"
        :transition="{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }"
        :class="
          cn(
            'bg-popover text-popover-foreground data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-64 rounded-md border p-4 shadow-md outline-hidden',
            props.class,
          )
        "
      >
        <slot />
      </Motion>
    </HoverCardContent>
  </HoverCardPortal>
</template>
