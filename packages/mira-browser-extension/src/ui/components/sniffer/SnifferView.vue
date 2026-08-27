<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBackground } from '@/ui/composables/useBackground';
import { useSniffer } from '@/ui/composables/useSniffer';
import { useSettings } from '@/ui/composables/useSettings';
import { useConnection } from '@/ui/composables/useConnection';
import type { SnifferViewMode, SnifferSortOrder, SniffedResource } from '@/shared/types';
import Switch from '@/ui/components/ui/Switch.vue';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';
import ResourceList from './ResourceList.vue';
import MasonryView from './MasonryView.vue';
import SaveLocationDialog from 'mira-plugin-ui/src/SaveLocationDialog.vue';
import { dbg } from '@/shared/debug';
import { runConcurrent } from '@/shared/concurrency';

const { t } = useI18n();

const bg = useBackground();
const { settings, load: loadSettings, update } = useSettings();
const { libraries } = useConnection();
// 当前 tab id(同步缓存,挂载时取一次)
const tabIdRef = ref<number | 'all'>(0);
const tabs = ref<chrome.tabs.Tab[]>([]);
const activeTabId = ref(0);
const tabReady = ref(false);
const { resources, load, start, stop } = useSniffer(() => tabIdRef.value);

// ---- 批量操作进度(由后台 BATCH_PROGRESS 事件驱动;预处理阶段由本地驱动) ----
type BatchProgress = { phase: 'upload' | 'download' | 'upgrade'; done: number; total: number; stage: 'fetch' | 'finish' };
const progress = ref<BatchProgress | null>(null);
let offBatchProgress: (() => void) | undefined;
const progressPct = computed(() => {
  if (!progress.value || !progress.value.total) return 0;
  return Math.min(100, Math.round((progress.value.done / progress.value.total) * 100));
});
const progressText = computed(() => {
  const p = progress.value;
  if (!p) return '';
  if (p.stage === 'finish') {
    return p.phase === 'upload' ? t('sniffer.progressUploading') : t('sniffer.progressZipping');
  }
  if (p.phase === 'upgrade') return t('sniffer.progressUpgrading', { done: p.done, total: p.total });
  return t(p.phase === 'upload' ? 'sniffer.progressFetching' : 'sniffer.progressDownloading', { done: p.done, total: p.total });
});

// ---- 自动滚动 popover ----
// 嗅探滚动加载场景:在当前页面按设定间隔自动向下滚动,触发懒加载后嗅探到更多资源。
const autoScrollOpen = ref(false);
const autoScrollRunning = ref(false);
// 编辑用的本地值(字符串,适配 Input);开始滚动时再转 number 写入 settings
const delayDraft = ref(String(settings.value.autoScrollDelay));
watch(() => settings.value.autoScrollDelay, v => { delayDraft.value = String(v); });

// ---- 过滤 popover ----
const filterOpen = ref(false);
// 尺寸过滤本地草稿(字符串,适配 Input);change 时再转 number 写入 settings
const minWidthDraft = ref(String(settings.value.snifferMinWidth || ''));
const minHeightDraft = ref(String(settings.value.snifferMinHeight || ''));
watch(() => settings.value.snifferMinWidth, v => { minWidthDraft.value = v ? String(v) : ''; });
watch(() => settings.value.snifferMinHeight, v => { minHeightDraft.value = v ? String(v) : ''; });
// 过滤是否激活(任意尺寸/比例过滤启用)
const filterActive = computed(() =>
  settings.value.snifferMinWidth > 0 ||
  settings.value.snifferMinHeight > 0 ||
  settings.value.snifferAspectRatios.length > 0,
);

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
  offBatchProgress = bg.onBatchProgress(p => { progress.value = p; });
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
  offBatchProgress?.();
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

// 全选 / 反选:基于当前 resources。全选态判断与「反选」语义合并到同一按钮。
function toggleSelectAll() {
  const ids = resources.value.map(r => r.id);
  // 已全部选中 → 清空;否则全选
  if (ids.length > 0 && ids.every(id => selected.value.has(id))) {
    selected.value = new Set();
  } else {
    selected.value = new Set(ids);
  }
}
const allSelected = computed(() => {
  const ids = resources.value.map(r => r.id);
  return ids.length > 0 && ids.every(id => selected.value.has(id));
});

