import type { CustomUploadSession, Request, Event } from '@/shared/messages';
import type { ExtensionSettings, ServerConfig, UploadTask, SniffedResource, ResourceKind, ImageUrlRule } from '@/shared/types';
import type { StagedFile } from '@/shared/types';
import type { Folder, Tag } from 'mira-app-core/shared/sdk';

function send<T = any>(req: Request): Promise<T> {
  return chrome.runtime.sendMessage(req);
}

export function useBackground() {
  return {
    async getCustomUploadSession() {
      return send<CustomUploadSession | null>({ type: 'CUSTOM_UPLOAD_SESSION_GET' });
    },
    async closeCustomUploadSession() {
      return send({ type: 'CUSTOM_UPLOAD_SESSION_CLOSE' });
    },
    onCustomUploadSessionOpen(cb: (session: CustomUploadSession) => void) {
      const listener = (msg: Event) => {
        if (msg?.type === 'CUSTOM_UPLOAD_SESSION_OPEN') cb(msg.payload);
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
    async login(username: string, password: string) {
      return send({ type: 'AUTH_LOGIN', payload: { username, password } });
    },
    async verify() {
      return send<{ authenticated: boolean }>({ type: 'AUTH_VERIFY' });
    },
    async getSettings() {
      return send<ExtensionSettings>({ type: 'CONFIG_GET' });
    },
    async setSettings(partial: Partial<ExtensionSettings>) {
      return send<ExtensionSettings>({ type: 'CONFIG_SET', payload: partial });
    },
    // ---- 多服务器 ----
    async listServers() {
      return send<{ servers: ServerConfig[]; activeServerId: string }>({ type: 'SERVERS_LIST' });
    },
    async saveServers(servers: ServerConfig[]) {
      return send<ExtensionSettings>({ type: 'SERVERS_SAVE', payload: { servers } });
    },
    async activateServer(id: string) {
      return send<ExtensionSettings>({ type: 'SERVER_ACTIVATE', payload: { id } });
    },
    async testServer(serverURL: string, username: string, password: string) {
      return send<{ ok: boolean; error?: string }>({
        type: 'SERVER_TEST',
        payload: { serverURL, username, password },
      });
    },
    async listLibraries() {
      return send({ type: 'LIB_LIST' });
    },
    async listFolders(libraryId: string) {
      return send<Folder[]>({ type: 'FOLDER_LIST', payload: { libraryId } });
    },
    async listTags(libraryId: string) {
      return send<Tag[]>({ type: 'TAG_LIST', payload: { libraryId } });
    },
    // ---- 文件夹 / 标签 CRUD(create/delete 统一入口) ----
    async createNode(kind: 'folder' | 'tag', libraryId: string, title: string, parentId?: number) {
      return send({ type: 'NODE_CREATE', payload: { kind, libraryId, title, parentId } });
    },
    async deleteNode(kind: 'folder' | 'tag', libraryId: string, id: number, deleteFiles?: boolean) {
      return send({ type: 'NODE_DELETE', payload: { kind, libraryId, id, deleteFiles } });
    },
    // 右键「编辑」:改 title/description/color/icon
    async updateNode(
      kind: 'folder' | 'tag',
      libraryId: string,
      id: number,
      title: string,
      extra?: { description?: string; color?: number; icon?: string },
    ) {
      return send({ type: 'NODE_UPDATE', payload: { kind, libraryId, id, title, ...extra } });
    },
    async moveNode(kind: 'folder' | 'tag', libraryId: string, id: number, parentId: number | null) {
      return send({ type: 'NODE_MOVE', payload: { kind, libraryId, id, parentId } });
    },
    async updateSortIndex(kind: 'folder' | 'tag', libraryId: string, items: { id: number; sort_index: number }[]) {
      return send({ type: 'NODE_SORT_INDEX', payload: { kind, libraryId, items } });
    },
    async uploadFiles(files: StagedFile[], libraryId: string, tags?: string[], folderId?: string) {
      return send({ type: 'UPLOAD_FILES', payload: { files, libraryId, tags, folderId } });
    },
    async batchImport(items: { urls: string[]; fallbackUrl: string; filename: string; referrer?: string }[], libraryId: string, folderId?: number, tags?: string[]) {
      return send<{ batchId: string; total: number }>({
        type: 'BATCH_IMPORT',
        payload: { items, libraryId, folderId, tags },
      });
    },
    async uploadStatus() {
      return send<UploadTask[]>({ type: 'UPLOAD_STATUS' });
    },
    async cancelUpload(id: string) {
      return send({ type: 'UPLOAD_CANCEL', payload: { id } });
    },
    async upgradeImageUrl(tabId: number, url: string, timeout?: number, rules?: ImageUrlRule[]) {
      return send<string[]>({ type: 'UPGRADE_IMAGE_URL', payload: { tabId, url, timeout, rules } });
    },
    /** 下载选中资源:单文件直下,多文件 zip 打包 */
    async downloadResources(items: { url: string; filename: string; referrer?: string }[]) {
      return send<{ success: boolean; count?: number; error?: string }>({
        type: 'DOWNLOAD_RESOURCES',
        payload: { items },
      });
    },
    async captureVisible(tabId: number) {
      return send({ type: 'CAPTURE_VISIBLE', payload: { tabId } });
    },
    async captureFullPage(tabId: number) {
      return send({ type: 'CAPTURE_FULLPAGE', payload: { tabId } });
    },
    async captureSelection(tabId: number) {
      return send({ type: 'CAPTURE_SELECTION', payload: { tabId } });
    },
    // ---- 自动滚动(在当前页面执行,嗅探滚动加载场景用) ----
    async autoScrollStart(tabId: number) {
      return send({ type: 'AUTOSCROLL_START', payload: { tabId } });
    },
    async autoScrollStop(tabId: number) {
      return send({ type: 'AUTOSCROLL_STOP', payload: { tabId } });
    },
    async snifferQuery(tabId: number) {
      return send<{ resources: SniffedResource[] }>({ type: 'SNIFFER_QUERY', payload: { tabId } });
    },
    async snifferStart(tabId: number, kinds: ResourceKind[]) {
      return send({ type: 'SNIFFER_START', payload: { tabId, kinds } });
    },
    onUploadProgress(cb: (p: { id: string; percent: number; status: string }) => void) {
      const listener = (msg: Event) => {
        if (msg?.type === 'UPLOAD_PROGRESS') cb(msg.payload);
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
    /** 批量上传/下载进度(phase=方向,stage=阶段,done/total=进度) */
    onBatchProgress(cb: (p: { phase: 'upload' | 'download'; done: number; total: number; stage: 'fetch' | 'finish' }) => void) {
      const listener = (msg: Event) => {
        if (msg?.type === 'BATCH_PROGRESS') cb(msg.payload);
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
    onSnifferFound(cb: (tabId: number, resources: SniffedResource[]) => void) {
      const listener = (msg: Event) => {
        if (msg?.type === 'SNIFFER_FOUND') cb(msg.payload.tabId, msg.payload.resources);
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
    onAuthExpired(cb: () => void) {
      const listener = (msg: Event) => {
        if (msg?.type === 'AUTH_EXPIRED') cb();
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    },
  };
}
