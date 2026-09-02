<script setup lang="ts">
/**
 * 文件夹 / 标签视图(两个 tab 共用,由 mode 区分)。
 * 自 mira-browser-extension 迁移:数据(CRUD)/弹窗/上传/文案全部由宿主注入。
 *
 * - 顶部:拖放/点击选择上传到素材库根目录(需传 upload)
 * - 工具栏:搜索切换(输入即过滤,自 SaveLocationForm 移入) + 上传(upload.pick) + 新增(CreateNodeDialog)
 * - 中部:树(拖拽文件 → fileDrop 回调 或 默认上传 direct/dialog 模式,互斥;useDefaultDropUpload 开关控制;
 *   树内拖拽排序,跨层移动内置 AlertDialog 确认;
 *   传 v-model:selected 受控启用选择;view='tiles' 时叶子层多行平铺、父级恒展开,切换 UI 由宿主实现)
 * - 右键菜单:上传到此处(upload.pick,由宿主弹上传对话框)、新建同级/子级(CreateNodeDialog)、
 *   编辑(services.updateNode)、删除(内置 AlertDialog 确认;folder 带「同时删除其中的文件」勾选)
 *
 * 样式为 tailwind/shadcn 原子类,scoped CSS 仅搜索栏展开过渡(ui_rule.md 允许的例外)。
 */
import { computed, ref, watch } from 'vue';
import { Loader2, Plus, Search, Upload } from '@lucide/vue';
import { useLibraryTreeData } from './useLibraryTreeData';
import { useLibraryTreeActions } from './useLibraryTreeActions';
import { createLibraryTreeT } from './i18n';
import { filterTree, collectIds, flattenTree, ROOT_ID } from './tree';
import LibraryTree from './LibraryTree.vue';
import CreateNodeDialog from './CreateNodeDialog.vue';
import ContextMenu from './ContextMenu.vue';
import Dropzone from './Dropzone.vue';
import { parseDrop, canAcceptDrop, isNodeDrag } from './drag-data';
import { defaultDropUpload } from './defaultDropUpload';
// 注意:library 子入口以源码供宿主直接消费,这里必须用相对路径(宿主的 @ 别名指向其自身 src)
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import type {
  LibraryTreeCreatePayload,
  LibraryTreeUpdatePayload,
  LibraryTreeDialog,
  LibraryTreeDropPosition,
  LibraryTreeDropUploadMode,
  LibraryTreeFileDropPayload,
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
  /** 弹窗服务:提供后用于拖拽排序/移动失败的错误提示(alert) */
  dialog?: LibraryTreeDialog;
  /** 上传服务:提供后启用拖放/选择文件上传 */
  upload?: LibraryTreeUpload;
  /** 拖放文件/链接回调:与默认上传互斥,仅在默认上传关闭时触发(提供了本回调且未显式开默认上传时即走回调) */
  fileDrop?: (payload: LibraryTreeFileDropPayload) => void;
  /** 是否使用默认拖放上传(经 defaultDropUpload 路由到 upload 服务);提供了 fileDrop 时需显式传 true 才走默认上传 */
  useDefaultDropUpload?: boolean;
  /** 默认拖放上传模式:direct=直接走 upload.files/urls(缺省);dialog=打开 upload.pick 对话框并预填(未提供 pick 回退 direct) */
  defaultDropUploadMode?: LibraryTreeDropUploadMode;
  /** 顶部根目录上传 Dropzone;传 false 隐藏(树节点拖放/右键/工具栏上传不受影响),缺省显示 */
  showDropzone?: boolean;
  /** 视图:tree=经典树(默认);tiles=叶子层多行平铺(所有父级分组卡片恒展开,无折叠按钮)。受控 prop,切换 UI 由宿主实现 */
  view?: 'tree' | 'tiles';
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT;
}>();

/** 受控选择:folder 视图单选(再点取消),tag 视图多选勾选;不传则纯浏览,无选择交互 */
const selected = defineModel<LibraryTreeNode[]>('selected');

const selectedIds = computed(() => {
  const nodes = selected.value;
  return nodes ? new Set(nodes.map(n => n.id)) : undefined;
});

