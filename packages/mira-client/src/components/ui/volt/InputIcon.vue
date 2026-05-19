<template>
  <span 
    class="absolute top-1/2 -mt-2 text-surface-400 leading-none z-1"
    :class="[
      position === 'left' ? 'start-3' : 'end-3',
      sizeClass
    ]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  position?: 'left' | 'right'
  size?: 'small' | 'normal' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  position: 'left',
  size: 'normal'
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'small':
      return 'text-xs'
    case 'large':
      return 'text-lg'
    default:
      return 'text-sm'
  }
})
</script>

<style scoped>
/* No additional styles needed - using Tailwind CSS classes */
</style>
