<script setup lang="ts">
/**
 * 递归文件夹 / 标签树。
 *
 * 复刻 React 版 headless-tree 树形交互:
 * - 按层级缩进(level * indent)
 * - 有子节点的项显示展开/折叠箭头(plus-minus 风格)
 * - 文件夹/标签图标(内联 SVG,零依赖)
 * - 拖拽落点高亮 + drop 抛回目标节点
 *
 * 组件自递归:LibraryTree 渲染一层 children 时复用自身。
 * 样式为 tailwind/shadcn 原子类,无 scoped CSS、不依赖语义变量。
 */
import { computed, ref } from 'vue';
import type { LibraryTreeNode } from './types';
import { canAcceptDrop, isNodeDrag, NODE_DND_TYPE } from './drag-data';
import type { LibraryTreeDropPosition } from './types';

const props = withDefaults(
  defineProps<{
    nodes: LibraryTreeNode[];
    /** 'folder' 走文件夹图标,否则标签图标 */
    kind?: 'folder' | 'tag';
    /** 每层缩进 px(对齐 React 版 indent) */
    indent?: number;
    /** 已展开的 id 集合(父级持有) */
    expanded: Set<number>;
    /** 命中搜索的 id 集合(高亮) */
    matched?: Set<number>;
    /** 选中态 id 集合(高亮行)。传入即启用选中模式:点行触发 select,展开只走箭头 */
    selectedIds?: Set<number>;
    /** 每行前显示 checkbox(多选场景);点击行/checkbox 均触发 select */
    checkable?: boolean;
    /** checkbox 勾选的 id 集合 */
    checked?: Set<number>;
    /** 树内拖拽排序:行可拖起(dragstart 经 node-drag-start 抛回父级) */
    sortable?: boolean;
    /** 拖拽落点指示(父级持有):目标行 + 落点位置 */
    dropMark?: { id: number; position: LibraryTreeDropPosition } | null;
    /** 拖拽中的节点 id(半透明反馈) */
    draggingId?: number | null;
    /** 平铺视图:叶子层渲染为多行平铺 chip,父级一律分组卡片恒展开(不显示折叠按钮) */
    tileLeaves?: boolean;
    /** 内部用:本平铺层嵌在分组卡片体内,去掉容器左缩进与上下留白 */
    inline?: boolean;
    /** 顶层标记(仅根层调用传 true):平铺视图下无子节点的散叶子聚合进「根目录」虚拟分组卡 */
    root?: boolean;
    /** 根目录虚拟分组卡的头部文案(root 时显示) */
    rootLabel?: string;
  }>(),
  { kind: 'folder', indent: 20, checkable: false, sortable: false, dropMark: null, draggingId: null, tileLeaves: false, inline: false, root: false, rootLabel: '' },
);

const emit = defineEmits<{
  toggle: [id: number];
  /** 拖放到某节点:带原始 DragEvent,父级用 parseDrop 提取 files / urls */
  drop: [node: LibraryTreeNode, e: DragEvent];
  /** 右键菜单:带节点 + 鼠标坐标,父级弹 ContextMenu */
  contextmenu: [node: LibraryTreeNode, x: number, y: number];
  /** 选中模式下单选/勾选某节点(父级维护 selectedIds / checked) */
  select: [node: LibraryTreeNode];
  /** 树内排序:行拖起(position 落点判定在父级) */
  'node-drag-start': [node: LibraryTreeNode, e: DragEvent];
  'node-drag-over': [node: LibraryTreeNode, position: LibraryTreeDropPosition, e: DragEvent];
  'node-drag-leave': [node: LibraryTreeNode, e: DragEvent];
  'node-drop': [node: LibraryTreeNode, position: LibraryTreeDropPosition, e: DragEvent];
  'node-drag-end': [node: LibraryTreeNode, e: DragEvent];
}>();

// 选中模式:点行 = select;非选中模式保持原行为(点行折叠/展开)
const selectable = computed(() => props.checkable || props.selectedIds !== undefined);

