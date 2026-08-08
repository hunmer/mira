<script setup lang="ts">
import type { DropdownMenuSubContentEmits, DropdownMenuSubContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  DropdownMenuPortal,
  DropdownMenuSubContent,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<DropdownMenuSubContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<DropdownMenuSubContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <!--
    默认 portal 到 body：reka-ui 的 SubContent 默认内联渲染在父级 DropdownMenuContent 内，
    当父级带 overflow 时（本项目 DropdownMenuContent 有 overflow-x-hidden/overflow-y-auto），
    子菜单向右溢出部分会被裁掉。Portal 后脱离父级 overflow 容器，定位锚点仍由 reka-ui floating 正确计算。
  -->
  <DropdownMenuPortal>
    <DropdownMenuSubContent
      data-slot="dropdown-menu-sub-content"
      v-bind="forwarded"
      :class="cn('bg-white/90 dark:bg-muted/90 backdrop-blur-xl text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] max-w-(--reka-dropdown-menu-content-available-width) origin-(--reka-dropdown-menu-content-transform-origin) overflow-hidden rounded-2xl border border-black/10 dark:border-white/15 p-1', props.class)"
    >
      <slot />
    </DropdownMenuSubContent>
  </DropdownMenuPortal>
</template>

