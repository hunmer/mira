<script setup lang="ts">
/**
 * ColorPicker 触发按钮
 * 移植自 HeroUI v3 color-picker（.color-picker__trigger 样式槽）。
 * 默认渲染色块（reka-ui ColorSwatch）+ 颜色值文本，可用 slot 完全自定义；
 * 点击切换弹层开合，继承根组件的 disabled 状态。
 */
import type { PopoverTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { PopoverTrigger } from "reka-ui"
import { computed, inject } from "vue"
import { cn } from "@/lib/utils"
import { ColorSwatch } from "@/components/ui/color-swatch"
import { ColorPickerContextKey } from "./context"

interface Props extends PopoverTriggerProps {
  class?: HTMLAttributes["class"]
  /** 是否禁用触发器（默认继承根组件 disabled） */
  disabled?: boolean
}

const props = defineProps<Props>()

const context = inject(ColorPickerContextKey, null)

const isDisabled = computed(() => props.disabled ?? context?.disabled.value ?? false)
const color = computed(() => context?.color.value ?? "#000000")
</script>

<template>
  <PopoverTrigger
    data-slot="color-picker-trigger"
    :class="
      cn(
        'inline-flex items-center gap-3 rounded-sm text-sm select-none',
        'transition-[background-color,box-shadow,color] duration-150 motion-reduce:transition-none',
        'outline-hidden focus-visible:ring-ring/50 focus-visible:ring-3',
        'disabled:pointer-events-none disabled:opacity-50',
        props.class,
      )
    "
    :disabled="isDisabled"
  >
    <slot>
      <ColorSwatch :color="color" shape="square" size="sm" />
      <span class="font-mono text-muted-foreground">{{ color }}</span>
    </slot>
  </PopoverTrigger>
</template>
