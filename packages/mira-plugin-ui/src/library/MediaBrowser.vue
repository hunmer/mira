<script setup lang="ts">
/**
 * 简易素材库文件浏览器(网格 / 瀑布流两种布局)。
 * 参考自 mira-client MediaTabListView / FilterBar,数据全部由宿主注入(services)。
 *
 * - 工具栏:标题搜索 + 分类筛选(全部/图片/视频/音频) + 排序(字段×方向) + 视图切换 + 刷新
 * - 网格:CSS grid 等比方形卡片;瀑布流:@hunmer/vue-masonry(高度按 item.aspect)
 * - 缩略图地址由 services.getThumbUrl 提供(img 标签无法带 header,宿主自行拼 token)
 *
 * 样式为 tailwind/shadcn 原子类;筛选/排序不在组件内做,条件变化即透传给 services 重新拉取。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { Masonry } from '@hunmer/vue-masonry';
import type { MasonryItemMeta } from '@hunmer/vue-masonry';
import '@hunmer/vue-masonry/style.css';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  LayoutGrid,
  RefreshCw,
  Rows3,
} from '@lucide/vue';
// 注意:library 子入口以源码供宿主直接消费,这里必须用相对路径(宿主的 @ 别名指向其自身 src)
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { createLibraryTreeT } from './i18n';
import type {
  LibraryTreeT,
  MediaBrowserFilters,
  MediaBrowserItem,
  MediaBrowserServices,
} from './types';

const props = defineProps<{
  /** 当前素材库 id;变化时自动重载 */
  libraryId: string;
  /** 数据服务:文件列表加载 + 缩略图地址 */
  services: MediaBrowserServices;
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT;
}>();

/** 视图模式受控切换:grid=网格 / waterfall=瀑布流 */
const view = defineModel<'grid' | 'waterfall'>('view', { default: 'grid' });

const emit = defineEmits<{
  /** 点击文件卡片 */
  itemClick: [item: MediaBrowserItem];
}>();

const fallbackT = createLibraryTreeT();
const tt = (key: string, params?: Record<string, unknown>) => {
  if (!props.t) return fallbackT(key, params);
  const r = props.t(key, params);
  return r === key ? fallbackT(key, params) : r;
};

// ---- 工具栏状态(变化即重新拉取) ----
const keyword = ref('');
const debouncedKeyword = ref('');
const category = ref<'image' | 'video' | 'audio' | undefined>();
const sortField = ref<NonNullable<MediaBrowserFilters['sort']>>('imported_at');
const sortOrder = ref<NonNullable<MediaBrowserFilters['order']>>('desc');

const categories = computed(() => [
  { value: undefined, label: tt('media.categoryAll') },
  { value: 'image' as const, label: tt('media.categoryImage') },
  { value: 'video' as const, label: tt('media.categoryVideo') },
  { value: 'audio' as const, label: tt('media.categoryAudio') },
]);

const sortFields = computed(() => [
  { value: 'imported_at' as const, label: tt('media.sortImportedAt') },
  { value: 'name' as const, label: tt('media.sortName') },
  { value: 'size' as const, label: tt('media.sortSize') },
]);

// ---- 数据加载 ----
const items = ref<MediaBrowserItem[]>([]);
const loading = ref(false);
const error = ref('');

async function load() {
  if (!props.libraryId) {
    items.value = [];
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const filters: MediaBrowserFilters = {
      title: debouncedKeyword.value.trim() || undefined,
      category: category.value,
      sort: sortField.value,
      order: sortOrder.value,
    };
    items.value = await props.services.listFiles(filters);
  } catch (e) {
    error.value = String((e as Error)?.message || e);
    items.value = [];
  } finally {
    loading.value = false;
  }
}

// 搜索关键词防抖,其余条件变化立即重载
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(keyword, (value) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => (debouncedKeyword.value = value), 300);
});
watch(
  [debouncedKeyword, category, () => props.libraryId],
  () => void load(),
);
watch([sortField, sortOrder], () => void load(), { immediate: false });

onMounted(() => void load());

const hasCondition = computed(() => !!debouncedKeyword.value.trim() || !!category.value);
const noMatch = computed(() => !loading.value && !error.value && items.value.length === 0 && hasCondition.value);
const noData = computed(() => !loading.value && !error.value && items.value.length === 0 && !hasCondition.value);

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

/** 瀑布流布局元信息:按 item.aspect 定高度,进入视窗才渲染内容 */
function getMeta(item: MediaBrowserItem): MasonryItemMeta {
  return { aspect: item.aspect || '1:1', lazy: true };
}

function onClickItem(item: MediaBrowserItem) {
  emit('itemClick', item);
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- 工具栏:搜索 + 分类 + 排序 + 视图切换 + 刷新 -->
    <div class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <div class="relative w-48 shrink-0">
        <Input
          v-model="keyword"
          class="h-8 pl-7 text-xs"
          :placeholder="tt('media.searchPlaceholder')"
        />
        <svg
          class="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      <!-- 分类筛选 -->
      <div class="bg-muted flex gap-0.5 rounded-lg p-0.5" role="group">
        <button
          v-for="c in categories"
          :key="c.label"
          type="button"
          class="cursor-pointer rounded-md px-2 py-1 text-[11px] leading-none font-medium transition-colors duration-100"
          :class="category === c.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="category = c.value"
        >
          {{ c.label }}
        </button>
      </div>

      <!-- 排序:字段 + 方向 -->
      <Select
        :model-value="sortField"
        @update:model-value="v => (sortField = v as typeof sortField)"
      >
        <SelectTrigger size="sm" class="h-8 gap-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="f in sortFields" :key="f.value" :value="f.value">{{ f.label }}</SelectItem>
        </SelectContent>
      </Select>
      <button
        type="button"
        class="text-muted-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent transition-colors duration-150 hover:bg-accent hover:text-foreground"
        :title="sortOrder === 'desc' ? tt('media.orderDesc') : tt('media.orderAsc')"
        @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
      >
        <ArrowDownAZ v-if="sortOrder === 'desc'" class="size-4" />
        <ArrowUpAZ v-else class="size-4" />
      </button>

      <div class="ms-auto flex items-center gap-2">
        <span class="text-muted-foreground shrink-0 text-xs tabular-nums">{{ tt('media.fileCount', { n: items.length }) }}</span>

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

    <!-- 内容区 -->
    <div class="min-h-0 flex-1 overflow-y-auto p-3">
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
          class="group bg-card text-card-foreground hover:border-primary/50 cursor-pointer overflow-hidden rounded-lg border text-left transition-colors duration-150"
          :title="item.title"
          @click="onClickItem(item)"
        >
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

      <!-- 瀑布流视图:高度按 item.aspect -->
      <Masonry
        v-else
        :data="items"
        :columns="{ base: 2, sm: 3, md: 4, lg: 5 }"
        :gap="12"
        :get-key="(item: MediaBrowserItem) => item.id"
        :get-meta="getMeta"
      >
        <template #default="{ item }">
          <button
            :key="item.id"
            type="button"
            class="group bg-card text-card-foreground hover:border-primary/50 relative w-full cursor-pointer overflow-hidden rounded-lg border text-left transition-colors duration-150"
            :title="item.title"
            @click="onClickItem(item as MediaBrowserItem)"
          >
            <img
              v-if="thumbOf(item as MediaBrowserItem)"
              :src="thumbOf(item as MediaBrowserItem)"
              :alt="(item as MediaBrowserItem).title"
              class="w-full object-cover"
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
    </div>
  </div>
</template>
