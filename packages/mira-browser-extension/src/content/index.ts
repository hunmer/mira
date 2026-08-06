import { isContentCommand } from '@/shared/messages';
import { createSniffer } from './sniffer';
import { createDragDrop, type DragDropPayload } from './dragdrop';
import { createAutoScroller } from './autoscroll';
import { drawSelection } from './overlay/selection';
import { upgradeImageUrl } from '@/shared/imu';
import { dbg } from '@/shared/debug';

dbg.info('content', 'script loaded', { url: location.href, readyState: document.readyState });

// 嗅探上报:发给 service worker(SNIFFER_REPORT)
const sniffer = createSniffer(resources => {
  dbg.log('content', 'sniffer onUpdate → report', { count: resources.length });
  chrome.runtime.sendMessage({ type: 'SNIFFER_REPORT', resources }).catch(e => dbg.error('content', 'SNIFFER_REPORT send failed', e));
});

// 拖拽上传:发给 service worker
const dragdrop = createDragDrop({
  // 取当前素材库的文件夹列表(用于拖放浮层右侧目录)
  async getFolders() {
    try {
      const settings: any = await chrome.runtime.sendMessage({ type: 'CONFIG_GET' });
      if (!settings?.libraryId) return [];
      const res = await chrome.runtime.sendMessage({
        type: 'FOLDER_LIST',
        payload: { libraryId: settings.libraryId },
      });
      return (res as any[]) ?? [];
    } catch {
      return [];
    }
  },
  onUpload(payload: DragDropPayload) {
    if (payload.file) {
      // File 跨上下文序列化
      payload.file.arrayBuffer().then(buffer => {
        chrome.runtime.sendMessage({
          type: 'UPLOAD_FILES',
          payload: {
            files: [{ name: payload.file!.name, type: payload.file!.type, buffer }],
            libraryId: '', // service worker 用默认 libraryId
            folderId: payload.folderId != null ? String(payload.folderId) : undefined,
          },
        }).catch(() => {});
      });
    } else if (payload.url) {
      uploadUrl(payload.url, payload.kind, payload.folderId);
    }
  },
});

/** 网页图片上传:开启高清升级时,先用 maxurl 取原图候选,取最优一个发 service worker 下载 */
async function uploadUrl(url: string, kind: 'image' | 'video', folderId?: number) {
  let best = url;
  try {
    const settings: any = await chrome.runtime.sendMessage({ type: 'CONFIG_GET' });
    dbg.info('content', 'uploadUrl', { url, kind, folderId, imuEnabled: settings?.imuEnabled });
    if (settings?.imuEnabled) {
      const candidates = await upgradeImageUrl(url, { timeout: 12000 });
      // upgradeImageUrl 返回 [...升级候选, 原 url];取第一个非原 url(若有),否则原 url
      best = candidates[0] ?? url;
      dbg.log('content', 'uploadUrl upgraded', { original: url, best, candidateCount: candidates.length });
    }
  } catch (e) { dbg.warn('content', 'uploadUrl upgrade failed, use original', e); /* 升级失败沿用原 url */ }
  chrome.runtime.sendMessage({
    type: 'UPLOAD_FROM_URL',
    payload: { url: best, kind, libraryId: '', folderId },
  }).then(() => dbg.log('content', 'UPLOAD_FROM_URL sent', { url: best }))
    .catch(e => dbg.error('content', 'UPLOAD_FROM_URL send failed', e));
}

const scroller = createAutoScroller();

// content script 内部消息:截图滚动控制(SCROLL_TO/SCROLL_RESTORE 由 capturer 发)
let restoreY = 0;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  dbg.log('content', 'onMessage', { type: msg?.type, isCmd: isContentCommand(msg) });
  // ContentCommand(service worker → content)
  if (isContentCommand(msg)) {
    switch (msg.type) {
      case 'SNIFFER_START':
        dbg.info('content', 'SNIFFER_START', msg.payload);
        sniffer.start(msg.payload.kinds);
        sendResponse({ ok: true });
        return true;
      case 'SNIFFER_STOP':
        dbg.info('content', 'SNIFFER_STOP');
        sniffer.stop();
        sendResponse({ ok: true });
        return true;
      case 'DISPATCH_DRAGDROP':
        dbg.info('content', 'DISPATCH_DRAGDROP', msg.payload);
        dragdrop.setEnabled(msg.payload.enabled);
        sendResponse({ ok: true });
        return true;
      case 'AUTOSCROLL_START':
        scroller.start({ delay: msg.payload.delay }).then(() => sendResponse({ done: true }));
        return true;
      case 'AUTOSCROLL_STOP':
        scroller.stop();
        sendResponse({ ok: true });
        return true;
      case 'START_SCROLL_CAPTURE':
        dbg.info('content', 'START_SCROLL_CAPTURE');
        restoreY = window.scrollY;
        sendResponse({
          scrollHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
        });
        return true;
      case 'DRAW_SELECTION':
        dbg.info('content', 'DRAW_SELECTION');
        drawSelection().then(rect => { dbg.log('content', 'DRAW_SELECTION rect', rect); sendResponse(rect); });
        return true;
    }
  }

  // 截图滚动内部命令(capturer 用 chrome.tabs.sendMessage 发)
  if (msg?.type === 'SCROLL_TO') {
    window.scrollTo(0, msg.payload.y);
    const done = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
    sendResponse({ done });
    return true;
  }
  if (msg?.type === 'SCROLL_RESTORE') {
    window.scrollTo(0, restoreY);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

// 初始化:根据当前设置启用 dragdrop / sniffer(嗅探开关持久化 —— 开启后刷新/新开页自动启用)
chrome.runtime.sendMessage({ type: 'CONFIG_GET' }).then((settings: any) => {
  dbg.info('content', 'init CONFIG_GET', {
    dragPopoverEnabled: settings?.dragPopoverEnabled,
    snifferEnabled: settings?.snifferEnabled,
    snifferKinds: settings?.snifferKinds,
    libraryId: settings?.libraryId,
  });
  if (settings?.dragPopoverEnabled === false) dragdrop.setEnabled(false);
  if (settings?.snifferEnabled) sniffer.start(settings.snifferKinds);
}).catch(e => dbg.error('content', 'init CONFIG_GET failed', e));
