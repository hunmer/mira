<script setup lang="ts">
/**
 * 服务器栏(独立一行):状态点 + 可横向滚动的服务器 badge 列表 + 右侧管理⚙按钮。
 *
 * - 状态点沿用 ConnStatus 颜色(idle/connecting/connected/failed),失败时闪烁
 *   并带「点此重试」tooltip;点击点 → 立即探活重试
 * - 点击某 badge → 切换激活服务器(emit switch,由父组件触发 useConnection.switchServer)
 * - 列表为空时显示「+ 添加服务器」(emit manage)
 * - 右侧⚙ → emit manage(打开 ServerManagerView);失败时换成 ↻ 重试按钮
 *
 * 切换/管理由父组件协调(需要联动 status 与全屏覆盖)。
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConnection, type ConnStatus } from '@/ui/composables/useConnection';

const { t } = useI18n();
const emit = defineEmits<{ manage: []; switch: [id: string] }>();

const { status, servers, activeServer, checkHealth, lastCheckedAt } = useConnection();

const statusColor = computed(
  () => ({
    idle: '#71717a',
    connecting: '#eab308',
    connected: '#4ade80',
    failed: '#ef4444',
  } satisfies Record<ConnStatus, string>)[status.value],
);

// 状态点 tooltip:失败时提示点击重试;正常时显示状态文本 + 上次检查时间
const statusTitle = computed(() => {
  const ago = lastCheckedAt.value
    ? t('health.lastChecked', { time: new Date(lastCheckedAt.value).toLocaleTimeString() })
    : '';
  switch (status.value) {
    case 'connected': return ago ? `${t('health.connected')} · ${ago}` : t('health.connected');
    case 'connecting': return t('common.connecting');
    case 'failed': return t('health.failedHint');
    default: return t('health.idle');
  }
});

const isFailed = computed(() => status.value === 'failed');
</script>

<template>
  <div class="bar">
    <span
      class="dot"
      :class="{ pulse: isFailed, clickable: isFailed }"
      :style="{ background: statusColor }"
      :title="statusTitle"
      @click="isFailed && checkHealth()"
    />
    <div class="badges">
      <button
        v-for="s in servers"
        :key="s.id"
        class="badge"
        :class="{ active: s.id === activeServer?.id }"
        :title="s.serverURL"
        @click="$emit('switch', s.id)"
      >
        {{ s.name }}
      </button>
      <button v-if="!servers.length" class="badge add" @click="$emit('manage')">
        + {{ t('server.add') }}
      </button>
    </div>
    <!-- 失败时显示重试按钮;否则显示管理⚙ -->
    <button
      v-if="isFailed"
      class="manage retry"
      :title="t('health.retry')"
      :aria-label="t('health.retry')"
      @click="checkHealth()"
    >↻</button>
    <button
      v-else
      class="manage"
      :title="t('server.manager')"
      :aria-label="t('server.manager')"
      @click="$emit('manage')"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path d="M19.43 12.98a7.8 7.8 0 0 0 0-1.96l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.3 7.3 0 0 0-1.7-.98l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.61.25-1.18.58-1.7.98l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65a7.8 7.8 0 0 0 0 1.96l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.49-1c.52.4 1.09.73 1.7.98l.38 2.65c.05.24.26.42.5.42h4c.24 0 .45-.18.5-.42l.38-2.65c.61-.25 1.18-.58 1.7-.98l2.49 1a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot.clickable { cursor: pointer; }
/* 失败时闪烁,提醒用户连接已断开 */
.dot.pulse { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.badges {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.badges::-webkit-scrollbar { display: none; }

.badge {
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 3px 10px;
  font-size: 12px;
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  transition: background .12s, color .12s, border-color .12s;
}
.badge:hover { color: var(--fg); border-color: var(--muted); }
.badge.active {
  background: var(--primary);
  color: var(--primary-fg);
  border-color: var(--primary);
}
.badge.add { color: var(--primary); border-color: var(--primary); }

.manage {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--muted);
  cursor: pointer;
  transition: color .12s, border-color .12s;
}
.manage:hover { color: var(--fg); border-color: var(--muted); }
.manage.retry { color: var(--danger); border-color: var(--danger); font-size: 14px; line-height: 1; }
.manage.retry:hover { color: #fff; background: var(--danger); }
</style>