async function onToggle(on: boolean) {
  await update({ snifferEnabled: on });
  on ? await start() : await stop();
  if (on) await refreshTarget();
}

// 视图切换:持久化到 settings,重开 popup 仍记住选择
async function setView(view: SnifferViewMode) {
  if (settings.value.snifferView === view) return;
  await update({ snifferView: view });
}

// 排序方向切换:持久化到 settings
async function setSortOrder(order: SnifferSortOrder) {
  if (settings.value.snifferSortOrder === order) return;
  await update({ snifferSortOrder: order });
}

// 尺寸过滤:change/blur 时把 draft 写入 settings(空或非法 → 0 = 不过滤)
async function applyMinWidth() {
  const n = Math.max(0, Math.floor(Number(minWidthDraft.value) || 0));
  if (settings.value.snifferMinWidth !== n) await update({ snifferMinWidth: n });
}
async function applyMinHeight() {
  const n = Math.max(0, Math.floor(Number(minHeightDraft.value) || 0));
  if (settings.value.snifferMinHeight !== n) await update({ snifferMinHeight: n });
}

// 常见宽高比(key=显示值, value=实际比值)。匹配带容差 ±0.05
const ASPECT_RATIOS: { key: string; value: number }[] = [
  { key: '1:1', value: 1 },
  { key: '4:3', value: 4 / 3 },
  { key: '3:2', value: 3 / 2 },
  { key: '16:9', value: 16 / 9 },
  { key: '21:9', value: 21 / 9 },
  { key: '3:4', value: 3 / 4 },
  { key: '2:3', value: 2 / 3 },
  { key: '9:16', value: 9 / 16 },
];
const ASPECT_TOLERANCE = 0.05;

function isRatioSelected(key: string): boolean {
  return settings.value.snifferAspectRatios.includes(key);
}
async function toggleRatio(key: string) {
  const set = new Set(settings.value.snifferAspectRatios);
  set.has(key) ? set.delete(key) : set.add(key);
  await update({ snifferAspectRatios: [...set] });
}

function resetSizeFilter() {
  minWidthDraft.value = '';
  minHeightDraft.value = '';
  void update({ snifferMinWidth: 0, snifferMinHeight: 0, snifferAspectRatios: [] });
}

// 排序 + 尺寸过滤(AND: px 阈值 与 比例命中均需满足)后的可见资源
const visibleResources = computed(() => {
  const order = settings.value.snifferSortOrder;
  const mw = settings.value.snifferMinWidth;
  const mh = settings.value.snifferMinHeight;
  const ratios = settings.value.snifferAspectRatios;
  const ratioValues = ASPECT_RATIOS
    .filter(r => ratios.includes(r.key))
    .map(r => r.value);
  const useSize = mw > 0 || mh > 0;
  const useRatio = ratioValues.length > 0;

  let arr = resources.value;
  if (useSize || useRatio) {
    arr = arr.filter(r => {
      const w = r.width ?? 0;
      const h = r.height ?? 0;
      // px 尺寸:宽高均需达阈值(未设阈值项跳过)
      if (useSize && !((mw <= 0 || w >= mw) && (mh <= 0 || h >= mh))) return false;
      // 比例:无尺寸数据直接排除;否则命中任一比例(OR)且带容差
      if (useRatio) {
        if (!w || !h) return false;
        const actual = w / h;
        if (!ratioValues.some(rv => Math.abs(actual - rv) <= ASPECT_TOLERANCE)) return false;
      }
      return true;
    });
  }
  const sorted = [...arr];
  sorted.sort((a, b) => order === 'desc' ? b.sniffedAt - a.sniffedAt : a.sniffedAt - b.sniffedAt);
  return sorted;
});

/** 与 mira-plugin-ui 的 SaveLocation 对齐(exports 通配符下 types 路径解析不稳,故内联) */
interface ImportLocation {
  libraryId: string;
  folderId?: string;
  tags?: string[];
}

