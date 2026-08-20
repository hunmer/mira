<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBackground } from '@/ui/composables/useBackground';
import { useBatchUpload } from '@/ui/composables/useBatchUpload';
import Button from '@/ui/components/ui/Button.vue';
import { dbg } from '@/shared/debug';

const { t } = useI18n();
const bg = useBackground();
const batchUpload = useBatchUpload();
const msg = ref('');

async function run(fn: (tabId: number) => Promise<any>, label: string) {
  msg.value = t('screenshot.doing', { label });
  dbg.info('shot-ui', 'click', label);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  dbg.log('shot-ui', 'active tab', { id: tab?.id, url: tab?.url, pendingUrl: tab?.pendingUrl });
  if (!tab?.id) { msg.value = t('screenshot.noActiveTab'); dbg.warn('shot-ui', 'no active tab'); return; }
  // chrome:// / edge:// 等受限页无法截图/注入
  const url = tab.url || tab.pendingUrl || '';
  if (/^(chrome|edge|about|chrome-extension):/i.test(url)) {
    msg.value = t('screenshot.unsupportedPage', { url });
    dbg.warn('shot-ui', 'restricted page', url);
    return;
  }
  try {
    const res: any = await fn(tab.id);
    // service worker 出错时 router 返回 {error},而非抛异常 —— 必须显式检查,
    // 否则会误报"完成"。错误信息直接展示给用户。
    if (res && typeof res === 'object' && 'error' in res) {
      msg.value = t('screenshot.failedWithError', { label, error: res.error });
      dbg.error('shot-ui', 'router error', label, res.error);
      return;
    }
    msg.value = t('screenshot.done', { label });
    dbg.info('shot-ui', 'done', label);
  } catch (e: any) {
    msg.value = e?.message ?? t('screenshot.failed', { label });
    dbg.error('shot-ui', 'error', label, e);
  }
}

// ---- 选择文件上传:多选后打开批量上传对话框(对话框本体在 App.vue 的 BatchUploadHost) ----
const fileInput = ref<HTMLInputElement>();

function pickFiles() {
  fileInput.value?.click();
}

function onFilesChosen(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) return;
  void batchUpload.open({ files });
}
</script>

<template>
  <div class="view">
    <input ref="fileInput" type="file" multiple hidden @change="onFilesChosen" />
    <Button @click="pickFiles">{{ t('header.selectFiles') }}</Button>
    <Button @click="run(bg.captureVisible, t('screenshot.visible'))">{{ t('screenshot.visible') }}</Button>
    <Button @click="run(bg.captureFullPage, t('screenshot.fullPage'))">{{ t('screenshot.fullPage') }}</Button>
    <Button @click="run(bg.captureSelection, t('screenshot.selection'))">{{ t('screenshot.selection') }}</Button>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<style scoped>
.view { padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.msg { color: var(--muted); font-size: 12px; margin-top: 8px; }
</style>
