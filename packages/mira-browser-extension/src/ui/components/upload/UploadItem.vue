<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { UploadTask } from '@/shared/types';
import Progress from '@/ui/components/ui/Progress.vue';
import Button from '@/ui/components/ui/Button.vue';
const { t } = useI18n();
const props = defineProps<{ task: UploadTask }>();
defineEmits<{ cancel: []; retry: [] }>();

const statusText = computed(() => {
  const { status, percent, error } = props.task;
  if (status === 'queued') return t('common.queued');
  if (status === 'uploading') return `${percent}%`;
  if (status === 'success') return t('common.done');
  return error ?? t('common.failed');
});
</script>

<template>
  <div class="item">
    <div class="info">
      <span class="name">{{ task.file.name }}</span>
      <span class="size">{{ Math.round(task.file.size / 1024) }}KB</span>
    </div>
    <Progress v-if="task.status === 'uploading'" :value="task.percent" />
    <div class="status">
      <span :class="task.status">{{ statusText }}</span>
      <Button v-if="task.status === 'uploading'" size="sm" variant="ghost" @click="$emit('cancel')">{{ t('common.cancel') }}</Button>
      <Button v-if="task.status === 'failed'" size="sm" variant="ghost" @click="$emit('retry')">{{ t('common.retry') }}</Button>
    </div>
  </div>
</template>

<style scoped>
.item { padding: 8px 12px; border-bottom: 1px solid var(--border); }
.info { display: flex; justify-content: space-between; }
.name { font-size: 12px; }
.size { font-size: 11px; color: var(--muted-foreground); }
.status { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 11px; }
.success { color: var(--primary); } .failed { color: var(--danger); } .queued { color: var(--muted-foreground); }
</style>
