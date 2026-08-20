<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../../lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <h2 data-slot="empty-title" :class="cn('text-foreground text-lg leading-none font-medium', props.class)">
    <slot />
  </h2>
</template>
