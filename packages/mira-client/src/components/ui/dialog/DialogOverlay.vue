<script setup lang="ts">
import type { DialogOverlayProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { DialogOverlay } from "reka-ui"
import { Motion } from "motion-v"
import { cn } from "@/lib/utils"

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <DialogOverlay
    v-bind="delegatedProps"
    as-child
  >
    <Motion
      as="div"
      data-slot="dialog-overlay"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }"
      :class="cn('dialog-overlay-motion fixed inset-0 z-50 bg-black/40 backdrop-blur-sm', props.class)"
    >
      <slot />
    </Motion>
  </DialogOverlay>
</template>

<style scoped>
.dialog-overlay-motion[data-state="closed"] {
  animation: dialog-overlay-exit 200ms ease-in forwards;
}

@keyframes dialog-overlay-exit {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}
</style>
