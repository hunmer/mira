/**
 * 语义搜索插件 - 服务端部分
 *
 * 基于 Ollama embedding 模型（默认 embeddinggemma-2）为素材建立向量索引，
 * 支持自然语言语义检索与「以图搜图」（视觉模型打标方案）。
 *
 * 职责：
 *   1. GET  /api/semantic-search/settings   读取配置（apiUrl / model / dim / vecIndex / vision）
 *   2. POST /api/semantic-search/settings   保存配置
 *   3. POST /api/semantic-search/test       测试 Ollama 连通性（可选 vision: true 测视觉模型）
 *   4. GET  /api/semantic-search/status     索引状态（总数/已索引/任务进度/vec/视觉）
 *   5. POST /api/semantic-search/index      启动/续跑后台索引（body: { force? } 全量重建）
 *   6. POST /api/semantic-search/stop       停止索引任务
 *   7. POST /api/semantic-search/search     文本语义搜索（body: { query, topK? }）
 *   8. POST /api/semantic-search/search-image  以图搜图（body: { fileId } 或 { imageBase64, topK? }）
 *
 * 以图搜图原理：Ollama /api/embed 仅支持文本（官方 openapi.yaml 无 images 字段），
 * 故配置视觉模型（visionModel，需支持图像输入，如 gemma3:4b）：
 *   索引时  图片 → /api/chat(images) 生成中文描述 → 描述文本 embeddinggemma-2 嵌入 → image_embedding 列
 *   搜索时  查询图 → 同样打标 → 嵌入 → 与 image_embedding（及 text embedding，取 max）比相似度
 * 文本与图像向量同处一个嵌入空间，文本搜索同样融合图像向量（每文件取最高分）。
 *
 * 自动增量同步：订阅库 eventManager 的 file::created/updated/deleted 事件，
 * 去抖后批量重嵌入变更素材、清理已删素材（仅当索引非空时生效）。
 *
 * 向量存储：semantic_search_index 表（file_id 主键，BLOB 存 Float32：
 * embedding=文本向量，image_embedding=图像描述向量，image_hash=图片内容 sha1 用于增量）
 * + 可选 vec0 虚拟表 ×2（sqlite-vec KNN 加速，失败自动回退内存扫描）。
 *
 * 索引文本按 EmbeddingGemma 2 规范加前缀：
 *   文档: "title: {标题} | text: {内容}"，查询: "task: search result | query: {query}"
 * 支持 Matryoshka 维度截断（768/512/256/128）：优先 Ollama dimensions 参数，本地截断兜底。
 *
 * 不依赖 mira 包，全部能力经 inst 注入（见 docs/server-plugin-development.md）。
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const PLUGIN_NAME = 'mira_semantic_search';
const ROUTE_BASE = '/semantic-search';
const TABLE = 'semantic_search_index';
const VEC_TABLE = 'semantic_search_vec';
const VEC_IMG_TABLE = 'semantic_search_vec_img';
const EMBED_TIMEOUT_MS = 120000;
const VISION_TIMEOUT_MS = 180000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 送入视觉模型的图片上限（原始字节）
const FILE_EVENT_DEBOUNCE_MS = 3000;
const SCORE_FLOOR = 0.05;
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'heic', 'heif', 'tiff', 'tif']);
const DEFAULT_VISION_PROMPT = '用一两句简洁的中文描述这张图片：主体对象、场景、风格与色调。直接输出描述本身，不要任何寒暄或前缀。';

interface PluginSettings {
  apiUrl: string;
  model: string;
  dim: number;
  batchSize: number;
  vecIndex: boolean;
  visionModel: string;
  visionPrompt: string;
}

interface IndexTaskState {
  running: boolean;
  cancelRequested: boolean;
  force: boolean;
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  imageDone: number;
  imageFailed: number;
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

const ALLOWED_DIMS = [768, 512, 256, 128];
const DEFAULT_SETTINGS: PluginSettings = {
  apiUrl: 'http://localhost:11434',
  model: 'embeddinggemma-2',
  dim: 768,
  batchSize: 16,
  vecIndex: true,
  visionModel: '',
  visionPrompt: DEFAULT_VISION_PROMPT,
};

function sha1(text: string): string {
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex');
}

/** 解析 files.tags / files.metadata 列：优先 JSON，失败时按分隔符拆分（tags）或忽略（metadata） */
function parseJsonColumn(raw: unknown): any {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  const text = String(raw).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function truncateAndNormalize(vec: number[], dim: number): Float32Array {
  const out = new Float32Array(dim);
  let squared = 0;
  const limit = Math.min(dim, vec.length);
  for (let i = 0; i < limit; i++) {
    const v = Number(vec[i]) || 0;
    out[i] = v;
    squared += v * v;
  }
  const norm = Math.sqrt(squared);
  if (norm > 1e-9) {
    for (let i = 0; i < dim; i++) out[i] /= norm;
  }
  return out;
}

function float32ToBuffer(vec: Float32Array): Buffer {
  const buf = Buffer.alloc(vec.byteLength);
  Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength).copy(buf);
  return buf;
}

function bufferToFloat32(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
}

class MiraSemanticSearchPlugin {
  /** 纯函数暴露为静态方法，便于外部测试 */
  static truncateAndNormalize = truncateAndNormalize;
  static float32ToBuffer = float32ToBuffer;
  static bufferToFloat32 = bufferToFloat32;

  private readonly pluginName = PLUGIN_NAME;
  private readonly routes: any[] = [];
  private readonly httpRoutes: Array<{ path: string; handler: any }> = [];
  private readonly libraryId: string;
  private readonly pluginDir: string;
  private readonly settingsFile: string;
  private dbService: any;
  private router: any;
  private settings: PluginSettings = { ...DEFAULT_SETTINGS };
  private task: IndexTaskState = this.idleTask();
  private taskTail: Promise<void> = Promise.resolve();
  /** file_id → 归一化向量；索引写入后置空，搜索时懒加载 */
  private vectorCache: { dim: number; vectors: Map<number, Float32Array>; imageVectors: Map<number, Float32Array> } | null = null;

