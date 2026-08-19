<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { SelectValue } from 'reka-ui'

const props = defineProps<{
  placeholder?: string
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <SelectValue data-slot="select-value" :placeholder="placeholder" :class="props.class">
    <slot />
  </SelectValue>
</template>
