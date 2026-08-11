import { isContentCommand } from '@/shared/messages';
import { createSniffer } from './sniffer';
import { createDragDrop, type DragDropPayload } from './dragdrop';
import { createAutoScroller } from './autoscroll';
import { drawSelection } from './overlay/selection';
import { openImportDialog, extractUrls } from './overlay/import-dialog';
import { urlKind } from '@/shared/drag-data';
import { upgradeImageUrl } from '@/shared/imu';
import { fileToStaged } from '@/shared/staged-file';
import { dbg } from '@/shared/debug';
import type { ResourceKind } from '@/shared/types';
import type { Folder, Tag } from 'mira-app-core/shared/sdk';

dbg.info('content', 'script loaded', { url: location.href, readyState: document.readyState });

// ---- 当前素材库文件夹/标签的访问 helper(供 dragdrop 与 import-dialog 复用) ----

/** 取当前激活 libraryId;未连接素材库返回 null */
async function getLibraryId(): Promise<string | null> {
  try {
    const settings: any = await chrome.runtime.sendMessage({ type: 'CONFIG_GET' });
    return settings?.libraryId || null;
  } catch {
    return null;
  }
}

/** 取当前素材库文件夹列表;未连接素材库时返回 null */
async function fetchFolders(): Promise<Folder[] | null> {
  const libraryId = await getLibraryId();
  if (!libraryId) return null;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'FOLDER_LIST', payload: { libraryId } });
    return (res as Folder[]) ?? [];
  } catch {
    return [];
  }
}

/** 取当前素材库标签列表;未连接素材库时返回 null */
async function fetchTags(): Promise<Tag[] | null> {
  const libraryId = await getLibraryId();
  if (!libraryId) return null;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'TAG_LIST', payload: { libraryId } });
    return (res as Tag[]) ?? [];
  } catch {
    return [];
  }
}

/** 新建文件夹,返回新 id;失败返回 null */
async function createFolder(title: string): Promise<number | null> {
  const libraryId = await getLibraryId();
  if (!libraryId) return null;
  try {
    const id = await chrome.runtime.sendMessage({
      type: 'NODE_CREATE',
      payload: { kind: 'folder', libraryId, title },
    });
    return typeof id === 'number' ? id : null;
  } catch (e) {
    dbg.error('content', 'createFolder failed', e);
    return null;
  }
}

// 嗅探上报:发给 service worker(SNIFFER_REPORT)
const sniffer = createSniffer(resources => {
  dbg.log('content', 'sniffer onUpdate → report', { count: resources.length });
  const pageUrl = location.href;
  chrome.runtime.sendMessage({
    type: 'SNIFFER_REPORT',
    resources: resources.map(resource => ({ ...resource, pageUrl, referrer: pageUrl })),
  }).catch(e => dbg.error('content', 'SNIFFER_REPORT send failed', e));
});

// 拖拽上传:发给 service worker
const dragdrop = createDragDrop({
  // 取当前素材库的文件夹列表(用于拖放浮层右侧目录)
  getFolders: fetchFolders,
  // 「➕ 新建文件夹」drop zone 调用
  createFolder,
  onUpload(payload: DragDropPayload) {
    if (payload.file) {
      if (payload.sourceUrl) {
        dbg.info('content', 'dragged file has source URL, upgrade via maxurl', { url: payload.sourceUrl });
        uploadUrl(payload.sourceUrl, payload.kind, payload.folderId);
        return;
      }
      // File 跨上下文序列化 —— 必须用 fileToStaged(转 number[]),
      // 裸 ArrayBuffer / Uint8Array 经 sendMessage 结构化克隆会丢失/退化,见 staged-file.ts
      fileToStaged(payload.file).then(staged => {
        dbg.log('content', 'UPLOAD_FILES staged', { name: staged.name, bytesLen: staged.buffer.length });
        chrome.runtime.sendMessage({
          type: 'UPLOAD_FILES',
          payload: {
            files: [staged],
            libraryId: '', // service worker 用默认 libraryId
            folderId: payload.folderId != null ? String(payload.folderId) : undefined,
          },
        }).catch(e => dbg.error('content', 'UPLOAD_FILES send failed', e));
      });
    } else if (payload.url) {
      uploadUrl(payload.url, payload.kind, payload.folderId);
    }
  },
});

/** 网页图片上传:开启高清升级时,先用 maxurl 取原图候选,取最优一个发 service worker 下载 */
async function uploadUrl(url: string, kind: ResourceKind, folderId?: number, tags?: string[]) {
  let best = url;
  try {
    const settings: any = await chrome.runtime.sendMessage({ type: 'CONFIG_GET' });
    if (settings?.imuEnabled) {
      const candidates = await upgradeImageUrl(url, { rules: settings?.imuRules });
      // upgradeImageUrl 返回 [...升级候选, 原 url];取第一个非原 url(若有),否则原 url
      best = candidates[0] ?? url;
      dbg.log('content', 'upgraded', { original: url, best, count: candidates.length });
    }
  } catch (e) { dbg.warn('content', 'uploadUrl upgrade failed, use original', e); /* 升级失败沿用原 url */ }
  chrome.runtime.sendMessage({
    type: 'UPLOAD_FROM_URL',
    payload: { url: best, kind, libraryId: '', folderId, tags, referrer: location.href },
  }).catch(e => dbg.error('content', 'UPLOAD_FROM_URL send failed', e));
}

/** 批量导入多张 URL:走 UPLOAD_FROM_URL(逐条),共用同一 folderId / tags。 */
function batchUploadUrls(urls: string[], opts: { folderId?: number; tags?: string[] }) {
  for (const u of urls) {
    void uploadUrl(u, urlKind(u), opts.folderId, opts.tags);
  }
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
        // 立即响应「已开始」,滚动循环在后台跑(可能持续很久);否则调用方
        // await sendMessage 会一直挂起,直到整段滚动结束。
        scroller.start({ delay: msg.payload.delay }).catch(() => {});
        sendResponse({ ok: true });
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
      case 'OPEN_IMPORT_DIALOG': {
        // 从页面选区提取 URL;调用方可显式传 urls 覆盖
        const explicit = msg.payload?.urls;
        const urls = explicit && explicit.length > 0
          ? explicit
          : extractUrls(window.getSelection()?.toString() ?? '');
        dbg.info('content', 'OPEN_IMPORT_DIALOG', { fromSelection: !explicit, count: urls.length });
        if (!urls.length) {
          sendResponse({ ok: false, error: 'no-urls' });
          return true;
        }
        openImportDialog({
          urls,
          referrer: location.href,
          getFolders: fetchFolders,
          getTags: fetchTags,
          createFolder,
          onImport: payload => {
            dbg.info('content', 'import-dialog submit', { count: payload.urls.length, folderId: payload.folderId, tags: payload.tags });
            batchUploadUrls(payload.urls, { folderId: payload.folderId, tags: payload.tags });
          },
        });
        sendResponse({ ok: true, count: urls.length });
        return true;
      }
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
  if (msg?.type === 'UPGRADE_IMAGE_URL') {
    dbg.info('content', 'UPGRADE_IMAGE_URL', { url: msg.payload?.url, timeout: msg.payload?.timeout });
    upgradeImageUrl(msg.payload.url, { timeout: msg.payload?.timeout, rules: msg.payload?.rules })
      .then(candidates => sendResponse({ candidates }))
      .catch(error => {
        dbg.warn('content', 'UPGRADE_IMAGE_URL failed', { url: msg.payload?.url, error });
        sendResponse({ candidates: [msg.payload.url] });
      });
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
