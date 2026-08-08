<script setup lang="ts">
/**
 * 全屏大图查看器。
 *
 * 消费 useImageViewer().state:state 非空时 Teleport 到 body 渲染全屏遮罩 +
 * contain 大图。核心交互「鼠标移动后关闭」:打开后给一段宽限期(让用户先看到图),
 * 宽限期过后任何 mousemove/touchmove 即关闭。同时保留点击遮罩 / ESC 关闭作为兜底
 * (纯「移动即关」无法静止欣赏,宽限期 + 显式关闭两者互补)。
 */
import { ref, watch, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useImageViewer } from '@/ui/composables/useImageViewer';

const { t } = useI18n();
const { state, close } = useImageViewer();

const loading = ref(true);
let graceTimer: ReturnType<typeof setTimeout> | null = null;

function reset() {
  loading.value = true;
  if (graceTimer) {
    clearTimeout(graceTimer);
    graceTimer = null;
  }
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('touchmove', onMove);
  document.removeEventListener('keydown', onKey);
}

/** 宽限期后的鼠标/触摸移动 → 关闭查看器 */
function onMove() {
  close();
}
/** ESC → 关闭 */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

// state 由 null→{url} 触发打开:挂载宽限期 + 事件
watch(
  () => state.value,
  async (s, prev) => {
    // 关闭(prev 非空 → null):清理
    if (!s) {
      reset();
      return;
    }
    // 切换图片(s/prev 都非空):仅重置 loading,不重新挂事件
    if (prev) {
      loading.value = true;
      return;
    }
    // 首次打开:绑兜底事件(ESC 立即生效),mousemove 延迟到宽限期后绑定
    loading.value = true;
    await nextTick();
    document.addEventListener('keydown', onKey);
    graceTimer = setTimeout(() => {
      // 宽限期(800ms)内不打断用户看图;之后鼠标一动即关
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove);
    }, 800);
  },
  { immediate: true },
);

onUnmounted(reset);
</script>

<template>
  <Teleport to="body">
    <div v-if="state" class="viewer" @click.self="close">
      <!-- 加载占位 -->
      <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
      <img
        :src="state.url"
        class="img"
        :class="{ hidden: loading }"
        @load="loading = false"
        @error="loading = false"
        draggable="false"
      />
      <button
        class="close"
        :title="t('common.close')"
        :aria-label="t('common.close')"
        @click.stop="close"
      >×</button>
    </div>
  </Teleport>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: #000c;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 避免遮罩本身的移动事件被图片挡住后体验割裂 */
  cursor: zoom-out;
}
.loading {
  position: absolute;
  color: var(--muted);
  font-size: 13px;
}
.img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  display: block;
  user-select: none;
}
.img.hidden {
  /* 加载中先隐藏,load 后淡入 */
  opacity: 0;
}
.close {
  position: absolute;
  top: 12px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.close:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
