<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../../lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="empty-content" :class="cn('flex flex-col items-center gap-2.5 md:flex-row', props.class)">
    <slot />
  </div>
</template>
