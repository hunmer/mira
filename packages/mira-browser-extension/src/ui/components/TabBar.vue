<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [v: string] }>();
const { t } = useI18n();

// 3 个数据 tab(纯图标,tooltip 由 i18n 提供)。设置已移到底部栏的独立按钮。
const tabs = [
  { id: 'folders', icon: 'folder' },
  { id: 'tags', icon: 'tag' },
  { id: 'sniffer', icon: 'radar' },
] as const;
</script>

<template>
  <div class="tabs">
    <button
      v-for="tab in tabs" :key="tab.id"
      class="tab" :class="{ active: modelValue === tab.id }"
      :title="t(`tab.${tab.id}`)"
      :aria-label="t(`tab.${tab.id}`)"
      @click="emit('update:modelValue', tab.id)"
    >
      <!-- 文件夹 -->
      <svg v-if="tab.icon === 'folder'" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3.38a2 2 0 0 1 1.55.74l.9 1.1a1 1 0 0 0 .78.37H18.5A2.5 2.5 0 0 1 21 8.21V17.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11zm2.5-.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V8.21a.5.5 0 0 0-.5-.5h-6.39a2 2 0 0 1-1.55-.74l-.9-1.1A1 1 0 0 0 8.88 5H5.5z" fill="currentColor"/>
      </svg>
      <!-- 标签 -->
      <svg v-else-if="tab.icon === 'tag'" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M11.3 3.07A2 2 0 0 1 12.2 3H19a2 2 0 0 1 2 2v6.8a2 2 0 0 1-.59 1.42l-7.2 7.2a2 2 0 0 1-2.82 0l-6.8-6.8a2 2 0 0 1 0-2.83l7.2-7.2a2 2 0 0 1 .5-.37zM12.2 5 5 12.2l6.8 6.8L19 11.8V5h-6.8zM16 7.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" fill="currentColor"/>
      </svg>
      <!-- 嗅探(雷达) -->
      <svg v-else-if="tab.icon === 'radar'" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M12 3a1 1 0 0 1 1 1v6.27l4.3 2.48a1 1 0 0 1-1 1.73l-4.8-2.77A1 1 0 0 1 11 11V4a1 1 0 0 1 1-1z" fill="currentColor"/>
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" fill="currentColor" opacity=".5"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.tabs { display: flex; border-bottom: 1px solid var(--border); }
.tab {
  flex: 1; padding: 8px; background: transparent; border: none;
  color: var(--muted); cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  border-bottom: 2px solid transparent; transition: color .15s;
}
.tab:hover { color: var(--fg); }
.tab.active { color: var(--fg); border-bottom-color: var(--primary); }
</style>
