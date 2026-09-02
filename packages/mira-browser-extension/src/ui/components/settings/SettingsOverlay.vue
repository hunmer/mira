<script setup lang="ts">
/**
 * 设置全屏覆盖视图:顶栏(标题 + 关闭) + SettingsView 内容。
 *
 * 与 ServerManagerView 同款全屏覆盖:position:absolute; inset:0; z-index:50。
 * 独立组件(而非 App.vue 内联)以保持与 ServerManager 一致的覆盖渲染模式。
 */
import { useI18n } from 'vue-i18n';
import SettingsView from './SettingsView.vue';

const { t } = useI18n();
defineEmits<{ close: [] }>();
</script>

<template>
  <div class="overlay">
    <div class="top">
      <span class="title">{{ t('tab.settings') }}</span>
      <button class="close" :title="t('common.close')" @click="$emit('close')">×</button>
    </div>
    <div class="body">
      <SettingsView />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.title { flex: 1; font-size: 14px; font-weight: 600; }
.close {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.close:hover { color: var(--fg); }
.body { flex: 1; overflow-y: auto; }
</style>
