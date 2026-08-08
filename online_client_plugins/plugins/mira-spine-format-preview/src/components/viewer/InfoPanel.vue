<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

defineProps<{
  boneCount: number
  slotCount: number
  animationCount: number
  spineVersion: string
}>()
</script>

<template>
  <div class="flex flex-col gap-3 p-3">
    <span class="text-xs font-medium text-muted-foreground">资源信息</span>
    <dl class="grid grid-cols-2 gap-y-2 text-xs">
      <dt class="text-muted-foreground">骨骼</dt>
      <dd class="text-right font-mono">{{ boneCount }}</dd>
      <dt class="text-muted-foreground">插槽</dt>
      <dd class="text-right font-mono">{{ slotCount }}</dd>
      <dt class="text-muted-foreground">动画</dt>
      <dd class="text-right font-mono">{{ animationCount }}</dd>
    </dl>
    <div v-if="spineVersion" class="flex items-center gap-2 pt-1">
      <Badge variant="secondary">Spine {{ spineVersion }}</Badge>
      <Badge variant="outline">3.8 运行时</Badge>
    </div>
    <p class="pt-1 text-[11px] leading-relaxed text-muted-foreground/70">
      此预览器为只读模式：支持骨骼查看、显隐切换、动画/皮肤切换，不提供骨骼编辑能力。
    </p>
  </div>
</template>
