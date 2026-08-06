<script setup lang="ts">
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import { computed } from 'vue';
import type { Theme } from '@/shared/types';

const { status, libraries } = useConnection();
const { settings, update } = useSettings();

const statusColor = computed(() => ({
  idle: '#71717a', connecting: '#eab308', connected: '#4ade80', failed: '#ef4444',
}[status.value]));

async function onLibChange(e: Event) {
  const libraryId = (e.target as HTMLSelectElement).value;
  await update({ libraryId });
}

// 主题三态循环:auto → light → dark → auto
const themeLabel = computed(() => ({ auto: '🌗 自动', light: '☀️ 亮色', dark: '🌙 暗色' }[settings.value.theme]));
async function cycleTheme() {
  const next: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
  await update({ theme: next[settings.value.theme] });
}
</script>

<template>
  <div class="header">
    <span class="dot" :style="{ background: statusColor }" />
    <select class="lib" :value="settings.libraryId" @change="onLibChange">
      <option value="" disabled>选择素材库</option>
      <option v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</option>
    </select>
    <button class="theme" :title="`主题: ${settings.theme}`" @click="cycleTheme">{{ themeLabel }}</button>
  </div>
</template>

<style scoped>
.header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.lib { flex: 1; min-width: 0; background: transparent; color: var(--fg); border: none; font: inherit; }
.lib option { background: var(--bg-elev); }
.theme { flex-shrink: 0; background: transparent; color: var(--muted); border: 1px solid var(--border); border-radius: var(--radius); padding: 2px 6px; cursor: pointer; font-size: 12px; }
.theme:hover { color: var(--fg); }
</style>
