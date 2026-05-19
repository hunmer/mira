<script setup lang="ts">
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Props {
  value?: any[]
  dataKey?: string
  stripedRows?: boolean
  hoverable?: boolean
  scrollable?: boolean
  scrollHeight?: string
  selectionMode?: 'single' | 'multiple'
  tableStyle?: any
  class?: any
}

const props = defineProps<Props>()
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div :class="cn('w-full', $props.class)" :style="scrollable ? { maxHeight: scrollHeight, overflow: 'auto' } : undefined">
    <Table v-bind="$attrs" :style="tableStyle" :class="cn(stripedRows && '[&_tbody_tr:nth-child(even)]:bg-muted/50')">
      <slot />
    </Table>
    <div v-if="!value?.length" class="py-8 text-center text-muted-foreground">
      <slot name="empty">No data available</slot>
    </div>
  </div>
</template>
