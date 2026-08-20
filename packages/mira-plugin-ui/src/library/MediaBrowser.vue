<script setup lang="ts">
/**
 * 简易素材库文件浏览器(网格 / 瀑布流两种布局)。
 * 参考自 mira-client MediaTabListView / FilterBar,数据全部由宿主注入(services)。
 *
 * - 工具栏:FilterBar(7 类筛选器 + 排序 + 已保存过滤器,宿主注入数据) + 计数/视图切换/刷新
 * - 网格:CSS grid 等比方形卡片;瀑布流:@hunmer/vue-masonry(高度按 item.aspect)
 * - 缩略图地址由 services.getThumbUrl 提供(img 标签无法带 header,宿主自行拼 token)
 * - 选择:传 v-model:selected 启用(点选 / Ctrl 加选 / Shift 连选 / 空白拖拽框选,Alt 减选)
 *
 * 样式为 tailwind/shadcn 原子类;筛选/排序不在组件内做,条件变化即透传给 services 重新拉取。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { Masonry } from '@hunmer/vue-masonry';
import type { MasonryItemMeta } from '@hunmer/vue-masonry';
import '@hunmer/vue-masonry/style.css';
import { SelectionBox } from '@hunmer/vue-selection-box';
import '@hunmer/vue-selection-box/style.css';
import {
  Check,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  LayoutGrid,
  RefreshCw,
  Rows3,
  Server,
  X,
} from '@lucide/vue';
// 注意:library 子入口以源码供宿主直接消费,这里必须用相对路径(宿主的 @ 别名指向其自身 src)
import FilterBar from './FilterBar.vue';
import LibrarySelect from './LibrarySelect.vue';
import ServerManagerDialog from './ServerManagerDialog.vue';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '../components/ui/menubar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import { buildTree } from './tree';
import {
  applySnapshotToRule,
  createDefaultFilterRules,
  hasActiveFilterConditions,
  resetFilterRule,
  rulesToFilters,
} from './filterBar';
import { createLibraryTreeT } from './i18n';
import type {
  FilterBarSortOption,
  FilterRule,
  LibraryTreeNode,
  LibrarySelectServer,
  LibraryTreeT,
  MediaBrowserFilters,
  MediaBrowserItem,
  MediaBrowserServerManager,
  MediaBrowserServices,
  SavedFilter,
} from './types';

const props = defineProps<{
  /** 数据服务:文件列表加载 + 缩略图地址 */
  services: MediaBrowserServices;
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT;
  /** 瀑布流布局模式:fill=自动回填空隙(默认) / stream=纯流式保序 */
  waterfallMode?: 'stream' | 'fill';
  /** 已保存的过滤器(透传给 FilterBar;传宿主持久化数据后启用已保存过滤器入口) */
  savedFilters?: SavedFilter[];
  /** FilterBar 排序选项(缺省用内置 8 项,与桌面端一致) */
  sortOptions?: FilterBarSortOption[];
  /**
   * 外部附加筛选(如三栏视图左侧树选中的文件夹/标签)。
   * 数组字段(folders/tags)与 FilterBar 内置筛选合并去重,其余字段覆盖;变化时自动回第 1 页重载。
   */
  extraFilters?: Partial<MediaBrowserFilters>;
  /** 素材库选择器数据(LibrarySelect 的服务器分组);传入后菜单栏右侧显示选择器 */
  libraryServers?: LibrarySelectServer[];
  /** 服务器管理数据;传入后显示服务器图标,点击弹 ServerManagerView(Dialog) */
  serverManager?: MediaBrowserServerManager;
}>();

/** 当前素材库 id;变化时自动重载(传 v-model:library-id 后可经选择器切换) */
const libraryId = defineModel<string>('libraryId', { required: true });

/** 视图模式受控切换:grid=网格 / waterfall=瀑布流 */
const view = defineModel<'grid' | 'waterfall'>('view', { default: 'grid' });

