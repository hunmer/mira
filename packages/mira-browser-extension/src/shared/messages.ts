import type {
  ExtensionSettings,
  ServerConfig,
  StagedFile,
  SniffedResource,
  ResourceKind,
  UploadStatus,
  ImageUrlRule,
} from './types';

export interface CustomUploadSession {
  sourceUrl: string;
  kind: ResourceKind;
  referrer: string;
}

/**
 * UI/content script → service worker
 */
export type Request =
  | { type: 'CUSTOM_UPLOAD_SIDEPANEL_OPEN'; payload: CustomUploadSession }
  | { type: 'CUSTOM_UPLOAD_SESSION_GET' }
  | { type: 'CUSTOM_UPLOAD_SESSION_CLOSE' }
  // 认证 / 配置
  | { type: 'AUTH_LOGIN'; payload: { username: string; password: string } }
  | { type: 'AUTH_VERIFY' }
  | { type: 'CONFIG_GET' }
  | { type: 'CONFIG_SET'; payload: Partial<ExtensionSettings> }
  // 多服务器
  | { type: 'SERVERS_LIST' }
  | { type: 'SERVERS_SAVE'; payload: { servers: ServerConfig[] } }
  | {
      type: 'SERVER_ACTIVATE';
      payload: { id: string };
    }
  | {
      type: 'SERVER_TEST';
      payload: { serverURL: string; username: string; password: string };
    }
  // 素材库
  | { type: 'LIB_LIST' }
  | { type: 'FOLDER_LIST'; payload: { libraryId: string } }
  | { type: 'TAG_LIST'; payload: { libraryId: string } }
  // 文件夹 / 标签 CRUD(create/delete 统一入口,kind 区分)
  | {
      type: 'NODE_CREATE';
      payload: {
        kind: 'folder' | 'tag';
        libraryId: string;
        title: string;
        /** 父节点 id;0/undefined 为根 */
        parentId?: number;
      };
    }
  | {
      type: 'NODE_DELETE';
      payload: {
        kind: 'folder' | 'tag';
        libraryId: string;
        id: number;
        /** 仅 folder:是否连同其下文件一起删除(默认 false 仅删空目录结构) */
        deleteFiles?: boolean;
      };
    }
  // 上传
  | {
      type: 'UPLOAD_FILES';
      payload: { files: StagedFile[]; libraryId: string; tags?: string[]; folderId?: string };
    }
  | { type: 'UPLOAD_FROM_URL'; payload: { url: string; kind: ResourceKind; libraryId: string; folderId?: number; tags?: string[]; referrer?: string } }
  | { type: 'BATCH_IMPORT'; payload: { items: { urls: string[]; fallbackUrl: string; filename: string; referrer?: string }[]; libraryId: string; folderId?: number } }
  | { type: 'UPLOAD_STATUS' }
  | { type: 'UPLOAD_CANCEL'; payload: { id: string } }
  | { type: 'UPGRADE_IMAGE_URL'; payload: { tabId: number; url: string; timeout?: number; rules?: ImageUrlRule[] } }
  // 下载选中(单文件直接下载,多文件 zip 打包)
  | { type: 'DOWNLOAD_RESOURCES'; payload: { items: { url: string; filename: string; referrer?: string }[] } }
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
  | { type: 'CUSTOM_UPLOAD_SESSION_OPEN'; payload: CustomUploadSession }
  | { type: 'UPLOAD_PROGRESS'; payload: { id: string; percent: number; status: UploadStatus } }
  | { type: 'SNIFFER_FOUND'; payload: { tabId: number; resources: SniffedResource[] } }
  | { type: 'AUTH_EXPIRED' }
  // 批量上传/下载进度(phase 区分方向,stage 区分「抓取」与「收尾上传/打包」)
  | { type: 'BATCH_PROGRESS'; payload: { phase: 'upload' | 'download'; done: number; total: number; stage: 'fetch' | 'finish' } };

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
  | { type: 'DISPATCH_DRAGDROP'; payload: { enabled: boolean } }
  | { type: 'UPGRADE_IMAGE_URL'; payload: { url: string; timeout?: number; rules?: ImageUrlRule[] } }
  // 在当前页面打开「批量导入」对话框(urls 由页面选区提取)
  | { type: 'OPEN_IMPORT_DIALOG'; payload?: { urls?: string[]; referrer?: string } };

const REQUEST_TYPES = new Set<Request['type']>([
  'CUSTOM_UPLOAD_SIDEPANEL_OPEN', 'CUSTOM_UPLOAD_SESSION_GET', 'CUSTOM_UPLOAD_SESSION_CLOSE',
  'AUTH_LOGIN', 'AUTH_VERIFY', 'CONFIG_GET', 'CONFIG_SET',
  'SERVERS_LIST', 'SERVERS_SAVE', 'SERVER_ACTIVATE', 'SERVER_TEST',
  'LIB_LIST', 'FOLDER_LIST', 'TAG_LIST', 'NODE_CREATE', 'NODE_DELETE',
  'UPLOAD_FILES', 'UPLOAD_FROM_URL', 'BATCH_IMPORT', 'UPLOAD_STATUS', 'UPLOAD_CANCEL', 'UPGRADE_IMAGE_URL', 'DOWNLOAD_RESOURCES',
  'CAPTURE_VISIBLE', 'CAPTURE_FULLPAGE', 'CAPTURE_SELECTION',
  'SNIFFER_START', 'SNIFFER_STOP', 'SNIFFER_QUERY',
  'AUTOSCROLL_START', 'AUTOSCROLL_STOP',
]);

const COMMAND_TYPES = new Set<ContentCommand['type']>([
  'SNIFFER_START', 'SNIFFER_STOP',
  'AUTOSCROLL_START', 'AUTOSCROLL_STOP',
  'START_SCROLL_CAPTURE', 'DRAW_SELECTION', 'DISPATCH_DRAGDROP', 'UPGRADE_IMAGE_URL',
  'OPEN_IMPORT_DIALOG',
]);

const EVENT_TYPES = new Set<Event['type']>([
  'CUSTOM_UPLOAD_SESSION_OPEN',
  'UPLOAD_PROGRESS', 'SNIFFER_FOUND', 'AUTH_EXPIRED', 'BATCH_PROGRESS',
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
