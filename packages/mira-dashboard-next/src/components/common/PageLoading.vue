<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RiLoader4Line } from '@remixicon/vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
    <RiLoader4Line class="size-8 animate-spin" />
    <span class="text-sm">{{ t('common.loading') }}</span>
  </div>
</template>
