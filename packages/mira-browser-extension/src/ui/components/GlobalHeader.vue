<script setup lang="ts">
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Theme } from '@/shared/types';
import UploadQueueButton from '@/ui/components/upload/UploadQueueButton.vue';
import ServerBar from '@/ui/components/server/ServerBar.vue';

const { t } = useI18n();
const { status, libraries } = useConnection();
const { settings, update } = useSettings();
const props = defineProps<{ screenshotOpen?: boolean }>();
const emit = defineEmits<{
  'toggle-screenshot': [];
  'manage-servers': [];
  'switch-server': [id: string];
}>();

const statusColor = computed(() => ({
  idle: '#71717a', connecting: '#eab308', connected: '#4ade80', failed: '#ef4444',
}[status.value]));

async function onLibChange(e: Event) {
  const libraryId = (e.target as HTMLSelectElement).value;
  await update({ libraryId });
}

// 主题三态循环:auto → light → dark → auto
const themeLabel = computed(() => ({
  auto: t('header.themeAuto'), light: t('header.themeLight'), dark: t('header.themeDark'),
}[settings.value.theme]));
async function cycleTheme() {
  const next: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
  await update({ theme: next[settings.value.theme] });
}
</script>

<template>
  <div class="head-wrap">
    <!-- 服务器栏:状态点 + badge 列表 + 管理按钮 -->
    <ServerBar
      @manage="emit('manage-servers')"
      @switch="emit('switch-server', $event)"
    />
    <div class="header">
      <span class="dot" :style="{ background: statusColor }" />
      <select class="lib" :value="settings.libraryId" @change="onLibChange">
        <option value="" disabled>{{ t('header.selectLibrary') }}</option>
        <option v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</option>
      </select>
      <button class="screenshot" @click="emit('toggle-screenshot')">{{ t('header.screenshot') }}</button>
      <UploadQueueButton />
      <button class="theme" :title="t('header.themeTitle', { theme: settings.theme })" @click="cycleTheme">{{ themeLabel }}</button>
      <div v-if="props.screenshotOpen" class="screenshot-menu"><slot name="screenshot-menu" /></div>
    </div>
  </div>
</template>

<style scoped>
.head-wrap { display: flex; flex-direction: column; }
.header { position: relative; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.lib { flex: 1; min-width: 0; background: transparent; color: var(--fg); border: none; font: inherit; }
.lib option { background: var(--bg-elev); }
.theme { flex-shrink: 0; background: transparent; color: var(--muted); border: 1px solid var(--border); border-radius: var(--radius); padding: 2px 6px; cursor: pointer; font-size: 12px; }
.theme:hover { color: var(--fg); }
.screenshot { flex-shrink: 0; background: transparent; color: var(--muted); border: 1px solid var(--border); border-radius: var(--radius); padding: 2px 6px; cursor: pointer; font: inherit; font-size: 12px; }
.screenshot:hover { color: var(--fg); }
.screenshot-menu { position: absolute; top: 100%; right: 12px; z-index: 10; min-width: 180px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 4px 12px #0003; }
</style>
