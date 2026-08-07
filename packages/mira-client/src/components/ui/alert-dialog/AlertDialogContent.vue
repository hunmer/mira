<script setup lang="ts">
import type { AlertDialogContentEmits, AlertDialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  AlertDialogContent,
  AlertDialogPortal,
  injectDialogRootContext,
  useForwardPropsEmits,
} from "reka-ui"
import { AnimatePresence, Motion } from "motion-v"
import { cn } from "@/lib/utils"
import AlertDialogOverlayVue from "./AlertDialogOverlay.vue"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<AlertDialogContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<AlertDialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
const rootContext = injectDialogRootContext()

function handleExitComplete() {
  console.debug("[AlertDialogMotion] content exit complete")
}
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlayVue />
    <AnimatePresence :on-exit-complete="handleExitComplete">
      <AlertDialogContent
        v-if="rootContext.open.value"
        key="alert-dialog-content"
        v-bind="{ ...$attrs, ...forwarded }"
        force-mount
        as-child
      >
        <Motion
          as="div"
          data-slot="alert-dialog-content"
          :initial="{ opacity: 0, transform: 'translate3d(-50%, -50%, 0) scale(0.88)' }"
          :animate="{ opacity: 1, transform: 'translate3d(-50%, -50%, 0) scale(1)' }"
          :exit="{ opacity: 0, transform: 'translate3d(-50%, -50%, 0) scale(0.88)', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }"
          :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }"
          :class="
            cn(
              'bg-white/70 dark:bg-muted/80 backdrop-blur-xl fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-2xl border border-white/60 dark:border-border p-6 shadow-[0_24px_60px_rgba(99,102,241,0.15)] sm:max-w-lg',
              props.class,
            )
          "
        >
          <slot />
        </Motion>
      </AlertDialogContent>
    </AnimatePresence>
  </AlertDialogPortal>
</template>
