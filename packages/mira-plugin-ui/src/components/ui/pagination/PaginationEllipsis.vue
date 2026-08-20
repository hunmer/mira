<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { MoreHorizontal } from "@lucide/vue"
import { cn } from "../../../lib/utils"

const props = defineProps<{ class?: HTMLAttributes["class"] }>()
</script>

<template>
  <span
    data-slot="pagination-ellipsis"
    aria-hidden="true"
    :class="cn('text-muted-foreground flex size-9 items-center justify-center', props.class)"
  >
    <MoreHorizontal class="size-4" />
    <span class="sr-only">More pages</span>
  </span>
</template>