/** 批量导入选中资源;loc 指定导入落点(素材库/文件夹/标签),缺省导入当前库 */
async function importSelected(loc?: ImportLocation) {
  const targets = resources.value.filter(r => selected.value.has(r.id));
  if (!targets.length) return;
  const importCandidates = new Map(targets.map(r => [r.id, [r.url]]));
  // 预处理(解析大图地址)阶段进度:后台 BATCH_PROGRESS 只覆盖其后的抓取/上传,这里本地驱动
  progress.value = { phase: 'upgrade', done: 0, total: targets.length, stage: 'fetch' };
  let resolved = 0;
  await runConcurrent(targets, settings.value.batchImportConcurrency, async r => {
    if (settings.value.imuEnabled && r.tabId) {
      try {
        const candidates = await bg.upgradeImageUrl(r.tabId, r.url, undefined, settings.value.imuRules);
        const urls = [...new Set([...candidates, r.url])];
        importCandidates.set(r.id, urls);
        dbg.log('sniffer', 'upgraded', { original: r.url, url: urls[0], count: urls.length });
      } catch (error) {
        dbg.warn('sniffer', 'upload selected upgrade failed, use original', { url: r.url, error });
      }
    } else {
      dbg.log('sniffer', 'upload selected maxurl skipped', { url: r.url, imuEnabled: settings.value.imuEnabled, tabId: r.tabId });
    }
    resolved++;
    progress.value = { phase: 'upgrade', done: resolved, total: targets.length, stage: 'fetch' };
  });
  try {
    await bg.batchImport(targets.map(r => ({
      urls: importCandidates.get(r.id)!,
      fallbackUrl: r.url,
      filename: filenameOf(r),
      referrer: r.referrer || r.pageUrl,
    })), loc?.libraryId ?? settings.value.libraryId,
      loc?.folderId ? Number(loc.folderId) : undefined,
      loc?.tags?.length ? loc.tags : undefined);
    selected.value.clear();
  } finally {
    progress.value = null;
  }
}

/** 上传所选:导入当前素材库(不带落点) */
async function uploadSelected() {
  await importSelected();
}

// ---- 导入到(SaveLocationDialog,内为 mira-plugin-ui 的 SaveLocationForm) ----
const importToOpen = ref(false);
const importToLibraryId = ref('');
const importToInitialFolderId = ref('');
const importToFolders = ref<any[]>([]);
const importToTags = ref<any[]>([]);

async function loadImportToTree() {
  if (!importToLibraryId.value) return;
  importToFolders.value = await bg.listFolders(importToLibraryId.value).catch(() => []);
  importToTags.value = await bg.listTags(importToLibraryId.value).catch(() => []);
}

async function openImportTo() {
  if (!selected.value.size) return;
  importToLibraryId.value = settings.value.libraryId;
  importToInitialFolderId.value = '';
  await loadImportToTree();
  importToOpen.value = true;
}

/** 切库:刷新树数据并清初始落点 */
async function onImportToLibraryChange(id: string) {
  importToLibraryId.value = id;
  importToInitialFolderId.value = '';
  await loadImportToTree();
}

/** 树内「新增」:走 background 创建后刷新树(background 不回新节点 id,不自动选中) */
async function importToCreateNode({ kind, parentId, title }: { kind: 'folder' | 'tag'; parentId: number; title: string }): Promise<number | undefined> {
  await bg.createNode(kind, importToLibraryId.value, title, parentId);
  await loadImportToTree();
  return undefined;
}

async function onImportToSave(loc: ImportLocation) {
  importToOpen.value = false;
  await importSelected(loc);
}

