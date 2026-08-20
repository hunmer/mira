<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted } from "vue"
import type { AlertDialogContentEmits, AlertDialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  AlertDialogContent,
  AlertDialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "../../../lib/utils"
import AlertDialogOverlay from "./AlertDialogOverlay.vue"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<AlertDialogContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<AlertDialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)

function centerCepAlertDialogs() {
  const cepWindow = window as typeof window & { cep?: unknown; CSInterface?: unknown }
  if (!cepWindow.cep && !cepWindow.CSInterface) return
  let matched = 0
  document.querySelectorAll<HTMLElement>('[data-slot="alert-dialog-content"]').forEach(el => {
    const className = typeof el.className === 'string' ? el.className : ''
    if (className.indexOf('left-0') >= 0 || className.indexOf('right-0') >= 0) return
    el.style.setProperty('transform', 'translate(-50%, -50%)', 'important')
    matched += 1
  })
  if (matched) console.log('[mira-cep-dialog] alert-centered', matched)
}

onMounted(() => {
  void nextTick(centerCepAlertDialogs)
  const observer = new MutationObserver(centerCepAlertDialogs)
  observer.observe(document.body, { childList: true, subtree: true })
  onBeforeUnmount(() => observer.disconnect())
})
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogContent
      data-slot="alert-dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-background text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          props.class,
        )
      "
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
