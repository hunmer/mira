<script setup lang="ts">
import { MenubarSeparator, type MenubarSeparatorProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<MenubarSeparatorProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _omit, ...rest } = props
  return rest
})
</script>

<template>
  <MenubarSeparator v-bind="delegated" :class="cn('-mx-1 my-1 h-px bg-border', props.class)" />
</template>
