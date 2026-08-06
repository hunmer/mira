<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [v: string] }>();
const { t } = useI18n();

// 4 个 tab:纯图标,tooltip 由 i18n 提供
const tabs = [
  { id: 'folders', icon: 'folder' },
  { id: 'tags', icon: 'tag' },
  { id: 'sniffer', icon: 'radar' },
  { id: 'settings', icon: 'gear' },
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
      <!-- 设置(齿轮) -->
      <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor"/>
        <path d="M9.6 1.6a1 1 0 0 1 .9.6l.5 1.3a7.8 7.8 0 0 1 2 0l.5-1.3a1 1 0 0 1 1.2-.6l1.9.7a1 1 0 0 1 .6 1.2l-.5 1.3a7.8 7.8 0 0 1 1.4 1.4l1.3-.5a1 1 0 0 1 1.2.6l.7 1.9a1 1 0 0 1-.6 1.2l-1.3.5a7.8 7.8 0 0 1 0 2l1.3.5a1 1 0 0 1 .6 1.2l-.7 1.9a1 1 0 0 1-1.2.6l-1.3-.5a7.8 7.8 0 0 1-1.4 1.4l.5 1.3a1 1 0 0 1-.6 1.2l-1.9.7a1 1 0 0 1-1.2-.6l-.5-1.3a7.8 7.8 0 0 1-2 0l-.5 1.3a1 1 0 0 1-1.2.6l-1.9-.7a1 1 0 0 1-.6-1.2l.5-1.3a7.8 7.8 0 0 1-1.4-1.4l-1.3.5a1 1 0 0 1-1.2-.6l-.7-1.9a1 1 0 0 1 .6-1.2l1.3-.5a7.8 7.8 0 0 1 0-2l-1.3-.5a1 1 0 0 1-.6-1.2l.7-1.9a1 1 0 0 1 1.2-.6l1.3.5a7.8 7.8 0 0 1 1.4-1.4l-.5-1.3a1 1 0 0 1 .6-1.2l1.9-.7zm.9 2.7a1 1 0 0 1-.9.6l-.4.04a1 1 0 0 1-.8-.4l-.3-.4-.5.2.06.5a1 1 0 0 1-.3.86l-.3.27a1 1 0 0 1-.88.22l-.5-.1-.2.5.4.3a1 1 0 0 1 .35.85l-.04.43a1 1 0 0 1-.5.78l-.45.25.1.52.5.03a1 1 0 0 1 .82.5l.22.37a1 1 0 0 1 0 .92l-.25.45.4.4.45-.25a1 1 0 0 1 .92 0l.37.22a1 1 0 0 1 .5.82l.03.5.52.1.25-.45a1 1 0 0 1 .78-.5l.43-.04a1 1 0 0 1 .85.35l.3.4.5-.2-.1-.5a1 1 0 0 1 .22-.88l.27-.3a1 1 0 0 1 .86-.3l.5.06.2-.5-.4-.3a1 1 0 0 1-.35-.85l.04-.43a1 1 0 0 1 .5-.78l.45-.25-.1-.52-.5-.03a1 1 0 0 1-.82-.5l-.22-.37a1 1 0 0 1 0-.92l.25-.45-.4-.4-.45.25a1 1 0 0 1-.92 0l-.37-.22a1 1 0 0 1-.5-.82L13 4.9l-.52-.1z" fill="currentColor" opacity=".5"/>
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
