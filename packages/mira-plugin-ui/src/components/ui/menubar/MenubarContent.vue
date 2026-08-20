<script setup lang="ts">
import { MenubarContent, MenubarPortal, type MenubarContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { cn } from '../../../lib/utils'

const props = defineProps<MenubarContentProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <MenubarPortal>
    <MenubarContent
      data-slot="menubar-content"
      v-bind="delegatedProps"
      :class="cn(
        'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-md',
        props.class,
      )"
    >
      <slot />
    </MenubarContent>
  </MenubarPortal>
</template>
