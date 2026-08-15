<script setup lang="ts">
/**
 * ColorSlider 滑块手柄
 * 移植自 HeroUI v3 color-slider（.color-slider__thumb 样式槽）：
 * size-4 白环圆点（border-3 border-white）+ 阴影，背景色 = 当前颜色
 * （disabled 时去除背景色，对应 HeroUI 的 default 底色行为）。
 */
import type { ColorSliderThumbProps } from "reka-ui"
import type { CSSProperties, HTMLAttributes } from "vue"
import { ColorSliderThumb as ColorSliderPrimitiveThumb, colorToString, injectColorSliderRootContext } from "reka-ui"
import { computed } from "vue"
import { cn } from "@/lib/utils"

interface Props extends ColorSliderThumbProps {
  class?: HTMLAttributes["class"]
}

const props = defineProps<Props>()

const context = injectColorSliderRootContext()

const thumbStyle = computed<CSSProperties | undefined>(() => {
  if (context.disabled.value)
    return undefined
  return { backgroundColor: colorToString(context.color.value, "hex") }
})
</script>

<template>
  <ColorSliderPrimitiveThumb
    data-slot="color-slider-thumb"
    :class="
      cn(
        'z-[1] flex size-4 cursor-grab items-center justify-center rounded-2xl select-none',
        'border-3 border-white shadow-md',
        'transition-[transform,box-shadow] duration-200 ease-out motion-reduce:transition-none',
        'active:cursor-grabbing',
        'outline-hidden focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50',
        'data-[disabled]:cursor-default data-[disabled]:bg-muted',
        props.class,
      )
    "
    :style="thumbStyle"
  >
    <slot />
  </ColorSliderPrimitiveThumb>
</template>
