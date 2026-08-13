<template>
  <!-- ============ 发光组件 Tab ============ -->
  <TabsContent value="glow" class="space-y-6 mt-4">
    <div class="space-y-1">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.glowShadowTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.glowDesc') }}</p>
    </div>

    <!-- GlowingShadow 三种配色模式 -->
    <div class="space-y-3">
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.glowShadowDesc') }}</p>
      <div class="flex flex-wrap items-center gap-8 py-4">
        <GlowingShadow :width="240">{{ $t('views.playgroundPanel.glowRainbow') }}</GlowingShadow>
        <GlowingShadow :width="240" color-mode="mono" color="#3b82f6">{{ $t('views.playgroundPanel.glowMono') }}</GlowingShadow>
        <GlowingShadow :width="240" color-mode="multi" :colors="['#ef4444','#22c55e','#3b82f6']">{{ $t('views.playgroundPanel.glowMulti') }}</GlowingShadow>
      </div>
    </div>

    <!-- GlowingButton 预设 -->
    <div class="space-y-3">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.glowButtonTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.glowButtonDesc') }}</p>
      <div class="flex flex-wrap items-center gap-6 py-4">
        <GlowingButton preset="rainbow" @click="onGlowClick">{{ $t('views.playgroundPanel.glowRainbow') }}</GlowingButton>
        <GlowingButton preset="blue">{{ $t('views.playgroundPanel.glowMono') }}</GlowingButton>
        <GlowingButton preset="sunset" size="lg">Sunset</GlowingButton>
        <GlowingButton preset="ocean" size="sm">Ocean</GlowingButton>
        <GlowingButton preset="green" disabled>{{ $t('views.playgroundPanel.glowDisabled') }}</GlowingButton>
      </div>
      <p v-if="glowClickCount > 0" class="text-xs text-muted-foreground">
        {{ $t('views.playgroundPanel.glowClickCount', { n: glowClickCount }) }}
      </p>
    </div>
  </TabsContent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { TabsContent } from '@/components/ui/tabs'
import { GlowingShadow } from '@/components/ui/glowing-shadow'
import { GlowingButton } from '@/components/ui/glowing-button'

const { t } = useI18n()

const glowClickCount = ref(0)
function onGlowClick() {
  glowClickCount.value++
  toast.success(t('views.playgroundPanel.glowButtonTitle'), { description: t('views.playgroundPanel.glowClickCount', { n: glowClickCount.value }) })
}
</script>
