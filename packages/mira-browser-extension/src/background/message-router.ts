// CRITICAL CORRECTION: brief wrote `import type { MiraClient } from 'mira-app-core'` — WRONG.
// The root package only exports EventArgs/EventManager/saveLibraries/getLibraries;
// SDK modules live under /shared/sdk (confirmed in Tasks 7/8).
import type { MiraClient } from 'mira-app-core/shared/sdk';
import type { Request, Event } from '@/shared/messages';
import { isRequest } from '@/shared/messages';
import { getSettings, updateSettings } from './settings';
import { login, withAuth, loginTo, activateServer } from './mira-client';
import { stagedToFile } from '@/shared/staged-file';
import type { Uploader } from './uploader';
import type { SniffedResource } from '@/shared/types';
import { dbg } from '@/shared/debug';
import { sendToContent } from './inject';
import { resourceFilename } from '@/shared/resource-filename';
import { fetchResource } from './resource-fetch';

export interface RouterDeps {
  uploader: Uploader;
  captureVisible: (tabId: number) => Promise<void>;
  captureFullPage: (tabId: number) => Promise<void>;
  captureSelection: (tabId: number) => Promise<void>;
  /** 读取某 tab 的嗅探快照(index.ts 维护的 Map 注入) */
  getSniffSnapshot: (tabId: number) => SniffedResource[];
  getAllSniffSnapshots: () => Promise<SniffedResource[]>;
}

export type RequestHandler = (
  req: Request,
  sender: chrome.runtime.MessageSender,
) => Promise<unknown>;

/** 广播 Event 给所有 listener(popup/side panel/content script) */
export function broadcast(event: Event): void {
  chrome.runtime.sendMessage(event).catch(() => {
    // 没有 listener 时会报错,忽略
  });
}

