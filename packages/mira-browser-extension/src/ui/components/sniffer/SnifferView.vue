<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBackground } from '@/ui/composables/useBackground';
import { useSniffer } from '@/ui/composables/useSniffer';
import { useSettings } from '@/ui/composables/useSettings';
import type { SnifferViewMode } from '@/shared/types';
import Switch from '@/ui/components/ui/Switch.vue';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';
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

// ---- 自动滚动 popover ----
// 嗅探滚动加载场景:在当前页面按设定间隔自动向下滚动,触发懒加载后嗅探到更多资源。
const autoScrollOpen = ref(false);
const autoScrollRunning = ref(false);
// 编辑用的本地值(字符串,适配 Input);开始滚动时再转 number 写入 settings
const delayDraft = ref(String(settings.value.autoScrollDelay));
watch(() => settings.value.autoScrollDelay, v => { delayDraft.value = String(v); });

function toggleAutoScrollPopover() {
  autoScrollOpen.value = !autoScrollOpen.value;
}

/** 解析当前要滚动到的 tab id(all 时取活动 tab;无则不执行) */
function scrollTargetTabId(): number | null {
  if (typeof tabIdRef.value === 'number' && tabIdRef.value > 0) return tabIdRef.value;
  return activeTabId.value || null;
}

async function startAutoScroll() {
  const tid = scrollTargetTabId();
  if (!tid) return;
  // 持久化间隔(后台 AUTOSCROLL_START 读 settings.autoScrollDelay)
  const delay = Number(delayDraft.value) || 800;
  await update({ autoScrollDelay: delay });
  // 立即置为运行态(后台下发后 content script 立即响应「已开始」,不再等整段滚动跑完)
  autoScrollRunning.value = true;
  try {
    await bg.autoScrollStart(tid);
  } catch (e) {
    autoScrollRunning.value = false;
  }
}

async function stopAutoScroll() {
  const tid = scrollTargetTabId();
  if (!tid) return;
  try {
    await bg.autoScrollStop(tid);
  } finally {
    autoScrollRunning.value = false;
  }
}

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
onUnmounted(() => {
  chrome.tabs.onActivated.removeListener(onActivated);
  // 离开嗅探视图时若还在滚动,停掉(popup 关闭后 content script 的滚动也会因 tab 切换自停,
  // 但显式停止让状态一致)
  if (autoScrollRunning.value) void stopAutoScroll();
});

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

      <!-- 自动滚动:图标入口 → popover 设间隔 + 开始/停止 -->
      <div class="autoscroll-wrap">
        <button
          type="button"
          class="icon-entry"
          :class="{ active: autoScrollRunning }"
          :title="t('autoscroll.title')"
          :aria-label="t('autoscroll.title')"
          @click="toggleAutoScrollPopover"
        >
          <!-- 向下滚动箭头图标 -->
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path d="M12 3a1 1 0 0 1 1 1v11.59l3.3-3.3a1 1 0 0 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1z" fill="currentColor"/>
            <path d="M5 21h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2z" fill="currentColor" opacity=".5"/>
          </svg>
        </button>
        <!-- popover 面板 -->
        <div v-if="autoScrollOpen" class="popover">
          <div class="popover-title">{{ t('autoscroll.title') }}</div>
          <p class="popover-hint">{{ t('autoscroll.hint') }}</p>
          <label class="popover-row">
            <span>{{ t('autoscroll.delay') }}</span>
            <Input v-model="delayDraft" type="number" :placeholder="'800'" />
            <span class="unit">ms</span>
          </label>
          <div class="popover-ops">
            <Button v-if="!autoScrollRunning" size="sm" :disabled="!scrollTargetTabId()" @click="startAutoScroll">{{ t('autoscroll.start') }}</Button>
            <Button v-else size="sm" variant="danger" @click="stopAutoScroll">{{ t('autoscroll.stop') }}</Button>
          </div>
        </div>
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

/* 自动滚动入口 + popover */
.autoscroll-wrap { position: relative; flex-shrink: 0; }
.icon-entry {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 24px; padding: 0;
  background: var(--bg-elev); color: var(--muted);
  border: 1px solid var(--border); border-radius: var(--radius);
  cursor: pointer; transition: background 0.15s, color 0.15s;
}
.icon-entry:hover { color: var(--fg); }
.icon-entry.active { color: var(--primary); border-color: var(--primary); }

.popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  width: 220px;
  padding: 10px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px #0006;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.popover-title { font-size: 13px; font-weight: 600; }
.popover-hint { margin: 0; font-size: 11px; color: var(--muted); line-height: 1.4; }
.popover-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
.popover-row .unit { flex-shrink: 0; }
.popover-ops { display: flex; justify-content: flex-end; }
</style>
