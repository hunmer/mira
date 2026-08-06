<script setup lang="ts">
import type { UploadTask } from '@/shared/types';
import Progress from '@/ui/components/ui/Progress.vue';
import Button from '@/ui/components/ui/Button.vue';
defineProps<{ task: UploadTask }>();
defineEmits<{ cancel: []; retry: [] }>();
</script>

<template>
  <div class="item">
    <div class="info">
      <span class="name">{{ task.file.name }}</span>
      <span class="size">{{ Math.round(task.file.size / 1024) }}KB</span>
    </div>
    <Progress v-if="task.status === 'uploading'" :value="task.percent" />
    <div class="status">
      <span :class="task.status">
        {{ { queued: '排队', uploading: `${task.percent}%`, success: '完成', failed: task.error ?? '失败' }[task.status] }}
      </span>
      <Button v-if="task.status === 'uploading'" size="sm" variant="ghost" @click="$emit('cancel')">取消</Button>
      <Button v-if="task.status === 'failed'" size="sm" variant="ghost" @click="$emit('retry')">重试</Button>
    </div>
  </div>
</template>

<style scoped>
.item { padding: 8px 12px; border-bottom: 1px solid var(--border); }
.info { display: flex; justify-content: space-between; }
.name { font-size: 12px; }
.size { font-size: 11px; color: var(--muted); }
.status { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 11px; }
.success { color: var(--primary); } .failed { color: var(--danger); } .queued { color: var(--muted); }
</style>
