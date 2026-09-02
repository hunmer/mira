<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { UploadTask } from '@/shared/types';
import UploadItem from './UploadItem.vue';
const { t } = useI18n();
defineProps<{ tasks: UploadTask[] }>();
defineEmits<{ cancel: [id: string]; retry: [id: string] }>();
</script>

<template>
  <div class="queue">
    <UploadItem
      v-for="task in tasks" :key="task.id" :task="task"
      @cancel="$emit('cancel', task.id)" @retry="$emit('retry', task.id)"
    />
    <p v-if="!tasks.length" class="empty">{{ t('upload.noTasks') }}</p>
  </div>
</template>

<style scoped>
.queue { flex: 1; overflow-y: auto; }
.empty { text-align: center; color: var(--muted-foreground); padding: 24px; }
</style>
