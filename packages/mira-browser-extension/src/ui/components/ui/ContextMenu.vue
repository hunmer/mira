<script setup lang="ts">
/**
 * 通用右键菜单:Teleport 到 body,按 {x,y} 定位,点击外部/ESC/选项后关闭。
 *
 * 用法:
 *   <ContextMenu v-if="menu" :x="menu.x" :y="menu.y" @close="menu = null">
 *     <button @click="...">选项</button>
 *   </ContextMenu>
 *
 * 定位策略:优先在 (x,y) 右下方展开;若会溢出视口右/下边界,则翻到左/上方。
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
    <div class="ctx-menu" :style="posStyle" @click.stop @contextmenu.prevent.stop>
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 1000;
  min-width: 140px;
  padding: 4px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px #0006;
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 12px;
}

/* 菜单项:由调用方放 button,这里只统一 ::v-deep 样式 */
.ctx-menu :deep(button) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--fg);
  cursor: pointer;
  font: inherit;
  text-align: left;
  width: 100%;
}
.ctx-menu :deep(button:hover) { background: var(--bg); }
.ctx-menu :deep(button.danger) { color: var(--danger); }
.ctx-menu :deep(.sep) { height: 1px; background: var(--border); margin: 3px 0; }
</style>
