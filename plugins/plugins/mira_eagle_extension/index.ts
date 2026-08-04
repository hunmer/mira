/**
 * Mira Eagle 浏览器扩展支持 服务端插件
 *
 * 在 41595 / 41593 两个端口复刻 Eagle 的本地 HTTP 协议，让 Eagle 浏览器扩展
 * 无需改动即可把图片保存到 Mira 当前素材库。
 *
 * 与原版 server.js 的差异：原版把请求转发给本机 Eagle（127.0.0.1:41597），
 * 本插件直接操作当前库的 dbService，把图片落库到 Mira。
 *
 * 参考：scripts/eagle浏览器扩展支持/server.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const PLUGIN_NAME = 'mira_eagle_extension';

interface PluginConfig {
  port: number;
  portCapture: number;
  apiToken: string;
  recentFoldersLimit: number;
  tempDir: string;
  allowedPushTypes: string[];
}

interface EagleItem {
  name?: string;
  url: string;
  website?: string;
  modificationTime?: number;
  tags?: string[];
  description?: string;
}

class MiraEagleExtension {
  private pluginName = PLUGIN_NAME;
  private pluginManager: any;
  private dbService: any;
  private libraryId: string;
  private config: PluginConfig;
  private tempDir: string;
  private server41595?: http.Server;
  private server41593?: http.Server;

  constructor(inst: any) {
    const { pluginManager } = inst;
    this.pluginManager = pluginManager;
    this.dbService = inst.dbService;
    this.libraryId = this.dbService.getLibraryId();
    this.config = this.loadConfig();
    this.tempDir = path.isAbsolute(this.config.tempDir)
      ? this.config.tempDir
      : path.join(this.getPluginDataDir(), this.config.tempDir);
    fs.mkdirSync(this.tempDir, { recursive: true });

    this.start();
    console.log(`[mira_eagle_extension] 已为库 ${this.libraryId} 启动，端口 ${this.config.port} / ${this.config.portCapture}`);
  }

  // ============================== 配置 ==============================

  private getPluginDataDir(): string {
    // ServerPluginManager.getPluginDir 返回插件源目录；data/ 与其并列
    try {
      const dir = this.pluginManager.getPluginDir?.(this.pluginName);
      if (dir) return path.join(dir, 'data');
    } catch {}
    return path.join(__dirname, 'data');
  }

  private getConfigPath(): string {
    return path.join(this.getPluginDataDir(), 'config.json');
  }

  private loadConfig(): PluginConfig {
    const defaultConfig: PluginConfig = {
      port: 41595,
      portCapture: 41593,
      apiToken: '3f0b58a7-a8a6-4652-8e12-5a6ad45bc77d',
      recentFoldersLimit: 10,
      tempDir: 'data/temp',
      allowedPushTypes: ['image', 'screen capture', 'save-url'],
    };
    try {
      const file = this.getConfigPath();
      if (fs.existsSync(file)) {
        const saved = JSON.parse(fs.readFileSync(file, 'utf-8'));
        return { ...defaultConfig, ...saved };
      }
    } catch (e) {
      console.warn('[mira_eagle_extension] 读取配置失败，使用默认值:', e);
    }
    return defaultConfig;
  }

  // ============================== Eagle 信息 ==============================

  /** 返回 Eagle 风格的本地服务信息，供浏览器扩展识别 */
  private getInformation() {
    return {
      version: '3.0.0',
      prereleaseVersion: null,
      buildVersion: '20231101',
      showCollectModal: false,
      platform: process.platform,
      preferences: {
        general: { language: 'zh_CN', showMenuItem: 'true', showSidebarBadge: 'true' },
        developer: { apiToken: this.config.apiToken },
      },
    };
  }

  // ============================== HTTP 工具 ==============================

  /** 统一带 CORS 头的 JSON 响应（复刻原版 echoJson） */
  private sendJson(res: http.ServerResponse, data: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (typeof data === 'object') data = JSON.stringify(data);
    res.end(data);
  }

  /** 读取请求 body（JSON 或 urlencoded） */
  private readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise(resolve => {
      let raw = '';
      req.on('data', chunk => {
        raw += chunk;
        // base64 图片可能很大，限制 200MB
        if (raw.length > 200 * 1024 * 1024) {
          raw = '';
          resolve(null);
          req.destroy();
        }
      });
      req.on('end', () => {
        if (!raw) return resolve({});
        const ct = req.headers['content-type'] || '';
        if (ct.includes('application/json')) {
          try { return resolve(JSON.parse(raw)); } catch { return resolve({}); }
        }
        if (ct.includes('application/x-www-form-urlencoded')) {
          const obj: any = {};
          for (const pair of raw.split('&')) {
            const [k, v] = pair.split('=');
            if (k) obj[decodeURIComponent(k)] = decodeURIComponent(v || '');
          }
          return resolve(obj);
        }
        // 兜底尝试 JSON
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      });
      req.on('error', () => resolve(null));
    });
  }

  /** 下载远端文件到临时路径，返回路径；失败返回 null */
  private downloadToFile(url: string, dest: string): Promise<string | null> {
    return new Promise(resolve => {
      const lib = url.startsWith('https') ? require('https') : require('http');
      const req = lib.get(url, (resp: http.IncomingMessage) => {
        // 处理重定向
        if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          return resolve(this.downloadToFile(resp.headers.location, dest));
        }
        if (resp.statusCode !== 200) return resolve(null);
        const stream = fs.createWriteStream(dest);
        resp.pipe(stream);
        stream.on('finish', () => stream.close(() => resolve(dest)));
        stream.on('error', () => { try { fs.unlinkSync(dest); } catch {} resolve(null); });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(30000, () => { req.destroy(); resolve(null); });
    });
  }

  /** 把 base64 写入临时文件 */
  private base64ToTempFile(base64: string): string | null {
    const clean = base64.replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(clean, 'base64');
    const ext = this.guessExtFromDataUrl(base64) || 'png';
    const file = path.join(this.tempDir, `${crypto.randomBytes(8).toString('hex')}.${ext}`);
    fs.writeFileSync(file, buf);
    return file;
  }

  private guessExtFromDataUrl(url: string): string | null {
    const m = url.match(/^data:image\/([a-zA-Z0-9]+);/);
    if (m) return m[1] === 'jpeg' ? 'jpg' : m[1];
    return null;
  }

  private guessExtFromUrl(url: string): string {
    try {
      const u = new URL(url);
      const m = u.pathname.match(/\.([a-zA-Z0-9]+)$/);
      if (m) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
    } catch {}
    return 'png';
  }

  // ============================== 落库 ==============================

  private broadcastFileCreated(file: Record<string, any>) {
    try {
      const wss = this.pluginManager.server?.backend?.getWebSocketServer?.();
      wss?.broadcastLibraryEvent?.(this.libraryId, 'file::created', file);
      wss?.broadcastPluginEvent?.('file::created', { result: file, libraryId: this.libraryId });
    } catch (e) {
      console.warn('[mira_eagle_extension] 广播 file::created 失败:', e);
    }
  }

  /**
   * 把一个 URL 作为"URL 文件"写入当前库（Mira 支持 isUrlFile 的远端引用文件，
   * 无需下载即可在网格中展示）。同时写入 custom_fields 保存来源 url / tags。
   */
  private async addUrlItem(item: EagleItem, folderId?: number): Promise<Record<string, any> | null> {
    try {
      const now = Date.now();
      const custom_fields: Record<string, any> = { url: item.website || item.url };
      if (item.tags && item.tags.length) custom_fields.tags = item.tags;
      if (item.description) custom_fields.desc = item.description;

      const file = await this.dbService.createFile({
        name: item.name || path.basename(new URL(item.url).pathname) || `${now}.png`,
        created_at: item.modificationTime || now,
        imported_at: now,
        size: 0,
        hash: '',
        reference: item.url,   // URL 文件的关键字段
        path: item.url,
        folder_id: folderId ?? null,
        custom_fields,
        tags: item.tags && item.tags.length ? JSON.stringify(item.tags) : null,
      });
      return file;
    } catch (e) {
      console.error('[mira_eagle_extension] addUrlItem 失败:', e);
      return null;
    }
  }

  /**
   * 把 base64 / 远端 URL 下载到临时文件，用 createFileFromPath 落盘入库（去重）。
   * importType=move 会把临时文件移动到库目录，临时文件自动清理。
   */
  private async importFileFromSource(opts: {
    base64?: string;
    src?: string;
    url?: string;
    title?: string;
    folderId?: number;
    tags?: string[];
    desc?: string;
  }): Promise<Record<string, any> | null> {
    let tempPath: string | null = null;
    try {
      if (opts.base64) {
        tempPath = this.base64ToTempFile(opts.base64);
        if (!tempPath) return null;
      } else if (opts.src) {
        const ext = this.guessExtFromUrl(opts.src);
        tempPath = path.join(this.tempDir, `${crypto.randomBytes(8).toString('hex')}.${ext}`);
        const downloaded = await this.downloadToFile(opts.src, tempPath);
        if (!downloaded) return null;
      } else {
        return null;
      }

      const custom_fields: Record<string, any> = {};
      if (opts.url) custom_fields.url = opts.url;
      if (opts.desc) custom_fields.desc = opts.desc;

      const file = await this.dbService.createFileFromPath(tempPath, {
        folder_id: opts.folderId ?? null,
        custom_fields,
        tags: opts.tags && opts.tags.length ? JSON.stringify(opts.tags) : null,
      }, { importType: 'move' });

      // createFileFromPath 用 path.basename 作 name，这里用 title 覆盖
      if (opts.title && file?.id) {
        try { await this.dbService.updateFile?.(file.id, { name: opts.title }); } catch {}
      }

      return file;
    } catch (e) {
      console.error('[mira_eagle_extension] importFileFromSource 失败:', e);
      // 失败时清理临时文件
      if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} }
      return null;
    }
  }

  // ============================== Eagle 协议路由 ==============================

  /** :41595 上的 /api/item/addFromURLs */
  private handleAddFromURLs = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const body = await this.readBody(req);
      const { folderId, items } = body || {};
      if (!Array.isArray(items)) {
        return this.sendJson(res, { status: 'failed', code: 'invalid params' });
      }
      let ok = 0;
      for (const it of items as EagleItem[]) {
        const file = await this.addUrlItem(it, folderId);
        if (file) {
          ok++;
          this.broadcastFileCreated(file);
        }
      }
      this.sendJson(res, { status: 'success', data: { count: ok } });
    } catch (e) {
      console.error('[mira_eagle_extension] addFromURLs error:', e);
      this.sendJson(res, { status: 'failed', code: 'error' });
    }
  };

  /** :41595 上的 /api/folder/create */
  private handleFolderCreate = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const body = await this.readBody(req);
      const { name, parentId, color, icon } = body || {};
      if (!name) return this.sendJson(res, { status: 'failed', code: 'missing name' });
      const id = await this.dbService.createFolder({
        title: name,
        parent_id: parentId ?? null,
        color: color || '',
        icon: icon || '',
        sort_index: 0,
      });
      // 通知前端
      try {
        const wss = this.pluginManager.server?.backend?.getWebSocketServer?.();
        wss?.broadcastLibraryEvent?.(this.libraryId, 'folder::created', { id, title: name });
      } catch {}
      this.sendJson(res, { status: 'success', data: { id } });
    } catch (e) {
      console.error('[mira_eagle_extension] folderCreate error:', e);
      this.sendJson(res, { status: 'failed', code: 'error' });
    }
  };

  /** :41595 上的 /api/folder/listRecent */
  private handleListRecentFolders = async (_req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const folders = await this.dbService.getAllFolders();
      // Eagle 返回 { status:'success', data:[...] }；按 id 倒序近似"最近"
      const list = (folders || [])
        .sort((a: any, b: any) => Number(b.id) - Number(a.id))
        .slice(0, this.config.recentFoldersLimit)
        .map((f: any) => ({ id: f.id, name: f.title, parentId: f.parent_id }));
      this.sendJson(res, { status: 'success', data: list });
    } catch (e) {
      console.error('[mira_eagle_extension] listRecentFolders error:', e);
      this.sendJson(res, { status: 'failed', code: 'error' });
    }
  };

  /** :41593 根路径 POST：处理 image / screen capture / save-url 推送 */
  private handleCapturePush = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const body = await this.readBody(req);
      const type = body?.type;
      if (type && this.config.allowedPushTypes.includes(type)) {
        const { metaTags, metaDescription, metaPicture, src, url, title, folderID, base64 } = body || {};
        // 始终返回 Eagle 信息（原版行为）
        this.sendJson(res, this.getInformation());

        const file = await this.importFileFromSource({
          base64,
          src: base64 ? undefined : (src || metaPicture),
          url,
          title: title || (url ? undefined : Date.now().toString()),
          folderId: folderID,
          tags: metaTags,
          desc: metaDescription,
        });
        if (file) this.broadcastFileCreated(file);
        return;
      }
      this.sendJson(res, this.getInformation());
    } catch (e) {
      console.error('[mira_eagle_extension] capturePush error:', e);
      this.sendJson(res, { code: 'error' });
    }
  };

  // ============================== 启动两个服务 ==============================

  private start() {
    // --- 端口 41595：Eagle API 协议 ---
    this.server41595 = http.createServer(async (req, res) => {
      // 处理 CORS 预检
      if (req.method === 'OPTIONS') return this.sendJson(res, {});
      const url = (req.url || '/').split('?')[0];
      if (req.method === 'GET' && url === '/') return this.sendJson(res, this.getInformation());
      if (req.method === 'POST' && url === '/api/item/addFromURLs') return this.handleAddFromURLs(req, res);
      if (req.method === 'POST' && url === '/api/folder/create') return this.handleFolderCreate(req, res);
      if (req.method === 'GET' && url === '/api/folder/listRecent') return this.handleListRecentFolders(req, res);
      this.sendJson(res, { status: 'failed', code: 'not found' });
    });
    this.server41595.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(`[mira_eagle_extension] 端口 ${this.config.port} 已被占用（是否已运行 Eagle？）`);
      } else {
        console.error('[mira_eagle_extension] 41595 服务错误:', e);
      }
    });
    this.server41595.listen(this.config.port);

    // --- 端口 41593：截图 / 图片 / save-url 推送 ---
    this.server41593 = http.createServer(async (req, res) => {
      if (req.method === 'OPTIONS') return this.sendJson(res, {});
      const url = (req.url || '/').split('?')[0];
      if (req.method === 'GET' && url === '/') return this.sendJson(res, this.getInformation());
      if (req.method === 'GET' && url === '/exit') {
        this.sendJson(res, { status: 'success' });
        return process.exit(0);
      }
      if (req.method === 'POST' && url === '/') return this.handleCapturePush(req, res);
      this.sendJson(res, this.getInformation());
    });
    this.server41593.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(`[mira_eagle_extension] 端口 ${this.config.portCapture} 已被占用`);
      } else {
        console.error('[mira_eagle_extension] 41593 服务错误:', e);
      }
    });
    this.server41593.listen(this.config.portCapture);
  }

  // ============================== 清理 ==============================

  cleanup() {
    try {
      this.server41595?.close();
      this.server41593?.close();
    } catch {}
    // 清理临时目录
    try {
      if (fs.existsSync(this.tempDir)) {
        for (const f of fs.readdirSync(this.tempDir)) {
          try { fs.unlinkSync(path.join(this.tempDir, f)); } catch {}
        }
      }
    } catch {}
    console.log('[mira_eagle_extension] 已停止');
  }
}

export function init(inst: any) {
  return new MiraEagleExtension(inst);
}
