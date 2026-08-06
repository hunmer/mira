<script setup lang="ts">
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import { computed } from 'vue';

const { status, libraries } = useConnection();
const { settings, update } = useSettings();

const statusColor = computed(() => ({
  idle: '#71717a', connecting: '#eab308', connected: '#4ade80', failed: '#ef4444',
}[status.value]));

async function onLibChange(e: Event) {
  const libraryId = (e.target as HTMLSelectElement).value;
  await update({ libraryId });
}
</script>

<template>
  <div class="header">
    <span class="dot" :style="{ background: statusColor }" />
    <select class="lib" :value="settings.libraryId" @change="onLibChange">
      <option value="" disabled>选择素材库</option>
      <option v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</option>
    </select>
  </div>
</template>

<style scoped>
.header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.lib { flex: 1; background: transparent; color: var(--fg); border: none; font: inherit; }
.lib option { background: var(--bg-elev); }
</style>
