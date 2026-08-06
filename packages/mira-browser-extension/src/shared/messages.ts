import type {
  ExtensionSettings,
  StagedFile,
  SniffedResource,
  ResourceKind,
  UploadStatus,
} from './types';

/**
 * UI/content script → service worker
 */
export type Request =
  // 认证 / 配置
  | { type: 'AUTH_LOGIN'; payload: { username: string; password: string } }
  | { type: 'AUTH_VERIFY' }
  | { type: 'CONFIG_GET' }
  | { type: 'CONFIG_SET'; payload: Partial<ExtensionSettings> }
  // 素材库
  | { type: 'LIB_LIST' }
  | { type: 'FOLDER_LIST'; payload: { libraryId: string } }
  | { type: 'TAG_LIST'; payload: { libraryId: string } }
  // 上传
  | {
      type: 'UPLOAD_FILES';
      payload: { files: StagedFile[]; libraryId: string; tags?: string[]; folderId?: string };
    }
  | { type: 'UPLOAD_FROM_URL'; payload: { url: string; kind: ResourceKind; libraryId: string; folderId?: number; tags?: string[]; referrer?: string } }
  | { type: 'UPLOAD_STATUS' }
  | { type: 'UPLOAD_CANCEL'; payload: { id: string } }
  // 截图
  | { type: 'CAPTURE_VISIBLE'; payload: { tabId: number } }
  | { type: 'CAPTURE_FULLPAGE'; payload: { tabId: number } }
  | { type: 'CAPTURE_SELECTION'; payload: { tabId: number } }
  // 嗅探
  | { type: 'SNIFFER_START'; payload: { tabId: number; kinds: ResourceKind[] } }
  | { type: 'SNIFFER_STOP'; payload: { tabId: number } }
  | { type: 'SNIFFER_QUERY'; payload: { tabId: number } }
  // 自动滚动
  | { type: 'AUTOSCROLL_START'; payload: { tabId: number } }
  | { type: 'AUTOSCROLL_STOP'; payload: { tabId: number } };

/**
 * service worker → 推送(content script / UI 监听)
 */
export type Event =
  | { type: 'UPLOAD_PROGRESS'; payload: { id: string; percent: number; status: UploadStatus } }
  | { type: 'SNIFFER_FOUND'; payload: { tabId: number; resources: SniffedResource[] } }
  | { type: 'AUTH_EXPIRED' };

/**
 * service worker → content script(经 chrome.tabs.sendMessage,带 tabId)
 */
export type ContentCommand =
  | { type: 'SNIFFER_START'; payload: { kinds: ResourceKind[] } }
  | { type: 'SNIFFER_STOP' }
  | { type: 'AUTOSCROLL_START'; payload: { delay: number } }
  | { type: 'AUTOSCROLL_STOP' }
  | { type: 'START_SCROLL_CAPTURE'; payload: { delay: number } }
  | { type: 'DRAW_SELECTION' }
  | { type: 'DISPATCH_DRAGDROP'; payload: { enabled: boolean } };

const REQUEST_TYPES = new Set<Request['type']>([
  'AUTH_LOGIN', 'AUTH_VERIFY', 'CONFIG_GET', 'CONFIG_SET',
  'LIB_LIST', 'FOLDER_LIST', 'TAG_LIST',
  'UPLOAD_FILES', 'UPLOAD_FROM_URL', 'UPLOAD_STATUS', 'UPLOAD_CANCEL',
  'CAPTURE_VISIBLE', 'CAPTURE_FULLPAGE', 'CAPTURE_SELECTION',
  'SNIFFER_START', 'SNIFFER_STOP', 'SNIFFER_QUERY',
  'AUTOSCROLL_START', 'AUTOSCROLL_STOP',
]);

const COMMAND_TYPES = new Set<ContentCommand['type']>([
  'SNIFFER_START', 'SNIFFER_STOP',
  'AUTOSCROLL_START', 'AUTOSCROLL_STOP',
  'START_SCROLL_CAPTURE', 'DRAW_SELECTION', 'DISPATCH_DRAGDROP',
]);

const EVENT_TYPES = new Set<Event['type']>([
  'UPLOAD_PROGRESS', 'SNIFFER_FOUND', 'AUTH_EXPIRED',
]);

export function isRequest(m: unknown): m is Request {
  return !!m && typeof m === 'object' && 'type' in m
    && REQUEST_TYPES.has((m as Request).type);
}

export function isContentCommand(m: unknown): m is ContentCommand {
  return !!m && typeof m === 'object' && 'type' in m
    && COMMAND_TYPES.has((m as ContentCommand).type);
}

export function isEvent(m: unknown): m is Event {
  return !!m && typeof m === 'object' && 'type' in m
    && EVENT_TYPES.has((m as Event).type);
}
