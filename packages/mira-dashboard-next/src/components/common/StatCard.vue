<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'

defineProps<{
  title: string
  value: string | number
  icon?: any
}>()
</script>

<template>
  <Card>
    <CardContent class="flex items-center gap-4 p-6">
      <div class="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <component :is="icon" v-if="icon" class="size-6" />
      </div>
      <div>
        <p class="text-sm text-muted-foreground">{{ title }}</p>
        <p class="text-2xl font-bold">{{ value }}</p>
      </div>
    </CardContent>
  </Card>
</template>
