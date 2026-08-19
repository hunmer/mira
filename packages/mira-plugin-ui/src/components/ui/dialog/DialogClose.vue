<script setup lang="ts">
import type { DialogCloseProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { DialogClose } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<DialogCloseProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <DialogClose data-slot="dialog-close" v-bind="props" :class="cn(props.class)">
    <slot />
  </DialogClose>
</template>
