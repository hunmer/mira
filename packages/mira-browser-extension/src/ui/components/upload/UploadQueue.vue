<script setup lang="ts">
import type { UploadTask } from '@/shared/types';
import UploadItem from './UploadItem.vue';
defineProps<{ tasks: UploadTask[] }>();
defineEmits<{ cancel: [id: string]; retry: [id: string] }>();
</script>

<template>
  <div class="queue">
    <UploadItem
      v-for="t in tasks" :key="t.id" :task="t"
      @cancel="$emit('cancel', t.id)" @retry="$emit('retry', t.id)"
    />
    <p v-if="!tasks.length" class="empty">暂无上传任务</p>
  </div>
</template>

<style scoped>
.queue { flex: 1; overflow-y: auto; }
.empty { text-align: center; color: var(--muted); padding: 24px; }
</style>
