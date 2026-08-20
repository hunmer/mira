<script setup lang="ts">
/**
 * 顶部栏:素材库下拉 + 截图 + 服务器管理。
 *
 * 主题切换已移至设置面板(select);上传队列已移至底部右下角(见 App.vue bottom-bar)。
 * 截图为图标按钮(无文字)。
 */
import { useConnection } from '@/ui/composables/useConnection';
import { useServers } from '@/ui/composables/useServers';
import { useSettings } from '@/ui/composables/useSettings';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { LibrarySelect, ServerManagerDialog } from 'mira-plugin-ui/library';
import type { LibrarySelectServer } from 'mira-plugin-ui/library';

const { t } = useI18n();
const { status, libraries, activeServer, switchServer } = useConnection();
const { servers, add, edit, remove, test } = useServers();
const { settings, update } = useSettings();
const props = defineProps<{ screenshotOpen?: boolean }>();
const emit = defineEmits<{ 'toggle-screenshot': [] }>();

// 服务器管理对话框:settings 持久化 + background 测试;激活走 switchServer(清 session 重登)
const showServerManager = ref(false);
const serverServices = { add, edit, remove, test, activate: switchServer };

const statusColor = computed(() => ({
  idle: '#71717a', connecting: '#eab308', connected: '#4ade80', failed: '#ef4444',
}[status.value]));

/** LibrarySelect 按服务器分组:header 仅展示当前激活服务器的库列表 */
const libServers = computed<LibrarySelectServer[]>(() => [{
  id: activeServer.value?.id ?? '',
  name: activeServer.value?.name || activeServer.value?.serverURL || '',
  libraries: libraries.value,
}]);

async function onLibChange(libraryId: string) {
  await update({ libraryId });
}
</script>

<template>
  <div class="header">
    <span class="dot" :style="{ background: statusColor }" :title="status" />
    <div class="lib-wrap">
      <LibrarySelect
        :servers="libServers"
        :model-value="settings.libraryId"
        :placeholder="t('header.selectLibrary')"
        @update:model-value="onLibChange"
      />
    </div>
    <!-- 服务器列表:图标按钮,Dialog 弹出 ServerManagerDialog -->
    <button
      class="icon-btn"
      :title="t('server.manager')"
      :aria-label="t('server.manager')"
      @click="showServerManager = true"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <rect x="2" y="2" width="20" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <path d="M16 6h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="2" y="14" width="20" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <path d="M6 18h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
      </svg>
    </button>
    <!-- 截图:图标按钮,点击展开截图菜单 -->
    <button
      class="icon-btn"
      :class="{ active: props.screenshotOpen }"
      :title="t('header.screenshot')"
      :aria-label="t('header.screenshot')"
      @click="emit('toggle-screenshot')"
    >
      <!-- 相机图标 -->
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M9 4l-1.2 1.6a2 2 0 0 1-1.6.8H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1.2a2 2 0 0 1-1.6-.8L15 4H9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
      </svg>
    </button>
    <div v-if="props.screenshotOpen" class="screenshot-menu"><slot name="screenshot-menu" /></div>

    <!-- 服务器管理对话框(Teleport 到 body) -->
    <ServerManagerDialog
      v-model:open="showServerManager"
      :servers="servers"
      :active-server-id="activeServer?.id ?? ''"
      :services="serverServices"
      :t="(key, params) => (t as any)(key, params)"
    />
  </div>
</template>

<style scoped>
.header { position: relative; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.lib-wrap { flex: 1; min-width: 0; }
/* 压低 trigger 高度以贴合 header 紧凑布局 */
.lib-wrap :deep([data-slot='select-trigger']) { height: 28px; }
/* 图标按钮(截图 / 主题)统一样式 */
.icon-btn {
  flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 24px; padding: 0;
  background: transparent; color: var(--muted);
  border: 1px solid var(--border); border-radius: var(--radius);
  cursor: pointer; transition: color 0.15s, border-color 0.15s;
}
.icon-btn:hover { color: var(--fg); }
.icon-btn.active { color: var(--primary); border-color: var(--primary); }
.screenshot-menu { position: absolute; top: 100%; right: 12px; z-index: 10; min-width: 180px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 4px 12px #0003; }
</style>
