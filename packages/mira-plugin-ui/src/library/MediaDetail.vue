<script setup lang="ts">
/**
 * 文件详情面板(单选编辑 / 多选合并展示)。
 * 自 mira-client MediaDetailComponent 复刻,数据与保存动作全部由宿主注入(services):
 *
 * - 单选:预览大图(加载后 canvas 提取主色调色板)、名称/网址/备注/评分编辑(blur/回车保存)、
 *   标签弹层(树勾选)/文件夹弹层(树单选)、基本信息(大小/时间/尺寸/时长)
 * - 多选:叠放相册预览 + 合并标签/文件夹/数量/总大小,支持批量设置标签与文件夹
 * - 保存成功后本地覆盖显示(不等列表刷新),并 emit updated 供宿主刷新文件列表
 *
 * 替代桌面端依赖:stores → services 注入;FolderTreeComponent → LibraryTree;
 * Popover/Input → 包内 shadcn 组件;material-icons → lucide;ColorThief → 内置 canvas 提色。
 * 样式为 tailwind/shadcn 原子类。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { Copy, ExternalLink, Folder, FolderOpen, Pencil, Plus, Star, X } from '@lucide/vue';
// 注意:library 子入口以源码供宿主直接消费,这里必须用相对路径(宿主的 @ 别名指向其自身 src)
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Input } from '../components/ui/input';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/ui/empty';
import { buildTree, collectIds, flattenTree } from './tree';
import { createLibraryTreeT } from './i18n';
import LibraryTree from './LibraryTree.vue';
import type {
  LibraryTreeT,
  LibraryTreeNode,
  MediaDetailItem,
  MediaDetailServices,
} from './types';

const props = defineProps<{
  /** 当前展示的文件(单个或多个;MediaBrowser 的 selected 可直接传入) */
  items?: MediaDetailItem[];
  /** 当前素材库 id(services 闭包捕获用) */
  libraryId?: string;
  /** 数据服务:详情补读 + 编辑保存;仅展示时可不传 */
  services?: MediaDetailServices;
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT;
}>();

const emit = defineEmits<{
  /** 任一保存动作成功后触发(宿主可刷新文件列表) */
  updated: [];
}>();

const fallbackT = createLibraryTreeT();
const tt = (key: string, params?: Record<string, unknown>) => {
  if (!props.t) return fallbackT(key, params);
  const r = props.t(key, params);
  return r === key ? fallbackT(key, params) : r;
};

// ---- 显示条目:传入 items + 本地保存覆盖(保存成功后立即生效,不等列表刷新) ----
const detailPatch = ref<Map<string, Partial<MediaDetailItem>>>(new Map());

/**
 * 标签归一化:后端可能把 tags 存成 JSON 字符串(如 "[]" / "[\"灵感\"]"),
 * 直接遍历字符串会渲染成单字符 chips 且 .map 抛错,统一转字符串数组。
 */
function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v));
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(v => String(v));
    } catch { /* 非 JSON 字符串按单标签处理 */ }
    return [value];
  }
  return [];
}

const displayItems = computed<MediaDetailItem[]>(() =>
  (props.items ?? []).map(file => {
    const patch = detailPatch.value.get(String(file.id));
    const merged = patch ? { ...file, ...patch } : file;
    return { ...merged, tags: normalizeTags(merged.tags) };
  }),
);

const isMultiSelect = computed(() => displayItems.value.length > 1);

function setPatch(fileId: string | number, patch: Partial<MediaDetailItem>) {
  const id = String(fileId);
  const next = new Map(detailPatch.value);
  next.set(id, { ...(next.get(id) ?? {}), ...patch });
  detailPatch.value = next;
}

// 切换选中文件时丢弃已不在选中集里的覆盖
watch(() => displayItems.value.map(f => String(f.id)).join(), ids => {
  const current = new Set(ids.split(',').filter(Boolean));
  detailPatch.value = new Map([...detailPatch.value].filter(([id]) => current.has(id)));
});

// 列表缓存可能只含基础字段;单文件打开时补读服务端完整字段,避免评分/备注回退为默认值
watch(() => displayItems.value[0]?.id, async fileId => {
  const fetcher = props.services?.getFileDetail;
  if (!fileId || isMultiSelect.value || !fetcher) return;
  try {
    const fresh = await fetcher(displayItems.value[0]);
    if (!fresh || String(displayItems.value[0]?.id) !== String(fileId)) return;
    setPatch(fileId, fresh);
  } catch {
    // 详情字段拉取失败时忽略,等待下次刷新重试
  }
}, { immediate: true });

