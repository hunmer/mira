<script setup lang="ts">
import { MenubarItem, type MenubarItemEmits, type MenubarItemProps, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<MenubarItemProps & { class?: HTMLAttributes['class']; inset?: boolean }>()
const emits = defineEmits<MenubarItemEmits>()
const delegated = computed(() => {
  const { class: _omit, inset: _i, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)

// class 字符串放在 script 中，避免模板属性内出现双引号嵌套（含 [class*="size-"]）
const itemClass = computed(() =>
  cn(
    'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
    'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    '[&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 [&_svg]:shrink-0',
    props.inset && 'pl-8',
    props.class,
  ),
)
</script>

<template>
  <MenubarItem v-bind="forwarded" :class="itemClass">
    <slot />
  </MenubarItem>
</template>
