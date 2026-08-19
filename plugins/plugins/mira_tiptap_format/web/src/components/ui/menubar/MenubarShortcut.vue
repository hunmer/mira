<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <span class="ml-auto text-xs tracking-widest text-muted-foreground" :class="props.class">
    <slot />
  </span>
</template>
