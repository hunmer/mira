<script setup lang="ts">
import { ref } from 'vue';
import { useBackground } from '@/ui/composables/useBackground';
import Button from '@/ui/components/ui/Button.vue';

const bg = useBackground();
const msg = ref('');

async function run(fn: (tabId: number) => Promise<any>, label: string) {
  msg.value = `${label}中...`;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { msg.value = '未找到活动标签页'; return; }
  try {
    await fn(tab.id);
    msg.value = `${label}完成,已加入上传队列`;
  } catch (e: any) {
    msg.value = e?.message ?? `${label}失败`;
  }
}
</script>

<template>
  <div class="view">
    <Button @click="run(bg.captureVisible, '可视区域截图')">可视区域截图</Button>
    <Button @click="run(bg.captureFullPage, '整页截图')">整页截图</Button>
    <Button @click="run(bg.captureSelection, '选区截图')">选区截图</Button>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<style scoped>
.view { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.msg { color: var(--muted); font-size: 12px; margin-top: 8px; }
</style>
