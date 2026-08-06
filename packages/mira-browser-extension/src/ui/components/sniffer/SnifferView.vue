<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBackground } from '@/ui/composables/useBackground';
import { useSniffer } from '@/ui/composables/useSniffer';
import { useSettings } from '@/ui/composables/useSettings';
import Switch from '@/ui/components/ui/Switch.vue';
import Button from '@/ui/components/ui/Button.vue';
import ResourceList from './ResourceList.vue';

const bg = useBackground();
const { settings, update } = useSettings();
// 当前 tab id(同步缓存,挂载时取一次)
const tabIdRef = ref(0);
chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => { tabIdRef.value = t?.id ?? 0; });
const { resources, load, start, stop } = useSniffer(() => tabIdRef.value);

const selected = ref(new Set<string>());
function toggle(id: string) {
  const s = new Set(selected.value);
  s.has(id) ? s.delete(id) : s.add(id);
  selected.value = s;
}

async function onToggle(on: boolean) {
  console.log('[mira-ext][sniffer-ui] onToggle', on, { libraryId: settings.value.libraryId });
  await update({ snifferEnabled: on });
  on ? await start() : await stop();
  if (on) load();
}

async function uploadSelected() {
  const targets = resources.value.filter(r => selected.value.has(r.id));
  for (const r of targets) {
    // 资源上传走 UPLOAD_FROM_URL(service worker fetch → File → 队列)
    chrome.runtime.sendMessage({
      type: 'UPLOAD_FROM_URL',
      payload: { url: r.url, kind: r.kind, libraryId: settings.value.libraryId },
    });
  }
  selected.value.clear();
}
</script>

<template>
  <div class="view">
    <div class="bar">
      <label>资源嗅探</label>
      <Switch :model-value="settings.snifferEnabled" @update:model-value="onToggle" />
    </div>
    <ResourceList :resources="resources" :selected="selected" @toggle="toggle" />
    <Button v-if="selected.size" @click="uploadSelected">上传选中 ({{ selected.size }})</Button>
  </div>
</template>

<style scoped>
.view { display: flex; flex-direction: column; height: 100%; }
.bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.bar label { flex: 1; }
</style>
