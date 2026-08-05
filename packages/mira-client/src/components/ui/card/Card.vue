<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn(
        'bg-white/60 dark:bg-muted/60 backdrop-blur-xl text-card-foreground flex flex-col gap-6 rounded-2xl border border-white/60 dark:border-border py-6 shadow-[0_8px_30px_rgba(99,102,241,0.08)]',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>

