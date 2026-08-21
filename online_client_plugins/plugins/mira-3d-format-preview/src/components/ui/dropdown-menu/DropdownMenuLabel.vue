<script setup lang="ts">
import { DropdownMenuLabel, type DropdownMenuLabelProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<DropdownMenuLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }>()
const delegated = computed(() => {
  const { class: _omit, inset: _i, ...rest } = props
  return rest
})
const insetClass = computed(() => (props.inset ? 'pl-8' : ''))
</script>

<template>
  <DropdownMenuLabel
    v-bind="delegated"
    :class="cn('px-2 py-1.5 text-sm font-medium', insetClass, props.class)"
  >
    <slot />
  </DropdownMenuLabel>
</template>
