<script setup lang="ts">
/**
 * 文件夹 / 标签视图(两个 tab 共用,由 mode 区分)。
 *
 * - 顶部:搜索框 + 刷新
 * - 中部:树(支持拖拽文件 → 上传到目标文件夹/标签)
 * - 拖到空白处:落到当前素材库根目录(不指定 folder/tags)
 *
 * 上传复用 useUploadQueue:文件夹落点 → folderId;标签落点 → tags:[title]。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLibraryTree, filterTree, collectIds, flattenTree } from '@/ui/composables/useLibraryTree';
import { useSettings } from '@/ui/composables/useSettings';
import { useUploadQueue } from '@/ui/composables/useUploadQueue';
import { useBackground } from '@/ui/composables/useBackground';
import { useDialog } from '@/ui/composables/useDialog';
import LibraryTree from './LibraryTree.vue';
import Dropzone from '@/ui/components/upload/Dropzone.vue';
import ContextMenu from '@/ui/components/ui/ContextMenu.vue';
import { parseDrop, canAcceptDrop, urlKind } from '@/shared/drag-data';
import { dbg } from '@/shared/debug';
import type { LibraryTreeNode } from '@/shared/types';

const props = defineProps<{ mode: 'folder' | 'tag' }>();

const { t } = useI18n();
const { settings } = useSettings();
const { addFiles } = useUploadQueue();
const bg = useBackground();
const dialog = useDialog();
const { tree, count, loading, error, load } = useLibraryTree(props.mode);

// ---- 展开/折叠状态 ----
const expanded = ref(new Set<number>());
function toggle(id: number) {
  const next = new Set(expanded.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
}

// ---- 搜索 ----
const query = ref('');
const filtered = computed(() => filterTree(tree.value, query.value));
const filteredTree = computed(() => filtered.value.tree);
const matched = computed(() => filtered.value.matched);
// 搜索态:自动展开全部(命中项连同其祖先/后代都可见)
const effectiveExpanded = computed(() =>
  query.value.trim() ? collectIds(filteredTree.value) : expanded.value,
);
const isSearching = computed(() => query.value.trim().length > 0);

// ---- 链接上传:走 service worker 的 UPLOAD_FROM_URL(fetch → File → 队列) ----
function uploadUrls(urls: string[], target?: { folderId?: number; tags?: string[] }) {
  const libId = settings.value.libraryId;
  for (const url of urls) {
    dbg.info('drag', 'uploadUrls → UPLOAD_FROM_URL', { url, libId, ...target });
    chrome.runtime.sendMessage({
      type: 'UPLOAD_FROM_URL',
      payload: {
        url,
        kind: urlKind(url),
        libraryId: libId,
        folderId: target?.folderId,
        tags: target?.tags,
      },
    });
  }
}

// ---- 拖到空白区域 → 上传到素材库根目录 ----
const rootHover = ref(false);
function onRootDragOver(e: DragEvent) {
  if (!canAcceptDrop(e.dataTransfer)) return;
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
  rootHover.value = true;
}
function onRootDragLeave(e: DragEvent) {
  const container = e.currentTarget as HTMLElement | null;
  const next = e.relatedTarget;
  if (container && next instanceof Node && container.contains(next)) return;
  rootHover.value = false;
}
function onRootDrop(e: DragEvent) {
  e.preventDefault();
  rootHover.value = false;
  const { files, urls } = parseDrop(e);
  if (files.length) addFiles(files, settings.value.libraryId);
  if (urls.length) uploadUrls(urls);
}
/** 顶部 Dropzone 回调(点击选择 / 拖放到 dropzone)→ 上传到素材库根目录 */
function onRootDropFiles(files: File[]) {
  if (files.length) addFiles(files, settings.value.libraryId);
}