// ---- 编辑字段状态(blur/回车保存;保存期间不同步,避免回包旧值覆盖输入) ----
const editName = ref('');
const editWebsite = ref('');
const editStars = ref(0);
const editNotes = ref('');
const hoverStars = ref(0);
const nameError = ref('');
const nameSaving = ref(false);
const websiteSaving = ref(false);
const starsSaving = ref(false);
const notesSaving = ref(false);

watch(displayItems, items => {
  if (items.length === 1 && !nameSaving.value && !websiteSaving.value && !starsSaving.value && !notesSaving.value) {
    editName.value = items[0].title || '';
    editWebsite.value = items[0].website || '';
    editStars.value = Number(items[0].stars) || 0;
    editNotes.value = items[0].notes || '';
    hoverStars.value = 0;
    nameError.value = '';
  }
}, { immediate: true, deep: true });

/** 是否为名称冲突错误(对齐桌面端 409 判定) */
function isConflict(e: unknown): boolean {
  const err = e as { response?: { status?: number; data?: { code?: number } } };
  return err?.response?.status === 409 || err?.response?.data?.code === 409;
}

async function handleNameBlur() {
  const file = displayItems.value[0];
  if (!file || !props.services?.renameFile || !editName.value.trim() || editName.value.trim() === file.title) {
    editName.value = file?.title || '';
    nameError.value = '';
    return;
  }
  const newName = editName.value.trim();
  nameSaving.value = true;
  nameError.value = '';
  try {
    await props.services.renameFile(file, newName);
    setPatch(file.id, { title: newName });
    emit('updated');
  } catch (e) {
    if (isConflict(e)) {
      nameError.value = tt('detail.nameConflict');
    } else {
      nameError.value = tt('detail.renameFailed');
      editName.value = file.title || '';
    }
  } finally {
    nameSaving.value = false;
  }
}

async function handleWebsiteBlur() {
  const file = displayItems.value[0];
  if (!file || !props.services?.updateFile) return;
  const newWebsite = editWebsite.value.trim();
  if (newWebsite === (file.website || '')) return;
  websiteSaving.value = true;
  try {
    await props.services.updateFile(file, { website: newWebsite });
    setPatch(file.id, { website: newWebsite });
    emit('updated');
  } catch {
    editWebsite.value = file.website || '';
  } finally {
    websiteSaving.value = false;
  }
}

function openWebsite() {
  const raw = editWebsite.value.trim();
  if (!raw) return;
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  window.open(url, '_blank', 'noopener');
}

async function handleStarsChange(value: number) {
  const file = displayItems.value[0];
  if (!file || !props.services?.updateFile) return;
  const oldStars = Number(file.stars) || 0;
  if (value === oldStars) return;
  editStars.value = value;
  starsSaving.value = true;
  try {
    await props.services.updateFile(file, { stars: value });
    setPatch(file.id, { stars: value });
    emit('updated');
  } catch {
    editStars.value = oldStars;
  } finally {
    starsSaving.value = false;
  }
}

