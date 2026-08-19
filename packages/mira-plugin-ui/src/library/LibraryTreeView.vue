<script setup lang="ts">
/**
 * 文件夹 / 标签视图(两个 tab 共用,由 mode 区分)。
 * 自 mira-browser-extension 迁移:数据(CRUD)/弹窗/上传/文案全部由宿主注入。
 *
 * - 顶部:拖放/点击选择上传到素材库根目录(需传 upload)
 * - 工具栏:搜索 + 刷新 + 计数
 * - 中部:树(支持拖拽文件 → 上传到目标文件夹/标签)
 * - 右键菜单:新建同级/子级、删除(需传 dialog,编辑动作依赖 services)
 *
 * 样式为 tailwind/shadcn 原子类,无 scoped CSS(见仓库 ui_rule.md)。
 */
import { computed, ref, watch } from 'vue';
import { useLibraryTreeData } from './useLibraryTreeData';
import { useLibraryTreeActions } from './useLibraryTreeActions';
import { createLibraryTreeT } from './i18n';
import { filterTree, collectIds, flattenTree } from './tree';
import LibraryTree from './LibraryTree.vue';
import ContextMenu from './ContextMenu.vue';
import Dropzone from './Dropzone.vue';
import { parseDrop, canAcceptDrop } from './drag-data';
import type {
  LibraryTreeDialog,
  LibraryTreeNode,
  LibraryTreeKind,
  LibraryTreeServices,
  LibraryTreeT,
  LibraryTreeUpload,
} from './types';

const props = defineProps<{
  mode: LibraryTreeKind;
  /** 当前素材库 id;变化时自动重载 */
  libraryId: string;
  /** 数据服务:树数据加载 + 节点 CRUD */
  services: LibraryTreeServices;
  /** 弹窗服务:提供后启用右键编辑菜单(新建/删除) */
  dialog?: LibraryTreeDialog;
  /** 上传服务:提供后启用拖放/选择文件上传 */
  upload?: LibraryTreeUpload;
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT;
  /** 显示右上角选择模式切换按钮(选择结果经 v-model:selected 抛出) */
  selection?: boolean;
}>();

/** 选择模式开关(selection 启用时右上角按钮切换) */
const selectMode = defineModel<boolean>('selectMode', { default: false });
/** 选中的节点:folder 视图单选(可取消),tag 视图多选 */
const selected = defineModel<LibraryTreeNode[]>('selected', { default: () => [] });

const selectedIds = computed(() => new Set(selected.value.map(n => n.id)));

function onSelect(node: LibraryTreeNode) {
  if (props.mode === 'folder') {
    // 文件夹单选,再点取消
    selected.value = selectedIds.value.has(node.id) ? [] : [node];
  } else {
    // 标签多选(checkbox 语义)
    selected.value = selectedIds.value.has(node.id)
      ? selected.value.filter(n => n.id !== node.id)
      : [...selected.value, node];
  }
}

const fallbackT = createLibraryTreeT();
const tt = (key: string, params?: Record<string, unknown>) =>
  props.t ? props.t(key, params) : fallbackT(key, params);

const { tree, count, loading, error, load } = useLibraryTreeData(props.mode, props.services);

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
  if (files.length) props.upload?.files(files);
  if (urls.length) props.upload?.urls(urls);
}
/** 顶部上传区回调(点击选择 / 拖放文件)→ 上传到素材库根目录 */
function onRootDropFiles(files: File[]) {
  if (files.length) props.upload?.files(files);
}

// ---- 节点落点 → 上传到目标文件夹 / 标签 ----
function onDrop(node: LibraryTreeNode, e: DragEvent) {
  rootHover.value = false;
  const { files, urls } = parseDrop(e);
  const target = props.mode === 'folder' ? { folderId: node.id } : { tags: [node.title] };
  if (files.length) props.upload?.files(files, target);
  if (urls.length) props.upload?.urls(urls, target);
}

