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
  /** 详细调试日志：打印每个收到的请求（method/url/body 摘要） */
  verbose: boolean;
  /** 网络代理（用于下载远端图片，绕过图床防盗链/区域限制） */
  proxy: {
    enabled: boolean;
    url: string; // 形如 http://127.0.0.1:7890 或 socks5://127.0.0.1:1080
    /** 仅对清单内站点走代理（匹配图片下载 URL 的 host）。
     *  支持通配符 *.example.com；以 ! 开头表示排除。
     *  空数组 = 对所有站点走代理。 */
    sites: string[];
  };
  /** Image Max URL：下载前尝试把缩略图 URL 升级为原图 */
  imu: {
    enabled: boolean;
    /** 升级超时（毫秒） */
    timeout: number;
    /** 最大迭代次数（IMU 内部） */
    iterations: number;
  };
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
  /** 缓存的代理 agent（key 为 proxy.url，避免每次下载重建连接池） */
  private proxyAgent: any = null;
  private proxyAgentKey = '';
  /** Image Max URL 模块（懒加载；null 表示未加载/不可用） */
  private imuModule: any = null;
  private imuLoadAttempted = false;

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
    // 兼容旧配置里的 "data/temp"（getPluginDataDir 已含 data/，避免拼成 data/data/temp）
    const tempRel = this.config.tempDir.replace(/^data[\\/]/, '');
    this.tempDir = path.isAbsolute(this.config.tempDir)
      ? this.config.tempDir
      : path.join(this.getPluginDataDir(), tempRel);
    fs.mkdirSync(this.tempDir, { recursive: true });

    this.registerDashboardRoute();
    this.registerConfigEndpoints();
    this.start();

    console.log(
      `[mira_eagle_extension] 全局单例已启动，端口 ${this.config.port} / ${this.config.portCapture}` +
      (this.config.targetLibraryId ? `，目标库 ${this.config.targetLibraryId}` : '，⚠️ 尚未选择目标库，请到配置页 /tools/eagle-extension 选择')
    );
    // 启动时立即探测 IMU 模块状态（给用户明确反馈）
    this.reportImuStatus();
  }

  /** 启动时打印 IMU 模块状态，便于确认 maxurl.user.js 是否被识别 */
  private reportImuStatus() {
    if (!this.config.imu?.enabled) {
      console.log('[mira_eagle_extension] IMU：已禁用');
      return;
    }
    const candidates = [
      this.pluginManager.getPluginDir ? path.join(this.pluginManager.getPluginDir(this.pluginName), 'maxurl.user.js') : '',
      path.join(__dirname, 'maxurl.user.js'),
      path.join(__dirname, '..', 'maxurl.user.js'),
      path.join(this.getPluginDataDir(), '..', 'maxurl.user.js'),
    ].filter(Boolean);
    const found = candidates.find(c => fs.existsSync(c));
    if (!found) {
      console.warn('[mira_eagle_extension] IMU：未找到 maxurl.user.js（原图升级不可用）。请把 Image Max URL 的 userscript.user.js 放到插件目录并重命名为 maxurl.user.js');
      console.warn('[mira_eagle_extension] IMU：查找位置：' + candidates.join(' ; '));
      return;
    }
    console.log(`[mira_eagle_extension] IMU：已发现模块 ${path.basename(found)}（${(fs.statSync(found).size / 1024 / 1024).toFixed(2)} MB），首次升级时加载`);
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
      tempDir: 'temp',
      allowedPushTypes: ['image', 'screen capture', 'save-url'],
      targetLibraryId: '',
      verbose: true,
      proxy: { enabled: false, url: '', sites: [] },
      imu: { enabled: true, timeout: 15000, iterations: 200 },
    };
    try {
      const file = this.getConfigPath();
      if (fs.existsSync(file)) {
        const saved = JSON.parse(fs.readFileSync(file, 'utf-8'));
        // 合并 proxy / imu，保证旧配置（无新字段）也有默认值
        const merged = { ...defaultConfig, ...saved };
        merged.proxy = { ...defaultConfig.proxy, ...(saved.proxy || {}) };
        if (!Array.isArray(merged.proxy.sites)) merged.proxy.sites = [];
        merged.imu = { ...defaultConfig.imu, ...(saved.imu || {}) };
        return merged;
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

  /** 41593 GET / 响应体（扁平结构，键名 appVersion）。对齐 Eagle 4.x 协议。 */
  private getInformation() {
    return {
      appVersion: '4.0.0',
      showCollectModal: false,
      platform: process.platform,
      preferences: {
        general: { language: 'zh_CN', showMenuItem: 'true', showSidebarBadge: 'true' },
        developer: { apiToken: this.config.apiToken },
      },
    };
  }

  /** 41595 GET / 响应体（包裹在 {status, data}，且用 version 键）。对齐 Eagle 4.x 协议。 */
  private getApiInfo() {
    return {
      status: 'success',
      data: {
        version: '4.0.0',
        prereleaseVersion: null,
        buildVersion: '20231101',
        showCollectModal: false,
        platform: process.platform,
        preferences: {
          general: { language: 'zh_CN', showMenuItem: 'true', showSidebarBadge: 'true' },
          developer: { apiToken: this.config.apiToken },
        },
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

  /** 把任意 body 压缩成可打印的摘要（base64/大字符串截断，保留结构） */
  private summarizeBody(body: any): any {
    if (body == null) return body;
    if (typeof body !== 'object') return body;
    const out: any = {};
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' && v.length > 120) {
        out[k] = `<string len=${v.length}> ${v.slice(0, 80)}…`;
      } else if (Array.isArray(v)) {
        out[k] = `[Array len=${v.length}]` + (v.length && typeof v[0] === 'object' ? '' : '');
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  /** 详细调试日志：打印每个进入的 HTTP 请求 */
  private logRequest(tag: string, req: http.IncomingMessage, extra?: any) {
    if (!this.config.verbose) return;
    const url = (req.url || '/');
    const origin = req.headers.origin || req.headers.referer || '-';
    const ct = req.headers['content-type'] || '-';
    const len = req.headers['content-length'] || '-';
    console.log(
      `[mira_eagle_extension:${tag}] ← ${req.method} ${url} | origin=${origin} | ct=${ct} | len=${len}` +
      (extra ? ' | ' + JSON.stringify(this.summarizeBody(extra)) : '')
    );
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
            const eq = pair.indexOf('=');
            if (eq < 0) continue;
            // urlencoded 中空格编码为 '+'，decodeURIComponent 不会处理它，需先替换
            const k = pair.slice(0, eq);
            const v = pair.slice(eq + 1);
            obj[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
          }
          return resolve(obj);
        }
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      });
      req.on('error', () => resolve(null));
    });
  }

  /**
   * 判断某个 host 是否应走代理。
   * 规则（对照 config.proxy.sites，支持通配符与排除）：
   *  - 空清单 → 所有站点都走代理
   *  - 形如 *.example.com → 匹配 example.com 及其任意子域
   *  - 形如 example.com  → 精确匹配或 *.example.com 子域
   *  - 形如 !example.com  → 排除（排除优先于包含）
   */
  private shouldProxy(host: string, sites: string[]): boolean {
    if (!Array.isArray(sites) || sites.length === 0) return true; // 空清单 = 全部走代理
    const h = host.toLowerCase();
    const excludes = sites.filter(s => s.trim().startsWith('!')).map(s => s.trim().slice(1).toLowerCase());
    const includes = sites.filter(s => !s.trim().startsWith('!')).map(s => s.trim().toLowerCase());

    const matchOne = (rule: string): boolean => {
      if (!rule) return false;
      if (rule.startsWith('*.')) {
        const base = rule.slice(2); // *.example.com -> example.com
        return h === base || h.endsWith('.' + base);
      }
      // 精确或子域：example.com 匹配 example.com / x.example.com
      return h === rule || h.endsWith('.' + rule);
    };
    // 排除优先
    if (excludes.some(matchOne)) return false;
    return includes.some(matchOne);
  }

  /**
   * 根据 config.proxy 构造（并缓存）HTTP(S)/SOCKS 代理 agent。
   * 返回 null 表示不走代理。
   * targetUrl 用于按 config.proxy.sites 判断是否对该站点启用代理。
   * 代理模块来自 pluginsDir/node_modules（http-proxy-agent / https-proxy-agent / socks-proxy-agent）。
   */
  private getHttpAgent(targetIsHttps: boolean, targetUrl: string): any {
    const { enabled, url, sites } = this.config.proxy || {};
    if (!enabled || !url) {
      this.proxyAgent = null;
      this.proxyAgentKey = '';
      return null;
    }
    // 仅对清单内站点走代理
    let host = '';
    try { host = new URL(targetUrl).host; } catch {}
    if (host && !this.shouldProxy(host, sites || [])) {
      if (this.config.verbose) console.log(`[mira_eagle_extension] ${host} 不在代理清单，直连`);
      return null;
    }
    // 缓存：同一 url 复用 agent（连接池）
    const key = url + '|' + (targetIsHttps ? 'https' : 'http');
    if (this.proxyAgent && this.proxyAgentKey === key) return this.proxyAgent;
    try {
      // 代理模块位于 ServerPluginManager 的 pluginsDir/node_modules（本插件经软链接加载，
      // 其物理目录的 node_modules 里没有这些包）。按多级 fallback 解析模块路径。
      const pluginsDir = this.pluginManager.pluginsDir;
      const resolve = (name: string): any => {
        // 1) 常规解析
        try { return require(name); } catch {}
        // 2) 直接 require 绝对路径：pluginsDir/node_modules/<name>
        if (pluginsDir) {
          const abs = path.join(pluginsDir, 'node_modules', name);
          try { return require(abs); } catch {}
        }
        // 3) 从本插件目录向上逐层查找 node_modules
        let dir: string | undefined = __dirname;
        for (let i = 0; i < 8 && dir; i++) {
          const abs = path.join(dir, 'node_modules', name);
          try { return require(abs); } catch {}
          const parent = path.dirname(dir);
          if (parent === dir) break;
          dir = parent;
        }
        throw new Error(`cannot resolve module ${name}`);
      };

      let agent: any = null;
      if (url.startsWith('socks')) {
        // socks5:// / socks4:// 同时覆盖 http 与 https 目标
        const { SocksProxyAgent } = resolve('socks-proxy-agent');
        agent = new SocksProxyAgent(url);
      } else if (url.startsWith('http')) {
        const HttpAgent = resolve('http-proxy-agent');
        const HttpsAgent = resolve('https-proxy-agent');
        agent = targetIsHttps ? new HttpsAgent(url) : new HttpAgent(url);
      } else {
        console.warn(`[mira_eagle_extension] 不支持的代理协议: ${url}`);
        return null;
      }
      this.proxyAgent = agent;
      this.proxyAgentKey = key;
      if (this.config.verbose) console.log(`[mira_eagle_extension] 使用代理 ${url}（目标 ${targetIsHttps ? 'https' : 'http'}）`);
      return agent;
    } catch (e) {
      console.error('[mira_eagle_extension] 创建代理 agent 失败:', e);
      console.error('[mira_eagle_extension] 提示：请确认插件 node_modules 下已安装 http-proxy-agent / https-proxy-agent / socks-proxy-agent');
      return null;
    }
  }

  /**
   * 下载远端图片到临时文件。
   * 关键：必须带浏览器风格的 User-Agent / Referer / Accept，
   * 否则 pinterest、微博、小红书等图床会直接返回 403/空白。
   * 若 config.proxy.enabled，则通过代理下载。
   */
  private downloadToFile(url: string, dest: string, referer?: string): Promise<string | null> {
    return new Promise(resolve => {
      const targetIsHttps = url.startsWith('https');
      const lib = targetIsHttps ? require('https') : require('http');
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      };
      if (referer) headers['Referer'] = referer;
      const agent = this.getHttpAgent(targetIsHttps, url);
      const reqOpts: any = { headers };
      if (agent) reqOpts.agent = agent;
      const req = lib.get(url, reqOpts, (resp: http.IncomingMessage) => {
        if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          // 跟随重定向，保持 Referer
          return resolve(this.downloadToFile(resp.headers.location, dest, referer || url));
        }
        if (resp.statusCode !== 200) {
          if (this.config.verbose) console.warn(`[mira_eagle_extension] 下载返回 HTTP ${resp.statusCode}: ${url}`);
          resp.resume();
          return resolve(null);
        }
        const stream = fs.createWriteStream(dest);
        resp.pipe(stream);
        stream.on('finish', () => stream.close(() => resolve(dest)));
        stream.on('error', () => { try { fs.unlinkSync(dest); } catch {} resolve(null); });
      });
      req.on('error', (e: Error) => {
        if (this.config.verbose) console.warn(`[mira_eagle_extension] 下载网络错误: ${url}`, e.message);
        resolve(null);
      });
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

  /** 把标题转成安全的文件名（去除非法字符 / 控制长度 / 去除扩展名部分）。失败返回 null。 */
  private safeFilename(title?: string): string | null {
    if (!title) return null;
    let base = String(title).trim();
    if (!base) return null;
    // 去掉文件系统非法字符与路径分隔符
    base = base.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
    // 若标题自带扩展名，去掉（下方会统一补）
    base = base.replace(/\.[a-zA-Z0-9]{1,5}$/, '');
    base = base.replace(/^\.+|\.+$/g, '').trim();
    if (!base) return null;
    // 控制长度，避免超长文件名
    if (base.length > 80) base = base.slice(0, 80).trim();
    return base;
  }

  /**
   * 把临时文件改名为 "标题.扩展名"，使落盘文件名可读。
   * 返回新路径；标题为空或改名失败时返回原路径。
   */
  private renameTempToTitle(tempPath: string, title?: string): string | null {
    const safe = this.safeFilename(title);
    if (!safe) return tempPath;
    try {
      const ext = path.extname(tempPath); // 含点，如 .jpg
      const dir = path.dirname(tempPath);
      let dest = path.join(dir, safe + (ext || '.jpg'));
      // 避免临时目录内重名
      let i = 1;
      while (fs.existsSync(dest) && dest !== tempPath) {
        dest = path.join(dir, `${safe}_${i}${ext || '.jpg'}`);
        i++;
      }
      if (dest === tempPath) return tempPath;
      fs.renameSync(tempPath, dest);
      if (this.config.verbose) console.log(`[mira_eagle_extension] 重命名临时文件: ${path.basename(tempPath)} -> ${path.basename(dest)}`);
      return dest;
    } catch (e) {
      console.warn('[mira_eagle_extension] 重命名临时文件失败，沿用原名:', e);
      return tempPath;
    }
  }

  // ============================== Image Max URL（缩略图 → 原图） ==============================

  /**
   * 懒加载 Image Max URL 模块（maxurl.user.js，需放在插件根目录）。
   * 失败/未启用返回 null。模块只在首次调用时 require，之后缓存。
   */
  private loadImu(): any {
    if (this.imuLoadAttempted) return this.imuModule;
    this.imuLoadAttempted = true;
    if (!this.config.imu?.enabled) {
      if (this.config.verbose) console.log('[mira_eagle_extension] IMU 已禁用，跳过原图升级');
      return null;
    }
    // maxurl.user.js 位于插件根目录。优先用 pluginManager.getPluginDir（权威路径，
    // 兼容 dist/ 编译加载与 src/ ts-node 加载），再回退 __dirname 与 data 父目录。
    const candidates = [
      this.pluginManager.getPluginDir ? path.join(this.pluginManager.getPluginDir(this.pluginName), 'maxurl.user.js') : '',
      path.join(__dirname, 'maxurl.user.js'),
      path.join(__dirname, '..', 'maxurl.user.js'), // dist/ 编译产物情况
      path.join(this.getPluginDataDir(), '..', 'maxurl.user.js'),
    ].filter(Boolean);
    let imuPath = '';
    for (const c of candidates) {
      if (fs.existsSync(c)) { imuPath = c; break; }
    }
    if (!imuPath) {
      console.warn('[mira_eagle_extension] 未找到 maxurl.user.js，跳过原图升级。请把 Image Max URL 的 userscript.user.js 放到插件目录并重命名为 maxurl.user.js');
      return null;
    }
    try {
      this.imuModule = require(imuPath);
      if (this.config.verbose) console.log(`[mira_eagle_extension] IMU 模块已加载: ${path.basename(imuPath)}`);
      return this.imuModule;
    } catch (e) {
      console.error('[mira_eagle_extension] 加载 IMU 模块失败:', e);
      return null;
    }
  }

  /** IMU 需要的 do_request（类 GM_xmlhttpRequest），走代理（若启用） */
  private imuDoRequest(options: any): void {
    const targetIsHttps = (options.url || '').startsWith('https');
    const lib = targetIsHttps ? require('https') : require('http');
    const headers: Record<string, string> = {};
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        if (v === null || v === '') continue;
        headers[k] = String(v);
      }
    }
    if (!headers['User-Agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
    const agent = this.getHttpAgent(targetIsHttps, options.url);
    const reqOpts: any = { method: options.method || 'GET', headers };
    if (agent) reqOpts.agent = agent;
    let url: string;
    try { url = options.url; } catch { if (options.onload) options.onload({ readyState: 4, status: 0, responseText: '', finalUrl: options.url }); return; }

    const req = lib.request(url, reqOpts, (resp: http.IncomingMessage) => {
      const chunks: Buffer[] = [];
      resp.on('data', (c: Buffer) => chunks.push(c));
      resp.on('end', () => {
        const buf = Buffer.concat(chunks);
        const body = buf.toString('utf8');
        if (options.onload) {
          options.onload({
            readyState: 4,
            status: resp.statusCode || 0,
            statusText: resp.statusMessage || '',
            responseText: body,
            finalUrl: url,
          });
        }
      });
    });
    req.on('error', (e: Error) => {
      if (options.onload) options.onload({ readyState: 4, status: 0, responseText: '', finalUrl: url });
    });
    req.setTimeout(this.config.imu?.timeout || 15000, () => { req.destroy(); });
    if (options.data && (options.method || '').toUpperCase() === 'POST') req.write(options.data);
    req.end();
  }

  /**
   * 用 IMU 尝试把缩略图 URL 升级为原图 URL。
   * 返回候选 URL 数组（已按优先级排序：is_original 优先，去重，去 bad/fake/video）。
   * 第一个元素总是原 url（保底）。找不到/出错/超时则返回 [url]。
   */
  private upgradeImageUrlCandidates(url: string): Promise<string[]> {
    const imu = this.loadImu();
    if (!imu) return Promise.resolve([url]);
    return new Promise(resolve => {
      let settled = false;
      const done = (urls: string[]) => { if (!settled) { settled = true; resolve(urls); } };
      const to = setTimeout(() => {
        if (this.config.verbose) console.warn(`[mira_eagle_extension] IMU 升级超时，沿用原 URL: ${url}`);
        done([url]);
      }, this.config.imu?.timeout || 15000);

      try {
        imu(url, {
          fill_object: true,
          iterations: this.config.imu?.iterations || 200,
          use_cache: true,
          exclude_videos: true,
          filter: (u: string) => { try { return imu.is_internet_url ? imu.is_internet_url(u) : /^https?:\/\//.test(u); } catch { return true; } },
          do_request: (opts: any) => this.imuDoRequest(opts),
          cb: (result: any[]) => {
            clearTimeout(to);
            if (!result || !result.length) return done([url]);
            // 收集所有可用候选，is_original 优先；去重、去 bad/fake/video
            const seen = new Set<string>();
            const ordered: { url: string; original: boolean }[] = [];
            for (const r of result) {
              if (!r || !r.url || r.bad || r.fake || r.video) continue;
              if (r.url === url || seen.has(r.url)) continue;
              seen.add(r.url);
              ordered.push({ url: r.url, original: !!r.is_original });
            }
            ordered.sort((a, b) => Number(b.original) - Number(a.original));
            const candidates = ordered.map(o => o.url);
            if (this.config.verbose && candidates.length) {
              console.log(`[mira_eagle_extension] IMU 升级候选 (${candidates.length}): ${url} -> ${candidates.join(', ')}`);
            }
            // 优先尝试升级候选（大的在前），原 url 放最后作保底——
            // 因为原 url 通常是缩略图，总能下成功，但质量最差，应最后才用
            done([...candidates, url]);
          },
        });
      } catch (e) {
        clearTimeout(to);
        console.warn('[mira_eagle_extension] IMU 调用异常:', e);
        done([url]);
      }
    });
  }

  /** 兼容旧调用：返回单个升级 URL（第一个候选） */
  private async upgradeImageUrl(url: string): Promise<string> {
    const candidates = await this.upgradeImageUrlCandidates(url);
    return candidates.length > 1 ? candidates[1] : candidates[0];
  }

  // ============================== 落库（用目标库） ==============================

  private broadcastFileCreated(targetLibraryId: string, file: Record<string, any>) {
    try {
      const wss = this.backend.getWebSocketServer?.();
      // 关键：客户端的标签页刷新（shouldUpdateForEvent）按 eventData.libraryId 匹配当前库，
      // 必须把 libraryId 合并进 data，否则事件被静默丢弃、列表不刷新。
      // 对齐 LibraryWatcher.ts:282 的有效广播格式 { ...result, libraryId }。
      wss?.broadcastLibraryEvent?.(targetLibraryId, 'file::created', {
        ...file,
        libraryId: targetLibraryId,
      });
      wss?.broadcastPluginEvent?.('file::created', {
        message: { type: 'file', action: 'create' },
        result: file,
        libraryId: targetLibraryId,
      });
    } catch (e) {
      console.warn('[mira_eagle_extension] 广播 file::created 失败:', e);
    }
  }

  private async addUrlItem(dbService: any, item: EagleItem, folderId?: number): Promise<Record<string, any> | null> {
    try {
      const now = Date.now();
      // 先用 IMU 把缩略图 URL 升级为原图（若启用且模块可用）
      const refUrl = await this.upgradeImageUrl(item.url);
      const custom_fields: Record<string, any> = { url: item.website || item.url };
      if (refUrl !== item.url) custom_fields.originalUrl = refUrl;
      if (item.tags && item.tags.length) custom_fields.tags = item.tags;
      if (item.description) custom_fields.desc = item.description;

      let name = item.name;
      if (!name) {
        try { name = path.basename(new URL(refUrl).pathname); } catch { name = `${now}.png`; }
      }

      const file = await dbService.createFile({
        name,
        created_at: item.modificationTime || now,
        imported_at: now,
        size: 0,
        hash: '',
        reference: refUrl,
        path: refUrl,
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
    referer?: string;
    title?: string;
    folderId?: number;
    tags?: string[];
    desc?: string;
    /** 下载/base64 都失败时，用此 URL 建一个 URL 引用文件（仍可在库中显示） */
    fallbackRefUrl?: string;
  }): Promise<Record<string, any> | null> {
    let tempPath: string | null = null;
    const custom_fields: Record<string, any> = {};
    if (opts.url) custom_fields.url = opts.url;
    if (opts.desc) custom_fields.desc = opts.desc;

    // 尝试 1：优先用 src（远端原图）下载，因为 base64 通常是缩略图质量。
    // Eagle 的 image 类型常同时带 base64（当前可见图）和 src（原图 URL），
    // 此时优先 IMU 升级 src → 按候选逐个下载原图；全失败再用 base64 兜底。
    try {
      if (opts.src) {
        // IMU 返回候选列表（第一个是原 src 保底，其余是升级候选，原图优先）
        const candidates = await this.upgradeImageUrlCandidates(opts.src);
        for (let i = 0; i < candidates.length; i++) {
          const candUrl = candidates[i];
          const ext = this.guessExtFromUrl(candUrl);
          const tryPath = path.join(this.tempDir, `${crypto.randomBytes(8).toString('hex')}.${ext}`);
          if (this.config.verbose) console.log(`[mira_eagle_extension] 下载候选 ${i + 1}/${candidates.length}: ${candUrl} -> ${tryPath}`);
          const downloaded = await this.downloadToFile(candUrl, tryPath, opts.referer);
          if (downloaded) {
            tempPath = tryPath;
            if (this.config.verbose) console.log(`[mira_eagle_extension] 下载完成 ${fs.statSync(tempPath).size} bytes`);
            break;
          }
          // 此候选失败（如 403），清理临时文件，继续下一个候选
          try { fs.unlinkSync(tryPath); } catch {}
        }
        if (!tempPath) {
          console.warn(`[mira_eagle_extension] 所有 ${candidates.length} 个候选下载均失败` + (opts.base64 ? '，回退用 base64' : ''));
        }
      }
      // src 下载失败或无 src 时，用 base64
      if (!tempPath && opts.base64) {
        tempPath = this.base64ToTempFile(opts.base64);
        if (this.config.verbose) console.log(`[mira_eagle_extension] base64 解码 -> ${tempPath}`);
        if (!tempPath) throw new Error('base64 解码失败');
      }
      if (!tempPath) {
        throw new Error('无 base64 也无 src，或下载均失败');
      }

      // 用页面标题重命名临时文件，使落盘文件名 / DB name / 前端显示三者一致。
      // 关键：name 字段同时是磁盘文件名（getItemFilePath / SMB 插件按 folder+name 拼路径），
      // 不能事后用 updateFile 改成标题（否则磁盘文件名不变，拖拽 data-file 路径失效）。
      // 所以在 createFileFromPath 前就把临时文件改名为 "标题.扩展名"。
      const titledTemp = this.renameTempToTitle(tempPath, opts.title);
      if (titledTemp && titledTemp !== tempPath) tempPath = titledTemp;

      const file = await dbService.createFileFromPath(tempPath, {
        folder_id: opts.folderId ?? null,
        custom_fields,
        tags: opts.tags && opts.tags.length ? JSON.stringify(opts.tags) : null,
      }, { importType: 'move' });
      if (this.config.verbose) console.log(`[mira_eagle_extension] createFileFromPath 结果:`, file?.id, file?.duplicate ? '(duplicate)' : '');

      return file;
    } catch (e) {
      console.warn('[mira_eagle_extension] importFileFromSource 落盘失败:', e instanceof Error ? e.message : e);
      if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} }
    }

    // 尝试 2：下载/解码都失败时，回退为 URL 引用文件（reference/path 存远端 URL）
    if (opts.fallbackRefUrl) {
      try {
        if (this.config.verbose) console.log(`[mira_eagle_extension] 回退为 URL 引用文件: ${opts.fallbackRefUrl}`);
        // name 用 URL 文件名（URL 引用文件无磁盘路径，name 仅作显示/标识）
        let name = '';
        try { name = path.basename(new URL(opts.fallbackRefUrl).pathname); } catch {}
        if (!name) name = `${Date.now()}.jpg`;
        // 显示标题写入 custom_fields.title（与主路径保持一致）
        const fbCf = { ...(custom_fields || {}), title: opts.title || name };
        const file = await dbService.createFile({
          name,
          created_at: Date.now(),
          imported_at: Date.now(),
          size: 0,
          hash: '',
          reference: opts.fallbackRefUrl,
          path: opts.fallbackRefUrl,
          folder_id: opts.folderId ?? null,
          custom_fields: fbCf,
          tags: opts.tags && opts.tags.length ? JSON.stringify(opts.tags) : null,
        });
        return { ...file, _urlFallback: true };
      } catch (e2) {
        console.error('[mira_eagle_extension] URL 回退也失败:', e2);
      }
    }
    return null;
  }

  // ============================== Eagle 协议路由（端口 41595 / 41593） ==============================

  private handleAddFromURLs = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const dbService = this.getTargetDbService();
    const lid = this.config.targetLibraryId;
    if (!dbService) {
      this.logRequest('41595:addFromURLs', req, { rejected: 'no target library', targetLibraryId: lid });
      return this.sendJson(res, { status: 'failed', code: 'no target library' });
    }
    try {
      const body = await this.readBody(req);
      this.logRequest('41595:addFromURLs', req, body);
      const { folderId, items } = body || {};
      if (!Array.isArray(items)) return this.sendJson(res, { status: 'failed', code: 'invalid params' });
      let ok = 0;
      for (const it of items as EagleItem[]) {
        const file = await this.addUrlItem(dbService, it, folderId);
        if (file) { ok++; this.broadcastFileCreated(lid, file); }
      }
      if (this.config.verbose) console.log(`[mira_eagle_extension:41595] addFromURLs 导入 ${ok}/${items.length}`);
      // 对齐 Eagle 协议：成功仅返回 {status:"success"}
      this.sendJson(res, { status: 'success' });
    } catch (e) {
      console.error('[mira_eagle_extension] addFromURLs error:', e);
      this.sendJson(res, { status: 'failed', code: 'error' });
    }
  };

  private handleFolderCreate = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const dbService = this.getTargetDbService();
    const lid = this.config.targetLibraryId;
    if (!dbService) {
      this.logRequest('41595:folderCreate', req, { rejected: 'no target library', targetLibraryId: lid });
      return this.sendJson(res, { status: 'failed', code: 'no target library' });
    }
    try {
      const body = await this.readBody(req);
      this.logRequest('41595:folderCreate', req, body);
      // Eagle 扩展用 folderName；兼容旧字段 name
      const folderName = body?.folderName ?? body?.name;
      const parentId = body?.parentId ?? body?.parentID;
      const { color, icon } = body || {};
      if (!folderName) return this.sendJson(res, { status: 'failed', code: 'missing folderName' });
      const id = await dbService.createFolder({
        title: folderName, parent_id: parentId ?? null, color: color || '', icon: icon || '', sort_index: 0,
      });
      try {
        const wss = this.backend.getWebSocketServer?.();
        // 客户端 folder::created 处理按 data.libraryId 刷新文件夹列表，必须带上
        wss?.broadcastLibraryEvent?.(lid, 'folder::created', { id, title: folderName, libraryId: lid });
      } catch {}
      // 对齐 Eagle 协议响应
      this.sendJson(res, { status: 'success', data: { id, name: folderName, images: [], folders: [] } });
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
      // 详细打印收到的推送内容（base64 等大字段会被截断）
      this.logRequest('41593:push', req, body);

      // 先响应（原版行为：始终返回 Eagle 信息）
      this.sendJson(res, this.getInformation());

      if (!body) {
        if (this.config.verbose) console.log('[mira_eagle_extension:41593] body 为空，忽略');
        return;
      }
      if (!body.type) {
        if (this.config.verbose) console.log('[mira_eagle_extension:41593] body 缺少 type 字段，忽略。body keys =', Object.keys(body));
        return;
      }
      if (!this.config.allowedPushTypes.includes(body.type)) {
        if (this.config.verbose) console.log(`[mira_eagle_extension:41593] type="${body.type}" 不在白名单 ${JSON.stringify(this.config.allowedPushTypes)}，忽略`);
        return;
      }
      if (this.config.verbose) console.log(`[mira_eagle_extension:41593] 接受推送 type="${body.type}"`);

      const dbService = this.getTargetDbService();
      const lid = this.config.targetLibraryId;
      if (!dbService) {
        console.warn(`[mira_eagle_extension:41593] 收到推送但无法解析目标库 (targetLibraryId="${lid}")，已丢弃`);
        return;
      }

      const { metaTags, metaDescription, metaPicture, src, url, title, folderID, base64 } = body;
      const hasBase64 = !!(base64 && String(base64).length);
      const hasSrc = !!(src || metaPicture);
      if (this.config.verbose) {
        console.log(`[mira_eagle_extension:41593] 来源: base64=${hasBase64}${hasBase64 ? '(len=' + String(base64).length + ')' : ''} src=${src || '-'} metaPicture=${metaPicture || '-'} url=${url || '-'} folderID=${folderID ?? '-'}`);
      }
      const file = await this.importFileFromSource(dbService, {
        base64,
        // 同时传 src 和 base64：importFileFromSource 会优先 IMU 升级 src 下载原图，
        // 失败再用 base64 兜底（src 是原图 URL，base64 通常是缩略图质量）。
        src: src || metaPicture,
        url,
        // 用页面 url 作 Referer，pinterest/微博/小红书等图床防盗链需要
        referer: url,
        title: title || (url ? undefined : Date.now().toString()),
        folderId: folderID,
        tags: metaTags,
        desc: metaDescription,
        // 下载失败时回退为 URL 引用文件（仍可在库中显示）
        fallbackRefUrl: src || metaPicture || url,
      });
      if (file) {
        console.log(`[mira_eagle_extension:41593] ✅ 已导入 file id=${file.id} 到库 ${lid}${file._urlFallback ? '（URL 引用，下载失败回退）' : ''}`);
        this.broadcastFileCreated(lid, file);
      } else {
        console.warn(`[mira_eagle_extension:41593] ❌ 导入失败（无可用图片来源）`);
      }
    } catch (e) {
      console.error('[mira_eagle_extension:41593] capturePush error:', e);
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
            proxy: {
              enabled: !!this.config.proxy?.enabled,
              url: this.config.proxy?.url || '',
              sites: Array.isArray(this.config.proxy?.sites) ? this.config.proxy.sites : [],
            },
            imu: {
              enabled: !!this.config.imu?.enabled,
              timeout: this.config.imu?.timeout ?? 15000,
              iterations: this.config.imu?.iterations ?? 200,
            },
          },
        });
      } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
      }
    });

    app.post('/api/eagle/config', async (req: any, res: any) => {
      try {
        const body = req.body || {};
        if (typeof body.targetLibraryId === 'string') {
          this.config.targetLibraryId = body.targetLibraryId;
        }
        if (body.proxy && typeof body.proxy === 'object') {
          const sites = Array.isArray(body.proxy.sites)
            ? body.proxy.sites.map((s: any) => String(s).trim()).filter((s: string) => s)
            : [];
          this.config.proxy = {
            enabled: !!body.proxy.enabled,
            url: typeof body.proxy.url === 'string' ? body.proxy.url.trim() : '',
            sites,
          };
          // 代理变更后让缓存的 agent 失效，下次下载重建
          this.proxyAgent = null;
          this.proxyAgentKey = '';
        }
        if (body.imu && typeof body.imu === 'object') {
          this.config.imu = {
            enabled: !!body.imu.enabled,
            timeout: Number(body.imu.timeout) > 0 ? Number(body.imu.timeout) : 15000,
            iterations: Number(body.imu.iterations) > 0 ? Number(body.imu.iterations) : 200,
          };
          // imu.enabled 变更后重置加载状态，以便重新尝试加载模块
          this.imuLoadAttempted = false;
          this.imuModule = null;
        }
        const saved = this.saveConfig();
        res.json({
          success: saved,
          data: {
            targetLibraryId: this.config.targetLibraryId,
            proxy: this.config.proxy,
            imu: this.config.imu,
          },
        });
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
      this.logRequest('41595', req);
      if (req.method === 'OPTIONS') return this.sendJson(res, {});
      const url = (req.url || '/').split('?')[0];
      if (req.method === 'GET' && url === '/') return this.sendJson(res, this.getApiInfo());
      if (req.method === 'POST' && url === '/api/item/addFromURLs') return this.handleAddFromURLs(req, res);
      if (req.method === 'POST' && url === '/api/folder/create') return this.handleFolderCreate(req, res);
      if (req.method === 'GET' && url === '/api/folder/listRecent') return this.handleListRecentFolders(req, res);
      if (this.config.verbose) console.log(`[mira_eagle_extension:41595] 未匹配路由 ${req.method} ${url}`);
      this.sendJson(res, { status: 'failed', code: 'not found' });
    });
    this.server41595.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') console.warn(`[mira_eagle_extension] 端口 ${this.config.port} 已被占用（是否已运行 Eagle？）`);
      else console.error('[mira_eagle_extension] 41595 服务错误:', e);
    });
    this.server41595.listen(this.config.port);

    // --- 端口 41593：截图 / 图片 / save-url 推送 ---
    this.server41593 = http.createServer(async (req, res) => {
      this.logRequest('41593', req);
      if (req.method === 'OPTIONS') return this.sendJson(res, {});
      const url = (req.url || '/').split('?')[0];
      if (req.method === 'GET' && url === '/') return this.sendJson(res, this.getInformation());
      if (req.method === 'GET' && url === '/exit') {
        this.sendJson(res, { status: 'success' });
        return process.exit(0);
      }
      if (req.method === 'POST' && url === '/') return this.handleCapturePush(req, res);
      if (this.config.verbose) console.log(`[mira_eagle_extension:41593] 未匹配路由 ${req.method} ${url}`);
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
