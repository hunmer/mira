import { ref, onUnmounted } from 'vue';
import { useBackground } from './useBackground';
import type { SniffedResource } from '@/shared/types';

const resources = ref<SniffedResource[]>([]);
const bg = useBackground();

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
    // 通过 setSettings 触发 service worker → content script
    await bg.setSettings({ snifferEnabled: true });
  }
  async function stop() {
    await bg.setSettings({ snifferEnabled: false });
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