async function handleNotesBlur() {
  const file = displayItems.value[0];
  if (!file || !props.services?.updateFile) return;
  const newNotes = editNotes.value;
  if (newNotes === (file.notes || '')) return;
  notesSaving.value = true;
  try {
    await props.services.updateFile(file, { notes: newNotes });
    setPatch(file.id, { notes: newNotes });
    emit('updated');
  } catch {
    editNotes.value = file.notes || '';
  } finally {
    notesSaving.value = false;
  }
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

// ---- 多选合并信息(标签/文件夹去重合并 + 数量/总大小) ----
const mergedInfo = computed(() => {
  if (!isMultiSelect.value) return null;
  const files = displayItems.value;
  const tags = new Set<string>();
  const folders = new Set<string | number>();
  let totalSize = 0;
  files.forEach(file => {
    totalSize += file.size || 0;
    file.tags?.forEach(tag => tags.add(tag));
    if (file.folder_id != null) folders.add(file.folder_id);
  });
  return { count: files.length, totalSize, tags: [...tags], folders: [...folders] };
});

const currentTags = computed<string[]>(() =>
  isMultiSelect.value ? (mergedInfo.value?.tags ?? []) : (displayItems.value[0]?.tags ?? []));

const currentFolderIds = computed<(string | number)[]>(() =>
  isMultiSelect.value
    ? (mergedInfo.value?.folders ?? [])
    : (displayItems.value[0]?.folder_id != null ? [displayItems.value[0].folder_id] : []));

// ---- 标签/文件夹选择树数据(Popover 弹层 + 文件夹/标签名解析共用) ----
const tagTree = ref<LibraryTreeNode[]>([]);
const folderTree = ref<LibraryTreeNode[]>([]);
const tagPopoverOpen = ref(false);
const folderPopoverOpen = ref(false);

async function loadTrees() {
  if (props.services?.listFolders) {
    folderTree.value = buildTree((await props.services.listFolders().catch(() => null)) ?? []);
  }
  if (props.services?.listTags) {
    tagTree.value = buildTree((await props.services.listTags().catch(() => null)) ?? []);
  }
}

onMounted(loadTrees);
// 弹层打开时重拉(编辑/新建节点后保持最新)
watch([tagPopoverOpen, folderPopoverOpen], ([tagOpen, folderOpen]) => {
  if (tagOpen || folderOpen) void loadTrees();
});

function getTagName(tag: string | number): string {
  const node = flattenTree(tagTree.value).find(n => String(n.id) === String(tag) || n.title === String(tag));
  return node?.title ?? String(tag);
}

function getFolderName(folderId: string | number): string {
  const node = flattenTree(folderTree.value).find(n => String(n.id) === String(folderId));
  return node?.title ?? `#${folderId}`;
}

// 弹层树默认全部展开(条目少,平铺好选)
function expandedOf(nodes: LibraryTreeNode[]): Set<number> {
  return new Set(collectIds(nodes));
}

// 标签弹层勾选态:当前 tags(标题/id 两种形态都匹配)
const checkedTagIds = computed(() => {
  const values = new Set(currentTags.value.map(String));
  return new Set(
    flattenTree(tagTree.value).filter(n => values.has(n.title) || values.has(String(n.id))).map(n => n.id),
  );
});

// 文件夹弹层高亮态(单选语义)
const selectedFolderIds = computed(() =>
  new Set(currentFolderIds.value.map(Number).filter(n => Number.isFinite(n))));

/** 标签弹层点选:已含该标签 → 移除;否则批量追加 */
async function onTagNodeSelect(node: LibraryTreeNode) {
  if (currentTags.value.some(tag => String(tag) === node.title || String(tag) === String(node.id))) {
    await removeTag(node.title);
  } else {
    await addTag(node.title);
  }
}

async function addTag(title: string) {
  if (!props.services?.addTagsToFile) return;
  try {
    await props.services.addTagsToFile(displayItems.value, [title]);
    displayItems.value.forEach(file => {
      setPatch(file.id, { tags: [...new Set([...(file.tags ?? []), title])] });
    });
    emit('updated');
  } catch (e) {
    console.warn('[MediaDetail] add tag failed:', e);
  }
}

async function removeTag(tag: string) {
  if (!props.services?.setFileTags) return;
  for (const file of displayItems.value) {
    const current = file.tags ?? [];
    // 标签值可能是标题或 id,按两种形态匹配后整体覆盖保存
    const remaining = current.filter(x => String(x) !== String(tag) && getTagName(x) !== getTagName(tag));
    if (remaining.length === current.length) continue;
    try {
      await props.services.setFileTags(file, remaining);
      setPatch(file.id, { tags: remaining });
    } catch (e) {
      console.warn('[MediaDetail] remove tag failed:', e);
    }
  }
  emit('updated');
}

/** 文件夹弹层点选:批量设置所属文件夹 */
async function onFolderNodeSelect(node: LibraryTreeNode) {
  if (!props.services?.setFileFolder) return;
  try {
    await props.services.setFileFolder(displayItems.value, node.id);
    displayItems.value.forEach(file => setPatch(file.id, { folder_id: node.id }));
    emit('updated');
  } catch (e) {
    console.warn('[MediaDetail] set folder failed:', e);
  }
}

/** 多选模式移除某文件夹归属 */
async function removeFolder(folderId: string | number) {
  if (!props.services?.setFileFolder) return;
  const files = displayItems.value.filter(file => String(file.folder_id) === String(folderId));
  try {
    await props.services.setFileFolder(files, null);
    files.forEach(file => setPatch(file.id, { folder_id: null }));
    emit('updated');
  } catch (e) {
    console.warn('[MediaDetail] remove folder failed:', e);
  }
}

// ---- 预览图 ----
function previewSrc(item: MediaDetailItem): string | undefined {
  return props.services?.getPreviewUrl?.(item) || item.thumbnail_path || undefined;
}

const imageLoadState = ref<'loading' | 'loaded' | 'error'>('loading');
const multiImageStates = ref<Record<string, 'loading' | 'loaded' | 'error'>>({});

// 条目/地址变化时重置加载状态(多选只重置新增项,保留已加载状态)
watch(() => displayItems.value
  .map(item => `${item.id}:${previewSrc(item) ?? ''}`)
  .join('|'), () => {
  imageLoadState.value = 'loading';
  const prev = { ...multiImageStates.value };
  const states: Record<string, 'loading' | 'loaded' | 'error'> = {};
  displayItems.value.forEach(item => {
    states[String(item.id)] = prev[String(item.id)] ?? 'loading';
  });
  multiImageStates.value = states;
}, { immediate: true });

const previewImage = ref<HTMLImageElement>();
const extractedColors = ref<number[][]>([]);

function handleImageLoad() {
  imageLoadState.value = 'loaded';
  if (previewImage.value && isImage(displayItems.value[0])) {
    extractedColors.value = extractPalette(previewImage.value);
  }
}

function handleImageError() {
  imageLoadState.value = 'error';
  extractedColors.value = [];
}

/**
 * 主色调色板:降采样到 40px 画布,5bit/通道量化统计取前 5 桶平均色
 * (替代桌面端 colorthief;跨域未授权图片 getImageData 抛错时静默跳过)。
 */
function extractPalette(img: HTMLImageElement): number[][] {
  try {
    const size = 40;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
      const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      bucket.n++;
      bucket.r += data[i];
      bucket.g += data[i + 1];
      bucket.b += data[i + 2];
      buckets.set(key, bucket);
    }
    const toColor = (b: { n: number; r: number; g: number; b: number }) =>
      [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)];
    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
    // 过滤低饱和度桶(背景白/黑),全被过滤时退回未过滤前 5
    const vivid = sorted.filter(b => {
      const r = b.r / b.n, g = b.g / b.n, bl = b.b / b.n;
      const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
      return max > 0 && (max - min) / max > 0.15;
    });
    return (vivid.length >= 3 ? vivid : sorted).slice(0, 5).map(toColor);
  } catch {
    return [];
  }
}

