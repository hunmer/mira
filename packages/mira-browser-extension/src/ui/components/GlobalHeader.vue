<script setup lang="ts">
/**
 * 顶部栏:素材库下拉 + 截图 + 上传队列 + 主题。
 *
 * 服务器栏已移至页面底部(与设置按钮同行的 BottomBar)。
 * 截图 / 主题均为图标按钮(无文字);主题三态循环:auto → light → dark → auto。
 */
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Theme } from '@/shared/types';
import UploadQueueButton from '@/ui/components/upload/UploadQueueButton.vue';

const { t } = useI18n();
const { status, libraries } = useConnection();
const { settings, update } = useSettings();
const props = defineProps<{ screenshotOpen?: boolean }>();
const emit = defineEmits<{ 'toggle-screenshot': [] }>();

const statusColor = computed(() => ({
  idle: '#71717a', connecting: '#eab308', connected: '#4ade80', failed: '#ef4444',
}[status.value]));

async function onLibChange(e: Event) {
  const libraryId = (e.target as HTMLSelectElement).value;
  await update({ libraryId });
}

// 主题三态循环:auto → light → dark → auto
async function cycleTheme() {
  const next: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
  await update({ theme: next[settings.value.theme] });
}
</script>

<template>
  <div class="header">
    <span class="dot" :style="{ background: statusColor }" :title="status" />
    <select class="lib" :value="settings.libraryId" @change="onLibChange">
      <option value="" disabled>{{ t('header.selectLibrary') }}</option>
      <option v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</option>
    </select>
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
    <UploadQueueButton />
    <!-- 主题:auto/light/dark 三态图标按钮 -->
    <button
      class="icon-btn"
      :title="t('header.themeTitle', { theme: settings.theme })"
      :aria-label="t('header.themeTitle', { theme: settings.theme })"
      @click="cycleTheme"
    >
      <!-- auto:半阳/半月 -->
      <svg v-if="settings.theme === 'auto'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" fill="currentColor"/>
      </svg>
      <!-- light:太阳 -->
      <svg v-else-if="settings.theme === 'light'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor"/>
        <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>
        </g>
      </svg>
      <!-- dark:月亮 -->
      <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="currentColor"/>
      </svg>
    </button>
    <div v-if="props.screenshotOpen" class="screenshot-menu"><slot name="screenshot-menu" /></div>
  </div>
</template>

<style scoped>
.header { position: relative; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.lib { flex: 1; min-width: 0; background: transparent; color: var(--fg); border: none; font: inherit; }
.lib option { background: var(--bg-elev); }
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
