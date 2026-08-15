<template>
  <div :data-folder-tree-node-id="node.id" :class="[
    'flex items-center min-h-8 py-1 px-2 rounded-lg cursor-pointer transition-colors',
    'hover:bg-primary/5',
    selected ? 'bg-primary/10 text-primary font-medium' : '',
    multiSelected ? 'bg-primary/10' : '',
    dragOver ? 'ring-2 ring-primary/50 bg-primary/10' : '',
    locating ? 'sidebar-locate-active' : ''
  ]" @click="emit('node-click', node, stat, $event)" @contextmenu="emit('node-context-menu', node, $event)"
    @dragover="emit('node-drag-over', $event, node)" @dragleave="emit('node-drag-leave', $event, node)"
    @drop.stop="emit('node-drop', $event, node)">
    <Checkbox v-if="showCheckbox" :model-value="checkState === true"
      :indeterminate="checkState === 'indeterminate'" class="mr-1.5"
      @update:model-value="emit('check-change', $event)" @click.stop />
    <span v-if="stat.children.length"
      class="folder-chevron material-icons text-base mr-1 text-muted-foreground hover:text-muted-foreground select-none"
      :class="{ 'folder-chevron--open': stat.open }" @click.stop="emit('toggle', stat, $event)">
      chevron_right
    </span>
    <!-- 叶子节点占位：仅在展示 checkbox 时保留，用于与父节点图标对齐；无 checkbox 时隐藏，让图标贴最左侧 -->
    <span v-else-if="showCheckbox" class="inline-block w-5"></span>
    <span class="material-icons mr-2 text-lg" :style="{ color: nodeColor }">{{ node.icon ||
      defaultIcon }}</span>
    <span class="flex-1 truncate text-sm">{{ node.label }}</span>
    <span v-if="node.count" v-digit-pop="node.count"
      class="t-digit-group text-xs text-muted-foreground ml-2">
      <span v-for="(d, i) in String(node.count)" :key="i" class="t-digit"
        :data-stagger="i > 0 ? String(i) : undefined">{{ d }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { vDigitPop } from '../directives/vDigitPop'
import { convertColorToHex } from '../utils'
import type { HeTreeNode } from '../types'
import '../styles/sidebar-locate.css'

/**
 * 树节点行。同时用于 Draggable / BaseTree 的默认插槽。
 * 注意：事件通过 emit 同步转发，保证父级处理器在事件分发期间执行
 * （部分逻辑依赖 event.currentTarget / closest 定位行元素）。
 */
const props = withDefaults(defineProps<{
  node: HeTreeNode
  stat: any
  selected?: boolean
  multiSelected?: boolean
  dragOver?: boolean
  locating?: boolean
  showCheckbox?: boolean
  checkState?: boolean | 'indeterminate'
  defaultIcon?: string
}>(), {
  selected: false,
  multiSelected: false,
  dragOver: false,
  locating: false,
  showCheckbox: false,
  checkState: false,
  defaultIcon: '',
})

const emit = defineEmits<{
  (e: 'node-click', node: HeTreeNode, stat: any, event: MouseEvent): void
  (e: 'node-context-menu', node: HeTreeNode, event: MouseEvent): void
  (e: 'node-drag-over', event: DragEvent, node: HeTreeNode): void
  (e: 'node-drag-leave', event: DragEvent, node: HeTreeNode): void
  (e: 'node-drop', event: DragEvent, node: HeTreeNode): void
  (e: 'toggle', stat: any, event: MouseEvent): void
  (e: 'check-change', checked: boolean | 'indeterminate'): void
}>()

const nodeColor = computed(() => convertColorToHex(props.node.color))
</script>

<style scoped>
.material-icons {
  font-size: 18px;
}

.folder-chevron {
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: center center;
}

.folder-chevron--open {
  transform: rotate(90deg);
}

/*
  按下反馈（emil-design-eng 硬性项）：可点击元素按压必须即时回弹。
  图标按钮比卡片按钮更克制，用 scale(0.9)。
*/
.folder-chevron:active {
  transform: scale(0.9);
}

.folder-chevron.folder-chevron--open:active {
  transform: rotate(90deg) scale(0.9);
}

/*
  Number pop-in —— 节点 count 逐位弹出。
  原始效果来自 Transitions.dev；此处把 :root 变量收拢到 .t-digit-group 上，
  既兼容 scoped（scoped 下 :root 不生效），又不污染全局。
  触发：v-digit-pop 指令在挂载及 count 变化时切换 .is-animating。
*/
.t-digit-group {
  --digit-dur: 500ms;
  --digit-distance: 8px;
  --digit-stagger: 70ms;
  --digit-blur: 2px;
  --digit-ease: cubic-bezier(0.34, 1.45, 0.64, 1);
  --digit-dir-x: 0;
  --digit-dir-y: 1;
  display: inline-flex;
  align-items: baseline;
}

.t-digit {
  display: inline-block;
  will-change: transform, opacity, filter;
}

.t-digit-group.is-animating .t-digit {
  animation: t-digit-pop-in var(--digit-dur) var(--digit-ease) both;
}

.t-digit-group.is-animating .t-digit[data-stagger="1"] {
  animation-delay: var(--digit-stagger);
}

.t-digit-group.is-animating .t-digit[data-stagger="2"] {
  animation-delay: calc(var(--digit-stagger) * 2);
}

@keyframes t-digit-pop-in {
  0% {
    transform: translate(calc(var(--digit-distance) * var(--digit-dir-x)),
      calc(var(--digit-distance) * var(--digit-dir-y)));
    opacity: 0;
    filter: blur(var(--digit-blur));
  }

  100% {
    transform: translate(0, 0);
    opacity: 1;
    filter: blur(0);
  }
}

@media (prefers-reduced-motion: reduce) {

  /* Folder tree animation is an explicit interaction requirement. */
  .folder-chevron {
    transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1) !important;
  }

  .t-digit-group .t-digit {
    animation: none !important;
  }

}
</style>
