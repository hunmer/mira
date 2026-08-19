<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { ProgressRootProps } from "reka-ui"
import { computed } from "vue"
import { ProgressIndicator, ProgressRoot } from "reka-ui"
import { cn } from "../../../lib/utils"

const props = withDefaults(
  defineProps<ProgressRootProps & { class?: HTMLAttributes["class"] }>(),
  { modelValue: 0 },
)

const percentage = computed(() => {
  const max = props.max ?? 100
  return max > 0 ? Math.min(100, Math.max(0, ((props.modelValue ?? 0) / max) * 100)) : 0
})
</script>

<template>
  <ProgressRoot
    data-slot="progress"
    :model-value="modelValue"
    :max="max"
    :class="cn(
      'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
      props.class,
    )"
  >
    <ProgressIndicator
      data-slot="progress-indicator"
      :model-value="modelValue"
      class="bg-primary h-full w-full flex-1 transition-all"
      :style="{ transform: `translateX(-${100 - percentage}%)` }"
    />
  </ProgressRoot>
</template>
