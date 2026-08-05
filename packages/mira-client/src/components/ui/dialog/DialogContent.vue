<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { X } from "@lucide/vue"
import { reactiveOmit } from "@vueuse/core"
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { Motion } from "motion-v"
import { cn } from "@/lib/utils"
import DialogOverlay from "./DialogOverlay.vue"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DialogContentProps & { class?: HTMLAttributes["class"], showCloseButton?: boolean }>(), {
  showCloseButton: true,
})
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      v-bind="{ ...$attrs, ...forwarded }"
      as-child
    >
      <Motion
        as="div"
        data-slot="dialog-content"
        :initial="{ opacity: 0, transform: 'translate3d(-50%, -50%, 0) scale(0.88)' }"
        :animate="{ opacity: 1, transform: 'translate3d(-50%, -50%, 0) scale(1)' }"
        :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }"
        :class="
          cn(
            'dialog-content-motion bg-white/70 dark:bg-muted/80 backdrop-blur-xl fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-2xl border border-white/60 dark:border-border p-6 shadow-[0_24px_60px_rgba(99,102,241,0.15)] sm:max-w-lg',
            props.class,
          )"
      >
        <slot />

        <DialogClose
          v-if="showCloseButton"
          data-slot="dialog-close"
          class="ring-offset-background focus:ring-ring group absolute top-4 right-4 flex items-center justify-center rounded-lg p-1 text-muted-foreground opacity-70 transition-all hover:bg-destructive/10 hover:text-destructive hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:transition-transform group-hover:[&_svg]:rotate-90"
        >
          <X />
          <span class="sr-only">Close</span>
        </DialogClose>
      </Motion>
    </DialogContent>
  </DialogPortal>
</template>

<style scoped>
.dialog-content-motion[data-state="closed"] {
  animation: dialog-content-exit 180ms cubic-bezier(0.4, 0, 1, 1) forwards;
}

@keyframes dialog-content-exit {
  from {
    opacity: 1;
    transform: translate3d(-50%, -50%, 0) scale(1);
  }

  to {
    opacity: 0;
    transform: translate3d(-50%, -50%, 0) scale(0.88);
  }
}
</style>
