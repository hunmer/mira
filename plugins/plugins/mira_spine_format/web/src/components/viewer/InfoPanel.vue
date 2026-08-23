<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'

const { t } = useI18n()

defineProps<{
  boneCount: number
  slotCount: number
  animationCount: number
  spineVersion: string
}>()
</script>

<template>
  <div class="flex flex-col gap-3 p-3">
    <span class="text-xs font-medium text-muted-foreground">{{ t('app.info') }}</span>
    <dl class="grid grid-cols-2 gap-y-2 text-xs">
      <dt class="text-muted-foreground">{{ t('app.bonesShort') }}</dt>
      <dd class="text-right font-mono">{{ boneCount }}</dd>
      <dt class="text-muted-foreground">{{ t('app.slots') }}</dt>
      <dd class="text-right font-mono">{{ slotCount }}</dd>
      <dt class="text-muted-foreground">{{ t('app.animationsShort') }}</dt>
      <dd class="text-right font-mono">{{ animationCount }}</dd>
    </dl>
    <div v-if="spineVersion" class="flex items-center gap-2 pt-1">
      <Badge variant="secondary">Spine {{ spineVersion }}</Badge>
            <Badge variant="outline">{{ t('app.runtime') }}</Badge>
    </div>
    <p class="pt-1 text-[11px] leading-relaxed text-muted-foreground/70">
      {{ t('app.infoHint') }}
    </p>
  </div>
</template>