  // 事件自动同步
  private eventManager: any = null;
  private eventSubIds: string[] = [];
  private pendingFiles = new Set<number>();
  private pendingTimer: NodeJS.Timeout | null = null;

  // sqlite-vec 状态
  private vecExtLoaded = false;
  private vecTableDim = 0;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager;
    this.dbService = inst.dbService;
    this.libraryId = this.dbService.getLibraryId();
    this.pluginDir = pluginManager.getPluginDir(this.pluginName);
    this.settingsFile = path.join(this.pluginDir, 'data', 'settings.json');
    this.router = pluginManager.server.backend.getHttpServer().httpRouter;
    this.loadSettings();
    this.ensureTable().catch((error) => {
      console.error(`[${PLUGIN_NAME}] init table failed:`, error);
    });
    this.hookFileEvents(pluginManager);

    this.register('/settings', 'get', (req: any, res: any) => this.getSettings(req, res));
    this.register('/settings', 'post', (req: any, res: any) => this.saveSettings(req, res));
    this.register('/test', 'post', (req: any, res: any) => this.testConnection(req, res));
    this.register('/status', 'get', (req: any, res: any) => this.getStatus(req, res));
    this.register('/index', 'post', (req: any, res: any) => this.startIndex(req, res));
    this.register('/stop', 'post', (req: any, res: any) => this.stopIndex(req, res));
    this.register('/search', 'post', (req: any, res: any) => this.search(req, res));
    this.register('/search-image', 'post', (req: any, res: any) => this.searchImage(req, res));

