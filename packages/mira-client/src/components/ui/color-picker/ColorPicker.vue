<script setup lang="ts">
/**
 * ColorPicker 颜色选择器（根组件）
 * 移植自 HeroUI v3 packages/react/src/components/color-picker/color-picker.tsx
 * （react-aria-components ColorPicker + DialogTrigger）→ reka-ui Popover 实现，
 * 样式对应 packages/styles/components/color-picker.css（.color-picker）。
 *
 * 职责：管理颜色状态（v-model）与弹层开合（v-model:open），并向下 provide 上下文；
 * 具体取色 UI 由使用者在 Content 内用 reka-ui 颜色原语（ColorAreaRoot / ColorSliderRoot /
 * ColorFieldRoot / ColorSwatchPickerRoot）组合，均直接绑定同一个 v-model 即可。
 *
 * 用法：
 *   <ColorPicker v-model="color">
 *     <ColorPickerTrigger />
 *     <ColorPickerContent>
 *       <ColorAreaRoot v-model="color" class="h-36 rounded-lg">
 *         <ColorAreaThumb class="size-5 rounded-full border-2 border-white shadow-md" />
 *       </ColorAreaRoot>
 *       <ColorSliderRoot v-model="color" channel="hue" class="h-5 rounded-full">
 *         <ColorSliderTrack class="rounded-full" />
 *         <ColorSliderThumb class="size-5 rounded-full border-2 border-white shadow-md" />
 *       </ColorSliderRoot>
 *     </ColorPickerContent>
 *   </ColorPicker>
 */
import type { HTMLAttributes } from "vue"
import { PopoverRoot } from "reka-ui"
import { computed, provide, ref, toRef } from "vue"
import { cn } from "@/lib/utils"
import { ColorPickerContextKey } from "./context"

interface Props {
  /** 当前颜色（v-model，任意 CSS 颜色字符串，建议 hex） */
  modelValue?: string
  /** 非受控初始颜色 */
  defaultValue?: string
  /** 是否禁用整个选择器 */
  disabled?: boolean
  /** 受控弹层开合（v-model:open） */
  open?: boolean
  /** 非受控初始开合 */
  defaultOpen?: boolean
  /** 根元素附加类名 */
  class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: "#000000",
  disabled: false,
  open: undefined,
  defaultOpen: undefined,
  class: undefined,
})

const emits = defineEmits<{
  "update:modelValue": [value: string]
  "update:open": [value: boolean]
}>()

const innerColor = ref(props.defaultValue)
const color = computed<string>({
  get: () => props.modelValue ?? innerColor.value,
  set: (value) => {
    innerColor.value = value
    emits("update:modelValue", value)
  },
})

provide(ColorPickerContextKey, {
  color,
  setColor: (value: string) => {
    color.value = value
  },
  disabled: toRef(() => props.disabled),
})
</script>

<template>
  <PopoverRoot
    :open="props.open"
    :default-open="props.defaultOpen"
    @update:open="emits('update:open', $event)"
  >
    <div :class="cn('inline-flex', props.class)" data-slot="color-picker">
      <slot />
    </div>
  </PopoverRoot>
</template>
