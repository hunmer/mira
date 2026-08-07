<template>
  <div v-if="visible" class="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
    <div class="w-full max-w-sm px-6 text-center">
      <div class="relative mx-auto mb-6 h-16 w-16">
        <div class="absolute inset-0 rounded-full border-4 border-border" />
        <div class="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div class="absolute inset-5 rounded-full bg-primary animate-pulse" />
      </div>
      <h1 class="text-lg font-semibold text-foreground">{{ failed ? '服务器启动失败' : '正在启动服务器' }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{{ message }}</p>
      <button v-if="failed" type="button" class="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" @click="emit('retry')">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ visible: boolean; failed?: boolean; message?: string }>(), {
  failed: false,
  message: '等待 mira-app-server 健康检查通过…',
})
const emit = defineEmits<{ retry: [] }>()
</script>
