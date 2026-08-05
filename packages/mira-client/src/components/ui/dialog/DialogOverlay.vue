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
      :transition="{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }"
      :class="cn('data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/40 backdrop-blur-sm', props.class)"
    >
      <slot />
    </Motion>
  </DialogOverlay>
</template>
