<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  label?: string
  removable?: boolean
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
const emit = defineEmits<{ remove: [] }>()
defineOptions({ inheritAttrs: false })
</script>

<template>
  <span
    v-bind="$attrs"
    :class="cn(
      'inline-flex items-center gap-1 rounded-2xl bg-secondary text-secondary-foreground px-3 py-1 text-sm',
      $props.class
    )"
  >
    <slot>{{ label }}</slot>
    <button v-if="removable" class="ml-1 hover:text-destructive" @click="emit('remove')">
      <slot name="removeicon">
        <span class="material-icons text-sm">cancel</span>
      </slot>
    </button>
  </span>
</template>
