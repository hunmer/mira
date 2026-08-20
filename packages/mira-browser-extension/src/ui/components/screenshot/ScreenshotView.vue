<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBackground } from '@/ui/composables/useBackground';
import { useSettings } from '@/ui/composables/useSettings';
import { useUploadQueue } from '@/ui/composables/useUploadQueue';
import Button from '@/ui/components/ui/Button.vue';
import { dbg } from '@/shared/debug';

const { t } = useI18n();
const bg = useBackground();
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

// ---- 上传双入口 ----
// window:新窗口打开批量上传页,文件选择由窗口内 BatchUploadForm 自己触发(无需跨窗口传 File)
// root:本页选文件,直接进扩展上传队列,上传到当前素材库根目录
const fileInput = ref<HTMLInputElement>();
const { settings } = useSettings();
const { addFiles } = useUploadQueue();

function openUploadWindow() {
  // 当前素材库经 URL params 传给新窗口(storage 读取存在时序/旧值问题,显式传参最可靠)
  // getURL 对含 query 的路径处理不可靠(实测 query 被丢弃),用 URL 对象显式附加
  const url = new URL(chrome.runtime.getURL('src/ui/upload.html'));
  url.searchParams.set('libraryId', settings.value.libraryId);
  dbg.log('upload', 'openUploadWindow', { libraryId: settings.value.libraryId, url: url.href });
  chrome.windows.create({
    url: url.href,
    type: 'popup',
    width: 1100,
    height: 840,
  });
}

function pickRootFiles() {
  fileInput.value?.click();
}

async function onFilesChosen(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) return;
  await addFiles(files, settings.value.libraryId);
}
</script>

<template>
  <div class="view">
    <input ref="fileInput" type="file" multiple hidden @change="onFilesChosen" />
    <Button @click="openUploadWindow">{{ t('header.uploadInWindow') }}</Button>
    <Button @click="pickRootFiles">{{ t('header.uploadToRoot') }}</Button>
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
