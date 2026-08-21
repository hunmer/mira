<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: boolean
  id?: string
  disabled?: boolean
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const checked = computed({
  get: () => !!props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :id="id"
    :aria-checked="checked"
    :disabled="disabled"
    :class="
      cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary text-primary-foreground' : 'bg-background',
        props.class,
      )
    "
    @click="checked = !checked"
  >
    <span v-if="checked" class="flex items-center justify-center text-current">
      <Check class="h-3.5 w-3.5" />
    </span>
  </button>
</template>
