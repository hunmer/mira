<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: string
  variant?: 'default' | 'destructive' | 'info' | 'success' | 'warning'
}>()

const variantClasses = {
  default: 'bg-background text-foreground',
  destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
  info: 'border-blue-500/50 text-blue-600 dark:text-blue-500 [&>svg]:text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  success: 'border-green-500/50 text-green-600 dark:text-green-500 [&>svg]:text-green-500 bg-green-50 dark:bg-green-500/10',
  warning: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-500 [&>svg]:text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10',
}
</script>

<template>
  <div
    role="alert"
    :class="cn(
      'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
      variantClasses[variant ?? 'default'],
      props.class,
    )"
  >
    <slot />
  </div>
</template>
