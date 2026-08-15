<script lang="ts">
export type ColorSwatchSize = "xs" | "sm" | "md" | "lg" | "xl"
export type ColorSwatchShape = "circle" | "square"
</script>

<script setup lang="ts">
/**
 * ColorSwatch 色块
 * 移植自 HeroUI v3 packages/react/src/components/color-swatch/color-swatch.tsx
 * 样式对应 packages/styles/components/color-swatch.css：
 * 透明棋盘格底（16px repeating-conic）+ 当前色叠加层 + inset 描边，
 * size（xs/sm/md/lg/xl）× shape（circle/square）变体。
 *
 * 用法：
 *   <ColorSwatch color="#3B82F6" />
 *   <ColorSwatch color="rgba(59,130,246,0.4)" shape="square" size="lg" label="半透明蓝" />
 */
import type { CSSProperties, HTMLAttributes } from "vue"
import { computed } from "vue"
import { cn } from "@/lib/utils"

interface Props {
  /** 颜色值，任意 CSS 颜色字符串（含透明度时透出底部棋盘格） */
  color: string
  /** 尺寸，默认 md（32px） */
  size?: ColorSwatchSize
  /** 形状：circle（大圆角）/ square（小圆角），默认 circle */
  shape?: ColorSwatchShape
  /** 无障碍标签，默认取颜色值 */
  label?: string
  class?: HTMLAttributes["class"]
  style?: CSSProperties
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  shape: "circle",
  label: undefined,
  class: undefined,
  style: undefined,
})

const baseStyle: CSSProperties = {
  background:
    "linear-gradient(var(--color-swatch-current), var(--color-swatch-current)), repeating-conic-gradient(#efefef 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px",
  boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.1)",
}

const sizeClasses: Record<ColorSwatchSize, string> = {
  xs: "size-4",
  sm: "size-6",
  md: "",
  lg: "size-9",
  xl: "size-10",
}

const shapeClasses: Record<ColorSwatchShape, Record<ColorSwatchSize, string>> = {
  circle: {
    xs: "rounded-lg",
    sm: "rounded-xl",
    md: "rounded-2xl",
    lg: "rounded-3xl",
    xl: "rounded-3xl",
  },
  square: {
    xs: "rounded-md",
    sm: "rounded-md",
    md: "rounded-md",
    lg: "rounded-md",
    xl: "rounded-md",
  },
}

const mergedStyle = computed(() => ({
  "--color-swatch-current": props.color,
  ...baseStyle,
  ...props.style,
}))
</script>

<template>
  <div
    role="img"
    :aria-label="props.label ?? props.color"
    data-slot="color-swatch"
    :data-size="props.size"
    :data-shape="props.shape"
    :class="
      cn(
        'relative box-border size-8 shrink-0',
        sizeClasses[props.size],
        shapeClasses[props.shape][props.size],
        props.class,
      )
    "
    :style="mergedStyle"
  />
</template>
