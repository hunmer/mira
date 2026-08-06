// CRITICAL CORRECTION: brief wrote `import type { MiraClient } from 'mira-app-core'` — WRONG.
// The root package only exports EventArgs/EventManager/saveLibraries/getLibraries;
// SDK modules live under /shared/sdk (confirmed in Tasks 7/8).
import type { MiraClient } from 'mira-app-core/shared/sdk';
import type { Request, Event } from '@/shared/messages';
import { isRequest } from '@/shared/messages';
import { getSettings, updateSettings } from './settings';
import { login, withAuth } from './mira-client';
import { stagedToFile } from '@/shared/staged-file';
import type { Uploader } from './uploader';
import type { SniffedResource } from '@/shared/types';
import { dbg } from '@/shared/debug';
import { sendToContent } from './inject';

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
      case 'LIB_LIST':
        return withAuth((client: MiraClient) => client.libraries().getAll());
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
        const filename = req.payload.url.split('/').pop()?.split('?')[0] || `resource-${Date.now()}`;
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
