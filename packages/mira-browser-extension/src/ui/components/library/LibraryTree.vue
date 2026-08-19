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
 */
import { computed, ref } from 'vue';
import type { LibraryTreeNode } from '@/shared/types';
import { canAcceptDrop } from '@/shared/drag-data';

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
</script>

<template>
  <ul class="tree" role="tree">
    <li
      v-for="node in nodes"
      :key="node.id"
      role="treeitem"
      :aria-expanded="node.children.length ? expanded.has(node.id) : undefined"
    >
      <div
        class="row"
        :class="{
          folder: kind === 'folder',
          selectable,
          selected: selectedIds?.has(node.id),
          dragover: dragOverId === node.id,
          matched: matched?.has(node.id),
        }"
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
          class="checkbox"
          :class="{ on: checked?.has(node.id) }"
          role="checkbox"
          :aria-checked="checked?.has(node.id) ?? false"
          tabindex="0"
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
        <span class="toggle" :class="{ invisible: !node.children.length }" @click.stop="onToggle(node)">
          <svg
            v-if="node.children.length"
            class="chev"
            :class="{ open: expanded.has(node.id) }"
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
        <span v-if="kind === 'folder'" class="icon" :style="iconStyle(node)">
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
        <span v-else class="icon" :style="iconStyle(node)">
          <!-- 标签:hash 形态 -->
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M10 4l-1 4H5a1 1 0 1 0 0 2h3.5l-1 4H4a1 1 0 1 0 0 2h3l-1 4h2l1-4h4l-1 4h2l1-4h3.5a1 1 0 1 0 0-2H15l1-4h3.5a1 1 0 1 0 0-2H16l1-4h-2l-1 4h-4l1-4h-2zm-.5 6h4l-1 4h-4l1-4z"
              fill="currentColor"
            />
          </svg>
        </span>

        <!-- 标题 -->
        <span class="label">{{ node.title }}</span>

        <!-- 子节点计数(提示里面有东西) -->
        <span v-if="node.children.length" class="badge">{{ node.children.length }}</span>
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

<style scoped>
.tree { list-style: none; margin: 0; padding: 0; }
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding-right: 8px;
  border-radius: 6px;
  color: var(--fg);
  cursor: default;
  user-select: none;
  transition: background .12s, box-shadow .12s;
}
.row:hover { background: var(--bg-elev); }
/* 选中模式:行可点选 */
.row.selectable { cursor: pointer; }
/* 选中行:主色描边 + 淡背景 */
.row.selected {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  box-shadow: inset 0 0 0 1.5px var(--primary);
}
.row.selected .label { color: var(--primary); }
/* 拖到该节点上:高亮 + 主色边框 */
.row.dragover {
  background: color-mix(in srgb, var(--primary) 18%, transparent);
  box-shadow: inset 0 0 0 1.5px var(--primary);
}
/* 搜索命中:文字主色加粗 */
.row.matched .label { color: var(--primary); font-weight: 600; }

/* 多选 checkbox */
.checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border: 1.5px solid var(--border);
  border-radius: 4px;
  background: var(--bg-elev);
  color: #fff;
  cursor: pointer;
  transition: border-color .12s, background .12s;
}
.checkbox:hover { border-color: var(--primary); }
.checkbox.on { border-color: var(--primary); background: var(--primary); }

.toggle { display: inline-flex; width: 14px; justify-content: center; flex-shrink: 0; }
.toggle.invisible { visibility: hidden; }
.chev { color: var(--muted); transition: transform .12s; transform: rotate(0deg); }
.chev.open { transform: rotate(90deg); }

.icon { display: inline-flex; flex-shrink: 0; color: var(--primary); }
.row:not(.folder) .icon { color: var(--muted); }

.label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 999px;
  background: var(--bg-elev);
  color: var(--muted);
  border: 1px solid var(--border);
}
</style>