/** 受控选择:传 v-model:selected 启用(点选/框选);不传则纯浏览,无选择交互 */
const selected = defineModel<MediaBrowserItem[]>('selected');

const emit = defineEmits<{
  /** 点击文件卡片 */
  itemClick: [item: MediaBrowserItem];
  /** Delete 快捷键:启用选择且容器聚焦时触发,删除动作由宿主实现 */
  deleteSelection: [items: MediaBrowserItem[]];
  /** FilterBar 新建/编辑已保存的过滤器(宿主持久化) */
  saveSavedFilter: [name: string, rules: FilterRule[], editingId: string | null];
  /** FilterBar 删除已保存的过滤器(宿主持久化) */
  deleteSavedFilter: [filterId: string];
  /** 菜单「导入文件」:宿主文件多选选完后抛出(宿主可打开 BatchUploadForm 上传表单) */
  importFiles: [files: File[]];
}>();

const fallbackT = createLibraryTreeT();
const tt = (key: string, params?: Record<string, unknown>) => {
  if (!props.t) return fallbackT(key, params);
  const r = props.t(key, params);
  return r === key ? fallbackT(key, params) : r;
};

// ---- 过滤/排序状态(变化即重新拉取) ----
const filterRules = ref<FilterRule[]>(createDefaultFilterRules(tt));
const sortField = ref<NonNullable<MediaBrowserFilters['sort']>>('imported_at');
const sortOrder = ref<NonNullable<MediaBrowserFilters['order']>>('desc');
/** 当前已应用的已保存过滤器 id(手动改筛选时自动取消关联) */
const appliedFilterId = ref<string | null>(null);

// 文件夹/标签选择树(services 提供列表接口时启用对应筛选器)
const folderTree = ref<LibraryTreeNode[]>([]);
const tagTree = ref<LibraryTreeNode[]>([]);

// ---- 数据加载(分页:一页最多 500;宿主返回 total 才显示底部翻页条) ----
const PAGE_SIZE = 500;
const page = ref(1);
const total = ref<number | undefined>(undefined);
const pageCount = computed(() =>
  total.value !== undefined ? Math.max(1, Math.ceil(total.value / PAGE_SIZE)) : 1,
);

// 已见条目缓存(id -> 对象):跨页选择的 id 解析回对象,列表刷新不丢已选项
const itemCache = new Map<string, MediaBrowserItem>();

const items = ref<MediaBrowserItem[]>([]);
const loading = ref(false);
const error = ref('');

// 请求版本号:筛选变化回第 1 页时丢弃仍在途的旧页请求,防止过期响应覆盖新结果
let loadVersion = 0;

async function load() {
  if (!libraryId.value) {
    items.value = [];
    total.value = undefined;
    return;
  }
  const version = ++loadVersion;
  loading.value = true;
  error.value = '';
  try {
    const paged = {
      sort: sortField.value,
      order: sortOrder.value,
      limit: PAGE_SIZE,
      offset: (page.value - 1) * PAGE_SIZE,
    };
    const filters = { ...rulesToFilters(filterRules.value, paged) };
    // 外部附加筛选:数组字段与规则结果合并去重,其余字段覆盖;分页参数始终以内部状态为准
    for (const [key, value] of Object.entries(props.extraFilters ?? {})) {
      if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) continue;
      if (Array.isArray(value) && Array.isArray(filters[key as 'folders'])) {
        filters[key as 'folders'] = [...new Set([...filters[key as 'folders'] as (string | number)[], ...value])] as (string | number)[];
      } else {
        (filters as Record<string, unknown>)[key] = value;
      }
    }
    Object.assign(filters, paged);
    const ret = await props.services.listFiles(filters);
    if (version !== loadVersion) return;
    if (Array.isArray(ret)) {
      items.value = ret;
      total.value = undefined;
    } else {
      items.value = ret.items;
      total.value = ret.total;
    }
    items.value.forEach(i => itemCache.set(String(i.id), i));
  } catch (e) {
    if (version !== loadVersion) return;
    error.value = String((e as Error)?.message || e);
    items.value = [];
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}

