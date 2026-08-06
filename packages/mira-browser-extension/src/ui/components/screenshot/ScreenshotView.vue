<script setup lang="ts">
import { ref } from 'vue';
import { useBackground } from '@/ui/composables/useBackground';
import Button from '@/ui/components/ui/Button.vue';
import { dbg } from '@/shared/debug';

const bg = useBackground();
const msg = ref('');

async function run(fn: (tabId: number) => Promise<any>, label: string) {
  msg.value = `${label}中...`;
  dbg.info('shot-ui', 'click', label);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  dbg.log('shot-ui', 'active tab', { id: tab?.id, url: tab?.url, pendingUrl: tab?.pendingUrl });
  if (!tab?.id) { msg.value = '未找到活动标签页'; dbg.warn('shot-ui', 'no active tab'); return; }
  // chrome:// / edge:// 等受限页无法截图/注入
  const url = tab.url || tab.pendingUrl || '';
  if (/^(chrome|edge|about|chrome-extension):/i.test(url)) {
    msg.value = `不支持该页面(${url})`;
    dbg.warn('shot-ui', 'restricted page', url);
    return;
  }
  try {
    const res: any = await fn(tab.id);
    // service worker 出错时 router 返回 {error},而非抛异常 —— 必须显式检查,
    // 否则会误报"完成"。错误信息直接展示给用户。
    if (res && typeof res === 'object' && 'error' in res) {
      msg.value = `${label}失败:${res.error}`;
      dbg.error('shot-ui', 'router error', label, res.error);
      return;
    }
    msg.value = `${label}完成,已加入上传队列`;
    dbg.info('shot-ui', 'done', label);
  } catch (e: any) {
    msg.value = e?.message ?? `${label}失败`;
    dbg.error('shot-ui', 'error', label, e);
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
