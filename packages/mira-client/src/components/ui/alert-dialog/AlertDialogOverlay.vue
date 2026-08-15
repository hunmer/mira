<script setup lang="ts">
import type { AlertDialogOverlayProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AlertDialogOverlay, injectDialogRootContext } from "reka-ui"
import { AnimatePresence, Motion } from "motion-v"
import { cn } from "@/lib/utils"

const props = defineProps<AlertDialogOverlayProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
const rootContext = injectDialogRootContext()

function handleExitComplete() {
}
</script>

<template>
  <AnimatePresence :on-exit-complete="handleExitComplete">
    <AlertDialogOverlay
      v-if="rootContext.open.value"
      key="alert-dialog-overlay"
      v-bind="delegatedProps"
      force-mount
      as-child
    >
      <Motion
        as="div"
        data-slot="alert-dialog-overlay"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }"
        :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }"
        :class="cn('fixed inset-0 z-50 bg-black/40 backdrop-blur-sm', props.class)"
      >
        <slot />
      </Motion>
    </AlertDialogOverlay>
  </AnimatePresence>
</template>