// 平铺视图:本层节点全部为叶子 → 该层渲染为多行平铺(父级层级仍走树形缩进)
const isLeafTier = computed(
  () => props.tileLeaves && props.nodes.length > 0 && props.nodes.every(n => !n.children.length),
);

/** 分组卡片:平铺视图下所有父节点(有子节点) → li 整体作为卡片(头=节点行,体=子内容),恒展开不折叠 */
function isGroupCard(node: LibraryTreeNode): boolean {
  return props.tileLeaves && node.children.length > 0;
}

/** 平铺视图根层:无子节点的散叶子 → 聚合进「根目录」虚拟分组卡(置顶渲染) */
const rootLeaves = computed(() =>
  props.tileLeaves && props.root ? props.nodes.filter(n => !n.children.length) : [],
);

/** 主列表:平铺根层剔除散叶子(进虚拟卡),其余场景全量 */
const mainNodes = computed(() =>
  rootLeaves.value.length ? props.nodes.filter(n => n.children.length) : props.nodes,
);

// 当前被拖拽悬停的节点 id(用于高亮落点)
const dragOverId = ref<number | null>(null);

function onToggle(node: LibraryTreeNode) {
  // 仅有子节点的项可折叠/展开;平铺视图的分组卡片始终展开,不响应折叠
  if (node.children.length && !isGroupCard(node)) emit('toggle', node.id);
}

function onRowClick(node: LibraryTreeNode) {
  if (selectable.value) emit('select', node);
  else onToggle(node);
}

// 右键:阻止浏览器默认菜单,把节点 + 鼠标坐标抛给父级
function onContextMenu(e: MouseEvent, node: LibraryTreeNode) {
  e.preventDefault();
  e.stopPropagation();
  emit('contextmenu', node, e.clientX, e.clientY);
}

// ---- 拖拽落点 ----
// dragenter/dragleave 在含子元素的行上会因进出子节点频繁触发,导致描边闪烁
// (一进子元素就 dragleave 清掉,移到下一个子元素再 dragenter)。改用 dragover 持续
// 标记当前悬停节点:dragover 在悬停期间每帧触发,移出后该节点不再触发,靠定时器清掉。
let clearTimer: ReturnType<typeof setTimeout> | null = null;

function onDragOver(e: DragEvent, node: LibraryTreeNode) {
  // 接受文件或链接(链接拖拽 files 为空,需看 types)
  if (!canAcceptDrop(e.dataTransfer)) return;
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
  dragOverId.value = node.id;
  // 每帧重置:若 80ms 内没有新的 dragover(已离开该行),清掉描边
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => { dragOverId.value = null; }, 80);
}

function onDrop(e: DragEvent, node: LibraryTreeNode) {
  e.preventDefault();
  e.stopPropagation();
  if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
  dragOverId.value = null;
  emit('drop', node, e);
}

// ---- 树内拖拽排序(与文件/链接上传拖拽分流) ----
/** 鼠标 Y 相对行位置 → 落点:上 30% 插目标前 / 下 30% 插目标后 / 中间进目标内 */
function hitPosition(e: DragEvent): LibraryTreeDropPosition {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const ratio = (e.clientY - rect.top) / rect.height;
  if (ratio < 0.3) return 'before';
  if (ratio > 0.7) return 'after';
  return 'inside';
}

function onNodeDragStart(node: LibraryTreeNode, e: DragEvent) {
  if (!e.dataTransfer) return;
  e.dataTransfer.setData(NODE_DND_TYPE, String(node.id));
  e.dataTransfer.effectAllowed = 'move';
  emit('node-drag-start', node, e);
}

function onNodeDragOver(node: LibraryTreeNode, e: DragEvent) {
  if (!isNodeDrag(e.dataTransfer)) return;
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer!.dropEffect = 'move';
  emit('node-drag-over', node, hitPosition(e), e);
}

function onNodeDragLeave(node: LibraryTreeNode, e: DragEvent) {
  if (!isNodeDrag(e.dataTransfer)) return;
  emit('node-drag-leave', node, e);
}

function onNodeDrop(node: LibraryTreeNode, e: DragEvent) {
  if (!isNodeDrag(e.dataTransfer)) return;
  e.preventDefault();
  e.stopPropagation();
  emit('node-drop', node, hitPosition(e), e);
}

