<script setup lang="ts">
import { MenubarRoot, type MenubarRootEmits, type MenubarRootProps, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<MenubarRootProps>()
const emits = defineEmits<MenubarRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <MenubarRoot v-bind="forwarded" class="flex h-8 items-center gap-0.5 rounded-lg p-0.5 text-muted-foreground">
    <slot />
  </MenubarRoot>
</template>
