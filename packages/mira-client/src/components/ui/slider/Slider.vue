<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { computed } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { useForwardPropsEmits, SliderRoot, SliderTrack, SliderRange, SliderThumb } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<SliderRootProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<SliderRootEmits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)

// 根据 modelValue 类型决定渲染几个 Thumb（单值 1 个，数组 N 个）
const thumbCount = computed(() => (Array.isArray(props.modelValue) ? props.modelValue.length : 1))
</script>

<template>
  <SliderRoot
    v-bind="forwarded"
    :class="
      cn(
        'relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
        props.class,
      )
    "
  >
    <SliderTrack class="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2">
      <SliderRange class="absolute h-full bg-primary data-[orientation=vertical]:w-full" />
    </SliderTrack>
    <SliderThumb
      v-for="i in thumbCount"
      :key="i"
      class="block h-4 w-4 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderRoot>
</template>
