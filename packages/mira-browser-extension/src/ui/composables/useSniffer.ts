import { ref, onUnmounted } from 'vue';
import { useBackground } from './useBackground';
import type { SniffedResource } from '@/shared/types';

const resources = ref<SniffedResource[]>([]);
const bg = useBackground();

export function useSniffer(currentTabId: () => number) {
  async function load() {
    const r = await bg.snifferQuery(currentTabId());
    resources.value = r.resources;
  }
  async function start() {
    // 通过 setSettings 触发 service worker → content script
    await bg.setSettings({ snifferEnabled: true });
  }
  async function stop() {
    await bg.setSettings({ snifferEnabled: false });
  }

  const off = bg.onSnifferFound((tabId, res) => {
    if (tabId === currentTabId()) resources.value = res;
  });
  onUnmounted(off);

  return { resources, load, start, stop };
}