/**
 * 后端 folder/tag 的 color 是数值(与桌面端一致,按 ABGR/ARGB 打包)。
 * 转成 #RRGGBB,取低 24 位。无 color 返回空字符串(走默认主题色)。
 */
function colorHex(color?: number): string {
  if (color == null) return '';
  return `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
}

/** 节点的行内样式:有 color 时把图标着色 */
function iconStyle(node: LibraryTreeNode): Record<string, string> {
  const hex = colorHex(node.color);
  return hex ? { color: hex } : {};
}

// ---- 行样式:选中/拖拽悬停时主色底 + 内描边,并压制 hover 反馈(对齐原行为) ----
// 排序落点:before/after 上下缘 2px 主色插入线,inside 整行主色底描边
function rowClass(node: LibraryTreeNode): string[] {
  const selected = props.selectedIds?.has(node.id);
  const dragOver = dragOverId.value === node.id;
  const marked = props.dropMark?.id === node.id ? props.dropMark.position : null;
  return [
    selected || dragOver
      ? 'bg-primary/12 shadow-[inset_0_0_0_1.5px_var(--primary)]'
      : 'hover:bg-accent',
    marked === 'before' ? 'shadow-[inset_0_2px_0_0_var(--primary)]' : '',
    marked === 'after' ? 'shadow-[inset_0_-2px_0_0_var(--primary)]' : '',
    marked === 'inside' ? 'bg-primary/12 shadow-[inset_0_0_0_1.5px_var(--primary)]' : '',
    props.draggingId === node.id ? 'opacity-40' : '',
    selectable.value ? 'cursor-pointer' : 'cursor-default',
  ];
}
</script>

<template>
  <!-- 平铺视图:本层全为叶子 → badge 样式多行平铺(统一默认图标;选择/右键/拖拽上传/排序交互与行一致;父级为分组卡片) -->
  <div
    v-if="isLeafTier && !root"
    class="flex flex-wrap gap-1"
    role="tree"
    :class="inline ? 'py-0.5' : 'py-1'"
    :style="inline ? undefined : { marginLeft: indent + 'px' }"
  >
    <div
      v-for="node in nodes"
      :key="node.id"
      role="treeitem"
      class="inline-flex h-6 max-w-48 shrink-0 items-center gap-1 rounded-full border border-border bg-accent/60 px-2.5 text-xs text-foreground transition-[background-color,border-color,box-shadow,opacity] duration-100 select-none"
      :class="rowClass(node)"
      :title="node.title"
      :draggable="sortable"
      @dragstart="onNodeDragStart(node, $event)"
      @dragover="onDragOver($event, node); onNodeDragOver(node, $event)"
      @dragleave="onNodeDragLeave(node, $event)"
      @drop="onNodeDrop(node, $event); onDrop($event, node)"
      @dragend="emit('node-drag-end', node, $event)"
      @click="onRowClick(node)"
      @contextmenu="onContextMenu($event, node)"
    >
      <!-- 多选 checkbox:点击勾选/取消,阻止冒泡到 badge -->
      <span
        v-if="checkable"
        role="checkbox"
        :aria-checked="checked?.has(node.id) ?? false"
        tabindex="0"
        class="inline-flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-[1.5px] border-border bg-accent text-white transition-colors duration-100 hover:border-primary"
        :class="checked?.has(node.id) && 'border-primary bg-primary'"
        @click.stop="emit('select', node)"
        @keydown.enter.prevent="emit('select', node)"
      >
        <svg v-if="checked?.has(node.id)" viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
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

      <!-- 图标:统一默认文件夹/标签图标,不展示节点自定义 icon -->
      <span
        v-if="kind === 'folder'"
        class="inline-flex shrink-0 text-primary"
        :style="iconStyle(node)"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path
            d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span v-else class="inline-flex shrink-0 text-muted-foreground" :style="iconStyle(node)">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path
            d="M10 4l-1 4H5a1 1 0 1 0 0 2h3.5l-1 4H4a1 1 0 1 0 0 2h3l-1 4h2l1-4h4l-1 4h2l1-4h3.5a1 1 0 1 0 0-2H15l1-4h3.5a1 1 0 1 0 0-2H16l1-4h-2l-1 4h-4l1-4h-2zm-.5 6h4l-1 4h-4l1-4z"
            fill="currentColor"
          />
        </svg>
      </span>

      <!-- 标题 -->
      <span
        class="min-w-0 truncate"
        :class="[
          selectedIds?.has(node.id) && 'text-primary',
          matched?.has(node.id) && 'font-semibold text-primary',
        ]"
      >{{ node.title }}</span>
    </div>
  </div>

  <ul v-else class="m-0 list-none p-0" role="tree">
    <!-- 平铺根层:「根目录」虚拟分组卡置顶,收纳无子节点的散叶子(恒展开,头部仅展示无节点交互) -->
    <li v-if="rootLeaves.length" class="my-1 rounded-lg border border-border bg-accent/35 p-1">
      <div class="flex h-7 items-center gap-1.5 rounded-md pr-2 pl-2 text-foreground select-none" :title="rootLabel">
        <span v-if="kind === 'folder'" class="inline-flex shrink-0 text-primary">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span v-else class="inline-flex shrink-0 text-muted-foreground">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M10 4l-1 4H5a1 1 0 1 0 0 2h3.5l-1 4H4a1 1 0 1 0 0 2h3l-1 4h2l1-4h4l-1 4h2l1-4h3.5a1 1 0 1 0 0-2H15l1-4h3.5a1 1 0 1 0 0-2H16l1-4h-2l-1 4h-4l1-4h-2zm-.5 6h4l-1 4h-4l1-4z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span class="min-w-0 flex-1 truncate">{{ rootLabel }}</span>
        <span class="shrink-0 rounded-full border border-border bg-accent px-[5px] py-0.5 text-[10px] leading-none text-muted-foreground">{{ rootLeaves.length }}</span>
      </div>
      <LibraryTree
        :nodes="rootLeaves"
        :kind="kind"
        :indent="indent"
        :expanded="expanded"
        :matched="matched"
        :selected-ids="selectedIds"
        :checkable="checkable"
        :checked="checked"
        :sortable="sortable"
        :drop-mark="dropMark"
        :dragging-id="draggingId"
        :tile-leaves="tileLeaves"
        :inline="true"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
        @drop="(n, f) => emit('drop', n, f)"
        @contextmenu="(n, x, y) => emit('contextmenu', n, x, y)"
        @node-drag-start="(n, e) => emit('node-drag-start', n, e)"
        @node-drag-over="(n, p, e) => emit('node-drag-over', n, p, e)"
        @node-drag-leave="(n, e) => emit('node-drag-leave', n, e)"
        @node-drop="(n, p, e) => emit('node-drop', n, p, e)"
        @node-drag-end="(n, e) => emit('node-drag-end', n, e)"
      />
    </li>

    <li
      v-for="node in mainNodes"
      :key="node.id"
      role="treeitem"
      :aria-expanded="node.children.length ? (isGroupCard(node) || expanded.has(node.id)) : undefined"
      :class="isGroupCard(node) && 'my-1 rounded-lg border border-border bg-accent/35 p-1'"
    >
      <div
        class="flex h-7 items-center gap-1.5 rounded-md pr-2 text-foreground transition-[background-color,box-shadow,opacity] duration-100 select-none"
        :class="rowClass(node)"
        :style="{ paddingLeft: 6 + node.level * indent + 'px' }"
        :title="node.title"
        :draggable="sortable"
        @dragstart="onNodeDragStart(node, $event)"
        @dragover="onDragOver($event, node); onNodeDragOver(node, $event)"
        @dragleave="onNodeDragLeave(node, $event)"
        @drop="onNodeDrop(node, $event); onDrop($event, node)"
        @dragend="emit('node-drag-end', node, $event)"
        @click="onRowClick(node)"
        @contextmenu="onContextMenu($event, node)"
      >
        <!-- 多选 checkbox:点击勾选/取消,阻止冒泡到行 -->
        <span
          v-if="checkable"
          role="checkbox"
          :aria-checked="checked?.has(node.id) ?? false"
          tabindex="0"
          class="inline-flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-[1.5px] border-border bg-accent text-white transition-colors duration-100 hover:border-primary"
          :class="checked?.has(node.id) && 'border-primary bg-primary'"
          @click.stop="emit('select', node)"
          @keydown.enter.prevent="emit('select', node)"
        >
          <svg v-if="checked?.has(node.id)" viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
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

        <!-- 展开/折叠:有子节点显示切换图标;无子节点占位对齐;分组卡片(平铺下恒展开)不渲染,不占左边距 -->
        <span
          v-if="!isGroupCard(node)"
          class="inline-flex w-3.5 shrink-0 justify-center"
          :class="!node.children.length && 'invisible'"
          @click.stop="onToggle(node)"
        >
          <svg
            v-if="node.children.length"
            class="size-3 text-muted-foreground transition-transform duration-100"
            :class="expanded.has(node.id) && 'rotate-90'"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
          >
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>

        <!-- 图标 -->
        <span
          v-if="kind === 'folder'"
          class="inline-flex shrink-0 text-primary"
          :style="iconStyle(node)"
        >
          <!-- 展开态:打开的文件夹;否则闭合文件夹 -->
          <svg
            v-if="node.children.length && expanded.has(node.id)"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path
              d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V11H4a1 1 0 0 0-1 1.1V7z"
              fill="currentColor"
              opacity="0.45"
            />
            <path
              d="M3 9.5a1 1 0 0 1 .9-.5H21l-1.6 7.4a2 2 0 0 1-1.95 1.6H6.3a2 2 0 0 1-1.95-1.5L3 9.5z"
              fill="currentColor"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span
          v-else
          class="inline-flex shrink-0 text-muted-foreground"
          :style="iconStyle(node)"
        >
          <!-- 标签:hash 形态 -->
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M10 4l-1 4H5a1 1 0 1 0 0 2h3.5l-1 4H4a1 1 0 1 0 0 2h3l-1 4h2l1-4h4l-1 4h2l1-4h3.5a1 1 0 1 0 0-2H15l1-4h3.5a1 1 0 1 0 0-2H16l1-4h-2l-1 4h-4l1-4h-2zm-.5 6h4l-1 4h-4l1-4z"
              fill="currentColor"
            />
          </svg>
        </span>

        <!-- 标题 -->
        <span
          class="min-w-0 flex-1 truncate"
          :class="[
            selectedIds?.has(node.id) && 'text-primary',
            matched?.has(node.id) && 'font-semibold text-primary',
          ]"
        >{{ node.title }}</span>

        <!-- 子节点计数(提示里面有东西) -->
        <span
          v-if="node.children.length"
          class="shrink-0 rounded-full border border-border bg-accent px-[5px] py-0.5 text-[10px] leading-none text-muted-foreground"
        >{{ node.children.length }}</span>
      </div>

      <!-- 子树:展开时渲染;分组卡片体强制展开(传 inline 去缩进) -->
      <LibraryTree
        v-if="node.children.length && (isGroupCard(node) || expanded.has(node.id))"
        :nodes="node.children"
        :kind="kind"
        :indent="indent"
        :expanded="expanded"
        :matched="matched"
        :selected-ids="selectedIds"
        :checkable="checkable"
        :checked="checked"
        :sortable="sortable"
        :drop-mark="dropMark"
        :dragging-id="draggingId"
        :tile-leaves="tileLeaves"
        :inline="isGroupCard(node)"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
        @drop="(n, f) => emit('drop', n, f)"
        @contextmenu="(n, x, y) => emit('contextmenu', n, x, y)"
        @node-drag-start="(n, e) => emit('node-drag-start', n, e)"
        @node-drag-over="(n, p, e) => emit('node-drag-over', n, p, e)"
        @node-drag-leave="(n, e) => emit('node-drag-leave', n, e)"
        @node-drop="(n, p, e) => emit('node-drop', n, p, e)"
        @node-drag-end="(n, e) => emit('node-drag-end', n, e)"
      />
    </li>
  </ul>
</template>
