<script setup lang="ts">
import type { SelectRootProps } from 'reka-ui'
import { SelectRoot } from 'reka-ui'

const props = defineProps<SelectRootProps>()

const modelValue = defineModel<SelectRootProps['modelValue']>()
</script>

<template>
  <SelectRoot v-bind="props" v-model="modelValue">
    <slot />
  </SelectRoot>
</template>