/** 筛选/排序变化:回到第 1 页拉取(load 带版本守卫,重复调用安全) */
function resetPage() {
  page.value = 1;
  void load();
}

/** 翻页:更新页码后按新 offset 拉取 */
function turnPage(p: number) {
  if (p === page.value) return;
  page.value = p;
  void load();
}

async function loadTrees() {
  if (props.services.listFolders) {
    try {
      folderTree.value = buildTree((await props.services.listFolders()) || []);
    } catch {
      folderTree.value = [];
    }
  }
  if (props.services.listTags) {
    try {
      tagTree.value = buildTree((await props.services.listTags()) || []);
    } catch {
      tagTree.value = [];
    }
  }
}

// ---- FilterBar 事件编排(语义对齐桌面端 useMediaTabFilters) ----
// 标题输入防抖,其余筛选变化立即重载
let titleTimer: ReturnType<typeof setTimeout> | undefined;

function onFilterChange(filter: FilterRule) {
  appliedFilterId.value = null;
  if (filter.id === 'title') {
    clearTimeout(titleTimer);
    titleTimer = setTimeout(() => resetPage(), 300);
  } else {
    resetPage();
  }
}

function onFilterClear() {
  appliedFilterId.value = null;
  resetPage();
}

function onSortChange(field: string, order: string) {
  sortField.value = field as typeof sortField.value;
  sortOrder.value = order as typeof sortOrder.value;
  resetPage();
}

/** 应用已保存的过滤器:整套回填规则显示后按新条件重载 */
function onApplySavedFilter(filterId: string, rules: FilterRule[]) {
  const byId = new Map(rules.map(rule => [rule.id, rule]));
  filterRules.value.forEach(rule => applySnapshotToRule(rule, byId.get(rule.id)));
  appliedFilterId.value = filterId;
  resetPage();
}

/** 清除全部筛选条件(重置规则显示后重载) */
function onClearAllFilters() {
  filterRules.value.forEach(rule => resetFilterRule(rule));
  appliedFilterId.value = null;
  resetPage();
}

watch(
  libraryId,
  () => {
    itemCache.clear();
    resetPage();
    void loadTrees();
  },
);

// 外部附加筛选变化(如左侧树选中):回到第 1 页重新拉取
watch(() => props.extraFilters, () => resetPage(), { deep: true });

onMounted(() => {
  void load();
  void loadTrees();
});

const hasCondition = computed(() => hasActiveFilterConditions(filterRules.value));
const noMatch = computed(() => !loading.value && !error.value && items.value.length === 0 && hasCondition.value);
const noData = computed(() => !loading.value && !error.value && items.value.length === 0 && !hasCondition.value);

// ---- 选择(SelectionBox 框选 + 点选;selectedIds 为 id 字符串集,与 selected 双向同步) ----
const selectionEnabled = computed(() => selected.value !== undefined);
const selectionBoxRef = ref<InstanceType<typeof SelectionBox> | null>(null);
const selectedIds = ref<string[]>([]);

// 内部选择集 -> 宿主 selected(按 itemCache 解析回对象,支持跨页保持已选项)。
// 两个方向的 watch 都做内容比较:赋值必然产生新数组引用,若不比较会互相触发无限循环
// (Maximum recursive updates exceeded)。
watch(selectedIds, (ids) => {
  if (!selectionEnabled.value) return;
  const next = ids.map(id => itemCache.get(id)).filter((i): i is MediaBrowserItem => !!i);
  if (next.map(i => String(i.id)).join() === (selected.value ?? []).map(i => String(i.id)).join()) return;
  selected.value = next;
});

