<template>
  <div class="flex h-full flex-col bg-muted">
    <PreviewHeader :file-info="fileInfo" :show-open-with="false" @renamed="$emit('renamed', $event)" @error="$emit('error', $event)" />
    <iframe v-if="src" :src="src" class="min-h-0 flex-1 border-0" :title="title" allow="fullscreen" />
    <div v-else class="flex flex-1 items-center justify-center text-muted-foreground">{{ $t('preview.iframePreview.loadFailed') }}</div>
  </div>
</template>

<script setup lang="ts">
import PreviewHeader from './PreviewHeader.vue'
defineProps<{ src: string; title?: string; fileInfo: any }>()
defineEmits<{ renamed: [name: string]; error: [message: string] }>()
</script>
