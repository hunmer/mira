import { initSettingsWatcher, getSettings, onSettingsChange } from './settings';
import { ensureClient, isAuthError } from './mira-client';
import { createUploader } from './uploader';
import { createCapturer } from './capturer';
import { createRouter, broadcast } from './message-router';
import { setupContextMenus } from './context-menus';
import { isRequest, type Request as MiraRequest } from '@/shared/messages';
import type { SniffedResource } from '@/shared/types';

// 嗅探快照:每 tab 最近一次资源
const sniffSnapshots = new Map<number, SniffedResource[]>();

// 上传函数:连接 SDK
async function uploadToServer(input: {
  file: File;
  libraryId: string;
  tags?: string[];
  folderId?: string;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}) {
  const client = await ensureClient();
  // MiraClient 的 files().upload 不直接暴露 onProgress,用 axios 拦截或扩展
  // 简化:MVP 先不带进度(进度从 SDK 增强),取消用 signal
  const res = await client.files().uploadFile(input.file, input.libraryId, {
    tags: input.tags,
    folderId: input.folderId,
  });
  return res.results?.[0] ?? { success: true, file: input.file.name };
}

const uploader = createUploader({ upload: uploadToServer });
const capturer = createCapturer({ uploader });
const router = createRouter({
  uploader,
  captureVisible: capturer.captureVisible,
  captureFullPage: capturer.captureFullPage,
  captureSelection: capturer.captureSelection,
  getSniffSnapshot: (tabId: number) => sniffSnapshots.get(tabId) ?? [],
});

// 上传进度 → 广播给 UI
uploader.onQueueChange(tasks => {
  for (const t of tasks) {
    broadcast({
      type: 'UPLOAD_PROGRESS',
      payload: { id: t.id, percent: t.percent, status: t.status },
    });
  }
});

// 消息路由:Request 由 router 处理,Event/content 的 SNIFFER_REPORT 由这里处理
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // content script 上报嗅探结果(内部消息,非 Request)
  if (msg?.type === 'SNIFFER_REPORT' && sender.tab?.id) {
    sniffSnapshots.set(sender.tab.id, msg.resources as SniffedResource[]);
    broadcast({
      type: 'SNIFFER_FOUND',
      payload: { tabId: sender.tab.id, resources: msg.resources },
    });
    sendResponse({ ok: true });
    return true;
  }
  if (isRequest(msg)) {
    router(msg as MiraRequest, sender).then(
      result => sendResponse(result),
      err => {
        if (isAuthError(err) || err?.message === 'AUTH_EXPIRED') {
          broadcast({ type: 'AUTH_EXPIRED' });
        }
        sendResponse({ error: err?.message ?? String(err) });
      },
    );
    return true; // 异步响应
  }
  return false;
});

// 快捷键截图
chrome.commands.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  if (command === 'capture-visible') await capturer.captureVisible(tab.id);
  if (command === 'capture-fullpage') await capturer.captureFullPage(tab.id);
  if (command === 'capture-selection') await capturer.captureSelection(tab.id);
});

// 右键菜单
setupContextMenus({
  captureVisible: capturer.captureVisible,
  captureFullPage: capturer.captureFullPage,
  captureSelection: capturer.captureSelection,
  uploadImageUrl: async url => {
    const settings = await getSettings();
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], url.split('/').pop() || 'image', { type: blob.type });
    uploader.enqueue({ file, libraryId: settings.libraryId, source: 'dragdrop' });
  },
});

// tab 关闭清理嗅探快照
chrome.tabs.onRemoved.addListener(tabId => {
  sniffSnapshots.delete(tabId);
});

// 设置变更 → uiMode 联动 side panel 行为
onSettingsChange(async settings => {
  if (settings.uiMode === 'sidePanel') {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }
  // sniffer / dragdrop 开关 → 通知当前 tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs
      .sendMessage(tab.id, {
        type: 'DISPATCH_DRAGDROP',
        payload: { enabled: settings.dragPopoverEnabled },
      })
      .catch(() => {});
    chrome.tabs
      .sendMessage(tab.id, {
        type: settings.snifferEnabled ? 'SNIFFER_START' : 'SNIFFER_STOP',
        payload: settings.snifferEnabled ? { kinds: settings.snifferKinds } : undefined,
      })
      .catch(() => {});
  }
});

// 启动初始化
initSettingsWatcher();
getSettings().then(settings => {
  if (settings.uiMode === 'sidePanel') {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

// 安装时初始化右键菜单
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus({
    captureVisible: capturer.captureVisible,
    captureFullPage: capturer.captureFullPage,
    captureSelection: capturer.captureSelection,
    uploadImageUrl: async url => {
      const settings = await getSettings();
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], url.split('/').pop() || 'image', { type: blob.type });
      uploader.enqueue({ file, libraryId: settings.libraryId, source: 'dragdrop' });
    },
  });
});
