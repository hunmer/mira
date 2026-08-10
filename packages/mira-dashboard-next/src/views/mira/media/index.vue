<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ThumbnailCard from './ThumbnailCard.vue'
import MetadataCard from './MetadataCard.vue'

const { t } = useI18n()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-normal">{{ t('media.title') }}</h1>
      <p class="mt-1 text-sm text-muted-foreground">{{ t('media.subtitle') }}</p>
    </div>
    <ThumbnailCard />
    <MetadataCard />
  </div>
</template>
