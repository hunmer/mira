<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { ChevronRight } from "@lucide/vue"
import { PaginationNext } from "reka-ui"
import { cn } from "../../../lib/utils"

const props = defineProps<{ class?: HTMLAttributes["class"] }>()
</script>

<template>
  <PaginationNext
    data-slot="pagination-next"
    as-child
    :class="cn('', props.class)"
  >
    <button
      type="button"
      class="text-muted-foreground inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border-none bg-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-100 outline-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
      aria-label="Go to next page"
    >
      <slot />
      <ChevronRight class="size-4" />
    </button>
  </PaginationNext>
</template>
