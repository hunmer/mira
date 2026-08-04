/**
 * Mira Eagle 浏览器扩展支持 服务端插件（全局单例版）
 *
 * 设计要点：
 * ServerPluginManager 是 per-library 的，init(inst) 会被每个库各调用一次。
 * 因此本插件采用模块级单例——端口只在首个库加载时 bind 一次，后续库直接返回同一实例。
 * 入库时按用户在配置页选择的 targetLibraryId 解析对应库的 dbService。
 *
 * 参考：scripts/eagle浏览器扩展支持/server.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PLUGIN_NAME = 'mira_eagle_extension';

interface PluginConfig {
  port: number;
  portCapture: number;
  apiToken: string;
  recentFoldersLimit: number;
  tempDir: string;
  allowedPushTypes: string[];
  /** 配置页选择的接收库 ID；为空表示未配置，Eagle 数据将被拒绝并提示去配置页 */
  targetLibraryId: string;
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
  /** init 时所在库（仅用于定位插件数据目录与 backend 入口） */
  private bootstrapLibraryId: string;
  private config: PluginConfig;
  private tempDir: string;
  private server41595?: http.Server;
  private server41593?: http.Server;

  /** dashboard 路由（被 ServerPluginManager.getAllPluginRoutes 消费） */
  private routes: any[] = [];
  getRoutes() {
    return [...this.routes];
  }

  constructor(inst: any) {
    const { pluginManager } = inst;
    const bootstrapDbService = inst.dbService;
    this.pluginManager = pluginManager;
    this.bootstrapLibraryId = bootstrapDbService.getLibraryId();
    this.config = this.loadConfig();
    this.tempDir = path.isAbsolute(this.config.tempDir)
      ? this.config.tempDir
      : path.join(this.getPluginDataDir(), this.config.tempDir);
    fs.mkdirSync(this.tempDir, { recursive: true });

    this.registerDashboardRoute();
    this.registerConfigEndpoints();
    this.start();

    console.log(
      `[mira_eagle_extension] 全局单例已启动，端口 ${this.config.port} / ${this.config.portCapture}` +
      (this.config.targetLibraryId ? `，目标库 ${this.config.targetLibraryId}` : '，⚠️ 尚未选择目标库，请到配置页 /tools/eagle-extension 选择')
    );
  }

  // ============================== backend / 库解析 ==============================

  private get backend(): any {
    return this.pluginManager.server.backend;
  }

  /**
   * 运行时解析"目标库"的 dbService。
   * 不再绑定 init 时的库——由配置页 targetLibraryId 决定。
   * 库未启用 / 不存在 / 未配置 → 返回 null。
   */
  private getTargetDbService(): any | null {
    const lid = this.config.targetLibraryId;
    if (!lid) return null;
    try {
      const obj = this.backend.libraries?.getLibrary?.(lid);
      if (!obj || !obj.libraryService) return null;
      return obj.libraryService;
    } catch (e) {
      console.warn('[mira_eagle_extension] 解析目标库失败:', e);
      return null;
    }
  }

  // ============================== 配置 ==============================

  private getPluginDataDir(): string {
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
      targetLibraryId: '',
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

  private saveConfig(): boolean {
    try {
      const file = this.getConfigPath();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(this.config, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('[mira_eagle_extension] 保存配置失败:', e);
      return false;
    }
  }

  // ============================== Eagle 信息 ==============================

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

  private sendJson(res: http.ServerResponse, data: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (typeof data === 'object') data = JSON.stringify(data);
    res.end(data);
  }

  private readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise(resolve => {
      let raw = '';
      req.on('data', chunk => {
        raw += chunk;
        if (raw.length > 200 * 1024 * 1024) { raw = ''; resolve(null); req.destroy(); }
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
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      });
      req.on('error', () => resolve(null));
    });
  }

  private downloadToFile(url: string, dest: string): Promise<string | null> {
    return new Promise(resolve => {
      const lib = url.startsWith('https') ? require('https') : require('http');
      const req = lib.get(url, (resp: http.IncomingMessage) => {
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

  // ============================== 落库（用目标库） ==============================

  private broadcastFileCreated(targetLibraryId: string, file: Record<string, any>) {
    try {
      const wss = this.backend.getWebSocketServer?.();
      wss?.broadcastLibraryEvent?.(targetLibraryId, 'file::created', file);
      wss?.broadcastPluginEvent?.('file::created', { result: file, libraryId: targetLibraryId });
    } catch (e) {
      console.warn('[mira_eagle_extension] 广播 file::created 失败:', e);
    }
  }

  private async addUrlItem(dbService: any, item: EagleItem, folderId?: number): Promise<Record<string, any> | null> {
    try {
      const now = Date.now();
      const custom_fields: Record<string, any> = { url: item.website || item.url };
      if (item.tags && item.tags.length) custom_fields.tags = item.tags;
      if (item.description) custom_fields.desc = item.description;

      let name = item.name;
      if (!name) {
        try { name = path.basename(new URL(item.url).pathname); } catch { name = `${now}.png`; }
      }

      const file = await dbService.createFile({
        name,
        created_at: item.modificationTime || now,
        imported_at: now,
        size: 0,
        hash: '',
        reference: item.url,
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

  private async importFileFromSource(dbService: any, opts: {
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

      const file = await dbService.createFileFromPath(tempPath, {
        folder_id: opts.folderId ?? null,
        custom_fields,
        tags: opts.tags && opts.tags.length ? JSON.stringify(opts.tags) : null,
      }, { importType: 'move' });

      if (opts.title && file?.id) {
        try { await dbService.updateFile?.(file.id, { name: opts.title }); } catch {}
      }
      return file;
    } catch (e) {
      console.error('[mira_eagle_extension] importFileFromSource 失败:', e);
      if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} }
      return null;
    }
  }

  // ============================== Eagle 协议路由（端口 41595 / 41593） ==============================

  private handleAddFromURLs = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const dbService = this.getTargetDbService();
    const lid = this.config.targetLibraryId;
    if (!dbService) return this.sendJson(res, { status: 'failed', code: 'no target library' });
    try {
      const body = await this.readBody(req);
      const { folderId, items } = body || {};
      if (!Array.isArray(items)) return this.sendJson(res, { status: 'failed', code: 'invalid params' });
      let ok = 0;
      for (const it of items as EagleItem[]) {
        const file = await this.addUrlItem(dbService, it, folderId);
        if (file) { ok++; this.broadcastFileCreated(lid, file); }
      }
      this.sendJson(res, { status: 'success', data: { count: ok } });
    } catch (e) {
      console.error('[mira_eagle_extension] addFromURLs error:', e);
      this.sendJson(res, { status: 'failed', code: 'error' });
    }
  };

  private handleFolderCreate = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const dbService = this.getTargetDbService();
    const lid = this.config.targetLibraryId;
    if (!dbService) return this.sendJson(res, { status: 'failed', code: 'no target library' });
    try {
      const body = await this.readBody(req);
      const { name, parentId, color, icon } = body || {};
      if (!name) return this.sendJson(res, { status: 'failed', code: 'missing name' });
      const id = await dbService.createFolder({
        title: name, parent_id: parentId ?? null, color: color || '', icon: icon || '', sort_index: 0,
      });
      try {
        const wss = this.backend.getWebSocketServer?.();
        wss?.broadcastLibraryEvent?.(lid, 'folder::created', { id, title: name });
      } catch {}
      this.sendJson(res, { status: 'success', data: { id } });
    } catch (e) {
      console.error('[mira_eagle_extension] folderCreate error:', e);
      this.sendJson(res, { status: 'failed', code: 'error' });
    }
  };

  private handleListRecentFolders = async (_req: http.IncomingMessage, res: http.ServerResponse) => {
    const dbService = this.getTargetDbService();
    if (!dbService) return this.sendJson(res, { status: 'failed', code: 'no target library' });
    try {
      const folders = await dbService.getAllFolders();
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

  private handleCapturePush = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const body = await this.readBody(req);
      // 先响应（原版行为：始终返回 Eagle 信息）
      this.sendJson(res, this.getInformation());
      if (!body || !body.type || !this.config.allowedPushTypes.includes(body.type)) return;
      if (!body || !body.type || !this.config.allowedPushTypes.includes(body.type)) return;
      const dbService = this.getTargetDbService();
      const lid = this.config.targetLibraryId;
      if (!dbService) { console.warn('[mira_eagle_extension] 收到扩展推送但未配置目标库'); return; }

      const { metaTags, metaDescription, metaPicture, src, url, title, folderID, base64 } = body;
      const file = await this.importFileFromSource(dbService, {
        base64,
        src: base64 ? undefined : (src || metaPicture),
        url,
        title: title || (url ? undefined : Date.now().toString()),
        folderId: folderID,
        tags: metaTags,
        desc: metaDescription,
      });
      if (file) this.broadcastFileCreated(lid, file);
    } catch (e) {
      console.error('[mira_eagle_extension] capturePush error:', e);
    }
  };

  // ============================== 配置端点（/api/eagle/config，非库级） ==============================

  private registerConfigEndpoints() {
    // 直接挂在 MiraHttpServer.app 上（/api 前缀自动走 token 中间件，保持鉴权）
    const app = this.backend.getHttpServer().app;
    // 单次注册守卫（init 可能被调多次）
    if ((app as any)._eagleConfigRegistered) return;
    (app as any)._eagleConfigRegistered = true;

    app.get('/api/eagle/config', (_req: any, res: any) => {
      try {
        res.json({
          success: true,
          data: {
            targetLibraryId: this.config.targetLibraryId,
            port: this.config.port,
            portCapture: this.config.portCapture,
            running: !!this.server41595?.listening,
          },
        });
      } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
      }
    });

    app.post('/api/eagle/config', async (req: any, res: any) => {
      try {
        const { targetLibraryId } = req.body || {};
        this.config.targetLibraryId = typeof targetLibraryId === 'string' ? targetLibraryId : '';
        const saved = this.saveConfig();
        res.json({ success: saved, data: { targetLibraryId: this.config.targetLibraryId } });
      } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
      }
    });
  }

  // ============================== Dashboard 路由 ==============================

  private registerDashboardRoute() {
    this.routes.push({
      name: 'EagleConfig',
      group: '工具',
      path: '/tools/eagle-extension',
      component: 'components/EagleConfig.js',
      pluginName: this.pluginName,
      meta: { title: 'Eagle 扩展', roles: ['super', 'admin', 'user'] },
    });
  }

  // ============================== 启动两个服务 ==============================

  private start() {
    // --- 端口 41595：Eagle API 协议 ---
    this.server41595 = http.createServer(async (req, res) => {
      if (req.method === 'OPTIONS') return this.sendJson(res, {});
      const url = (req.url || '/').split('?')[0];
      if (req.method === 'GET' && url === '/') return this.sendJson(res, this.getInformation());
      if (req.method === 'POST' && url === '/api/item/addFromURLs') return this.handleAddFromURLs(req, res);
      if (req.method === 'POST' && url === '/api/folder/create') return this.handleFolderCreate(req, res);
      if (req.method === 'GET' && url === '/api/folder/listRecent') return this.handleListRecentFolders(req, res);
      this.sendJson(res, { status: 'failed', code: 'not found' });
    });
    this.server41595.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') console.warn(`[mira_eagle_extension] 端口 ${this.config.port} 已被占用（是否已运行 Eagle？）`);
      else console.error('[mira_eagle_extension] 41595 服务错误:', e);
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
      if (e.code === 'EADDRINUSE') console.warn(`[mira_eagle_extension] 端口 ${this.config.portCapture} 已被占用`);
      else console.error('[mira_eagle_extension] 41593 服务错误:', e);
    });
    this.server41593.listen(this.config.portCapture);
  }

  // ============================== 清理 ==============================

  cleanup() {
    try {
      this.server41595?.close();
      this.server41593?.close();
    } catch {}
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

// ============================== 模块级单例 ==============================
// ServerPluginManager 是 per-library 的：init(inst) 会被每个库各调用一次。
// 借助 require 缓存（仅 reload 时清），模块级变量跨库共享，保证端口只 bind 一次。
let globalServer: MiraEagleExtension | null = null;

export function init(inst: any) {
  if (globalServer) return globalServer;
  globalServer = new MiraEagleExtension(inst);
  return globalServer;
}
