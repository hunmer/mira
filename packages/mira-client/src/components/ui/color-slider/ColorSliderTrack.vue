<script setup lang="ts">
/**
 * ColorSlider 滑轨
 * 移植自 HeroUI v3 color-slider（.color-slider__track 样式槽）。
 * 轨道渐变由 reka-ui ColorSliderTrack 自动生成（alpha 通道自带棋盘格）；
 * 两端圆头端帽按 HeroUI 的 ::before/::after 实现，端点色与渐变公式保持一致，
 * 以 CSS 变量（--track-*-cap 完整 background 片段）提供给伪元素。
 */
import type { Color, ColorSliderTrackProps } from "reka-ui"
import type { CSSProperties, HTMLAttributes } from "vue"
import {
  ColorSliderTrack as ColorSliderPrimitiveTrack,
  colorToHsb,
  colorToHsl,
  colorToString,
  injectColorSliderRootContext,
  parseColor,
} from "reka-ui"
import { computed } from "vue"
import { cn } from "@/lib/utils"

interface HslLike { h: number, s: number, l: number, alpha: number }
interface HsbLike { h: number, s: number, b: number, alpha: number }

/** 提取颜色的 HSL 分量（reka-ui 未导出 convertToHsl，用 parseColor 往返解析） */
function hslOf(color: Color): HslLike {
  if (color.space === "hsl")
    return color
  return parseColor(colorToHsl(color)) as unknown as HslLike
}

/** 提取颜色的 HSB 分量 */
function hsbOf(color: Color): HsbLike {
  if (color.space === "hsb")
    return color
  return parseColor(colorToHsb(color)) as unknown as HsbLike
}

interface Props extends ColorSliderTrackProps {
  class?: HTMLAttributes["class"]
}

const props = defineProps<Props>()

const context = injectColorSliderRootContext()

/** 各通道取值范围（hue 0-360 / 百分通道 0-100 / rgb 0-255 / alpha 0-1） */
const CHANNEL_RANGES: Record<string, [number, number]> = {
  hue: [0, 360],
  saturation: [0, 100],
  lightness: [0, 100],
  brightness: [0, 100],
  red: [0, 255],
  green: [0, 255],
  blue: [0, 255],
  alpha: [0, 1],
}

/** 计算通道某一端的颜色 css 字符串（端点公式与 reka-ui getSliderGradient 一致） */
function channelEndCss(end: "min" | "max"): string {
  const color = context.color.value
  const channel = context.channel.value
  const [min, max] = CHANNEL_RANGES[channel] ?? [0, 0]
  const value = end === "min" ? min : max

  switch (channel) {
    case "hue":
      // 色相渐变端点为固定纯红
      return "#ff0000"
    case "saturation": {
      const hsl = hslOf(color)
      const lightness = context.colorSpace.value === "hsb" ? 50 : hsl.l
      return colorToString({ space: "hsl", h: hsl.h, s: value, l: lightness, alpha: 1 } as Color, "hex")
    }
    case "lightness": {
      const hsl = hslOf(color)
      return colorToString({ space: "hsl", h: hsl.h, s: hsl.s, l: value, alpha: 1 } as Color, "hex")
    }
    case "brightness": {
      const hsb = hsbOf(color)
      return colorToString({ space: "hsb", h: hsb.h, s: hsb.s, b: value, alpha: 1 } as Color, "hex")
    }
    case "red":
    case "green":
    case "blue": {
      const base = color.space === "rgb"
        ? { r: color.r, g: color.g, b: color.b }
        : { r: 128, g: 128, b: 128 }
      return colorToString({ space: "rgb", ...base, [channel]: value, alpha: 1 } as Color, "hex")
    }
    case "alpha":
      return colorToString({ ...color, alpha: value } as Color, "hex")
    default:
      return "transparent"
  }
}

const capStyle = computed<CSSProperties>(() => ({
  "--track-start-cap": `linear-gradient(${channelEndCss("min")}), repeating-conic-gradient(#efefef 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px`,
  "--track-end-cap": `linear-gradient(${channelEndCss("max")})`,
}))

const isVertical = computed(() => context.orientation.value === "vertical")

// 端帽公共类（双引号串以便使用 content-['']，模板内单引号无法嵌套）
const CAP_BASE = [
  "before:pointer-events-none before:absolute before:z-0 before:bg-[image:var(--track-start-cap)] before:content-['']",
  "after:pointer-events-none after:absolute after:z-0 after:bg-[image:var(--track-end-cap)] after:content-['']",
]
</script>

<template>
  <ColorSliderPrimitiveTrack
    data-slot="color-slider-track"
    :class="
      cn(
        isVertical
          ? cn(
              'relative my-auto block w-5',
              'h-[calc(100%-1.25rem)]',
              'shadow-[inset_1px_0_0_0_rgba(0,0,0,0.1),inset_-1px_0_0_0_rgba(0,0,0,0.1)]',
              'before:start-0 before:-bottom-2.5 before:h-2.5 before:w-full',
              'before:rounded-ss-none before:rounded-se-none before:rounded-ee-full before:rounded-es-full before:shadow-[inset_1px_0_0_0_rgba(0,0,0,0.1),inset_-1px_0_0_0_rgba(0,0,0,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.1)]',
              'after:start-0 after:-top-2.5 after:h-2.5 after:w-full',
              'after:rounded-ss-full after:rounded-se-full after:rounded-ee-none after:rounded-es-none after:shadow-[inset_1px_0_0_0_rgba(0,0,0,0.1),inset_-1px_0_0_0_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(0,0,0,0.1)]',
            )
          : cn(
              'relative mx-auto block h-5',
              'w-[calc(100%-1.25rem)]',
              'shadow-[inset_0_1px_0_0_rgba(0,0,0,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.1)]',
              'before:top-0 before:-start-2.5 before:h-full before:w-2.5',
              'before:rounded-ss-2xl before:rounded-es-2xl before:shadow-[inset_1px_0_0_0_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(0,0,0,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.1)]',
              'after:top-0 after:-end-2.5 after:h-full after:w-2.5',
              'after:rounded-se-2xl after:rounded-ee-2xl after:shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(0,0,0,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.1)]',
            ),
        ...CAP_BASE,
        props.class,
      )
    "
    :style="capStyle"
  >
    <slot />
  </ColorSliderPrimitiveTrack>
</template>
