<template>
  <webview v-if="url" :src="url" class="h-full w-full" />
  <div v-else class="flex h-full items-center justify-center text-muted-foreground">Invalid URL</div>
</template>

<script setup lang="ts">
defineProps<{ url: string }>()
</script>
