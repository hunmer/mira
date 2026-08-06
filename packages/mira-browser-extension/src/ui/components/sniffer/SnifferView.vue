<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useBackground } from '@/ui/composables/useBackground';
import { useSniffer } from '@/ui/composables/useSniffer';
import { useSettings } from '@/ui/composables/useSettings';
import Switch from '@/ui/components/ui/Switch.vue';
import Button from '@/ui/components/ui/Button.vue';
import ResourceList from './ResourceList.vue';

const bg = useBackground();
const { settings, load: loadSettings, update } = useSettings();
// 当前 tab id(同步缓存,挂载时取一次)
const tabIdRef = ref<number | 'all'>(0);
const tabs = ref<chrome.tabs.Tab[]>([]);
const activeTabId = ref(0);
const tabReady = ref(false);
const { resources, load, start, stop } = useSniffer(() => tabIdRef.value);

async function refreshTabs() {
  tabs.value = await chrome.tabs.query({ currentWindow: true });
}

// 挂载:取当前 tab,并若嗅探已开启则立即拉取已有快照(否则要重新点 toggle 才显示)
onMounted(async () => {
  await loadSettings();
  await refreshTabs();
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId.value = t?.id ?? 0;
  tabIdRef.value = t?.id ?? 0;
  tabReady.value = true;
  if (settings.value.snifferEnabled) {
    await load();
  }
});

const onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
  const previous = activeTabId.value;
  activeTabId.value = activeInfo.tabId;
  // 默认跟随活动 Tab；手动选择其它 Tab 后保持选择。
  if (tabIdRef.value === previous) tabIdRef.value = activeInfo.tabId;
  void refreshTabs();
};
chrome.tabs.onActivated.addListener(onActivated);
onUnmounted(() => chrome.tabs.onActivated.removeListener(onActivated));

// 切换 tab / tab id 变化时若已开启,也刷新一次(popup 长开场景)
watch(tabIdRef, async (id) => {
  if (id && tabReady.value && settings.value.snifferEnabled) {
    await load();
  }
});

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
    <div class="target-bar">
      <label for="sniffer-target">目标标签页</label>
      <select id="sniffer-target" v-model="tabIdRef" :disabled="!settings.snifferEnabled">
        <option value="all">全部</option>
        <option v-for="tab in tabs" :key="tab.id" :value="tab.id">
          {{ tab.active ? '当前：' : '' }}{{ tab.title || tab.url || `Tab ${tab.id}` }}
        </option>
      </select>
    </div>
    <ResourceList :resources="resources" :selected="selected" @toggle="toggle" />
    <Button v-if="selected.size" @click="uploadSelected">上传选中 ({{ selected.size }})</Button>
  </div>
</template>

<style scoped>
.view { display: flex; flex-direction: column; height: 100%; }
.bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.bar label { flex: 1; }
.target-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.target-bar label { white-space: nowrap; }
.target-bar select { min-width: 0; flex: 1; padding: 4px; background: var(--bg); color: var(--fg); border: 1px solid var(--border); }
</style>
