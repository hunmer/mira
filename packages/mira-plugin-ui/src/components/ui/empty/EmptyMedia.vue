<script setup lang="ts">
import type { EmptyMediaVariants } from '.'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../../lib/utils'
import { emptyMediaVariants } from '.'

const props = withDefaults(defineProps<{
  variant?: EmptyMediaVariants['variant']
  class?: HTMLAttributes['class']
}>(), {
  variant: 'default',
})
</script>

<template>
  <div data-slot="empty-media" :class="cn(emptyMediaVariants({ variant }), props.class)">
    <slot />
  </div>
</template>
