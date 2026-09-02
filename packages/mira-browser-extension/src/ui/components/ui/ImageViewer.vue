<script setup lang="ts">
/**
 * 全屏大图查看器。
 *
 * 消费 useImageViewer().state:state 非空时 Teleport 到 body 渲染全屏遮罩 +
 * contain 大图。关闭方式:点击遮罩空白 / 右上角 × / ESC。
 */
import { ref, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useImageViewer } from '@/ui/composables/useImageViewer';

const { t } = useI18n();
const { state, close } = useImageViewer();

const loading = ref(true);

function reset() {
  loading.value = true;
  document.removeEventListener('keydown', onKey);
}

/** ESC → 关闭 */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

// state 变化:打开时绑 ESC,关闭时清理
watch(
  () => state.value,
  (s, prev) => {
    if (!s) {
      // 关闭 / 已关闭:确保清理
      reset();
      return;
    }
    if (!prev) {
      // null → {url} 首次打开:绑 ESC
      document.addEventListener('keydown', onKey);
    }
    // 每次新 url 都重置 loading 占位
    loading.value = true;
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
}
.loading {
  position: absolute;
  color: var(--muted-foreground);
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
