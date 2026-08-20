<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../../lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="empty-header" :class="cn('flex flex-col items-center gap-2', props.class)">
    <slot />
  </div>
</template>
