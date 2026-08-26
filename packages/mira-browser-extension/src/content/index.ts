import { isContentCommand } from '@/shared/messages';
import { createSniffer } from './sniffer';
import { createDragDrop, type DragDropPayload } from './dragdrop';
import { createHoverButton } from './hover-button';
import { createAutoScroller } from './autoscroll';
import { drawSelection } from './overlay/selection';
import { openImportDialog, extractUrls } from './overlay/import-dialog';
import { urlKind } from '@/shared/drag-data';
import { upgradeImageUrl } from '@/shared/imu';
import { fileToStaged } from '@/shared/staged-file';
import { isDragPopoverHostAllowed } from '@/shared/types';
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

// 拖拽浮层不依赖 popup 生命周期:首次请求列表时主动触发后台认证。
// AUTH_VERIFY 由 background.withAuth 处理,无有效 token 时会按保存凭据自动重登。
let pendingConnection: Promise<boolean> | null = null;
async function ensureConnected(): Promise<boolean> {
  if (!pendingConnection) {
    pendingConnection = (async () => {
      const verified = await chrome.runtime.sendMessage({ type: 'AUTH_VERIFY' }).catch(() => null) as any;
      if (verified?.authenticated === true) {
        dbg.info('content', 'dragdrop connection check', { ok: true, phase: 'verify' });
        return true;
      }

      // popup 的启动流程在 verify 失败后会用保存凭据(无则默认账号)自动登录。
      // 拖拽浮层没有 popup 生命周期,这里补齐同样的回退。
      const settings: any = await chrome.runtime.sendMessage({ type: 'CONFIG_GET' }).catch(() => null);
      const username = settings?.username || 'admin';
      const password = settings?.password || 'admin123';
      const login = await chrome.runtime.sendMessage({
        type: 'AUTH_LOGIN',
        payload: { username, password },
      }).catch(() => null) as any;
      if (!login?.success) {
        dbg.warn('content', 'dragdrop auto login failed', { error: login?.error });
        return false;
      }
      const retry = await chrome.runtime.sendMessage({ type: 'AUTH_VERIFY' }).catch(() => null) as any;
      const ok = retry?.authenticated === true;
      dbg.info('content', 'dragdrop connection check', { ok, phase: 'login' });
      return ok;
    })()
      .catch(e => {
        dbg.warn('content', 'dragdrop connection check failed', e);
        return false;
      })
      .finally(() => { pendingConnection = null; });
  }
  return pendingConnection ?? Promise.resolve(false);
}

/** 取当前素材库文件夹列表;未连接素材库时返回 null */
async function fetchFolders(): Promise<Folder[] | null> {
  if (!await ensureConnected()) return null;
  const libraryId = await getLibraryId();
  if (!libraryId) return null;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'FOLDER_LIST', payload: { libraryId } });
    return Array.isArray(res) ? res as Folder[] : null;
  } catch (e) {
    // 后台会在未连接/认证失效时尝试自动登录;仍失败时保留 null,
    // 让拖拽浮层显示未连接状态,而不是误显示为空文件夹列表。
    dbg.warn('content', 'fetchFolders failed', e);
    return null;
  }
}

