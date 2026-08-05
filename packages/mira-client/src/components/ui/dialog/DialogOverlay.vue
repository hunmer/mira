<script setup lang="ts">
import type { DialogOverlayProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { DialogOverlay, injectDialogRootContext } from "reka-ui"
import { AnimatePresence, Motion } from "motion-v"
import { cn } from "@/lib/utils"

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
const rootContext = injectDialogRootContext()

function handleExitComplete() {
  console.debug("[DialogMotion] overlay exit complete")
}
</script>

<template>
  <AnimatePresence :on-exit-complete="handleExitComplete">
    <DialogOverlay
      v-if="rootContext.open.value"
      key="dialog-overlay"
      v-bind="delegatedProps"
      force-mount
      as-child
    >
      <Motion
        as="div"
        data-slot="dialog-overlay"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }"
        :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }"
        :class="cn('fixed inset-0 z-50 bg-black/40 backdrop-blur-sm', props.class)"
      >
        <slot />
      </Motion>
    </DialogOverlay>
  </AnimatePresence>
</template>
