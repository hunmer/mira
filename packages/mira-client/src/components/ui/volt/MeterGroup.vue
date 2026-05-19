<script setup lang="ts">
import { cn } from '@/lib/utils'

interface MeterItem {
  label?: string
  value: number
  color?: string
}

interface Props {
  value?: MeterItem[]
  class?: any
}

const props = defineProps<Props>()
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div v-bind="$attrs" :class="cn('w-full', $props.class)">
    <div class="flex h-3 w-full overflow-hidden rounded-full bg-muted">
      <div
        v-for="(item, i) in value"
        :key="i"
        :style="{
          width: item.value + '%',
          backgroundColor: item.color || 'var(--primary)',
        }"
        class="h-full transition-all"
      />
    </div>
    <div v-if="value?.length" class="mt-1 flex flex-wrap gap-3">
      <div v-for="(item, i) in value" :key="i" class="flex items-center gap-1 text-xs text-muted-foreground">
        <span class="inline-block h-2 w-2 rounded-full" :style="{ backgroundColor: item.color || 'var(--primary)' }" />
        {{ item.label }}
      </div>
    </div>
  </div>
</template>