/** 取当前素材库标签列表;未连接素材库时返回 null */
async function fetchTags(): Promise<Tag[] | null> {
  if (!await ensureConnected()) return null;
  const libraryId = await getLibraryId();
  if (!libraryId) return null;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'TAG_LIST', payload: { libraryId } });
    return Array.isArray(res) ? res as Tag[] : null;
  } catch (e) {
    dbg.warn('content', 'fetchTags failed', e);
    return null;
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
  getFolders: fetchFolders,
  getTags: fetchTags,
  createFolder,
  openCustomUpload(source) {
    return chrome.runtime.sendMessage({
      type: 'CUSTOM_UPLOAD_SIDEPANEL_OPEN',
      payload: { sourceUrl: source.url, kind: source.kind, referrer: location.href },
    }).then(result => {
      dbg.info('dragdrop', 'custom upload side panel requested', result);
    }).catch(error => dbg.error('dragdrop', 'custom upload side panel request failed', error));
  },
  onUpload(payload: DragDropPayload) {
    if (payload.file) {
      if (payload.sourceUrl) {
        uploadUrl(payload.sourceUrl, payload.kind, payload.folderId, payload.tags);
        return;
      }
      fileToStaged(payload.file).then(staged => {
        chrome.runtime.sendMessage({
          type: 'UPLOAD_FILES',
          payload: {
            files: [staged],
            libraryId: '',
            folderId: payload.folderId != null ? String(payload.folderId) : undefined,
            tags: payload.tags,
          },
        }).catch(e => dbg.error('content', 'UPLOAD_FILES send failed', e));
      });
    } else if (payload.url) {
      uploadUrl(payload.url, payload.kind, payload.folderId, payload.tags);
    }
  },
});

// 图片 hover 操作按钮:「导入图片」复用 uploadUrl;「在新标签打开大图」升级后交 background 开标签
const hoverButton = createHoverButton({
  importImage: url => { void uploadUrl(url, 'image'); },
  openLarge: url => {
    upgradeBest(url).then(best => {
      chrome.runtime.sendMessage({ type: 'OPEN_URL_IN_TAB', payload: { url: best } })
        .catch(e => dbg.error('content', 'OPEN_URL_IN_TAB send failed', e));
    });
  },
});

/** imu 开启时用 maxurl 取高清升级候选中最优 url;关闭或失败时回退原 url */
async function upgradeBest(url: string): Promise<string> {
  try {
    const settings: any = await chrome.runtime.sendMessage({ type: 'CONFIG_GET' });
    if (settings?.imuEnabled) {
      const candidates = await upgradeImageUrl(url, { rules: settings?.imuRules });
      // upgradeImageUrl 返回 [...升级候选, 原 url];取第一个非原 url(若有),否则原 url
      const best = candidates[0] ?? url;
      dbg.log('content', 'upgraded', { original: url, best, count: candidates.length });
      return best;
    }
  } catch (e) { dbg.warn('content', 'image url upgrade failed, use original', e); }
  return url;
}

/** 网页图片上传:先升级到高清原图,再发 service worker 下载入库 */
async function uploadUrl(url: string, kind: ResourceKind, folderId?: number, tags?: string[]) {
  const best = await upgradeBest(url);
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
        sniffer.start(msg.payload.kinds);
        sendResponse({ ok: true });
        return true;
      case 'SNIFFER_STOP':
        dbg.info('content', 'SNIFFER_STOP');
        sniffer.stop();
        sendResponse({ ok: true });
        return true;
      case 'DISPATCH_DRAGDROP':
        dragdrop.setEnabled(msg.payload.enabled && isDragPopoverHostAllowed(location.host, msg.payload.hosts ?? []));
        sendResponse({ ok: true, dragdrop: dragdrop.health() });
        return true;
      case 'DISPATCH_HOVER_BUTTON':
        hoverButton.setEnabled(msg.payload.enabled);
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
    dragPopoverHosts: settings?.dragPopoverHosts,
    imageHoverButtonEnabled: settings?.imageHoverButtonEnabled,
    snifferEnabled: settings?.snifferEnabled,
    snifferKinds: settings?.snifferKinds,
    libraryId: settings?.libraryId,
  });
  // 拖拽快传按钮:总开关关闭,或当前 host 不在启用站点列表(空列表 = 所有站点)时禁用
  if (settings?.dragPopoverEnabled === false
    || !isDragPopoverHostAllowed(location.host, settings?.dragPopoverHosts)) dragdrop.setEnabled(false);
  if (settings?.imageHoverButtonEnabled !== true) hoverButton.setEnabled(false);
  if (settings?.snifferEnabled) sniffer.start(settings.snifferKinds);
  dbg.info('content', 'initialization complete', { dragdrop: dragdrop.health() });
}).catch(e => dbg.error('content', 'init CONFIG_GET failed', e));