function onSelect(node: LibraryTreeNode) {
  const checked = selectedIds.value;
  if (props.mode === 'folder') {
    // 文件夹单选,再点取消
    selected.value = checked?.has(node.id) ? [] : [node];
  } else {
    // 标签多选(checkbox 语义)
    selected.value = checked?.has(node.id)
      ? (selected.value ?? []).filter(n => n.id !== node.id)
      : [...(selected.value ?? []), node];
  }
  // 点选搜索定位到的目标后清空搜索,树恢复全量
  if (searchTerm.value) searchTerm.value = '';
}

const fallbackT = createLibraryTreeT();
/** 宿主未传 t 或宿主缺 key(vue-i18n 返回 key 本身)时回退内置中文(与 CreateNodeDialog 一致) */
const tt = (key: string, params?: Record<string, unknown>) => {
  if (!props.t) return fallbackT(key, params);
  const r = props.t(key, params);
  return r === key ? fallbackT(key, params) : r;
};

const { tree, count, loading, error, load } = useLibraryTreeData(props.mode, props.services);

// ---- 展开/折叠状态 ----
const expanded = ref(new Set<number>());
function toggle(id: number) {
  const next = new Set(expanded.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
}

// ---- 搜索(自 SaveLocationForm 移入):按钮切换搜索栏显隐,输入即实时过滤 ----
const showSearch = ref(false);
const searchTerm = ref('');

function toggleSearch() {
  showSearch.value = !showSearch.value;
  // 收起时清空关键词,树恢复全量
  if (!showSearch.value) searchTerm.value = '';
}

const filtered = computed(() => filterTree(tree.value, searchTerm.value));
const filteredTree = computed(() => filtered.value.tree);
const matched = computed(() => filtered.value.matched);
// 搜索态:自动展开全部(命中项连同其祖先/后代都可见)
const effectiveExpanded = computed(() =>
  searchTerm.value.trim() ? collectIds(filteredTree.value) : expanded.value,
);
const isSearching = computed(() => searchTerm.value.trim().length > 0);

// ---- 拖到空白区域:文件/链接 → 上传到根目录;树内节点 → 排序到根层末尾 ----
const rootHover = ref(false);
/** 树内拖拽悬停空白区:容器底部插入线指示"排到根末尾" */
const rootDropMark = ref(false);
function onRootDragOver(e: DragEvent) {
  if (isNodeDrag(e.dataTransfer)) {
    if (!dragNode.value) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    rootDropMark.value = true;
    return;
  }
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
  rootDropMark.value = false;
}
function onRootDrop(e: DragEvent) {
  if (isNodeDrag(e.dataTransfer)) {
    e.preventDefault();
    rootDropMark.value = false;
    void onRootNodeDrop();
    return;
  }
  e.preventDefault();
  rootHover.value = false;
  dispatchFileDrop(e);
}

/** 拖放文件/链接统一分发:与默认上传互斥 —— 默认上传启用时走 defaultDropUpload,关闭时走 fileDrop 回调 */
function dispatchFileDrop(e: DragEvent, node?: LibraryTreeNode) {
  const { files, urls } = parseDrop(e);
  if (!files.length && !urls.length) return;
  const target = node
    ? (props.mode === 'folder' ? { folderId: node.id } : { tags: [String(node.id)] })
    : undefined;
  // 缺省规则:提供 fileDrop 即视为自定义(走回调);未提供则始终走默认上传。
  // 注意 Vue 对 Boolean prop 未传时缺省为 false(非 undefined),不能用 ?? 判断"未传":
  // - 有 fileDrop: 开关显式传 true 才走默认上传(压制回调),缺省 false 走回调
  // - 无 fileDrop: 无回调可走,直接默认上传(开关无意义,安全兜底)
  const useDefault = props.fileDrop ? props.useDefaultDropUpload === true : true;
  if (useDefault) {
    defaultDropUpload(props.upload, files, urls, target, props.defaultDropUploadMode);
    return;
  }
  props.fileDrop?.({ node, files, urls, target, event: e });
}

/** 顶部上传区回调(点击选择 / 拖放文件)→ 上传到素材库根目录 */
function onRootDropFiles(files: File[]) {
  if (files.length) props.upload?.files(files);
}

// ---- 节点落点 → 拖放文件分发(fileDrop 回调 + 默认上传到目标文件夹/标签) ----
function onDrop(node: LibraryTreeNode, e: DragEvent) {
  rootHover.value = false;
  dispatchFileDrop(e, node);
}

// ---- 树内拖拽排序(参考 mira-client FolderTreeComponent/useDragSort 语义) ----
// services.updateSortIndex 提供后启用;跨层移动需 services.moveNode,确认走内置 AlertDialog。
const sortable = computed(() => !!props.services.updateSortIndex);
const movable = computed(() => !!props.services.moveNode);
const dragNode = ref<LibraryTreeNode | null>(null);
const dropMark = ref<{ id: number; position: LibraryTreeDropPosition } | null>(null);

/** 某父级(0=根)下的直接子节点列表(基于全量树,搜索过滤态不参与排序计算) */
function siblingsOf(parentId: number): LibraryTreeNode[] {
  if (parentId === ROOT_ID) return tree.value;
  return flattenTree(tree.value).find(n => n.id === parentId)?.children ?? [];
}

function expandNode(id: number) {
  const next = new Set(expanded.value);
  next.add(id);
  expanded.value = next;
}

function clearDragState() {
  dragNode.value = null;
  dropMark.value = null;
  rootDropMark.value = false;
}

function onNodeDragStart(node: LibraryTreeNode, e: DragEvent) {
  // 搜索过滤态顺序不完整,排序会错乱,禁止拖起
  if (isSearching.value) {
    e.preventDefault();
    return;
  }
  dragNode.value = node;
}

function onNodeDragOver(node: LibraryTreeNode, position: LibraryTreeDropPosition) {
  // 行上悬停时收回根末尾指示(行级 dragover 已阻断冒泡,根容器 handler 收不到)
  rootDropMark.value = false;
  if (!dragNode.value || node.id === dragNode.value.id) {
    dropMark.value = null;
    return;
  }
  // 不支持跨层移动时,inside 落点折叠为 after(仅同层重排)
  dropMark.value = {
    id: node.id,
    position: position === 'inside' && !movable.value ? 'after' : position,
  };
}

function onNodeDragLeave(node: LibraryTreeNode, e: DragEvent) {
  // 行内子元素间移动会触发 dragleave,离开行本体才清指示
  const row = e.currentTarget as HTMLElement | null;
  if (row && e.relatedTarget instanceof Node && row.contains(e.relatedTarget)) return;
  if (dropMark.value?.id === node.id) dropMark.value = null;
}

async function onNodeDrop(target: LibraryTreeNode, position: LibraryTreeDropPosition) {
  const drag = dragNode.value;
  clearDragState();
  if (!drag || !props.services.updateSortIndex) return;
  if (target.id === drag.id) return;

  // 禁止拖进自己子树(循环引用)
  if (collectIds([drag]).has(position === 'inside' ? target.id : target.parentId)) return;

  // 落点 → 新父级 + 新兄弟顺序
  let newParentId: number;
  let siblings: LibraryTreeNode[];
  if (position === 'inside') {
    newParentId = target.id;
    siblings = [...target.children.filter(n => n.id !== drag.id), drag];
  } else {
    newParentId = target.parentId;
    const list = siblingsOf(newParentId).filter(n => n.id !== drag.id);
    const index = list.findIndex(n => n.id === target.id);
    if (index < 0) return;
    list.splice(position === 'before' ? index : index + 1, 0, drag);
    siblings = list;
  }

  const parentTitle = position === 'inside'
    ? target.title
    : (flattenTree(tree.value).find(n => n.id === target.parentId)?.title ?? tt('tree.root'));
  await applyDragSort(drag, newParentId, siblings, parentTitle);
}

/** 拖到视图空白区域 → 移动/排序到根层末尾 */
async function onRootNodeDrop() {
  const drag = dragNode.value;
  clearDragState();
  if (!drag || !props.services.updateSortIndex) return;
  const siblings = [...tree.value.filter(n => n.id !== drag.id), drag];
  await applyDragSort(drag, ROOT_ID, siblings, tt('tree.root'));
}

/** 拖拽跨层移动确认(内置 AlertDialog):暂存待保存参数,确认后执行 */
const moveConfirm = ref<{
  drag: LibraryTreeNode;
  newParentId: number;
  items: { id: number; sort_index: number }[];
  parentTitle: string;
} | null>(null);
const moving = ref(false);

/** 保存拖拽结果:跨层先 moveNode,再写新层排序;失败走宿主 dialog.alert */
async function saveDragSort(
  drag: LibraryTreeNode,
  newParentId: number,
  items: { id: number; sort_index: number }[],
  move: boolean,
) {
  const updateSortIndex = props.services.updateSortIndex;
  if (!updateSortIndex) return;
  const alertDialog = props.dialog ?? silentDialog;
  try {
    if (move) {
      await props.services.moveNode?.(props.mode, props.libraryId, drag.id, newParentId || null);
    }
    await updateSortIndex.call(props.services, props.mode, props.libraryId, items);
  } catch (error) {
    console.error('[LibraryTreeView] drag sort failed:', error);
    alertDialog.alert({ message: tt(move ? 'tree.moveFailed' : 'tree.sortFailed', { error: String(error) }) });
    return;
  }
  if (newParentId !== ROOT_ID) expandNode(newParentId);
  await load(props.libraryId);
}

/** 拖拽入口:同层直接写排序;跨层先弹内置 AlertDialog 确认(对齐桌面端拖拽移动语义),取消则不动 */
async function applyDragSort(
  drag: LibraryTreeNode,
  newParentId: number,
  siblings: LibraryTreeNode[],
  parentTitle: string,
) {
  const updateSortIndex = props.services.updateSortIndex;
  if (!updateSortIndex) return;
  const sameLevel = newParentId === drag.parentId;
  // 同层且顺序未变 → 无需保存
  const oldOrder = siblingsOf(drag.parentId).map(n => n.id).join();
  if (sameLevel && siblings.map(n => n.id).join() === oldOrder) return;

  const items = siblings.map((n, i) => ({ id: n.id, sort_index: i }));
  if (!sameLevel) {
    if (!props.services.moveNode) return;
    moveConfirm.value = { drag, newParentId, items, parentTitle };
    return;
  }
  await saveDragSort(drag, newParentId, items, false);
}

/** 跨层移动确认对话框「确定」:执行 moveNode + 新层排序 */
async function confirmMove() {
  const pending = moveConfirm.value;
  if (!pending || moving.value) return;
  moving.value = true;
  try {
    await saveDragSort(pending.drag, pending.newParentId, pending.items, true);
  } finally {
    moving.value = false;
    moveConfirm.value = null;
  }
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

const noData = computed(() => !loading.value && !error.value && count.value === 0);

/** dialog 未注入时的占位:错误提示静默忽略 */
const silentDialog: LibraryTreeDialog = {
  alert: async () => {},
  confirm: async () => false,
  prompt: async () => null,
  confirmCheck: async () => ({ ok: false, checked: false }),
};

// ---- 右键菜单:新建同级 / 新建子级 / 编辑 / 删除(删除确认走内置 AlertDialog,不再依赖宿主 dialog) ----
const {
  menu,
  openMenu: onContextMenu,
  closeMenu,
  requestDelete,
  closeDelete,
  confirmDelete,
  deleteTarget,
  deleteFiles,
  deleteError,
  deleting,
} = useLibraryTreeActions({
  mode: props.mode,
  libraryId: () => props.libraryId,
  reload: () => load(props.libraryId),
}, {
  services: props.services,
  t: (key, params) => tt(key, params),
});

// ---- 工具栏「新增」对话框(CreateNodeDialog,自 SaveLocationForm 抽离) ----
const createOpen = ref(false);
const createDefaultParent = ref(ROOT_ID);

/** 父级选择树:folder=根目录行+文件夹树;tag=根标签行+标签树 */
const createTree = computed<LibraryTreeNode[]>(() => {
  const root: LibraryTreeNode = {
    id: ROOT_ID,
    title: props.mode === 'folder' ? tt('tree.root') : tt('tree.tagRoot'),
    parentId: ROOT_ID,
    level: 0,
    children: [],
  };
  return [root, ...tree.value];
});

/** 打开对话框:默认父级为当前选中节点(folder 模式),未选为根 */
function onCreateNode() {
  createDefaultParent.value = props.mode === 'folder' ? (selected.value?.[0]?.id ?? ROOT_ID) : ROOT_ID;
  createOpen.value = true;
}

/** 右键「新建同级」:父级 = 右键节点的父级 */
function onCreateSibling() {
  if (!menu.value) return;
  createDefaultParent.value = menu.value.node.parentId;
  closeMenu();
  createOpen.value = true;
}

/** 右键「新建子级」:父级 = 右键节点自身 */
function onCreateChild() {
  if (!menu.value) return;
  createDefaultParent.value = menu.value.node.id;
  closeMenu();
  createOpen.value = true;
}

// ---- 右键「编辑」(CreateNodeDialog 编辑模式;services.updateNode 提供后启用) ----
const editable = computed(() => !!props.services.updateNode);
const editOpen = ref(false);
const editNode = ref<LibraryTreeNode | null>(null);

function onEditNode() {
  if (!menu.value) return;
  editNode.value = menu.value.node;
  closeMenu();
  editOpen.value = true;
}

/** 对话框更新服务:调 services.updateNode */
async function updateViaDialog(payload: LibraryTreeUpdatePayload): Promise<unknown> {
  return props.services.updateNode?.(payload.kind, props.libraryId, payload.id, payload.title, {
    description: payload.description,
    color: payload.color,
    icon: payload.icon,
  });
}

/** 编辑保存成功:刷新树 + 同步受控选中里的同 id 节点引用 */
async function onUpdated(e: { id: number; parentId: number }) {
  await load(props.libraryId);
  if (selected.value === undefined) return;
  const node = flattenTree(tree.value).find(n => n.id === e.id);
  if (node) selected.value = selected.value.map(s => (s.id === e.id ? node : s));
}

/** 对话框创建服务:调 services.createNode,尽力取新节点 id(实现可返回 number 或含 id 的对象) */
async function createViaDialog(payload: LibraryTreeCreatePayload): Promise<number | undefined> {
  const r = await props.services.createNode(
    payload.kind,
    props.libraryId,
    payload.title,
    payload.parentId || undefined,
    { description: payload.description, color: payload.color, icon: payload.icon },
  );
  return typeof r === 'number'
    ? r
    : typeof (r as { id?: unknown })?.id === 'number' ? (r as { id: number }).id : undefined;
}

/** 创建成功:展开父级 + 刷新树 + 受控选中新节点(宿主未传 selected 时跳过选中) */
async function onCreated(e: { id?: number; parentId: number }) {
  if (e.parentId !== ROOT_ID) expandNode(e.parentId);
  await load(props.libraryId);
  if (e.id == null || selected.value === undefined) return;
  const node = flattenTree(tree.value).find(n => n.id === e.id);
  if (!node) return;
  selected.value = props.mode === 'folder' ? [node] : [...selected.value, node];
}

/** 右键菜单常开(新建/编辑走内置 CreateNodeDialog,删除走内置 AlertDialog) */
function onTreeContextMenu(node: LibraryTreeNode, x: number, y: number) {
  onContextMenu(node, x, y);
}

/** 右键「上传到此处」:交宿主 upload.pick 弹上传对话框(如 BatchUploadDialog),落点语义与拖拽上传一致 */
function onUploadToNode() {
  if (!menu.value) return;
  const target = props.mode === 'folder'
    ? { folderId: menu.value.node.id }
    : { tags: [String(menu.value.node.id)] };
  closeMenu();
  props.upload?.pick?.(target);
}

/** 工具栏「上传」:同样交宿主 upload.pick;落点取当前选中节点(文件夹单选/标签勾选,未选=无预选) */
function onToolbarUpload() {
  if (props.mode === 'folder') {
    const folder = selected.value?.[0];
    props.upload?.pick?.(folder ? { folderId: folder.id } : undefined);
    return;
  }
  const tags = (selected.value ?? []).map(n => String(n.id));
  props.upload?.pick?.(tags.length ? { tags } : undefined);
}

/** 右键菜单项(ContextMenu 的 :deep 样式已移除,类由这里提供) */
const ctxItem = 'flex w-full cursor-pointer items-center gap-1.5 rounded-[4px] border-none bg-transparent px-2.5 py-1.5 text-left font-inherit text-xs text-foreground hover:bg-background';
</script>

<template>
  <div class="relative flex h-full flex-col" @dragover="onRootDragOver" @dragleave="onRootDragLeave" @drop="onRootDrop">
    <!-- 顶部:拖放/点击选择上传到素材库根目录 -->
    <Dropzone v-if="upload && showDropzone !== false" :hint="tt('upload.dropHint')" @drop="onRootDropFiles" />

    <!-- 工具栏:搜索切换 + 新增(自 SaveLocationForm 移入) -->
    <div class="flex items-center justify-end gap-0.5 border-b border-border px-3 py-2">
      <button
        type="button"
        class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-90"
        :class="showSearch && 'text-primary'"
        :title="tt('library.searchPlaceholder', { type: titleText })"
        @click="toggleSearch"
      >
        <Search class="size-4" />
      </button>
      <button
        v-if="upload?.pick"
        type="button"
        class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-90"
        :title="tt('common.upload')"
        @click="onToolbarUpload"
      >
        <Upload class="size-4" />
      </button>
      <button
        type="button"
        class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-90"
        :title="tt('library.create', { type: titleText })"
        @click="onCreateNode"
      >
        <Plus class="size-4" />
      </button>
    </div>

    <!-- 搜索栏:输入即实时过滤树 -->
    <Transition name="search-slide">
      <div v-if="showSearch" class="search-shell border-b border-border px-3 py-2">
        <div class="search-shell-inner">
          <Input v-model="searchTerm" class="h-7" :placeholder="tt('library.searchPlaceholder', { type: titleText })" />
        </div>
      </div>
    </Transition>

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
      class="flex-1 overflow-y-auto px-2 pt-1.5 transition-[background-color,box-shadow] duration-100"
      :class="[
        rootHover && 'bg-primary/[6%]',
        rootDropMark && 'shadow-[inset_0_-2px_0_0_var(--primary)]',
      ]"
    >
      <LibraryTree
        :nodes="filteredTree"
        :kind="mode"
        :expanded="effectiveExpanded"
        :matched="matched"
        :selected-ids="mode === 'folder' ? selectedIds : undefined"
        :checkable="mode === 'tag' && selectedIds != null"
        :checked="mode === 'tag' ? selectedIds : undefined"
        :sortable="sortable && !isSearching"
        :drop-mark="dropMark"
        :dragging-id="dragNode?.id ?? null"
        :tile-leaves="view === 'tiles'"
        :root="true"
        :root-label="tt(mode === 'folder' ? 'tree.root' : 'tree.tagRoot')"
        @toggle="toggle"
        @select="onSelect"
        @drop="onDrop"
        @contextmenu="onTreeContextMenu"
        @node-drag-start="onNodeDragStart"
        @node-drag-over="onNodeDragOver"
        @node-drag-leave="onNodeDragLeave"
        @node-drop="onNodeDrop"
        @node-drag-end="clearDragState"
      />
    </div>

    <!-- 右键菜单:上传到此处(需 upload.pick,宿主弹 BatchUploadDialog 等) / 新建同级 / 新建子级(内置 CreateNodeDialog) + 编辑(需 services.updateNode) + 删除(内置 AlertDialog 确认) -->
    <ContextMenu v-if="menu" :x="menu.x" :y="menu.y" @close="closeMenu">
      <button v-if="upload?.pick" :class="ctxItem" @click="onUploadToNode">{{ tt('tree.upload') }}</button>
      <button v-if="editable" :class="ctxItem" @click="onEditNode">{{ tt('tree.edit') }}</button>
      <button :class="ctxItem" @click="onCreateSibling">{{ tt('tree.createSibling') }}</button>
      <button :class="ctxItem" @click="onCreateChild">{{ tt('tree.createChild', { type: titleText }) }}</button>
      <div class="my-[3px] h-px bg-border" />
      <button :class="[ctxItem, 'text-destructive']" @click="requestDelete">{{ tt('tree.delete') }}</button>
    </ContextMenu>

    <!-- 删除确认:内置 AlertDialog(folder 带「同时删除其中的文件」勾选;失败错误留在框内可重试) -->
    <AlertDialog :open="!!deleteTarget" @update:open="(value: boolean) => !value && closeDelete()">
      <AlertDialogContent class="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ tt('tree.deleteTitle', { type: titleText }) }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ mode === 'folder'
              ? tt('tree.deleteFolderConfirm', { name: deleteTarget?.title })
              : tt('tree.deleteTagConfirm', { name: deleteTarget?.title }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <!-- folder:勾选后连同其中的文件一起删除 -->
        <label
          v-if="mode === 'folder'"
          class="flex cursor-pointer items-center gap-2 text-sm select-none"
          @click.prevent="deleteFiles = !deleteFiles"
        >
          <span
            role="checkbox"
            :aria-checked="deleteFiles"
            tabindex="0"
            class="inline-flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-border bg-accent text-white transition-colors duration-100 hover:border-primary"
            :class="deleteFiles && 'border-primary bg-primary'"
            @keydown.enter.prevent="deleteFiles = !deleteFiles"
          >
            <svg v-if="deleteFiles" viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
              <path
                d="M3 8.5l3 3 7-7"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          {{ tt('tree.deleteFilesCheck') }}
        </label>

        <p v-if="deleteError" class="text-xs text-destructive">{{ deleteError }}</p>

        <AlertDialogFooter>
          <Button variant="outline" :disabled="deleting" @click="closeDelete">{{ tt('common.cancel') }}</Button>
          <Button variant="destructive" :disabled="deleting" @click="confirmDelete">
            <Loader2 v-if="deleting" class="size-4 animate-spin" />
            {{ tt('tree.delete') }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 拖拽跨层移动确认:内置 AlertDialog(取消则不动) -->
    <AlertDialog :open="!!moveConfirm" @update:open="(value: boolean) => !value && !moving && (moveConfirm = null)">
      <AlertDialogContent class="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ tt('tree.moveTitle', { type: titleText }) }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ tt('tree.dragMoveConfirm', { name: moveConfirm?.drag.title, parent: moveConfirm?.parentTitle }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" :disabled="moving" @click="moveConfirm = null">{{ tt('common.cancel') }}</Button>
          <Button :disabled="moving" @click="confirmMove">
            <Loader2 v-if="moving" class="size-4 animate-spin" />
            {{ tt('common.confirm') }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 新建节点对话框:工具栏「新增」与右键「新建同级/子级」共用(图标/颜色/名称/描述/父级树) -->
    <CreateNodeDialog
      v-model:open="createOpen"
      :kind="mode"
      :nodes="createTree"
      :default-parent-id="createDefaultParent"
      :create-node="createViaDialog"
      :t="t"
      @created="onCreated"
    />

    <!-- 编辑节点对话框:右键「编辑」,回填目标节点字段,保存走 services.updateNode -->
    <CreateNodeDialog
      v-model:open="editOpen"
      :kind="mode"
      :nodes="createTree"
      :node="editNode ?? undefined"
      :create-node="createViaDialog"
      :update-node="updateViaDialog"
      :t="t"
      @updated="onUpdated"
    />
  </div>
</template>

<style scoped>
/* 搜索栏展开/收起:grid 0fr→1fr 高度过渡 + 位移/透明度(自 SaveLocationForm 移入)。
   tailwind 无法表达的过渡,属 ui_rule.md 允许的例外;不含颜色 token。 */
.search-shell {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}
.search-slide-enter-active {
  transition: grid-template-rows 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
}
.search-slide-leave-active {
  transition: grid-template-rows 150ms cubic-bezier(0.4, 0, 1, 1), opacity 150ms cubic-bezier(0.4, 0, 1, 1), transform 150ms cubic-bezier(0.4, 0, 1, 1);
}
.search-slide-enter-from,
.search-slide-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
}
.search-shell-inner { overflow: hidden; min-height: 0; }
@media (prefers-reduced-motion: reduce) {
  .search-slide-enter-active,
  .search-slide-leave-active { transition: opacity 150ms ease; }
  .search-slide-enter-from,
  .search-slide-leave-to { transform: none; }
}
</style>
