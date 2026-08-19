<script setup lang="ts">
/**
 * 通用右键菜单:Teleport 到 body,按 {x,y} 定位,点击外部/ESC/选项后关闭。
 *
 * 用法:
 *   <ContextMenu v-if="menu" :x="menu.x" :y="menu.y" @close="menu = null">
 *     <button class="ctx-item" @click="...">选项</button>
 *   </ContextMenu>
 *
 * 定位策略:优先在 (x,y) 右下方展开;若会溢出视口右/下边界,则翻到左/上方。
 * 样式为 tailwind 原子类;菜单项/分隔线的类由调用方使用 .ctx-item / .ctx-sep。
 */
import { computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ x: number; y: number }>();
const emit = defineEmits<{ close: [] }>();

// 边界翻转:挂载后测量实际尺寸,若溢出则贴边/翻转。这里用 CSS 配合 viewport 单位
// 做静态翻转(基于 x/y 是否过半视口),避免 measure 抖动。
const posStyle = computed(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = props.x > vw - 160; // 菜单预估宽 ~160px
  const bottom = props.y > vh - 160;
  return {
    left: right ? 'auto' : `${props.x}px`,
    right: right ? `${vw - props.x}px` : 'auto',
    top: bottom ? 'auto' : `${props.y}px`,
    bottom: bottom ? `${vh - props.y}px` : 'auto',
  };
});

function onDocClick() { emit('close'); }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close'); }

// 挂载时绑定全局监听(点击外部 / ESC 关闭);卸载时解绑
onMounted(() => {
  // nextTick:避免触发本菜单的同一个 contextmenu 冒泡立刻关闭
  requestAnimationFrame(() => {
    document.addEventListener('click', onDocClick);
    document.addEventListener('contextmenu', onDocClick, true);
    document.addEventListener('keydown', onKey);
  });
});
onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('contextmenu', onDocClick, true);
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <!-- stop:点击菜单内部不触发关闭 -->
  <Teleport to="body">
    <div
      class="fixed z-[1000] flex min-w-[140px] flex-col gap-px rounded-md border border-border bg-accent p-1 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
      :style="posStyle"
      @click.stop
      @contextmenu.prevent.stop
    >
      <slot />
    </div>
  </Teleport>
</template>