    this.routes.push({
      name: 'SemanticSearch',
      group: '工具',
      path: '/tools/semantic-search',
      component: 'components/SemanticSearch.js',
      pluginName: this.pluginName,
      meta: { title: '语义搜索', roles: ['super', 'admin', 'user'] },
    });
    console.log(`[${PLUGIN_NAME}] registered /api${ROUTE_BASE}/* (library: ${this.libraryId}, autoSync: ${this.eventSubIds.length > 0})`);
  }

  getRoutes() {
    return [...this.routes];
  }

  private idleTask(): IndexTaskState {
    return {
      running: false,
      cancelRequested: false,
      force: false,
      total: 0,
      processed: 0,
      skipped: 0,
      failed: 0,
      imageDone: 0,
      imageFailed: 0,
      startedAt: 0,
      finishedAt: null,
      error: null,
    };
  }

  private register(subPath: string, method: string, handler: (req: any, res: any) => void): void {
    const full = `${ROUTE_BASE}${subPath}`;
    this.router.registerRounter(this.libraryId, full, method, handler);
    this.httpRoutes.push({ path: full, handler });
  }

  // ── 配置 ──────────────────────────────────────────────

  private loadSettings(): void {
    try {
      const raw = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
      this.settings = {
        apiUrl: String(raw.apiUrl || DEFAULT_SETTINGS.apiUrl).replace(/\/+$/, ''),
        model: String(raw.model || DEFAULT_SETTINGS.model),
        dim: ALLOWED_DIMS.includes(Number(raw.dim)) ? Number(raw.dim) : DEFAULT_SETTINGS.dim,
        batchSize: Math.min(64, Math.max(1, Number(raw.batchSize) || DEFAULT_SETTINGS.batchSize)),
        vecIndex: raw.vecIndex === undefined ? DEFAULT_SETTINGS.vecIndex : Boolean(raw.vecIndex),
        visionModel: String(raw.visionModel || '').trim(),
        visionPrompt: String(raw.visionPrompt || DEFAULT_VISION_PROMPT).trim() || DEFAULT_VISION_PROMPT,
      };
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private persistSettings(): void {
    fs.mkdirSync(path.dirname(this.settingsFile), { recursive: true });
    fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
  }

  get visionEnabled(): boolean {
    return Boolean(this.settings.visionModel);
  }

  // ── 数据库 ──────────────────────────────────────────────

  /** dbService 实际实现（LibraryServerDataSQLite）暴露 runSql/getSql，接口未声明 */
  private runSql(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
    return this.dbService.runSql(sql, params);
  }

  private getSql(sql: string, params?: any[]): Promise<any[]> {
    return this.dbService.getSql(sql, params);
  }

  private async ensureTable(): Promise<void> {
    await this.runSql(`
      CREATE TABLE IF NOT EXISTS ${TABLE}(
        file_id INTEGER PRIMARY KEY,
        text_hash TEXT NOT NULL,
        dim INTEGER NOT NULL,
        embedding BLOB NOT NULL,
        updated_at INTEGER NOT NULL,
        image_embedding BLOB,
        image_hash TEXT,
        image_caption TEXT
      )
    `);
    // 老表迁移：补图像向量列（幂等）
    for (const [col, def] of [
      ['image_embedding', 'BLOB'],
      ['image_hash', 'TEXT'],
      ['image_caption', 'TEXT'],
    ] as const) {
      try {
        await this.runSql(`ALTER TABLE ${TABLE} ADD COLUMN ${col} ${def}`);
      } catch { /* 列已存在 */ }
    }
    await this.runSql(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_dim ON ${TABLE}(dim)`);
  }

  private async countFiles(): Promise<number> {
    const rows = await this.getSql('SELECT COUNT(*) AS n FROM files WHERE recycled = 0');
    return Number(rows?.[0]?.n || 0);
  }

  private async countIndexed(): Promise<number> {
    const rows = await this.getSql(`SELECT COUNT(*) AS n FROM ${TABLE} WHERE dim = ?`, [this.settings.dim]);
    return Number(rows?.[0]?.n || 0);
  }

  private async countCaptioned(): Promise<number> {
    const rows = await this.getSql(`SELECT COUNT(*) AS n FROM ${TABLE} WHERE dim = ? AND image_embedding IS NOT NULL`, [this.settings.dim]);
    return Number(rows?.[0]?.n || 0);
  }

  // ── sqlite-vec KNN 加速（可选，任何失败回退内存扫描） ──

  private async initVec(): Promise<{ ok: boolean; reason?: string }> {
    if (!this.settings.vecIndex) return { ok: false, reason: '已在配置中关闭' };
    try {
      if (!this.vecExtLoaded) {
        const sqliteVec = require('sqlite-vec');
        const db = this.dbService?.db;
        if (!db?.loadExtension) throw new Error('宿主数据库连接不支持 loadExtension');
        // node-sqlite3 的 loadExtension 异步生效，必须等回调完成后再建 vec0 表
        await new Promise<void>((resolve, reject) => {
          db.loadExtension(sqliteVec.getLoadablePath(), (err: Error | null) => (err ? reject(err) : resolve()));
        });
        this.vecExtLoaded = true;
      }
      if (this.vecTableDim !== this.settings.dim) {
        await this.runSql(
          `CREATE VIRTUAL TABLE IF NOT EXISTS ${VEC_TABLE} USING vec0(file_id INTEGER PRIMARY KEY, embedding FLOAT[${this.settings.dim}])`,
        );
        await this.runSql(
          `CREATE VIRTUAL TABLE IF NOT EXISTS ${VEC_IMG_TABLE} USING vec0(file_id INTEGER PRIMARY KEY, embedding FLOAT[${this.settings.dim}])`,
        );
        this.vecTableDim = this.settings.dim;
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  private async dropVecTables(): Promise<void> {
    for (const table of [VEC_TABLE, VEC_IMG_TABLE]) {
      try {
        await this.runSql(`DROP TABLE IF EXISTS ${table}`);
      } catch { /* 老库无该表 */ }
    }
    this.vecTableDim = 0;
  }

  /** 向量写入 vec0 表（失败仅告警，不影响普通表这一 source of truth）。vec0 不支持 INSERT OR REPLACE，先删后插 */
  private async vecUpsert(table: string, fileId: number, vec: Float32Array): Promise<void> {
    if (!(await this.initVec()).ok) return;
    try {
      await this.runSql(`DELETE FROM ${table} WHERE file_id = ?`, [fileId]);
      await this.runSql(
        `INSERT INTO ${table}(file_id, embedding) VALUES(?, ?)`,
        [fileId, float32ToBuffer(vec)],
      );
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] vec upsert ${table} failed for ${fileId}:`, error instanceof Error ? error.message : error);
    }
  }

  private async vecDelete(fileId: number): Promise<void> {
    try {
      if ((await this.initVec()).ok) {
        await this.runSql(`DELETE FROM ${VEC_TABLE} WHERE file_id = ?`, [fileId]);
        await this.runSql(`DELETE FROM ${VEC_IMG_TABLE} WHERE file_id = ?`, [fileId]);
      }
    } catch { /* 忽略：重建索引时会全量刷新 */ }
  }

  /**
   * vec0 KNN 查询。返回 null 表示 vec 不可用需回退内存扫描。
   * 向量已归一化：L2 距离与余弦等价，cos = 1 - d²/2。
   */
  private async searchViaVec(table: string, column: string, queryVec: Float32Array, limit: number): Promise<Array<{ fileId: number; score: number }> | null> {
    if (!(await this.initVec()).ok) return null;
    try {
      // 多取 3 倍候选，JOIN files 过滤已删/回收行后再截断
      const rows = await this.getSql(
        `SELECT file_id, distance FROM ${table} WHERE ${column} MATCH ? AND k = ?`,
        [float32ToBuffer(queryVec), Math.max(limit * 3, 30)],
      );
      return rows.map((row) => {
        const dist = Number(row.distance);
        return { fileId: Number(row.file_id), score: 1 - (dist * dist) / 2 };
      });
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] vec KNN ${table} failed, fallback to memory scan:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  // ── 索引文本构造 ──────────────────────────────────────────

  /** 文件文本信息 → EmbeddingGemma 2 文档格式 "title: {标题} | text: {内容}" */
  private buildDocument(row: any): { title: string; content: string } {
    const name = String(row?.name || '').trim();
    const title = name.replace(/\.[a-z0-9]{1,6}$/i, '') || name || '未命名';

    const parts: string[] = [];
    const notes = String(row?.notes || '').trim();
    if (notes) parts.push(notes);

    const tags = parseJsonColumn(row?.tags);
    if (Array.isArray(tags)) {
      const titles = tags
        .map((t: any) => String(typeof t === 'object' && t ? t.title || t.name || '' : t || '').trim())
        .filter(Boolean);
      if (titles.length) parts.push(titles.join(' '));
    } else if (typeof tags === 'string' && tags.trim()) {
      parts.push(tags.trim());
    }

    const website = String(row?.website || '').trim();
    if (website) parts.push(website);

    const metadata = parseJsonColumn(row?.metadata);
    if (metadata && typeof metadata === 'object') {
      for (const key of ['title', 'description', 'author', 'album', 'artist', 'comment']) {
        const value = String((metadata as any)[key] || '').trim();
        if (value) parts.push(value);
      }
      const ext = String((metadata as any).extension || '').trim();
      if (ext) parts.push(String(ext).replace(/^\./, ''));
    }

    const folderTitle = String(row?.folder_title || '').trim();
    if (folderTitle) parts.push(folderTitle);

    return { title, content: parts.join(' ') };
  }

  // ── Ollama 调用 ──────────────────────────────────────────

  private async ollamaEmbed(inputs: string[]): Promise<number[][]> {
    if (!inputs.length) return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.settings.apiUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // dimensions: 支持 MRL 的模型由 Ollama 服务端截断；老版本忽略该字段，本地截断兜底
        body: JSON.stringify({ model: this.settings.model, input: inputs, dimensions: this.settings.dim }),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}: ${text.slice(0, 300)}`);
      }
      const payload = JSON.parse(text);
      const embeddings = payload?.embeddings;
      if (!Array.isArray(embeddings) || !embeddings.length) {
        throw new Error('Ollama 响应缺少 embeddings 字段');
      }
      return embeddings;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 视觉模型打标：图片 base64 → 中文描述文本 */
  private async ollamaVisionDescribe(imageBase64: string): Promise<string> {
    if (!this.visionEnabled) throw new Error('未配置视觉模型（visionModel）');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.settings.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.settings.visionModel,
          messages: [{ role: 'user', content: this.settings.visionPrompt, images: [imageBase64] }],
          stream: false,
          options: { temperature: 0, num_predict: 120 },
        }),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}: ${text.slice(0, 300)}`);
      }
      const payload = JSON.parse(text);
      const content = String(payload?.message?.content || '').trim();
      if (!content) throw new Error('视觉模型返回空描述');
      return content;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── 图片读取 ──────────────────────────────────────────────

  /** 扩展名 / MIME 双重判断是否图片素材 */
  private isImageFile(row: any): boolean {
    const name = String(row?.name || '');
    const ext = path.extname(name).slice(1).toLowerCase();
    if (ext && IMAGE_EXTS.has(ext)) return true;
    const metadata = parseJsonColumn(row?.metadata);
    const mime = String(metadata?.mimeType || '');
    return mime.startsWith('image/');
  }

  /** 读本地图片 → base64 + 内容 sha1（URL 引用/超大文件返回 null；无 url 列，靠 existsSync 兜底过滤） */
  private async readImageBase64(row: any): Promise<{ base64: string; hash: string } | null> {
    try {
      const filePath = await this.dbService.getItemFilePath(row);
      if (!filePath || !fs.existsSync(filePath)) return null;
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile() || stat.size === 0 || stat.size > MAX_IMAGE_BYTES) return null;
      const buffer = await fs.promises.readFile(filePath);
      return { base64: buffer.toString('base64'), hash: crypto.createHash('sha1').update(buffer).digest('hex') };
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] read image ${row?.name} failed:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  // ── 文件事件自动同步 ──────────────────────────────────────

  private hookFileEvents(pluginManager: any): void {
    try {
      const em = pluginManager?.server?.backend?.libraries?.getLibrary?.(this.libraryId)?.eventManager;
      if (!em?.subscribe) {
        console.warn(`[${PLUGIN_NAME}] eventManager unavailable, auto sync disabled`);
        return;
      }
      this.eventManager = em;
      for (const eventName of ['file::created', 'file::updated', 'file::deleted']) {
        const subId = em.subscribe(eventName, (args: any) => {
          const fileId = this.extractFileId(args);
          if (fileId) this.scheduleFileUpsert(fileId);
        });
        this.eventSubIds.push(subId);
      }
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] hook file events failed:`, error instanceof Error ? error.message : error);
    }
  }

  /** 宿主广播负载存在 {fileId} 与 {result: {id}} 两种形态，统一提取 */
  private extractFileId(args: any): number | null {
    const data = args?.args || args || {};
    const raw = data.fileId ?? data.result?.id ?? data.result?.fileId ?? data.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private scheduleFileUpsert(fileId: number): void {
    this.pendingFiles.add(fileId);
    if (this.pendingTimer) return;
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      const ids = Array.from(this.pendingFiles);
      this.pendingFiles.clear();
      // 与索引任务共用串行队列，避免并发写表
      this.taskTail = this.taskTail.then(() => this.upsertFiles(ids)).catch((error) => {
        console.warn(`[${PLUGIN_NAME}] auto sync failed:`, error instanceof Error ? error.message : error);
      });
    }, FILE_EVENT_DEBOUNCE_MS);
    this.pendingTimer.unref?.();
  }

  /**
   * 事件驱动的增量同步：重嵌入仍存在的素材，清理已删除/回收的向量。
   * 仅当索引非空时生效——用户未建过索引时不自动开始消耗 Ollama 资源。
   */
  private async upsertFiles(ids: number[]): Promise<void> {
    if (!ids.length) return;
    try {
      if (await this.countIndexed() === 0) return;
      const files = await this.queryFilesByIds(ids);
      const foundIds = new Set(files.map((f: any) => Number(f.id)));
      for (const id of ids) {
        if (!foundIds.has(id)) await this.deleteEmbedding(id);
      }
      if (!files.length) return;
      const existing = await this.loadExistingHashes();
      const stored = await this.embedAndStore(files, existing, undefined, false);
      if (stored > 0) {
        console.log(`[${PLUGIN_NAME}] auto synced ${stored} file(s)`);
      }
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] upsertFiles failed:`, error instanceof Error ? error.message : error);
    }
  }

  private async queryFilesByIds(ids: number[]): Promise<any[]> {
    if (!ids.length) return [];
    return this.getSql(
      `SELECT f.id, f.name, f.notes, f.tags, f.website, f.metadata, f.folder_id, f.recycled, fo.title AS folder_title
       FROM files f
       LEFT JOIN folders fo ON fo.id = f.folder_id
       WHERE f.recycled = 0 AND f.id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
  }

  private async loadExistingHashes(): Promise<Map<string, { textHash: string; imageHash: string | null }>> {
    const rows = await this.getSql(`SELECT file_id, text_hash, image_hash FROM ${TABLE} WHERE dim = ?`, [this.settings.dim]);
    const map = new Map<string, { textHash: string; imageHash: string | null }>();
    for (const row of rows) {
      map.set(String(row.file_id), { textHash: String(row.text_hash), imageHash: row.image_hash ? String(row.image_hash) : null });
    }
    return map;
  }

  private async deleteEmbedding(fileId: number): Promise<void> {
    await this.runSql(`DELETE FROM ${TABLE} WHERE file_id = ?`, [fileId]);
    await this.vecDelete(fileId);
    this.vectorCache = null;
  }

  // ── HTTP 处理器 ──────────────────────────────────────────

  private getSettings(_req: any, res: any): void {
    res.json({
      success: true,
      data: {
        ...this.settings,
        allowedDims: ALLOWED_DIMS,
        defaultVisionPrompt: DEFAULT_VISION_PROMPT,
        visionEnabled: this.visionEnabled,
      },
    });
  }

  private async saveSettings(req: any, res: any): Promise<void> {
    try {
      const { apiUrl, model, dim, batchSize, vecIndex, visionModel, visionPrompt } = req.body || {};
      if (apiUrl != null) {
        const url = String(apiUrl).trim().replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(url)) return res.status(400).json({ success: false, error: 'API 地址必须是 http(s):// 开头' });
        this.settings.apiUrl = url;
      }
      if (model != null) {
        const m = String(model).trim();
        if (!m) return res.status(400).json({ success: false, error: '模型名不能为空' });
        this.settings.model = m;
      }
      let dimChanged = false;
      if (dim != null) {
        const d = Number(dim);
        if (!ALLOWED_DIMS.includes(d)) return res.status(400).json({ success: false, error: `维度仅支持 ${ALLOWED_DIMS.join('/')}` });
        dimChanged = d !== this.settings.dim;
        this.settings.dim = d;
      }
      if (batchSize != null) {
        this.settings.batchSize = Math.min(64, Math.max(1, Number(batchSize) || DEFAULT_SETTINGS.batchSize));
      }
      if (vecIndex != null) {
        this.settings.vecIndex = Boolean(vecIndex);
      }
      if (visionModel != null) {
        this.settings.visionModel = String(visionModel).trim();
      }
      if (visionPrompt != null) {
        this.settings.visionPrompt = String(visionPrompt).trim() || DEFAULT_VISION_PROMPT;
      }
      // vec0 表维度固定，dim 变更/关闭加速时删除旧表（普通表数据保留，按 dim 过滤）
      if (dimChanged || !this.settings.vecIndex) await this.dropVecTables();
      this.vectorCache = null;
      this.persistSettings();
      res.json({ success: true, data: { ...this.settings } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /** POST test body: { vision?: true } → vision 时测试视觉模型（纯文本 ping） */
  private async testConnection(req: any, res: any): Promise<void> {
    try {
      if (req.body?.vision) {
        if (!this.visionEnabled) return res.status(400).json({ success: false, error: '请先填写视觉模型名（如 gemma3:4b，需支持图像输入）' });
        const started = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
          const response = await fetch(`${this.settings.apiUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.settings.visionModel,
              messages: [{ role: 'user', content: '回复：OK' }],
              stream: false,
            }),
            signal: controller.signal,
          });
          const text = await response.text();
          if (!response.ok) throw new Error(`Ollama HTTP ${response.status}: ${text.slice(0, 300)}`);
          const payload = JSON.parse(text);
          const reply = String(payload?.message?.content || '').trim();
          if (!reply) throw new Error('视觉模型返回空响应');
          return res.json({ success: true, data: { vision: true, model: this.settings.visionModel, reply: reply.slice(0, 100), latencyMs: Date.now() - started } });
        } finally {
          clearTimeout(timer);
        }
      }
      const started = Date.now();
      const [embedding] = await this.ollamaEmbed(['mira semantic search connectivity test']);
      const dim = Array.isArray(embedding) ? embedding.length : 0;
      if (!dim) throw new Error('返回向量为空');
      res.json({
        success: true,
        data: {
          apiUrl: this.settings.apiUrl,
          model: this.settings.model,
          modelDim: dim,
          configuredDim: this.settings.dim,
          truncating: dim > this.settings.dim,
          latencyMs: Date.now() - started,
        },
      });
    } catch (error) {
      res.status(502).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async getStatus(_req: any, res: any): Promise<void> {
    try {
      const [total, indexed, captioned, vec] = await Promise.all([
        this.countFiles(), this.countIndexed(), this.countCaptioned(), this.initVec(),
      ]);
      res.json({
        success: true,
        data: {
          settings: { ...this.settings },
          totalFiles: total,
          indexedFiles: indexed,
          captionedFiles: captioned,
          task: { ...this.task },
          vecIndex: { enabled: this.settings.vecIndex, available: vec.ok, reason: vec.reason || null },
          vision: { enabled: this.visionEnabled, model: this.settings.visionModel || null },
          autoSync: { active: this.eventSubIds.length > 0, pending: this.pendingFiles.size },
          pollIntervalMs: this.task.running ? 2000 : 0,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /** POST index body: { force?: boolean, imagesOnly?: boolean } */
  private async startIndex(req: any, res: any): Promise<void> {
    try {
      if (this.task.running) {
        return res.status(409).json({ success: false, error: '索引任务正在运行' });
      }
      const force = Boolean(req.body?.force);
      const imagesOnly = Boolean(req.body?.imagesOnly);
      if (imagesOnly && !this.visionEnabled) {
        return res.status(400).json({ success: false, error: '图像索引需先配置视觉模型' });
      }
      this.task = { ...this.idleTask(), running: true, force, startedAt: Date.now() };
      if (force) {
        await this.runSql(`DELETE FROM ${TABLE}`);
        await this.dropVecTables();
      }
      this.vectorCache = null;
      // 串行队列，避免并发索引
      this.taskTail = this.taskTail.then(() => this.runIndexTask(imagesOnly)).catch((error) => {
        console.error(`[${PLUGIN_NAME}] index task crashed:`, error);
        this.task.running = false;
        this.task.finishedAt = Date.now();
        this.task.error = error instanceof Error ? error.message : String(error);
      });
      res.json({ success: true, data: { task: { ...this.task } } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private stopIndex(_req: any, res: any): void {
    if (!this.task.running) {
      return res.json({ success: true, data: { task: { ...this.task }, message: '当前没有运行中的任务' } });
    }
    this.task.cancelRequested = true;
    res.json({ success: true, data: { task: { ...this.task }, message: '已请求停止，等待当前批次完成' } });
  }

  // ── 索引任务 ──────────────────────────────────────────────

  private async runIndexTask(imagesOnly: boolean): Promise<void> {
    try {
      await this.ensureTable();
      const files = await this.getSql(`
        SELECT f.id, f.name, f.notes, f.tags, f.website, f.metadata, f.folder_id, f.recycled, fo.title AS folder_title
        FROM files f
        LEFT JOIN folders fo ON fo.id = f.folder_id
        WHERE f.recycled = 0
        ORDER BY f.id
      `);
      this.task.total = files.length;
      const existing = await this.loadExistingHashes();
      const targets = imagesOnly && this.visionEnabled ? files.filter((f: any) => this.isImageFile(f)) : files;

      await this.embedAndStore(targets, existing, () => !this.task.cancelRequested, true, imagesOnly);
      if (!this.task.cancelRequested) {
        // 清理已删除/回收素材的残留向量
        const stale = await this.getSql(
          `SELECT t.file_id FROM ${TABLE} t
           LEFT JOIN files f ON f.id = t.file_id AND f.recycled = 0
           WHERE f.id IS NULL`,
        );
        for (const row of stale) await this.deleteEmbedding(Number(row.file_id));
      }
      this.task.finishedAt = Date.now();
      this.task.error = this.task.cancelRequested ? '已手动停止（可续跑）' : null;
    } catch (error) {
      this.task.error = error instanceof Error ? error.message : String(error);
      this.task.finishedAt = Date.now();
    } finally {
      this.task.running = false;
      this.vectorCache = null;
      console.log(
        `[${PLUGIN_NAME}] index finished: processed=${this.task.processed} skipped=${this.task.skipped} failed=${this.task.failed} imageDone=${this.task.imageDone} imageFailed=${this.task.imageFailed} ${this.task.error ? `error=${this.task.error}` : ''}`,
      );
    }
  }

  /**
   * 核心：批量构建文档 → Ollama 嵌入 → 写普通表 + vec0 表。
   * 视觉启用时，图片素材额外打标（/api/chat）并将描述向量写入 image_embedding 列 + vec0 图像表；
   * image_hash（图片内容 sha1 + 视觉模型名）未变时跳过图像部分。
   * shouldContinue 返回 false 时中断；trackTask=false 时事件增量路径不改动任务进度计数。
   * imagesOnly=true 时跳过纯文本嵌入（仅补图像向量，用于已建文本索引后开启视觉）。
   * @returns 实际新嵌入的条数
   */
  private async embedAndStore(
    files: any[],
    existing: Map<string, { textHash: string; imageHash: string | null }>,
    shouldContinue?: () => boolean,
    trackTask = true,
    imagesOnly = false,
  ): Promise<number> {
    let stored = 0;
    const count = trackTask
      ? (kind: 'processed' | 'skipped') => { this.task[kind]++; }
      : () => undefined;
    const batch: Array<{ fileId: number; hash: string; input: string }> = [];
    const flush = async () => {
      if (!batch.length) return;
      const inputs = batch.map((item) => item.input);
      const embeddings = await this.ollamaEmbed(inputs);
      if (embeddings.length !== batch.length) {
        throw new Error(`Ollama 返回数量不匹配（期望 ${batch.length}，得到 ${embeddings.length}）`);
      }
      const now = Date.now();
      for (let i = 0; i < batch.length; i++) {
        const vec = truncateAndNormalize(embeddings[i], this.settings.dim);
        await this.runSql(
          `INSERT INTO ${TABLE}(file_id, text_hash, dim, embedding, updated_at)
           VALUES(?, ?, ?, ?, ?)
           ON CONFLICT(file_id) DO UPDATE SET
             text_hash = excluded.text_hash,
             dim = excluded.dim,
             embedding = excluded.embedding,
             updated_at = excluded.updated_at`,
          [batch[i].fileId, batch[i].hash, this.settings.dim, float32ToBuffer(vec), now],
        );
        await this.vecUpsert(VEC_TABLE, batch[i].fileId, vec);
        stored++;
        count('processed');
      }
      batch.length = 0;
    };

    for (const file of files) {
      if (shouldContinue && !shouldContinue()) break;
      const fileId = Number(file.id);
      const { title, content } = this.buildDocument(file);
      const input = `title: ${title} | text: ${content}`;
      const hash = sha1(`${this.settings.model}|${this.settings.dim}|${input}`);
      const prev = existing.get(String(fileId));

      if (!imagesOnly) {
        if (prev?.textHash === hash) {
          count('skipped');
          count('processed');
        } else {
          batch.push({ fileId, hash, input });
          if (batch.length >= this.settings.batchSize) {
            await this.retryOnce(flush, trackTask ? () => { this.task.failed += this.settings.batchSize; } : () => undefined);
          }
        }
      } else if (!prev) {
        // 补图像模式：仅给从未建过文本索引的文件补文本向量（图像 UPDATE 依赖该行存在）
        batch.push({ fileId, hash, input });
      }
      // 补图像模式先 flush 文本行，图像 UPDATE 才能命中
      if (imagesOnly && batch.length) await this.retryOnce(flush, () => undefined);

      // 图像部分：图片文件 + 视觉启用 + 图片内容/视觉模型变化
      if (this.visionEnabled && this.isImageFile(file)) {
        const image = await this.readImageBase64(file);
        const nextImageHash = image ? sha1(`${this.settings.visionModel}|${image.hash}`) : null;
        if (nextImageHash && prev?.imageHash !== nextImageHash) {
          try {
            const caption = await this.ollamaVisionDescribe(image!.base64);
            const [embedding] = await this.ollamaEmbed([`title: ${title} | text: ${caption}`]);
            const vec = truncateAndNormalize(embedding, this.settings.dim);
            await this.runSql(
              `UPDATE ${TABLE} SET image_embedding = ?, image_hash = ?, image_caption = ?
               WHERE file_id = ? AND dim = ?`,
              [float32ToBuffer(vec), nextImageHash, caption, fileId, this.settings.dim],
            );
            await this.vecUpsert(VEC_IMG_TABLE, fileId, vec);
            if (trackTask) this.task.imageDone++;
            this.vectorCache = null;
          } catch (error) {
            if (trackTask) this.task.imageFailed++;
            console.warn(`[${PLUGIN_NAME}] vision describe ${file?.name} failed:`, error instanceof Error ? error.message : error);
          }
        }
      }
    }
    if (!shouldContinue || shouldContinue()) {
      if (batch.length) await this.retryOnce(flush, trackTask ? () => { this.task.failed += this.settings.batchSize; } : () => undefined);
    }
    return stored;
  }

  /** Ollama 偶发超时/断连重试一次；整批失败调用 onFail 记账但不中断任务 */
  private async retryOnce(fn: () => Promise<void>, onFail: () => void): Promise<void> {
    try {
      await fn();
    } catch (firstError) {
      console.warn(`[${PLUGIN_NAME}] embed batch failed, retrying:`, firstError instanceof Error ? firstError.message : firstError);
      try {
        await fn();
      } catch (secondError) {
        onFail();
        console.error(`[${PLUGIN_NAME}] embed batch retry failed:`, secondError instanceof Error ? secondError.message : secondError);
      }
    }
  }

  // ── 搜索 ──────────────────────────────────────────────

  private async loadVectors(): Promise<{ vectors: Map<number, Float32Array>; imageVectors: Map<number, Float32Array> }> {
    if (this.vectorCache && this.vectorCache.dim === this.settings.dim) {
      return this.vectorCache;
    }
    const rows = await this.getSql(`SELECT file_id, embedding, image_embedding FROM ${TABLE} WHERE dim = ?`, [this.settings.dim]);
    const vectors = new Map<number, Float32Array>();
    const imageVectors = new Map<number, Float32Array>();
    for (const row of rows) {
      const fileId = Number(row.file_id);
      if (Buffer.isBuffer(row.embedding)) {
        const vec = bufferToFloat32(row.embedding);
        if (vec.length === this.settings.dim) vectors.set(fileId, vec);
      }
      if (Buffer.isBuffer(row.image_embedding)) {
        const vec = bufferToFloat32(row.image_embedding);
        if (vec.length === this.settings.dim) imageVectors.set(fileId, vec);
      }
    }
    this.vectorCache = { dim: this.settings.dim, vectors, imageVectors };
    return this.vectorCache;
  }

  /**
   * 查询向量与「文本向量 + 图像向量」两个集合比相似度，每文件取最高分。
   * 优先 vec0 KNN（两张表），不可用回退内存余弦扫描。
   */
  private async rankAll(queryVec: Float32Array, topK: number): Promise<{ top: Array<{ fileId: number; score: number; via: 'text' | 'image' }>; engine: string }> {
    let engine = 'sqlite-vec';
    const perFile = new Map<number, { score: number; via: 'text' | 'image' }>();

    const merge = (rows: Array<{ fileId: number; score: number }>, via: 'text' | 'image') => {
      for (const row of rows) {
        const prev = perFile.get(row.fileId);
        if (!prev || row.score > prev.score) perFile.set(row.fileId, { score: row.score, via });
      }
    };

    const textRows = await this.searchViaVec(VEC_TABLE, 'embedding', queryVec, topK);
    const imageRows = this.visionEnabled
      ? await this.searchViaVec(VEC_IMG_TABLE, 'embedding', queryVec, topK)
      : null;
    if (textRows === null) {
      engine = 'memory';
      const { vectors, imageVectors } = await this.loadVectors();
      const scan = (map: Map<number, Float32Array>, via: 'text' | 'image') => {
        const rows: Array<{ fileId: number; score: number }> = [];
        for (const [fileId, vec] of map) {
          let dot = 0;
          for (let i = 0; i < queryVec.length; i++) dot += queryVec[i] * vec[i];
          rows.push({ fileId, score: dot });
        }
        merge(rows, via);
      };
      scan(vectors, 'text');
      if (this.visionEnabled) scan(imageVectors, 'image');
    } else {
      merge(textRows, 'text');
      if (imageRows) merge(imageRows, 'image');
    }

    const top = Array.from(perFile.entries())
      .map(([fileId, v]) => ({ fileId, score: v.score, via: v.via }))
      .filter((item) => item.score > SCORE_FLOOR)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return { top, engine };
  }

  /** 组装结果：JOIN files 表补素材信息 + caption */
  private async buildResults(top: Array<{ fileId: number; score: number; via: 'text' | 'image' }>): Promise<any[]> {
    if (!top.length) return [];
    const rows = await this.getSql(
      `SELECT id, name, notes, tags, website, size, thumb, created_at FROM files
       WHERE recycled = 0 AND id IN (${top.map(() => '?').join(',')})`,
      top.map((item) => item.fileId),
    );
    const captions = await this.getSql(
      `SELECT file_id, image_caption FROM ${TABLE} WHERE image_caption IS NOT NULL AND file_id IN (${top.map(() => '?').join(',')})`,
      top.map((item) => item.fileId),
    );
    const captionMap = new Map<number, string>();
    for (const row of captions) captionMap.set(Number(row.file_id), String(row.image_caption));
    const fileMap = new Map<number, any>();
    for (const row of rows) fileMap.set(Number(row.id), row);

    return top
      .map((item) => {
        const file = fileMap.get(item.fileId);
        if (!file) return null; // 已删除但向量残留
        const tags = parseJsonColumn(file.tags);
        return {
          fileId: item.fileId,
          name: String(file.name || ''),
          notes: String(file.notes || ''),
          tags: Array.isArray(tags) ? tags : [],
          website: String(file.website || ''),
          size: Number(file.size || 0),
          thumb: Number(file.thumb || 0),
          createdAt: Number(file.created_at || 0),
          score: Math.round(item.score * 1000) / 1000,
          via: item.via,
          caption: captionMap.get(item.fileId) || '',
        };
      })
      .filter(Boolean);
  }

  /**
   * 查询前缀按模型系适配：EmbeddingGemma 2 / Gemma-3-embedding 用检索任务前缀，
   * 第一代 EmbeddingGemma 及其他模型用与文档一致的 title 格式。
   * 文档前缀 "title: {标题} | text: {内容}" 两代通用（title 插槽官方支持）。
   */
  private buildQueryInput(query: string): string {
    return /embeddinggemma-2|gemma[-.]?3/.test(this.settings.model)
      ? `task: search result | query: ${query}`
      : `title: none | text: ${query}`;
  }

  /** POST search body: { query, topK? } */
  private async search(req: any, res: any): Promise<void> {
    try {
      const query = String(req.body?.query || '').trim();
      if (!query) return res.status(400).json({ success: false, error: 'query 不能为空' });
      const topK = Math.min(100, Math.max(1, Number(req.body?.topK) || 20));

      const total = await this.countIndexed();
      if (!total) {
        return res.json({ success: true, data: { query, results: [], indexedFiles: 0, message: '索引为空，请先构建索引' } });
      }
      const [queryEmbedding] = await this.ollamaEmbed([this.buildQueryInput(query)]);
      if (!Array.isArray(queryEmbedding)) {
        return res.status(502).json({ success: false, error: 'Ollama 未返回查询向量' });
      }
      const queryVec = truncateAndNormalize(queryEmbedding, this.settings.dim);
      const { top, engine } = await this.rankAll(queryVec, topK);
      const results = await this.buildResults(top);
      res.json({ success: true, data: { query, results, indexedFiles: total, engine } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /** POST search-image body: { fileId } 或 { imageBase64, topK? } */
  private async searchImage(req: any, res: any): Promise<void> {
    try {
      if (!this.visionEnabled) {
        return res.status(400).json({ success: false, error: '以图搜图需先在配置中填写视觉模型（如 gemma3:4b）' });
      }
      const topK = Math.min(100, Math.max(1, Number(req.body?.topK) || 20));
      const captioned = await this.countCaptioned();
      if (!captioned) {
        return res.json({ success: true, data: { results: [], captionedFiles: 0, message: '图像索引为空：请先在配置视觉模型后点「补建图像索引」' } });
      }

      // 查询图：库内素材（fileId）或前端上传（imageBase64）
      let base64 = '';
      let name = '';
      const fileId = Number(req.body?.fileId);
      if (Number.isFinite(fileId) && fileId > 0) {
        const rows = await this.getSql(`SELECT * FROM files WHERE id = ? AND recycled = 0`, [fileId]);
        if (!rows?.length) return res.status(404).json({ success: false, error: '素材不存在' });
        const image = await this.readImageBase64(rows[0]);
        if (!image) return res.status(400).json({ success: false, error: '素材不是可读的本地图片（URL 引用或超过 15MB）' });
        base64 = image.base64;
        name = String(rows[0].name || '');
      } else {
        base64 = String(req.body?.imageBase64 || '').replace(/^data:[^;]*;base64,/, '');
        name = String(req.body?.name || '');
      }
      if (!base64) return res.status(400).json({ success: false, error: '缺少 fileId 或 imageBase64' });
      if (base64.length > MAX_IMAGE_BYTES * 1.4) {
        return res.status(413).json({ success: false, error: '图片过大（超过 15MB）' });
      }

      // 打标 → 嵌入（与索引端相同的文档前缀，保证语义对齐）
      const caption = await this.ollamaVisionDescribe(base64);
      const [queryEmbedding] = await this.ollamaEmbed([`title: ${name || 'image query'} | text: ${caption}`]);
      if (!Array.isArray(queryEmbedding)) {
        return res.status(502).json({ success: false, error: 'Ollama 未返回查询向量' });
      }
      const queryVec = truncateAndNormalize(queryEmbedding, this.settings.dim);
      const { top, engine } = await this.rankAll(queryVec, topK);
      const results = await this.buildResults(top);
      res.json({ success: true, data: { caption, results, captionedFiles: captioned, engine } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  cleanup(): void {
    if (this.task.running) this.task.cancelRequested = true;
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    for (const subId of this.eventSubIds) {
      try {
        this.eventManager?.unsubscribe(subId);
      } catch { /* 库已关闭时忽略 */ }
    }
    this.eventSubIds = [];
    for (const route of this.httpRoutes) {
      try {
        this.router.unregisterRounter(route.path, this.libraryId, route.handler);
      } catch (error) {
        console.warn(`[${PLUGIN_NAME}] cleanup warn:`, error);
      }
    }
    console.log(`[${PLUGIN_NAME}] cleaned up`);
  }
}

export function init(inst: any) {
  return new MiraSemanticSearchPlugin(inst);
}