// ---- 节点落点 → 上传到目标文件夹 / 标签 ----
function onDrop(node: LibraryTreeNode, e: DragEvent) {
  rootHover.value = false;
  const { files, urls } = parseDrop(e);
  if (props.mode === 'folder') {
    if (files.length) addFiles(files, settings.value.libraryId, undefined, String(node.id));
    if (urls.length) uploadUrls(urls, { folderId: node.id });
  } else {
    if (files.length) addFiles(files, settings.value.libraryId, [node.title]);
    if (urls.length) uploadUrls(urls, { tags: [node.title] });
  }
}

// ---- 初始加载 + libraryId 变化重载 ----
let loadedFor = '';
watch(
  () => settings.value.libraryId,
  async (libId) => {
    if (!libId) {
      loadedFor = '';
      return;
    }
    if (loadedFor === libId) return;
    loadedFor = libId;
    await load(libId);
    // 默认展开全部(含子级):把所有「有子节点」的 id 放进 expanded
    if (tree.value.length) {
      expanded.value = new Set(
        flattenTree(tree.value)
          .filter(n => n.children.length)
          .map(n => n.id),
      );
    }
  },
  { immediate: true },
);

const titleText = computed(() => props.mode === 'folder' ? t('common.folder') : t('common.tag'));
const unitText = computed(() => props.mode === 'folder' ? t('library.folderUnit') : t('library.tagUnit'));

const noData = computed(() => !loading.value && !error.value && count.value === 0);

// ---- 右键菜单:新建同级 / 新建子级 / 删除 ----
// menu:右键的节点 + 坐标;为 null 时菜单关闭
const menu = ref<{ node: LibraryTreeNode; x: number; y: number } | null>(null);

function onContextMenu(node: LibraryTreeNode, x: number, y: number) {
  menu.value = { node, x, y };
}
function closeMenu() {
  menu.value = null;
}

/**
 * 新建节点(sibling/child 由 level 决定 parentId):
 *  - sibling:与目标节点同级 → parentId = node.parentId
 *  - child:作为目标节点的子级 → parentId = node.id
 *
 * 用弹窗收集名称(默认「新建文件夹/标签 N」),空名/取消则放弃。
 */
async function createNode(level: 'sibling' | 'child') {
  const target = menu.value?.node;
  if (!target) return;
  const parentId = level === 'sibling' ? target.parentId : target.id;
  closeMenu();

  const libId = settings.value.libraryId;
  if (!libId) return;
  const defaultName = t('tree.newName', { type: titleText.value, n: count.value + 1 });
  const title = await dialog.prompt({
    title: t('tree.createPrompt', { type: titleText.value }),
    defaultValue: defaultName,
  });
  if (!title?.trim()) return;

  try {
    await bg.createNode(props.mode, libId, title.trim(), parentId || undefined);
    await load(libId);
    // 新建子级:展开其父,使新节点可见
    if (level === 'child') {
      const next = new Set(expanded.value);
      next.add(target.id);
      expanded.value = next;
    }
  } catch (e: any) {
    dbg.warn('lib-tree', 'createNode failed', { error: e?.message });
    await dialog.alert({
      title: t('common.failed'),
      message: t('tree.createFailed', { error: e?.message ?? String(e) }),
      danger: true,
    });
  }
}

/**
 * 删除节点。folder 支持连文件一起删(二次确认 + deleteFiles 提示)。
 */
async function deleteNode() {
  const target = menu.value?.node;
  if (!target) return;
  closeMenu();

  const libId = settings.value.libraryId;
  if (!libId) return;

  let deleteFiles = false;
  if (props.mode === 'folder') {
    if (!(await dialog.confirm({
      message: t('tree.deleteFolderConfirm', { name: target.title }),
      danger: true,
    }))) return;
    deleteFiles = await dialog.confirm({
      message: t('tree.deleteFilesConfirm'),
    });
  } else {
    if (!(await dialog.confirm({
      message: t('tree.deleteTagConfirm', { name: target.title }),
      danger: true,
    }))) return;
  }

  try {
    await bg.deleteNode(props.mode, libId, target.id, deleteFiles);
    await load(libId);
  } catch (e: any) {
    dbg.warn('lib-tree', 'deleteNode failed', { error: e?.message });
    await dialog.alert({
      title: t('common.failed'),
      message: t('tree.deleteFailed', { error: e?.message ?? String(e) }),
      danger: true,
    });
  }
}
</script>

