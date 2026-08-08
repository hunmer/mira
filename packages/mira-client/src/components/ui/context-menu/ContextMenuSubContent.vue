<script setup lang="ts">
import type { DropdownMenuSubContentEmits, DropdownMenuSubContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  ContextMenuSubContent,
  useForwardPropsEmits,
} from "reka-ui"
import { Motion } from "motion-v"
import { cn } from "@/lib/utils"

const props = defineProps<DropdownMenuSubContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<DropdownMenuSubContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ContextMenuSubContent
    v-bind="forwarded"
    as-child
  >
    <Motion
      as="div"
      data-slot="context-menu-sub-content"
      :initial="{ opacity: 0, transform: 'translate3d(-8px, 0, 0) scale(0.95)' }"
      :animate="{ opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }"
      :transition="{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }"
      :class="
        cn(
          'bg-popover text-popover-foreground data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 min-w-[8rem] origin-(--reka-context-menu-content-transform-origin) overflow-visible rounded-md border p-1',
          props.class,
        )
      "
    >
      <slot />
    </Motion>
  </ContextMenuSubContent>
</template>
