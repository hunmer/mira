<script setup lang="ts">
import { MenubarTrigger, type MenubarTriggerProps } from 'reka-ui'

const props = defineProps<MenubarTriggerProps>()
</script>

<template>
  <MenubarTrigger
    v-bind="props"
    class="flex cursor-default select-none items-center rounded-md px-2 py-1 text-sm font-medium outline-none transition-colors focus:bg-accent focus:text-accent-foreground hover:bg-accent/60 hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
  >
    <slot />
  </MenubarTrigger>
</template>