// ---- 初始加载 + libraryId 变化重载 ----
let loadedFor = '';
watch(
  () => props.libraryId,
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

const titleText = computed(() => props.mode === 'folder' ? tt('common.folder') : tt('common.tag'));
const unitText = computed(() => props.mode === 'folder' ? tt('library.folderUnit') : tt('library.tagUnit'));

const noData = computed(() => !loading.value && !error.value && count.value === 0);

/** dialog 未注入时的占位:动作静默取消 */
const silentDialog: LibraryTreeDialog = {
  alert: async () => {},
  confirm: async () => false,
  prompt: async () => null,
  confirmCheck: async () => ({ ok: false, checked: false }),
};

// ---- 右键菜单:新建同级 / 新建子级 / 删除(dialog 未提供则不弹菜单) ----
const {
  menu,
  openMenu: onContextMenu,
  closeMenu,
  createNode,
  deleteNode,
} = useLibraryTreeActions({
  mode: props.mode,
  libraryId: () => props.libraryId,
  count: () => count.value,
  reload: () => load(props.libraryId),
  expand: id => {
    const next = new Set(expanded.value);
    next.add(id);
    expanded.value = next;
  },
}, {
  services: props.services,
  dialog: props.dialog ?? silentDialog,
  t: (key, params) => tt(key, params),
});
const menuEnabled = computed(() => !!props.dialog);
function onTreeContextMenu(node: LibraryTreeNode, x: number, y: number) {
  if (menuEnabled.value) onContextMenu(node, x, y);
}

/** 右键菜单项(ContextMenu 的 :deep 样式已移除,类由这里提供) */
const ctxItem = 'flex w-full cursor-pointer items-center gap-1.5 rounded-[4px] border-none bg-transparent px-2.5 py-1.5 text-left font-inherit text-xs text-foreground hover:bg-background';
</script>

<template>
  <div class="relative flex h-full flex-col" @dragover="onRootDragOver" @dragleave="onRootDragLeave" @drop="onRootDrop">
    <!-- 顶部:拖放/点击选择上传到素材库根目录 -->
    <Dropzone v-if="upload" :hint="tt('upload.dropHint')" @drop="onRootDropFiles" />

    <!-- 工具栏:搜索 + 刷新 + 计数 -->
    <div class="flex items-center gap-2 border-b border-border px-3 py-2">
      <span
        class="relative flex min-w-0 flex-1 items-center rounded-md border border-border bg-accent px-2 text-muted-foreground transition-colors focus-within:border-primary"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <path
            d="M7 2a5 5 0 1 1-3.06 8.96l-2.49 2.49a.75.75 0 1 1-1.06-1.06l2.49-2.49A5 5 0 0 1 7 2zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
            fill="currentColor"
          />
        </svg>
        <input
          v-model="query"
          type="text"
          class="min-w-0 flex-1 border-none bg-transparent px-1 py-[5px] font-inherit text-foreground outline-none"
          :placeholder="tt('library.searchPlaceholder', { type: titleText })"
        />
        <button
          v-if="query"
          class="cursor-pointer border-none bg-transparent px-0.5 py-0 text-base leading-none text-muted-foreground hover:text-foreground"
          :title="tt('common.clear')"
          @click="query = ''"
        >×</button>
      </span>
      <button
        class="cursor-pointer rounded-md border border-border bg-transparent px-2 py-1 text-sm leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        :title="tt('common.refresh')"
        :disabled="loading"
        @click="load(libraryId)"
      >↻</button>
      <button
        v-if="selection"
        class="cursor-pointer rounded-md border border-border bg-transparent px-2 py-1 text-sm leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
        :class="selectMode && 'border-primary text-primary'"
        :title="tt('library.selectMode')"
        @click="selectMode = !selectMode"
      >
        {{ selectMode ? `✓ ${tt('library.selecting')}` : tt('library.selectMode') }}
      </button>
      <span class="text-[11px] whitespace-nowrap text-muted-foreground">{{ tt('library.count', { n: count, unit: unitText }) }}</span>
    </div>

    <!-- 错误 -->
    <div v-if="error" class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-destructive">{{ tt('library.loadFailed', { error }) }}</div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">{{ tt('common.loading') }}</div>

    <!-- 空态 -->
    <div v-else-if="noData" class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      <span class="text-4xl">📁</span>
      <span>{{ tt('library.emptyTitle', { type: titleText }) }}</span>
      <span class="text-[11px] text-muted-foreground opacity-70">{{ tt('library.emptyHint') }}</span>
    </div>

    <!-- 搜索无结果 -->
    <div v-else-if="isSearching && filteredTree.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      {{ tt('library.noMatch', { type: titleText }) }}
    </div>

    <!-- 树 -->
    <div
      v-else
      class="flex-1 overflow-y-auto px-2 pt-1.5 transition-colors duration-100"
      :class="rootHover && 'bg-primary/[6%]'"
    >
      <LibraryTree
        :nodes="filteredTree"
        :kind="mode"
        :expanded="effectiveExpanded"
        :matched="matched"
        :selected-ids="selectMode && mode === 'folder' ? selectedIds : undefined"
        :checkable="selectMode && mode === 'tag'"
        :checked="selectMode && mode === 'tag' ? selectedIds : undefined"
        @toggle="toggle"
        @select="onSelect"
        @drop="onDrop"
        @contextmenu="onTreeContextMenu"
      />
    </div>

    <!-- 右键菜单:新建同级 / 新建子级 / 删除 -->
    <ContextMenu v-if="menu" :x="menu.x" :y="menu.y" @close="closeMenu">
      <button :class="ctxItem" @click="createNode('sibling')">{{ tt('tree.createSibling') }}</button>
      <button :class="ctxItem" @click="createNode('child', { type: titleText })">{{ tt('tree.createChild', { type: titleText }) }}</button>
      <div class="my-[3px] h-px bg-border" />
      <button :class="[ctxItem, 'text-destructive']" @click="deleteNode">{{ tt('tree.delete') }}</button>
    </ContextMenu>
  </div>
</template>
