<script setup lang="ts">
import { Maximize2, Bone } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

defineProps<{
  fileName: string
  spineVersion?: string
}>()

const emit = defineEmits<{
  (e: 'fit'): void
}>()
</script>

<template>
  <header class="flex h-12 shrink-0 items-center gap-3 border-b bg-card/60 px-4">
    <Bone class="size-5 text-primary" />
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <span class="truncate text-sm font-medium">{{ fileName }}</span>
      <Badge v-if="spineVersion" variant="secondary" class="shrink-0">
        Spine {{ spineVersion }}
      </Badge>
      <Badge variant="outline" class="shrink-0">只读预览</Badge>
    </div>
    <Button size="sm" variant="outline" class="gap-1.5" @click="emit('fit')">
      <Maximize2 class="size-4" />
      适配视角
    </Button>
  </header>
</template>
