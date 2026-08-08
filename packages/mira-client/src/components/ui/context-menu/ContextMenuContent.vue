<script setup lang="ts">
import type { ContextMenuContentEmits, ContextMenuContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  ContextMenuContent,
  ContextMenuPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { Motion } from "motion-v"
import { cn } from "@/lib/utils"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<ContextMenuContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<ContextMenuContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ContextMenuPortal>
    <ContextMenuContent
      v-bind="{ ...$attrs, ...forwarded }"
      as-child
    >
      <Motion
        as="div"
        data-slot="context-menu-content"
        :initial="{ opacity: 0, transform: 'translate3d(0, -8px, 0) scale(0.95)' }"
        :animate="{ opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }"
        :transition="{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }"
        :class="cn(
          'bg-white/65 dark:bg-muted/70 backdrop-blur-xl text-popover-foreground data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 max-h-(--reka-context-menu-content-available-height) min-w-[8rem] overflow-visible rounded-xl border border-white/60 dark:border-border p-1',
          props.class,
        )"
      >
        <slot />
      </Motion>
    </ContextMenuContent>
  </ContextMenuPortal>
</template>
