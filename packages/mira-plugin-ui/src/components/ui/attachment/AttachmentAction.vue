<script setup lang="ts">
import type { ButtonVariants } from "../button"
import { Button } from "../button"

withDefaults(defineProps<{
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
}>(), {
  variant: "ghost",
  size: "icon-xs",
})
</script>

<template>
  <Button
    data-slot="attachment-action"
    :variant="variant"
    :size="size"
  >
    <slot />
  </Button>
</template>
