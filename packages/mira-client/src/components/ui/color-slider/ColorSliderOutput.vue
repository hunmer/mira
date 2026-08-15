<script setup lang="ts">
/**
 * ColorSlider 通道值输出
 * 移植自 HeroUI v3 ColorSliderOutput（react-aria SliderOutput 的
 * state.getThumbValueLabel(0) 默认渲染）→ 从 reka-ui 上下文取通道值自行格式化：
 * hue 加 °、饱和度/亮度/明度/alpha 用百分比、rgb 通道取整数。
 *
 * 用法：
 *   <ColorSlider v-model="color" channel="hue">
 *     <template #output><ColorSliderOutput /></template>
 *     ...
 *   </ColorSlider>
 */
import type { HTMLAttributes } from "vue"
import { injectColorSliderRootContext } from "reka-ui"
import { computed } from "vue"
import { cn } from "@/lib/utils"

interface Props {
  class?: HTMLAttributes["class"]
}

const props = defineProps<Props>()

const context = injectColorSliderRootContext()

const formatted = computed(() => {
  const channel = context.channel.value
  const value = context.channelValue.value
  switch (channel) {
    case "hue":
      return `${Math.round(value)}°`
    case "saturation":
    case "lightness":
    case "brightness":
      return `${Math.round(value)}%`
    case "alpha":
      return `${Math.round(value * 100)}%`
    default:
      return `${Math.round(value)}`
  }
})
</script>

<template>
  <output data-slot="color-slider-output-value" :class="cn(props.class)">
    <slot>{{ formatted }}</slot>
  </output>
</template>
