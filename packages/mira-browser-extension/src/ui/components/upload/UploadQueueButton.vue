<script setup lang="ts">
/**
 * 底部右下角的上传队列入口。
 *
 * - 图标 + badge(进行中任务数);有失败任务时图标变红
 * - 点击 → 向上弹出 popover 展示队列(进度/状态/取消/重试)
 * - 队列来自 useUploadQueue(模块级单例,文件夹/标签页的上传共享同一队列)
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUploadQueue } from '@/ui/composables/useUploadQueue';
import UploadQueue from './UploadQueue.vue';

const { t } = useI18n();
const { tasks, load, cancel } = useUploadQueue();

onMounted(load);

const open = ref(false);

// badge 只统计进行中(queued/uploading)的任务数
const activeCount = computed(
  () => tasks.value.filter(t => t.status === 'queued' || t.status === 'uploading').length,
);
const hasFailed = computed(() => tasks.value.some(t => t.status === 'failed'));

function toggle() {
  open.value = !open.value;
  if (open.value) load();
}
</script>

<template>
  <div class="wrap">
    <button
      class="icon-btn"
      :class="{ active: open, failed: hasFailed }"
      :title="activeCount ? t('upload.uploadingN', { n: activeCount }) : t('upload.queue')"
      @click="toggle"
    >
      <!-- 上传/云 图标 -->
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          d="M12 4a5 5 0 0 1 4.9 4.06A4 4 0 0 1 19 16h-1a1 1 0 1 1 0-2h1a2 2 0 0 0-.27-3.97 1 1 0 0 1-.82-1.13A3 3 0 0 0 12 6a1 1 0 0 1-.86.5 3 3 0 0 0-4.5 3.18 1 1 0 0 1-.6 1.13A2 2 0 0 0 6 14h1a1 1 0 1 1 0 2H6a4 4 0 0 1-1.2-7.82A5 5 0 0 1 12 4zm0 8.6.7-.7a1 1 0 0 1 1.4 1.4l-2.1 2.1a1 1 0 0 1-1.4 0l-2.1-2.1a1 1 0 1 1 1.4-1.4l.7.7V9a1 1 0 1 1 2 0v3.6z"
          fill="currentColor"
        />
      </svg>
      <span v-if="activeCount" class="badge">{{ activeCount }}</span>
    </button>

    <!-- popover -->
    <div v-if="open" class="popover">
      <div class="head">
        <span>{{ t('upload.queue') }}</span>
        <button class="close" :title="t('common.close')" @click="open = false">×</button>
      </div>
      <UploadQueue :tasks="tasks" @cancel="cancel" @retry="load" />
    </div>
  </div>
</template>

<style scoped>
.wrap { position: relative; flex-shrink: 0; }

.icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color .12s, border-color .12s;
}
.icon-btn:hover { color: var(--fg); }
.icon-btn.active { color: var(--primary); border-color: var(--primary); }
.icon-btn.failed { color: var(--danger); }

.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--primary);
  color: var(--primary-fg);
  font-size: 10px;
  line-height: 15px;
  text-align: center;
  border: 1.5px solid var(--bg);
}

.popover {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  z-index: 20;
  width: 300px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px #0006;
  overflow: hidden;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--muted-foreground);
}
.close {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.close:hover { color: var(--fg); }

/* popover 内的队列允许滚动 */
.popover :deep(.queue) { max-height: 320px; }
</style>
