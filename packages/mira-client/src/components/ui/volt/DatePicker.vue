<script setup lang="ts">
import { ref, computed } from 'vue'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface Props {
  modelValue?: Date | string
  showIcon?: boolean
  size?: 'small' | 'normal' | 'large'
  class?: any
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: Date | string] }>()
defineOptions({ inheritAttrs: false })

const open = ref(false)

const dateValue = computed({
  get: () => props.modelValue instanceof Date ? props.modelValue : props.modelValue ? new Date(props.modelValue) : undefined,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

const displayValue = computed(() => {
  if (!dateValue.value) return ''
  return dateValue.value.toLocaleDateString()
})

const sizeClass: Record<string, string> = {
  small: 'h-8 text-xs',
  normal: '',
  large: 'h-10',
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <div class="relative" :class="cn($props.class)">
        <Input
          v-bind="$attrs"
          :model-value="displayValue"
          readonly
          :class="cn(sizeClass[size] ?? '', showIcon && 'pl-9')"
        />
        <span v-if="showIcon" class="absolute left-2.5 top-1/2 -translate-y-1/2 material-icons text-base text-muted-foreground">calendar_today</span>
      </div>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar v-model="dateValue" @update:model-value="open = false" />
    </PopoverContent>
  </Popover>
</template>