// ---- 卡片辅助 ----
function isImage(item?: MediaDetailItem): boolean {
  return !!item && (item.mime_type ?? '').startsWith('image/');
}

function isVideo(item?: MediaDetailItem): boolean {
  return !!item && (item.mime_type ?? '').startsWith('video/');
}

function fileExtension(item: MediaDetailItem): string {
  return item.extension || item.title.split('.').pop()?.toUpperCase() || 'FILE';
}

function typeIcon(item: MediaDetailItem) {
  const mime = item.mime_type || '';
  const ext = (item.extension || '').toLowerCase();
  if (isImage(item) || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (isVideo(item) || ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  if (mime.startsWith('audio') || ['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return 'audio';
  return 'file';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(value?: string | number): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
</script>

<template>
  <div class="flex h-full flex-col gap-4 text-foreground">
    <!-- 空态 -->
    <Empty v-if="displayItems.length === 0" class="min-h-56">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle>{{ tt('detail.emptyTitle') }}</EmptyTitle>
        <EmptyDescription>{{ tt('detail.emptyHint') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <template v-else>
      <!-- 预览区 -->
      <div class="relative">
        <!-- 单选模式 -->
        <div v-if="displayItems.length === 1" class="relative">
          <div class="bg-muted/40 relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl">
            <!-- 错误/无地址占位:文件类型图标 -->
            <div
              v-if="imageLoadState === 'error' || !previewSrc(displayItems[0])"
              class="text-muted-foreground/60 absolute inset-0 flex flex-col items-center justify-center"
            >
              <span class="text-4xl">{{ typeIcon(displayItems[0]) === 'image' ? '🖼️' : typeIcon(displayItems[0]) === 'video' ? '🎬' : typeIcon(displayItems[0]) === 'audio' ? '🎵' : '📄' }}</span>
            </div>
            <img
              v-show="imageLoadState === 'loaded'"
              ref="previewImage"
              :src="previewSrc(displayItems[0])"
              :alt="displayItems[0].title"
              class="max-h-full max-w-full rounded-xl object-contain"
              @load="handleImageLoad"
              @error="handleImageError"
            >
          </div>
          <div class="absolute top-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
            {{ fileExtension(displayItems[0]) }}
          </div>
          <!-- 主色调色板(canvas 提取) -->
          <div v-if="extractedColors.length" class="mt-2 flex justify-center gap-1">
            <div
              v-for="(color, index) in extractedColors"
              :key="index"
              class="shadow-sm size-6 rounded-full"
              :style="{ backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})` }"
              :title="`RGB(${color[0]}, ${color[1]}, ${color[2]})`"
            />
          </div>
        </div>

        <!-- 多选模式:叠放相册效果 -->
        <div v-else class="relative">
          <div class="relative mx-auto h-[120px] w-[120px]">
            <div
              v-for="(item, index) in displayItems.slice(0, 4)"
              :key="item.id"
              class="absolute top-0 left-0 h-[100px] w-[100px]"
              :style="{ zIndex: index, left: `${index * 8}px`, top: `${index * 8}px` }"
            >
              <div
                v-if="multiImageStates[String(item.id)] !== 'loaded'"
                class="bg-muted absolute flex size-full items-center justify-center rounded-xl border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]"
              >
                <span class="text-muted-foreground/60 text-2xl">{{ typeIcon(item) === 'image' ? '🖼️' : typeIcon(item) === 'video' ? '🎬' : typeIcon(item) === 'audio' ? '🎵' : '📄' }}</span>
              </div>
              <img
                v-show="multiImageStates[String(item.id)] === 'loaded'"
                :src="previewSrc(item) ?? ''"
                :alt="item.title"
                class="shadow-[0_2px_6px_rgba(0,0,0,0.1)] absolute top-0 left-0 size-full rounded-xl border-2 border-white object-cover"
                @load="multiImageStates[String(item.id)] = 'loaded'"
                @error="multiImageStates[String(item.id)] = 'error'"
              >
            </div>
            <!-- 更多文件提示 -->
            <div v-if="displayItems.length > 4" class="absolute right-1 bottom-1 z-10 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
              +{{ displayItems.length - 4 }}
            </div>
            <!-- 文件数量 -->
            <div class="absolute top-1 left-1 z-10 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
              {{ tt('detail.fileCount', { count: displayItems.length }) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 文件名编辑(仅单选) -->
      <div v-if="!isMultiSelect && displayItems[0]">
        <label class="text-muted-foreground mb-1 block text-xs font-medium">{{ tt('detail.fileName') }}</label>
        <Input
          v-model="editName"
          type="text"
          :class="nameError ? 'border-destructive focus-visible:ring-destructive' : ''"
          :disabled="nameSaving || !services?.renameFile"
          @blur="handleNameBlur"
          @keydown.enter.prevent="handleNameBlur"
        >
        </Input>
        <p v-if="nameError" class="text-destructive mt-1 text-xs">{{ nameError }}</p>
      </div>

      <!-- 网址编辑(仅单选) -->
      <div v-if="!isMultiSelect && displayItems[0]">
        <label class="text-muted-foreground mb-1 block text-xs font-medium">{{ tt('detail.website') }}</label>
        <div class="flex items-center gap-1">
          <Input
            v-model="editWebsite"
            type="text"
            placeholder="https://"
            :disabled="websiteSaving || !services?.updateFile"
            @blur="handleWebsiteBlur"
            @keydown.enter.prevent="handleWebsiteBlur"
          >
          </Input>
          <button
            v-if="editWebsite.trim()"
            type="button"
            class="hover:bg-muted text-muted-foreground shrink-0 rounded-md p-1.5"
            :title="tt('detail.openWebsite')"
            @click="openWebsite"
            @mousedown.prevent
          >
            <ExternalLink class="size-4" />
          </button>
        </div>
      </div>

      <!-- 备注(仅单选) -->
      <div v-if="!isMultiSelect && displayItems[0]">
        <label class="text-muted-foreground mb-1 block text-xs font-medium">{{ tt('detail.notes') }}</label>
        <textarea
          v-model="editNotes"
          rows="3"
          :placeholder="tt('detail.notesPlaceholder')"
          :disabled="notesSaving || !services?.updateFile"
          class="border-input bg-transparent focus-visible:ring-ring placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 flex w-full resize-none rounded-md border px-3 py-2 text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          @blur="handleNotesBlur"
        ></textarea>
      </div>

      <!-- 评分(仅单选) -->
      <div v-if="!isMultiSelect && displayItems[0]">
        <label class="text-muted-foreground mb-1 block text-xs font-medium">{{ tt('detail.rating') }}</label>
        <div class="flex items-center gap-0.5">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="hover:bg-muted rounded p-0.5 transition-colors"
            :disabled="starsSaving || !services?.updateFile"
            @click="handleStarsChange(n)"
            @mouseenter="hoverStars = n"
            @mouseleave="hoverStars = 0"
          >
            <Star
              class="size-5"
              :class="(hoverStars || editStars) >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'"
            />
          </button>
          <button
            v-if="editStars > 0"
            type="button"
            class="text-muted-foreground hover:bg-muted ml-1 rounded p-1"
            :disabled="starsSaving"
            :title="tt('detail.rating')"
            @click="handleStarsChange(0)"
          >
            <X class="size-4" />
          </button>
        </div>
      </div>

      <!-- 文件地址(仅单选,宿主提供 url 时展示) -->
      <div
        v-if="!isMultiSelect && displayItems[0]?.url"
        class="bg-muted/60 border-border/60 flex items-center rounded-lg border p-2"
      >
        <span class="flex-1 truncate text-xs">{{ displayItems[0].url }}</span>
        <button
          type="button"
          class="hover:bg-muted cursor-pointer rounded-md border-none bg-transparent p-1"
          :title="tt('detail.copyUrl')"
          @click="copyText(displayItems[0].url!)"
        >
          <Copy class="text-muted-foreground size-4" />
        </button>
      </div>

      <!-- 标签管理 -->
      <div>
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-semibold">{{ tt('detail.tags') }}</h3>
          <Popover v-model:open="tagPopoverOpen">
            <PopoverTrigger as-child>
              <button
                v-if="services?.addTagsToFile || services?.setFileTags"
                type="button"
                class="text-primary hover:text-primary/80 flex cursor-pointer items-center gap-0.5 border-none bg-transparent p-0 text-xs"
              >
                <component :is="currentTags.length ? Pencil : Plus" class="size-3.5" />
                <span>{{ currentTags.length ? tt('detail.editTags') : (isMultiSelect ? tt('detail.batchSetTags') : tt('detail.setTags')) }}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" class="max-h-72 w-64 overflow-y-auto p-2">
              <p class="text-muted-foreground mb-1.5 px-1 text-xs">{{ tt('detail.tagTreeHint') }}</p>
              <LibraryTree
                v-if="tagTree.length"
                :nodes="tagTree"
                kind="tag"
                :expanded="expandedOf(tagTree)"
                checkable
                :checked="checkedTagIds"
                @select="onTagNodeSelect"
              />
              <p v-else class="text-muted-foreground px-1 py-4 text-center text-xs">{{ tt('detail.noTags') }}</p>
            </PopoverContent>
          </Popover>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <template v-if="currentTags.length">
            <span
              v-for="tag in currentTags"
              :key="String(tag)"
              class="bg-primary/10 text-primary flex items-center rounded-full px-2.5 py-1 text-xs"
            >
              {{ getTagName(tag) }}
              <button
                v-if="services?.setFileTags"
                type="button"
                class="hover:text-primary/70 ml-1 cursor-pointer border-none bg-transparent p-0"
                @click="removeTag(tag)"
              >×</button>
            </span>
          </template>
          <span v-else class="text-muted-foreground text-xs">{{ tt('detail.noTags') }}</span>
        </div>
      </div>

      <!-- 文件夹信息 -->
      <div>
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-semibold">{{ tt('detail.folder') }}</h3>
          <Popover v-model:open="folderPopoverOpen">
            <PopoverTrigger as-child>
              <button
                v-if="services?.setFileFolder"
                type="button"
                class="text-primary hover:text-primary/80 flex cursor-pointer items-center gap-0.5 border-none bg-transparent p-0 text-xs"
              >
                <component :is="currentFolderIds.length ? Pencil : Plus" class="size-3.5" />
                <span>{{ currentFolderIds.length ? tt('detail.editFolder') : (isMultiSelect ? tt('detail.batchSetFolder') : tt('detail.setFolder')) }}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" class="max-h-72 w-64 overflow-y-auto p-2">
              <p class="text-muted-foreground mb-1.5 px-1 text-xs">{{ tt('detail.folderTreeHint') }}</p>
              <LibraryTree
                v-if="folderTree.length"
                :nodes="folderTree"
                kind="folder"
                :expanded="expandedOf(folderTree)"
                :selected-ids="selectedFolderIds"
                @select="onFolderNodeSelect"
              />
              <p v-else class="text-muted-foreground px-1 py-4 text-center text-xs">{{ tt('detail.uncategorized') }}</p>
            </PopoverContent>
          </Popover>
        </div>
        <!-- 单选展示 -->
        <template v-if="!isMultiSelect">
          <div
            v-if="currentFolderIds.length"
            class="bg-primary/10 text-primary flex items-center rounded-lg px-3 py-2 text-xs"
          >
            <Folder class="mr-2 size-4 shrink-0" />
            {{ getFolderName(currentFolderIds[0]) }}
          </div>
          <div v-else class="bg-muted text-muted-foreground flex items-center rounded-lg px-3 py-2 text-xs">
            <FolderOpen class="mr-2 size-4 shrink-0" />
            {{ tt('detail.uncategorized') }}
          </div>
        </template>
        <!-- 多选展示 -->
        <template v-else>
          <div v-if="mergedInfo && mergedInfo.folders.length" class="space-y-1">
            <div
              v-for="folderId in mergedInfo.folders"
              :key="String(folderId)"
              class="bg-primary/10 text-primary flex items-center rounded-lg px-3 py-2 text-xs"
            >
              <Folder class="mr-2 size-4 shrink-0" />
              {{ getFolderName(folderId) }}
              <button
                v-if="services?.setFileFolder"
                type="button"
                class="hover:opacity-70 ml-auto cursor-pointer border-none bg-transparent p-0 pl-2"
                @click="removeFolder(folderId)"
              >×</button>
            </div>
          </div>
          <div v-else class="bg-muted text-muted-foreground flex items-center rounded-lg px-3 py-2 text-xs">
            <FolderOpen class="mr-2 size-4 shrink-0" />
            {{ tt('detail.uncategorized') }}
          </div>
        </template>
      </div>

      <!-- 基本信息 -->
      <div>
        <h3 class="mb-2 text-sm font-semibold">{{ tt('detail.basicInfo') }}</h3>
        <div class="text-muted-foreground space-y-2 text-xs">
          <!-- 单选 -->
          <template v-if="!isMultiSelect && displayItems[0]">
            <div class="flex justify-between">
              <span>{{ tt('detail.size') }}</span>
              <span>{{ formatFileSize(displayItems[0].size) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ tt('detail.importedAt') }}</span>
              <span>{{ formatDate(displayItems[0].imported_at ?? displayItems[0].created_at) }}</span>
            </div>
            <div v-if="displayItems[0].updated_at" class="flex justify-between">
              <span>{{ tt('detail.updatedAt') }}</span>
              <span>{{ formatDate(displayItems[0].updated_at) }}</span>
            </div>
            <div v-if="isImage(displayItems[0]) && displayItems[0].width" class="flex justify-between">
              <span>{{ tt('detail.dimensions') }}</span>
              <span>{{ displayItems[0].width }} x {{ displayItems[0].height }}</span>
            </div>
            <div v-if="isVideo(displayItems[0]) && displayItems[0].duration" class="flex justify-between">
              <span>{{ tt('detail.duration') }}</span>
              <span>{{ formatDuration(displayItems[0].duration) }}</span>
            </div>
          </template>
          <!-- 多选 -->
          <template v-else-if="mergedInfo">
            <div class="flex justify-between">
              <span>{{ tt('detail.selectedCount') }}</span>
              <span>{{ tt('detail.fileCount', { count: mergedInfo.count }) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ tt('detail.totalSize') }}</span>
              <span>{{ formatFileSize(mergedInfo.totalSize) }}</span>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
