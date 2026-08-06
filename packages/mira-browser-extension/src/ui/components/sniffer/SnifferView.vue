<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBackground } from '@/ui/composables/useBackground';
import { useSniffer } from '@/ui/composables/useSniffer';
import { useSettings } from '@/ui/composables/useSettings';
import type { SnifferViewMode } from '@/shared/types';
import Switch from '@/ui/components/ui/Switch.vue';
import Button from '@/ui/components/ui/Button.vue';
import ResourceList from './ResourceList.vue';
import MasonryView from './MasonryView.vue';

const { t } = useI18n();

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

async function refreshTarget() {
  const targetIds = tabIdRef.value === 'all'
    ? tabs.value.flatMap(tab => tab.id ? [tab.id] : [])
    : tabIdRef.value ? [tabIdRef.value] : [];
  await Promise.all(targetIds.map(tabId => bg.snifferStart(tabId, settings.value.snifferKinds)));
  await load();
}

// 挂载:取当前 tab,并若嗅探已开启则立即拉取已有快照(否则要重新点 toggle 才显示)
onMounted(async () => {
  await loadSettings();
  await refreshTabs();
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId.value = activeTab?.id ?? 0;
  tabIdRef.value = activeTab?.id ?? 0;
  tabReady.value = true;
  if (settings.value.snifferEnabled) {
    await refreshTarget();
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
    await refreshTarget();
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
  if (on) await refreshTarget();
}

// 视图切换:持久化到 settings,重开 popup 仍记住选择
async function setView(view: SnifferViewMode) {
  if (settings.value.snifferView === view) return;
  await update({ snifferView: view });
}

async function uploadSelected() {
  const targets = resources.value.filter(r => selected.value.has(r.id));
  for (const r of targets) {
    // 资源上传走 UPLOAD_FROM_URL(service worker fetch → File → 队列)
    chrome.runtime.sendMessage({
      type: 'UPLOAD_FROM_URL',
      payload: {
        url: r.url,
        kind: r.kind,
        libraryId: settings.value.libraryId,
        referrer: r.referrer || r.pageUrl,
      },
    });
  }
  selected.value.clear();
}
</script>

<template>
  <div class="view">
    <div class="bar">
      <label>{{ t('sniffer.title') }}</label>
      <Switch :model-value="settings.snifferEnabled" @update:model-value="onToggle" />
    </div>
    <div class="target-bar">
      <label for="sniffer-target">{{ t('sniffer.targetTab') }}</label>
      <select id="sniffer-target" v-model="tabIdRef" :disabled="!settings.snifferEnabled">
        <option value="all">{{ t('sniffer.allTabs') }}</option>
        <option v-for="tab in tabs" :key="tab.id" :value="tab.id">
          {{ tab.active ? t('sniffer.currentPrefix') : '' }}{{ tab.title || tab.url || `Tab ${tab.id}` }}
        </option>
      </select>
      <!-- 视图切换:列表 / 瀑布流 -->
      <div class="view-toggle" role="group" :aria-label="t('sniffer.viewToggle')">
        <button
          type="button"
          class="seg"
          :class="{ active: settings.snifferView === 'list' }"
          :disabled="!settings.snifferEnabled"
          :title="t('sniffer.listView')"
          :aria-label="t('sniffer.listView')"
          @click="setView('list')"
        >
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
        <button
          type="button"
          class="seg"
          :class="{ active: settings.snifferView === 'masonry' }"
          :disabled="!settings.snifferEnabled"
          :title="t('sniffer.masonryView')"
          :aria-label="t('sniffer.masonryView')"
          @click="setView('masonry')"
        >
          <svg viewBox="0 0 16 16" width="14" height="14">
            <rect x="2" y="2" width="4.5" height="6" rx="1" fill="currentColor"/>
            <rect x="9.5" y="2" width="4.5" height="9" rx="1" fill="currentColor"/>
            <rect x="2" y="10" width="4.5" height="4" rx="1" fill="currentColor"/>
            <rect x="9.5" y="13" width="4.5" height="1" rx="0.5" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
    <MasonryView
      v-if="settings.snifferView === 'masonry'"
      :resources="resources"
      :selected="selected"
      @toggle="toggle"
    />
    <ResourceList
      v-else
      :resources="resources"
      :selected="selected"
      @toggle="toggle"
    />
    <Button v-if="selected.size" @click="uploadSelected">{{ t('sniffer.uploadSelected', { n: selected.size }) }}</Button>
  </div>
</template>

<style scoped>
.view { display: flex; flex-direction: column; height: 100%; }
.bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.bar label { flex: 1; }
.target-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.target-bar label { white-space: nowrap; }
.target-bar select { min-width: 0; flex: 1; padding: 4px; background: var(--bg); color: var(--fg); border: 1px solid var(--border); }

/* 视图切换 segmented 控件 */
.view-toggle { display: inline-flex; gap: 0; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.seg {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 24px; padding: 0;
  background: var(--bg-elev); color: var(--muted);
  border: none; border-right: 1px solid var(--border); cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.seg:last-child { border-right: none; }
.seg:hover:not(:disabled) { color: var(--fg); }
.seg.active { background: var(--primary); color: var(--primary-fg); }
.seg:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