<template>
  <div class="view" @dragover="onRootDragOver" @dragleave="onRootDragLeave" @drop="onRootDrop">
    <!-- 顶部:拖放/点击选择上传到素材库根目录 -->
    <Dropzone @drop="onRootDropFiles" />

    <!-- 工具栏:搜索 + 刷新 + 计数 -->
    <div class="bar">
      <span class="search">
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <path
            d="M7 2a5 5 0 1 1-3.06 8.96l-2.49 2.49a.75.75 0 1 1-1.06-1.06l2.49-2.49A5 5 0 0 1 7 2zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
            fill="currentColor"
          />
        </svg>
        <input
          v-model="query"
          type="text"
          :placeholder="t('library.searchPlaceholder', { type: titleText })"
        />
        <button
          v-if="query"
          class="clear"
          :title="t('common.clear')"
          @click="query = ''"
        >×</button>
      </span>
      <button class="refresh" :title="t('common.refresh')" :disabled="loading" @click="load(settings.libraryId)">↻</button>
      <span class="count">{{ t('library.count', { n: count, unit: unitText }) }}</span>
    </div>

    <!-- 错误 -->
    <div v-if="error" class="msg err">{{ t('library.loadFailed', { error }) }}</div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="msg">{{ t('common.loading') }}</div>

    <!-- 空态 -->
    <div v-else-if="noData" class="msg empty">
      <span class="big">📁</span>
      <span>{{ t('library.emptyTitle', { type: titleText }) }}</span>
      <span class="hint">{{ t('library.emptyHint') }}</span>
    </div>

    <!-- 搜索无结果 -->
    <div v-else-if="isSearching && filteredTree.length === 0" class="msg">
      {{ t('library.noMatch', { type: titleText }) }}
    </div>

    <!-- 树 -->
    <div v-else class="tree-wrap" :class="{ roothover: rootHover }">
      <LibraryTree
        :nodes="filteredTree"
        :kind="mode"
        :expanded="effectiveExpanded"
        :matched="matched"
        @toggle="toggle"
        @drop="onDrop"
        @contextmenu="onContextMenu"
      />
    </div>

    <!-- 右键菜单:新建同级 / 新建子级 / 删除 -->
    <ContextMenu v-if="menu" :x="menu.x" :y="menu.y" @close="closeMenu">
      <button @click="createNode('sibling')">{{ t('tree.createSibling') }}</button>
      <button @click="createNode('child')">{{ t('tree.createChild', { type: titleText }) }}</button>
      <div class="sep" />
      <button class="danger" @click="deleteNode">{{ t('tree.delete') }}</button>
    </ContextMenu>
  </div>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

/* 工具栏 */
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 8px;
  color: var(--muted);
}
.search:focus-within { border-color: var(--primary); }
.search input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--fg);
  font: inherit;
  padding: 5px 4px;
}
.clear {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
}
.clear:hover { color: var(--fg); }
.refresh {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--muted);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  line-height: 1;
}
.refresh:hover:not(:disabled) { color: var(--fg); }
.refresh:disabled { opacity: .5; cursor: default; }
.count { font-size: 11px; color: var(--muted); white-space: nowrap; }

/* 消息态 */
.msg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted);
  padding: 24px;
  text-align: center;
}
.msg.empty .big { font-size: 40px; }
.msg.empty .hint { font-size: 11px; color: var(--muted); opacity: .7; }
.msg.err { color: var(--danger); }

/* 树容器 */
.tree-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px 0;
  transition: background .12s;
}
.tree-wrap.roothover {
  /* 整片区域作为根落点时高亮 */
  background: color-mix(in srgb, var(--primary) 6%, transparent);
}
</style>