// 宿主 selected -> 内部选择集
watch(selected, (sel) => {
  if (sel === undefined) return;
  const next = sel.map(i => String(i.id));
  if (next.join() === selectedIds.value.join()) return;
  selectedIds.value = next;
}, { deep: true, immediate: true });

function isSelected(item: MediaBrowserItem): boolean {
  return selectionEnabled.value && selectedIds.value.includes(String(item.id));
}

/** 卡片点击:启用选择时走 SelectionBox 的修饰键逻辑(Ctrl/Shift/Alt),并抛 itemClick */
function onClickItem(item: MediaBrowserItem, event: MouseEvent) {
  if (selectionEnabled.value) {
    selectionBoxRef.value?.handleItemClick(String(item.id), event);
  }
  emit('itemClick', item);
}

function clearSelection() {
  selectedIds.value = [];
}

// ---- 全选(FilterBar 的全选开关;按"当前页全部选中"判定,翻页选择互不覆盖) ----
const isAllSelected = computed(
  () => selectionEnabled.value && items.value.length > 0
    && items.value.every(i => selectedIds.value.includes(String(i.id))),
);

/** 当前页全选/取消(增删当前页 id,保留其他页的已选) */
function toggleSelectAll() {
  if (!selectionEnabled.value) return;
  const ids = items.value.map(i => String(i.id));
  const set = new Set(selectedIds.value);
  if (ids.every(id => set.has(id))) ids.forEach(id => set.delete(id));
  else ids.forEach(id => set.add(id));
  selectedIds.value = [...set];
}

/** SelectionBox 的 Delete 快捷键:按 id 从缓存解析回对象抛给宿主 */
function onDeleteSelection(ids: string[]) {
  const selected = ids.map(id => itemCache.get(id)).filter((i): i is MediaBrowserItem => !!i);
  if (selected.length) emit('deleteSelection', selected);
}

// ---- 菜单「导入文件」:触发隐藏的文件多选 input,选完抛给宿主(打开上传表单) ----
const importInputRef = ref<HTMLInputElement | null>(null);

// ---- 服务器管理弹层(ServerManagerView 的 Dialog 包装) ----
const serverManagerOpen = ref(false);

function pickImportFiles() {
  importInputRef.value?.click();
}

function onImportChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  // 重置 value,允许下次再选同一批文件
  input.value = '';
  if (files.length) emit('importFiles', files);
}

defineExpose({
  /** 重新拉取文件列表与文件夹/标签树(宿主批量删除等操作后调用) */
  refresh() {
    void load()
    void loadTrees()
  },
});

