import { ref, onUnmounted } from 'vue';
import { useBackground } from './useBackground';
import { useSettings } from './useSettings';
import type { SniffedResource } from '@/shared/types';

const resources = ref<SniffedResource[]>([]);
const bg = useBackground();
const { update } = useSettings();

export function useSniffer(currentTabId: () => number | 'all') {
  async function load() {
    const target = currentTabId();
    if (target === 'all') {
      const r = await bg.snifferQuery(-1);
      resources.value = r.resources;
      return;
    }
    if (!target) {
      resources.value = [];
      return;
    }
    const r = await bg.snifferQuery(target);
    resources.value = r.resources.map(resource => ({ ...resource, tabId: resource.tabId ?? target }));
  }
  async function start() {
    // 经 update(自动写回 settings)触发 service worker → content script
    await update({ snifferEnabled: true });
  }
  async function stop() {
    await update({ snifferEnabled: false });
  }

  const off = bg.onSnifferFound((tabId, res) => {
    if (currentTabId() === 'all') {
      void load();
    } else if (tabId === currentTabId()) {
      resources.value = res.map(resource => ({ ...resource, tabId }));
    }
  });
  onUnmounted(off);

  return { resources, load, start, stop };
}
