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
import { canAcceptDrop } from './drag-data';

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
  }>(),
  { kind: 'folder', indent: 20, checkable: false },
);

const emit = defineEmits<{
  toggle: [id: number];
  /** 拖放到某节点:带原始 DragEvent,父级用 parseDrop 提取 files / urls */
  drop: [node: LibraryTreeNode, e: DragEvent];
  /** 右键菜单:带节点 + 鼠标坐标,父级弹 ContextMenu */
  contextmenu: [node: LibraryTreeNode, x: number, y: number];
  /** 选中模式下单选/勾选某节点(父级维护 selectedIds / checked) */
  select: [node: LibraryTreeNode];
}>();

// 选中模式:点行 = select;非选中模式保持原行为(点行折叠/展开)
const selectable = computed(() => props.checkable || props.selectedIds !== undefined);

// 当前被拖拽悬停的节点 id(用于高亮落点)
const dragOverId = ref<number | null>(null);

function onToggle(node: LibraryTreeNode) {
  // 仅有子节点的项可折叠/展开
  if (node.children.length) emit('toggle', node.id);
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
function rowClass(node: LibraryTreeNode): string[] {
  const selected = props.selectedIds?.has(node.id);
  const dragOver = dragOverId.value === node.id;
  return [
    selected || dragOver
      ? 'bg-primary/12 shadow-[inset_0_0_0_1.5px_var(--primary)]'
      : 'hover:bg-accent',
    selectable.value ? 'cursor-pointer' : 'cursor-default',
  ];
}
</script>

<template>
  <ul class="m-0 list-none p-0" role="tree">
    <li
      v-for="node in nodes"
      :key="node.id"
      role="treeitem"
      :aria-expanded="node.children.length ? expanded.has(node.id) : undefined"
    >
      <div
        class="flex h-7 items-center gap-1.5 rounded-md pr-2 text-foreground transition-[background-color,box-shadow] duration-100 select-none"
        :class="rowClass(node)"
        :style="{ paddingLeft: 6 + node.level * indent + 'px' }"
        :title="node.title"
        @dragover="onDragOver($event, node)"
        @drop="onDrop($event, node)"
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

        <!-- 展开/折叠:有子节点显示切换图标;无子节点占位对齐 -->
        <span
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

      <!-- 子树:展开时渲染 -->
      <LibraryTree
        v-if="node.children.length && expanded.has(node.id)"
        :nodes="node.children"
        :kind="kind"
        :indent="indent"
        :expanded="expanded"
        :matched="matched"
        :selected-ids="selectedIds"
        :checkable="checkable"
        :checked="checked"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
        @drop="(n, f) => emit('drop', n, f)"
        @contextmenu="(n, x, y) => emit('contextmenu', n, x, y)"
      />
    </li>
  </ul>
</template>
