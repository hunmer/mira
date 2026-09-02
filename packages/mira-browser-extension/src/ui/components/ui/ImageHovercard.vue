<script setup lang="ts">
/**
 * 图片悬浮预览卡(hovercard)全局宿主。
 *
 * 消费 useImagePreview().state:state 非空时 Teleport 到 body 渲染一张
 * 跟随鼠标的放大预览卡(~240px)。定位策略参考 ContextMenu:鼠标坐标处展开,
 * 溢出视口右/下边界时翻到左/上。pointer-events:none,不抢悬停避免抖动。
 *
 * 由 ResourceItem / MasonryItem 的 @mouseenter/@mousemove/@mouseleave 驱动。
 */
import { computed } from 'vue';
import { useImagePreview } from '@/ui/composables/useImagePreview';

const { state } = useImagePreview();

/** 预览卡预估尺寸,用于边界翻转判断 */
const CARD_W = 240;
const CARD_H = 260;
const MARGIN = 12;

/** 跟随鼠标坐标,溢出视口右/下时翻到左/上方 */
const posStyle = computed(() => {
  const s = state.value;
  if (!s) return { display: 'none' };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const flipRight = s.x + CARD_W + MARGIN > vw;
  const flipBottom = s.y + CARD_H + MARGIN > vh;
  return {
    left: flipRight ? 'auto' : `${s.x + 14}px`,
    right: flipRight ? `${vw - s.x + 14}px` : 'auto',
    top: flipBottom ? 'auto' : `${s.y + 14}px`,
    bottom: flipBottom ? `${vh - s.y + 14}px` : 'auto',
  };
});

/** 文件名:取 url 最后一段;失败回退原 url */
function nameOf(url: string): string {
  try {
    const u = new URL(url, location.href);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : url;
  } catch {
    return url.split('/').pop() || url;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="state" class="hovercard" :style="posStyle">
      <img :src="state.url" class="img" loading="lazy" />
      <div class="name">{{ nameOf(state.url) }}</div>
    </div>
  </Teleport>
</template>

<style scoped>
.hovercard {
  position: fixed;
  z-index: 1500;
  width: 240px;
  padding: 6px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px #0006;
  /* 不抢悬停:否则卡片盖在缩略图上会触发 mouseleave 抖动 */
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.img {
  width: 100%;
  /* 限制高度避免竖图撑满屏幕 */
  max-height: 220px;
  object-fit: contain;
  border-radius: 4px;
  background: var(--bg);
  display: block;
}
.name {
  font-size: 11px;
  color: var(--muted-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