// ---- 卡片辅助 ----
function iconOf(item: MediaBrowserItem) {
  const mime = item.mime_type || '';
  const ext = (item.extension || '').toLowerCase();
  if (mime.startsWith('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return FileImage;
  if (mime.startsWith('video') || ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) return FileVideo;
  if (mime.startsWith('audio') || ['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return FileAudio;
  return FileText;
}

// 加载失败的缩略图(服务端对未生成缩略图的文件返回 404)记录后回退类型图标
const brokenThumbs = ref(new Set<string | number>());

function thumbOf(item: MediaBrowserItem): string | undefined {
  if (brokenThumbs.value.has(item.id)) return undefined;
  return props.services.getThumbUrl?.(item);
}

function onThumbError(item: MediaBrowserItem) {
  brokenThumbs.value = new Set(brokenThumbs.value).add(item.id);
}

function formatSize(size?: number): string {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

// ---- 瀑布流宽高预取(services.getMetadataByIds 提供后启用,参考桌面端 WaterfallComponent) ----
// id -> "W:H" 宽高比;优先级 item.aspect > 预取缓存 > 1:1
const ratios = ref<Record<string, string>>({});
let ratioVersion = 0;

async function preloadRatios() {
  const fetcher = props.services.getMetadataByIds;
  if (!fetcher || view.value !== 'waterfall') return;
  const pending = items.value.filter(i => !i.aspect && !ratios.value[String(i.id)]);
  if (!pending.length) return;
  const version = ++ratioVersion;
  try {
    const entries = await fetcher(pending.map(i => i.id));
    if (version !== ratioVersion) return;
    const next = { ...ratios.value };
    for (const entry of entries ?? []) {
      const w = Number(entry.width);
      const h = Number(entry.height);
      if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
        next[String(entry.id)] = `${w}:${h}`;
      }
    }
    ratios.value = next;
  } catch {
    // metadata 不可用:保持 1:1 兜底
  }
}

watch([items, view], () => void preloadRatios());

/** 瀑布流布局元信息:按 item.aspect 定高度,进入视窗才渲染内容 */
function getMeta(item: MediaBrowserItem): MasonryItemMeta {
  return { aspect: item.aspect || ratios.value[String(item.id)] || '1:1', lazy: true };
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- 菜单栏:文件操作(导入文件等) + 素材库选择器 + 服务器管理 -->
    <div class="flex items-center gap-2 border-b border-border px-2 py-1">
      <Menubar class="h-7 gap-0.5 rounded-md border-none p-0.5 shadow-none">
        <MenubarMenu>
          <MenubarTrigger class="px-2 py-0.5 text-xs">{{ tt('menu.file') }}</MenubarTrigger>
          <MenubarContent :side-offset="4">
            <MenubarItem @select="pickImportFiles">{{ tt('menu.importFiles') }}</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <!-- 导入文件多选 input:选完抛 importFiles,由宿主打开上传表单 -->
      <input ref="importInputRef" type="file" multiple class="hidden" @change="onImportChange" />

      <!-- 素材库选择器(传入 libraryServers 后显示);切换即 v-model:libraryId -->
      <div v-if="libraryServers?.length" class="ms-auto w-44">
        <LibrarySelect v-model="libraryId" :servers="libraryServers" />
      </div>

      <!-- 服务器管理(传入 serverManager 后显示):点击弹 ServerManagerView -->
      <button
        v-if="serverManager"
        type="button"
        class="text-muted-foreground inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent transition-colors duration-150 hover:bg-accent hover:text-foreground"
        :title="tt('server.manager')"
        @click="serverManagerOpen = true"
      >
        <Server class="size-4" />
      </button>
    </div>

    <!-- 工具栏:FilterBar(筛选/排序/已保存过滤器) + 视图切换/刷新 -->
    <div class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <FilterBar
        class="min-w-0 flex-1"
        :filters="filterRules"
        :is-all-selected="selectionEnabled ? isAllSelected : undefined"
        :folder-tree-items="folderTree"
        :tag-tree-items="tagTree"
        :sort="sortField"
        :order="sortOrder"
        :sort-options="props.sortOptions"
        :saved-filters="props.savedFilters"
        :applied-filter-id="appliedFilterId"
        :t="tt"
        @select-all="toggleSelectAll"
        @filter-change="onFilterChange"
        @filter-clear="onFilterClear"
        @sort-change="onSortChange"
        @apply-saved-filter="onApplySavedFilter"
        @clear-filters="onClearAllFilters"
        @save-saved-filter="(name, rules, editingId) => emit('saveSavedFilter', name, rules, editingId)"
        @delete-saved-filter="filterId => emit('deleteSavedFilter', filterId)"
      />

      <div class="ms-auto flex items-center gap-2">
        <!-- 视图切换:网格 / 瀑布流 -->
        <div class="bg-muted flex gap-0.5 rounded-lg p-0.5" role="group">
          <button
            v-for="v in (['grid', 'waterfall'] as const)"
            :key="v"
            type="button"
            class="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] leading-none font-medium transition-colors duration-100"
            :class="view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            :title="v === 'grid' ? tt('media.viewGrid') : tt('media.viewWaterfall')"
            @click="view = v"
          >
            <LayoutGrid v-if="v === 'grid'" class="size-3.5" />
            <Rows3 v-else class="size-3.5" />
            <span class="hidden sm:inline">{{ v === 'grid' ? tt('media.viewGrid') : tt('media.viewWaterfall') }}</span>
          </button>
        </div>

        <!-- 刷新 -->
        <button
          type="button"
          class="text-muted-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent transition-colors duration-150 hover:bg-accent hover:text-foreground"
          :title="tt('common.refresh')"
          @click="load()"
        >
          <RefreshCw class="size-4" :class="loading && 'animate-spin'" />
        </button>
      </div>
    </div>

    <!-- 内容区:SelectionBox 提供空白处拖拽框选(Alt 拖拽减选) -->
    <SelectionBox
      ref="selectionBoxRef"
      v-model="selectedIds"
      class="min-h-0 flex-1 overflow-y-auto p-3"
      :tabindex="selectionEnabled ? 0 : undefined"
      :enable-select-all-shortcut="selectionEnabled"
      :enable-delete-selection-shortcut="selectionEnabled"
      @delete-selection="onDeleteSelection"
    >
      <!-- 加载中 -->
      <div v-if="loading && !items.length" class="text-muted-foreground flex h-full items-center justify-center text-sm">
        {{ tt('common.loading') }}
      </div>

      <!-- 错误 -->
      <div v-else-if="error" class="text-destructive flex h-full items-center justify-center text-sm">
        {{ tt('library.loadFailed', { error }) }}
      </div>

      <!-- 空态 -->
      <div v-else-if="noData" class="text-muted-foreground flex h-full flex-col items-center justify-center gap-1 text-sm">
        <span class="text-3xl">🗂️</span>
        <span>{{ tt('media.emptyTitle') }}</span>
        <span class="text-[11px] opacity-70">{{ tt('media.emptyHint') }}</span>
      </div>

      <!-- 搜索/筛选无结果 -->
      <div v-else-if="noMatch" class="text-muted-foreground flex h-full items-center justify-center text-sm">
        {{ tt('media.noMatch') }}
      </div>

      <!-- 网格视图:等比方形卡片 -->
      <div
        v-else-if="view === 'grid'"
        class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3"
      >
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          :data-selectable-id="selectionEnabled ? String(item.id) : undefined"
          class="group bg-card text-card-foreground hover:border-primary/50 relative cursor-pointer overflow-hidden rounded-lg border text-left transition-colors duration-150"
          :class="isSelected(item) && 'border-primary ring-2 ring-primary'"
          :title="item.title"
          @click="onClickItem(item, $event)"
        >
          <!-- 选中角标 -->
          <span
            v-if="isSelected(item)"
            class="bg-primary absolute top-1.5 left-1.5 z-10 flex size-5 items-center justify-center rounded-full text-white shadow"
          >
            <Check class="size-3.5" />
          </span>
          <div class="bg-muted relative aspect-square overflow-hidden">
            <img
              v-if="thumbOf(item)"
              :src="thumbOf(item)"
              :alt="item.title"
              loading="lazy"
              class="size-full object-cover transition-transform duration-200 group-hover:scale-105"
              @error="onThumbError(item)"
            />
            <component :is="iconOf(item)" v-else class="text-muted-foreground/50 absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div class="flex flex-col gap-0.5 p-2">
            <span class="truncate text-xs font-medium">{{ item.title }}</span>
            <span class="text-muted-foreground truncate text-[11px]">
              {{ [formatSize(item.size), item.extension?.toUpperCase()].filter(Boolean).join(' · ') || '—' }}
            </span>
          </div>
        </button>
      </div>

      <!-- 瀑布流视图:高度按 item.aspect;fill 模式自动回填空隙 -->
      <Masonry
        v-else
        :data="items"
        :columns="{ base: 2, sm: 3, md: 4, lg: 5 }"
        :gap="12"
        :layout-mode="waterfallMode ?? 'fill'"
        :get-key="(item: MediaBrowserItem) => item.id"
        :get-meta="getMeta"
      >
        <template #default="{ item }">
          <button
            :key="item.id"
            type="button"
            :data-selectable-id="selectionEnabled ? String((item as MediaBrowserItem).id) : undefined"
            class="group bg-card text-card-foreground hover:border-primary/50 relative h-full w-full cursor-pointer overflow-hidden rounded-lg border transition-colors duration-150"
            :class="isSelected(item as MediaBrowserItem) && 'border-primary ring-2 ring-primary'"
            :title="(item as MediaBrowserItem).title"
            @click="onClickItem(item as MediaBrowserItem, $event)"
          >
            <!-- 选中角标 -->
            <span
              v-if="isSelected(item as MediaBrowserItem)"
              class="bg-primary absolute top-1.5 left-1.5 z-10 flex size-5 items-center justify-center rounded-full text-white shadow"
            >
              <Check class="size-3.5" />
            </span>
            <img
              v-if="thumbOf(item as MediaBrowserItem)"
              :src="thumbOf(item as MediaBrowserItem)"
              :alt="(item as MediaBrowserItem).title"
              class="h-full w-full object-cover"
              @error="onThumbError(item as MediaBrowserItem)"
            />
            <component :is="iconOf(item as MediaBrowserItem)" v-else class="text-muted-foreground/50 absolute inset-0 m-auto size-10" />
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
              <span class="line-clamp-1 text-xs font-medium text-white">{{ (item as MediaBrowserItem).title }}</span>
              <span class="text-[11px] text-white/70">
                {{ [formatSize((item as MediaBrowserItem).size), (item as MediaBrowserItem).extension?.toUpperCase()].filter(Boolean).join(' · ') || '—' }}
              </span>
            </div>
          </button>
        </template>
      </Masonry>
    </SelectionBox>

    <!-- 底部状态栏:文件总数 + 已选计数/取消选择 + 翻页(宿主返回 total 且不止一页;一页最多 500 条) -->
    <div class="flex shrink-0 flex-wrap items-center gap-4 border-t border-border px-3 py-2">
      <div class="flex shrink-0 items-center gap-1.5">
        <span class="text-muted-foreground text-xs tabular-nums">{{ tt('media.fileCount', { n: items.length }) }}</span>
        <template v-if="selectionEnabled && selectedIds.length">
          <span class="text-muted-foreground text-xs">·</span>
          <span class="text-primary text-xs font-medium tabular-nums">{{ tt('media.selectedCount', { n: selectedIds.length }) }}</span>
          <button
            type="button"
            class="text-muted-foreground inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent transition-colors duration-150 hover:bg-accent hover:text-foreground"
            :title="tt('media.clearSelection')"
            @click="clearSelection"
          >
            <X class="size-3.5" />
          </button>
        </template>
      </div>

      <Pagination
        v-if="total !== undefined && pageCount > 1"
        class="mx-auto"
        :page="page"
        :total="total"
        :items-per-page="PAGE_SIZE"
        :sibling-count="1"
        @update:page="turnPage"
      >
        <PaginationContent v-slot="{ items: pages }">
          <PaginationItem>
            <PaginationPrevious>{{ tt('media.prevPage') }}</PaginationPrevious>
          </PaginationItem>
          <PaginationItem v-for="(item, index) in pages" :key="index">
            <PaginationLink v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
              {{ item.value }}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext>{{ tt('media.nextPage') }}</PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>

    <!-- 服务器管理弹层(ServerManagerView):激活成功后由宿主 services.activate 切换服务器 -->
    <ServerManagerDialog
      v-if="serverManager"
      v-model:open="serverManagerOpen"
      :servers="serverManager.servers"
      :active-server-id="serverManager.activeServerId"
      :services="serverManager.services"
    />
  </div>
</template>
