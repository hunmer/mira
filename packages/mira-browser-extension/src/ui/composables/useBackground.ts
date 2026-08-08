import type { Request, Event } from '@/shared/messages';
import type { ExtensionSettings, ServerConfig, UploadTask, SniffedResource, ResourceKind } from '@/shared/types';
import type { StagedFile } from '@/shared/types';
import type { Folder, Tag } from 'mira-app-core/shared/sdk';

function send<T = any>(req: Request): Promise<T> {
  return chrome.runtime.sendMessage(req);
}

export function useBackground() {
  return {
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
    async uploadFiles(files: StagedFile[], libraryId: string, tags?: string[], folderId?: string) {
      return send({ type: 'UPLOAD_FILES', payload: { files, libraryId, tags, folderId } });
    },
    async uploadStatus() {
      return send<UploadTask[]>({ type: 'UPLOAD_STATUS' });
    },
    async cancelUpload(id: string) {
      return send({ type: 'UPLOAD_CANCEL', payload: { id } });
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