export function createRouter(deps: RouterDeps): RequestHandler {
  return async (req, _sender) => {
    if (!isRequest(req)) return undefined;
    dbg.log('router', 'request', req.type, (req as any).payload);

    switch (req.type) {
      case 'AUTH_LOGIN': {
        await login(req.payload.username, req.payload.password);
        await updateSettings({
          username: req.payload.username,
          password: req.payload.password,
        });
        return { success: true };
      }
      case 'AUTH_VERIFY': {
        return withAuth(async (client: MiraClient) => {
          await client.auth().verify();
          return { authenticated: true };
        });
      }
      case 'CONFIG_GET':
        return getSettings();
      case 'CONFIG_SET':
        return updateSettings(req.payload);
      case 'SERVERS_LIST': {
        const s = await getSettings();
        return { servers: s.servers, activeServerId: s.activeServerId };
      }
      case 'SERVERS_SAVE':
        return updateSettings({ servers: req.payload.servers });
      case 'SERVER_ACTIVATE': {
        const current = await getSettings();
        const merged = await activateServer(req.payload.id, current);
        // 写回(含 activeServerId + 同步的顶层兼容字段)
        return updateSettings({
          activeServerId: merged.activeServerId,
          serverURL: merged.serverURL,
          username: merged.username,
          password: merged.password,
        });
      }
      case 'SERVER_TEST':
        return loginTo(req.payload.serverURL, req.payload.username, req.payload.password);
      case 'LIB_LIST':
        return withAuth((client: MiraClient) => client.libraries().getAll());
      case 'NODE_CREATE':
        // kind 区分:同一入口走 folders/tags 的 create
        return withAuth(async (client: MiraClient) => {
          const { kind, libraryId, title, parentId } = req.payload;
          if (kind === 'folder') {
            return client.folders().create({ libraryId, title, parent_id: parentId });
          }
          return client.tags().create({ libraryId, title, parent_id: parentId });
        });
      case 'NODE_DELETE':
        return withAuth(async (client: MiraClient) => {
          const { kind, libraryId, id, deleteFiles } = req.payload;
          if (kind === 'folder') {
            return client.folders().delete({ libraryId, id, deleteFiles });
          }
          return client.tags().delete({ libraryId, id });
        });
      case 'FOLDER_LIST':
        return withAuth((client: MiraClient) =>
          client.folders().getAll(req.payload.libraryId),
        );
      case 'TAG_LIST':
        return withAuth((client: MiraClient) =>
          client.tags().getAll(req.payload.libraryId),
        );
      case 'UPLOAD_FILES': {
        const settings = await getSettings();
        for (const staged of req.payload.files) {
          const file = stagedToFile(staged);
          deps.uploader.enqueue({
            file,
            libraryId: req.payload.libraryId || settings.libraryId,
            source: 'dragdrop',
            tags: req.payload.tags,
            folderId: req.payload.folderId,
          });
        }
        return { enqueued: req.payload.files.length };
      }
      case 'UPLOAD_FROM_URL': {
        const settings = await getSettings();
        // service worker fetch url → Blob → File(规避 content script CORS)
        const res = await fetch(req.payload.url, {
          credentials: 'include',
          ...(req.payload.referrer ? {
            referrer: req.payload.referrer,
            referrerPolicy: 'no-referrer-when-downgrade' as ReferrerPolicy,
          } : {}),
        });
        const blob = await res.blob();
        const filename = resourceFilename(req.payload.url, blob.type) || `resource-${Date.now()}`;
        const file = new File([blob], filename, { type: blob.type || 'image/*' });
        deps.uploader.enqueue({
          file,
          libraryId: req.payload.libraryId || settings.libraryId,
          folderId: req.payload.folderId != null ? String(req.payload.folderId) : undefined,
          tags: req.payload.tags,
          source: 'sniffer',
        });
        return { enqueued: 1 };
      }
      case 'UPLOAD_STATUS':
        return deps.uploader.getQueue();
      case 'UPLOAD_CANCEL':
        deps.uploader.cancelTask(req.payload.id);
        return { success: true };
      case 'DOWNLOAD_RESOURCES': {
        const items = req.payload.items;
        dbg.info('download', 'download requested', { count: items.length });
        // 单文件:直接交给浏览器下载(走原始 url,referrer 由浏览器按 tab 处理)
        if (items.length === 1) {
          const downloadId = await chrome.downloads.download({ url: items[0].url, filename: items[0].filename, saveAs: false });
          dbg.info('download', 'single download started', { downloadId, url: items[0].url, filename: items[0].filename });
          return { success: true, count: 1 };
        }
        // 多文件:逐个 fetch(host_permissions 覆盖跨域)→ zip 打包 → 下载
        const { zipSync } = await import('fflate');
        const files: Record<string, Uint8Array> = {};
        let ok = 0;
        for (const item of items) {
          try {
            const res = await fetchResource(item.url, item.referrer);
            if (!res.ok) throw new Error(`resource fetch failed: ${res.status}`);
            const buf = new Uint8Array(await res.arrayBuffer());
            // 同名冲突时加序号避免覆盖
            let name = item.filename;
            if (files[name]) {
              const dot = name.lastIndexOf('.');
              const base = dot > 0 ? name.slice(0, dot) : name;
              const ext = dot > 0 ? name.slice(dot) : '';
              let i = 1;
              while (files[`${base} (${i})${ext}`]) i++;
              name = `${base} (${i})${ext}`;
            }
            files[name] = buf;
            ok++;
            dbg.log('download', 'resource added to zip', { url: item.url, filename: name, bytes: buf.length });
          } catch (error) {
            dbg.warn('download', 'resource skipped', { url: item.url, filename: item.filename, error });
            // 单个失败不阻断整体打包
          }
        }
        if (ok === 0) {
          dbg.error('download', 'all resources failed', { count: items.length });
          return { success: false, error: 'no resource fetched' };
        }
        const zipped = zipSync(files);
        // service worker 里 createObjectURL 可用;blob 传给 downloads API
        const blob = new Blob([zipped], { type: 'application/zip' });
        const objectUrl = URL.createObjectURL(blob);
        const downloadId = await chrome.downloads.download({
          url: objectUrl,
          filename: `sniffer-${Date.now()}.zip`,
          saveAs: false,
        });
        dbg.info('download', 'zip download started', { downloadId, requested: items.length, included: ok, bytes: zipped.length });
        // 下载器拷贝 objectUrl 后即可释放
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        return { success: true, count: ok };
      }
      case 'CAPTURE_VISIBLE':
        await deps.captureVisible(req.payload.tabId);
        return { success: true };
      case 'CAPTURE_FULLPAGE':
        await deps.captureFullPage(req.payload.tabId);
        return { success: true };
      case 'CAPTURE_SELECTION':
        await deps.captureSelection(req.payload.tabId);
        return { success: true };
      case 'SNIFFER_START':
        await sendToContent(req.payload.tabId, {
          type: 'SNIFFER_START',
          payload: { kinds: req.payload.kinds },
        });
        return { success: true };
      case 'SNIFFER_STOP':
        await sendToContent(req.payload.tabId, { type: 'SNIFFER_STOP' });
        return { success: true };
      case 'SNIFFER_QUERY': {
        // 从内存快照返回(getSniffSnapshot 由 index.ts 注入)
        return {
          resources: req.payload.tabId === -1
            ? await deps.getAllSniffSnapshots()
            : deps.getSniffSnapshot(req.payload.tabId),
        };
      }
      case 'AUTOSCROLL_START':
        await sendToContent(req.payload.tabId, {
          type: 'AUTOSCROLL_START',
          payload: { delay: (await getSettings()).autoScrollDelay },
        });
        return { success: true };
      case 'AUTOSCROLL_STOP':
        await sendToContent(req.payload.tabId, { type: 'AUTOSCROLL_STOP' });
        return { success: true };
      default:
        return undefined;
    }
  };
}
