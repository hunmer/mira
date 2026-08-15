<script setup lang="ts">
/**
 * ColorSlider 颜色通道滑条（根组件）
 * 移植自 HeroUI v3 packages/react/src/components/color-slider/color-slider.tsx
 * （react-aria-components ColorSlider）→ reka-ui ColorSliderRoot 实现，
 * 样式对应 packages/styles/components/color-slider.css（.color-slider）。
 *
 * 布局：label（命名插槽，左上）+ output（命名插槽，右上）+ default 插槽（Track/Thumb），
 * 依 HeroUI 的 grid-template-areas 语义按插槽存在情况自动降级（.color-slider 的 :has 条件）。
 *
 * 用法：
 *   <ColorSlider v-model="color" channel="hue">
 *     <template #label>色相</template>
 *     <template #output><ColorSliderOutput /></template>
 *     <ColorSliderTrack><ColorSliderThumb /></ColorSliderTrack>
 *   </ColorSlider>
 */
import type { ColorSliderRootEmits, ColorSliderRootProps, ColorSpace } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { ColorSliderRoot as ColorSliderPrimitiveRoot, useForwardPropsEmits } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { computed, useSlots } from "vue"
import { cn } from "@/lib/utils"

interface Props extends ColorSliderRootProps {
  class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), {
  class: undefined,
})

const emits = defineEmits<ColorSliderRootEmits>()

// channel 与 colorSpace 的合法组合校验（移植 HeroUI getValidColorSpace，自动纠正并告警）
const CHANNEL_TO_REQUIRED_COLORSPACE: Partial<Record<string, ColorSpace>> = {
  red: "rgb",
  green: "rgb",
  blue: "rgb",
  lightness: "hsl",
  brightness: "hsb",
}

const validColorSpace = computed(() => {
  const { channel, colorSpace } = props
  const required = CHANNEL_TO_REQUIRED_COLORSPACE[channel as string]
  if (required && colorSpace && colorSpace !== required) {
    console.warn(
      `[ColorSlider] Invalid combination: channel="${channel}" requires colorSpace="${required}", but received "${colorSpace}". Auto-correcting.`,
    )
    return required
  }
  if ((channel === "hue" || channel === "saturation") && colorSpace === "rgb") {
    console.warn("[ColorSlider] hue/saturation are not available in rgb color space. Auto-correcting to hsl.")
    return "hsl"
  }
  return colorSpace
})

const delegatedProps = reactiveOmit(props, "class", "channel", "colorSpace", "orientation")
const forwarded = useForwardPropsEmits(delegatedProps, emits)

const slots = useSlots()
const hasLabel = computed(() => !!slots.label?.())
const hasOutput = computed(() => !!slots.output?.())
const isVertical = computed(() => props.orientation === "vertical")

// 对应 HeroUI .color-slider 的 grid-template-areas 四态 × 横竖两向
const layoutClass = computed(() => {
  if (isVertical.value) {
    if (hasLabel.value && hasOutput.value)
      return "h-full grid-cols-1 grid-rows-[auto_1fr_auto] gap-2 justify-items-center [grid-template-areas:'output'_'track'_'label']"
    if (hasLabel.value)
      return "h-full grid-cols-1 grid-rows-[1fr_auto] gap-2 justify-items-center [grid-template-areas:'track'_'label']"
    if (hasOutput.value)
      return "h-full grid-cols-1 grid-rows-[auto_1fr] gap-2 justify-items-center [grid-template-areas:'output'_'track']"
    return "h-full grid-cols-1 grid-rows-[1fr] [grid-template-areas:'track']"
  }
  if (hasLabel.value && hasOutput.value)
    return "grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-1 [grid-template-areas:'label_output'_'track_track']"
  if (hasLabel.value)
    return "grid-cols-1 grid-rows-[auto_auto] gap-1 [grid-template-areas:'label'_'track']"
  if (hasOutput.value)
    return "grid-cols-1 grid-rows-[auto_auto] gap-1 [grid-template-areas:'output'_'track']"
  return "grid-cols-1 grid-rows-[auto] [grid-template-areas:'track']"
})
</script>

<template>
  <ColorSliderPrimitiveRoot
    data-slot="color-slider"
    :class="cn('grid w-full', layoutClass, props.class)"
    v-bind="forwarded"
    :channel="props.channel"
    :color-space="validColorSpace"
    :orientation="props.orientation"
  >
    <div
      v-if="hasLabel"
      data-slot="color-slider-label"
      class="w-fit text-sm font-medium [grid-area:label]"
    >
      <slot name="label" />
    </div>
    <div
      v-if="hasOutput"
      data-slot="color-slider-output"
      class="text-sm font-medium tabular-nums [grid-area:output]"
      :class="!hasLabel && 'justify-self-end'"
    >
      <slot name="output" />
    </div>
    <div class="min-w-0 [grid-area:track]">
      <slot />
    </div>
  </ColorSliderPrimitiveRoot>
</template>
