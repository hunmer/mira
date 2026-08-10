<script setup lang="ts">
/**
 * TiltCard 演示：在任意路由挂载即可预览 3D 倾斜 + 光晕效果。
 */
import TiltCard from './TiltCard.vue'

defineOptions({ name: 'TiltCardPreview' })
</script>

<template>
  <div class="flex items-center justify-center p-6">
    <TiltCard class="w-[280px] border border-border bg-card p-8">
      <div class="text-xs uppercase tracking-wider text-muted-foreground">Premium</div>
      <h3 class="mt-2 text-2xl font-semibold text-foreground">Tilt me</h3>
      <p class="mt-3 text-sm text-muted-foreground">
        Move your cursor across the card to see 3D tilt + glare.
      </p>
    </TiltCard>
  </div>
</template>