/** url 末段当文件名;解码失败回退 resource */
function filenameOf(r: SniffedResource): string {
  const raw = r.url.split('/').pop()?.split('?')[0];
  if (!raw) return `resource-${r.id}`;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

async function downloadSelected() {
  const targets = resources.value.filter(r => selected.value.has(r.id));
  if (!targets.length) return;
  const items = targets.map(r => ({
    url: r.url,
    filename: filenameOf(r),
    referrer: r.referrer || r.pageUrl,
  }));
  try {
    await bg.downloadResources(items);
    selected.value.clear();
  } finally {
    progress.value = null;
  }
}
</script>

<template>
  <div class="view">
    <div class="bar">
      <label>{{ t('sniffer.title') }}</label>
      <Switch :model-value="settings.snifferEnabled" @update:model-value="onToggle" />
    </div>
    <div class="target-bar">
      <!-- 全选 / 反选(基于当前 resources) -->
      <button
        type="button"
        class="select-all"
        :class="{ checked: allSelected }"
        :disabled="!resources.length"
        :title="t('sniffer.selectAll')"
        :aria-label="t('sniffer.selectAll')"
        @click="toggleSelectAll"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <path
            v-if="allSelected"
            d="M3.5 8.5l3 3 6-6.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            v-else
            d="M3.5 8h9"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <select id="sniffer-target" v-model="tabIdRef" :disabled="!settings.snifferEnabled" :title="t('sniffer.targetTab')">
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

      <!-- 过滤入口:排序 + 尺寸过滤 -->
      <div class="filter-wrap">
        <button
          type="button"
          class="icon-entry"
          :class="{ active: filterOpen || filterActive }"
          :title="t('sniffer.filterTitle')"
          :aria-label="t('sniffer.filterTitle')"
          @click="filterOpen = !filterOpen"
        >
          <!-- 漏斗图标 -->
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M2 3.5h12L9.5 9v4l-3 1.5V9L2 3.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          </svg>
        </button>
        <div v-if="filterOpen" class="popover filter-popover">
          <div class="popover-title">{{ t('sniffer.filterTitle') }}</div>
          <!-- 排序 -->
          <div class="filter-group">
            <span class="filter-label">{{ t('sniffer.sortLabel') }}</span>
            <div class="seg-group">
              <button
                type="button" class="seg"
                :class="{ active: settings.snifferSortOrder === 'asc' }"
                :title="t('sniffer.sortAsc')" @click="setSortOrder('asc')"
              >{{ t('sniffer.sortAscShort') }}</button>
              <button
                type="button" class="seg"
                :class="{ active: settings.snifferSortOrder === 'desc' }"
                :title="t('sniffer.sortDesc')" @click="setSortOrder('desc')"
              >{{ t('sniffer.sortDescShort') }}</button>
            </div>
          </div>
          <!-- 最小宽度 -->
          <label class="popover-row">
            <span>{{ t('sniffer.minWidth') }}</span>
            <Input v-model="minWidthDraft" type="number" min="0" placeholder="0" @change="applyMinWidth" @blur="applyMinWidth" />
            <span class="unit">px</span>
          </label>
          <!-- 最小高度 -->
          <label class="popover-row">
            <span>{{ t('sniffer.minHeight') }}</span>
            <Input v-model="minHeightDraft" type="number" min="0" placeholder="0" @change="applyMinHeight" @blur="applyMinHeight" />
            <span class="unit">px</span>
          </label>
          <!-- 宽高比:多选 chip -->
          <div class="filter-group-vertical">
            <span class="filter-label">{{ t('sniffer.aspectRatio') }}</span>
            <div class="ratio-chips">
              <button
                v-for="r in ASPECT_RATIOS" :key="r.key"
                type="button" class="chip"
                :class="{ active: isRatioSelected(r.key) }"
                @click="toggleRatio(r.key)"
              >{{ r.key }}</button>
            </div>
          </div>
          <p class="popover-hint">{{ t('sniffer.sizeFilterHint') }}</p>
          <div class="popover-ops">
            <Button size="sm" variant="ghost" @click="resetSizeFilter">{{ t('sniffer.resetFilter') }}</Button>
          </div>
        </div>
      </div>

      <!-- 自动滚动:dots 入口 → dropdown 设间隔 + 开始/停止 -->
      <div class="autoscroll-wrap">
        <button
          type="button"
          class="icon-entry"
          :class="{ active: autoScrollRunning || autoScrollOpen }"
          :title="t('autoscroll.title')"
          :aria-label="t('autoscroll.title')"
          @click="toggleAutoScrollPopover"
        >
          <!-- 三点(dots)图标 -->
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
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
      v-if="settings.snifferView === 'masonry' && visibleResources.length"
      :resources="visibleResources"
      :selected="selected"
      @toggle="toggle"
    />
    <ResourceList
      v-else-if="settings.snifferView !== 'masonry' && visibleResources.length"
      :resources="visibleResources"
      :selected="selected"
      @toggle="toggle"
    />
    <!-- 空态占位 -->
    <div v-else class="empty">
      <span class="big">{{ settings.snifferEnabled ? '🔍' : '🐽' }}</span>
      <span>{{ settings.snifferEnabled ? t('sniffer.empty') : t('sniffer.emptyOff') }}</span>
      <span class="hint">{{ settings.snifferEnabled ? t('sniffer.emptyHint') : t('sniffer.emptyOffHint') }}</span>
    </div>
    <div v-if="selected.size || progress" class="actions">
      <template v-if="progress">
        <div class="batch-progress">
          <span class="bp-text">{{ progressText }}</span>
          <div class="bp-bar" :class="{ indeterminate: progress.stage === 'finish' }">
            <div class="bp-fill" :style="{ width: progressPct + '%' }" />
          </div>
        </div>
      </template>
      <template v-else>
        <Button @click="uploadSelected">{{ t('sniffer.uploadSelected', { n: selected.size }) }}</Button>
        <Button variant="ghost" @click="openImportTo">{{ t('sniffer.importTo') }}</Button>
        <Button variant="ghost" @click="downloadSelected">{{ t('sniffer.downloadSelected', { n: selected.size }) }}</Button>
      </template>
    </div>

    <!-- 导入到:选素材库/文件夹/标签后批量导入(SaveLocationForm) -->
    <SaveLocationDialog
      v-model:open="importToOpen"
      :libraries="libraries"
      :folders="importToFolders"
      :tags="importToTags"
      :initial-library-id="importToLibraryId"
      :initial-folder-id="importToInitialFolderId"
      :title="t('sniffer.importTo')"
      :description="t('sniffer.importToHint')"
      :submit-text="t('sniffer.importToSubmit')"
      :create-node="importToCreateNode"
      @save="onImportToSave"
      @library-change="onImportToLibraryChange"
    />
  </div>
</template>

<style scoped>
.view { display: flex; flex-direction: column; height: 100%; }

/* 空态占位 */
.empty {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 24px 12px; text-align: center;
  color: var(--muted); font-size: 12px;
}
.empty .big { font-size: 32px; margin-bottom: 4px; }
.empty .hint { font-size: 11px; opacity: 0.7; }
.bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.bar label { flex: 1; }
.target-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.target-bar label { white-space: nowrap; }
.target-bar select { min-width: 0; flex: 1; padding: 4px; background: var(--bg); color: var(--fg); border: 1px solid var(--border); }

/* 全选 / 反选按钮(左上角) */
.select-all {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; flex-shrink: 0; padding: 0;
  background: var(--bg-elev); color: var(--muted);
  border: 1px solid var(--border); border-radius: var(--radius);
  cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.select-all:hover:not(:disabled) { color: var(--fg); }
.select-all.checked { background: var(--primary); color: var(--primary-fg); border-color: var(--primary); }
.select-all:disabled { opacity: 0.4; cursor: not-allowed; }

/* 底部选中操作栏 */
.actions { display: flex; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--border); }

/* 批量操作进度条 */
.batch-progress { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.bp-text { font-size: 11px; color: var(--muted); white-space: nowrap; }
.bp-bar { height: 4px; background: var(--border); border-radius: 9999px; overflow: hidden; }
.bp-fill { height: 100%; background: var(--primary); border-radius: 9999px; transition: width 0.2s ease; }
/* finish 阶段无逐项进度,显示 indeterminate 滑动条 */
.bp-bar.indeterminate { position: relative; }
.bp-bar.indeterminate .bp-fill { width: 40% !important; animation: bp-slide 1s ease-in-out infinite; }
@keyframes bp-slide {
  0% { margin-left: -40%; }
  100% { margin-left: 100%; }
}

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

/* 过滤入口 + popover */
.filter-wrap { position: relative; flex-shrink: 0; }
.filter-popover { width: 240px; }
.filter-group { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.filter-group-vertical { display: flex; flex-direction: column; gap: 6px; }
.filter-label { font-size: 12px; color: var(--muted); }
.seg-group { display: inline-flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.seg-group .seg { width: auto; min-width: 40px; height: 26px; padding: 0 8px; font-size: 12px; }

/* 宽高比多选 chip */
.ratio-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  height: 24px; padding: 0 10px;
  font-size: 12px; line-height: 1;
  background: var(--bg-elev); color: var(--muted);
  border: 1px solid var(--border); border-radius: 9999px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.chip:hover { color: var(--fg); }
.chip.active { background: var(--primary); color: var(--primary-fg); border-color: var(--primary); }

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
