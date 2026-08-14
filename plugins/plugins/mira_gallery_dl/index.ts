import { spawn } from 'child_process';
import { createHash, randomBytes } from 'crypto';
import { promises as dns } from 'dns';
import * as fs from 'fs';
import { isIP } from 'net';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const MAX_URLS = 20;
const MAX_PARSED_ITEMS = 500;
const MAX_IMPORT_ITEMS = 100;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp']);

interface CommandSpec {
  command: string;
  args: string[];
}

export interface ParsedGalleryItem {
  id: string;
  url: string;
  thumbnailUrl: string;
  name: string;
  extension: string;
  width?: number;
  height?: number;
  site: string;
  sourceUrl: string;
}

interface ImportItem {
  url: string;
  name?: string;
  extension?: string;
  sourceUrl?: string;
  site?: string;
}

function normalizeExtension(value: unknown, url = ''): string {
  const fromValue = String(value || '').toLowerCase().replace(/^\./, '');
  if (IMAGE_EXTENSIONS.has(fromValue)) return fromValue === 'jpeg' ? 'jpg' : fromValue;
  try {
    const fromUrl = path.extname(new URL(url).pathname).slice(1).toLowerCase();
    if (IMAGE_EXTENSIONS.has(fromUrl)) return fromUrl === 'jpeg' ? 'jpg' : fromUrl;
  } catch {}
  return 'jpg';
}

function safeFileName(value: unknown, extension: string): string {
  const fallback = `gallery-${Date.now()}`;
  const raw = path.basename(String(value || fallback)).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  const base = (path.extname(raw) ? raw.slice(0, -path.extname(raw).length) : raw) || fallback;
  return `${base.slice(0, 120)}.${extension}`;
}

function findPreview(metadata: Record<string, any>, directUrl: string): string {
  const candidates = [
    metadata.preview_file_url,
    metadata.thumbnail_url,
    metadata.preview_url,
    metadata.thumb,
  ];
  const variants = metadata.media_asset?.variants;
  if (Array.isArray(variants)) {
    const preview = variants.find((item: any) => item?.type === '360x360') || variants[0];
    candidates.unshift(preview?.url);
  }
  return String(candidates.find(value => typeof value === 'string' && /^https?:\/\//i.test(value)) || directUrl);
}

export function parseGalleryOutput(stdout: string, sourceUrl: string): ParsedGalleryItem[] {
  const events = JSON.parse(stdout.trim());
  if (!Array.isArray(events)) throw new Error('gallery-dl 返回了无效 JSON');

  const items: ParsedGalleryItem[] = [];
  for (const event of events) {
    if (!Array.isArray(event) || event[0] !== 3 || typeof event[1] !== 'string') continue;
    const metadata = event[2] && typeof event[2] === 'object' ? event[2] : {};
    const extension = normalizeExtension(metadata.extension || metadata.file_ext, event[1]);
    if (!IMAGE_EXTENSIONS.has(extension)) continue;
    const fileName = safeFileName(metadata.filename || metadata.title || metadata.id, extension);
    items.push({
      id: createHash('sha256').update(event[1]).digest('hex').slice(0, 20),
      url: event[1],
      thumbnailUrl: findPreview(metadata, event[1]),
      name: fileName,
      extension,
      width: Number.isFinite(Number(metadata.image_width)) ? Number(metadata.image_width) : undefined,
      height: Number.isFinite(Number(metadata.image_height)) ? Number(metadata.image_height) : undefined,
      site: [metadata.category, metadata.subcategory].filter(Boolean).join(' / '),
      sourceUrl,
    });
  }
  return items;
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const parts = address.split('.').map(Number);
    return parts[0] === 10
      || parts[0] === 127
      || (parts[0] === 169 && parts[1] === 254)
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168)
      || (parts[0] === 0);
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::1'
      || normalized === '::'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || /^fe[89ab]/.test(normalized);
  }
  return false;
}

function parseHttpUrl(value: unknown): URL {
  let parsed: URL;
  try {
    parsed = new URL(String(value || ''));
  } catch {
    throw new Error('仅支持有效的 HTTP/HTTPS 链接');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('仅支持 HTTP/HTTPS 链接');
  if (parsed.username || parsed.password) throw new Error('链接不能包含用户名或密码');
  if (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.local') || isPrivateAddress(parsed.hostname)) {
    throw new Error('不允许访问本机或私有网络地址');
  }
  return parsed;
}

async function assertPublicUrl(value: unknown): Promise<URL> {
  const parsed = parseHttpUrl(value);
  const addresses = await dns.lookup(parsed.hostname, { all: true });
  if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) {
    throw new Error('链接解析到了本机或私有网络地址');
  }
  return parsed;
}

async function fetchWithSafeRedirects(value: unknown, options: Record<string, any>): Promise<any> {
  let current = await assertPublicUrl(value);
  for (let redirectCount = 0; redirectCount <= 5; redirectCount++) {
    const response = await (globalThis as any).fetch(current.toString(), {
      ...options,
      redirect: 'manual',
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) throw new Error('图片重定向缺少 Location');
    if (redirectCount === 5) throw new Error('图片重定向次数过多');
    current = await assertPublicUrl(new URL(location, current).toString());
  }
  throw new Error('图片重定向次数过多');
}

function normalizeInputUrls(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('urls 必须是数组');
  const urls = Array.from(new Set(value.map(item => parseHttpUrl(item).toString())));
  if (!urls.length) throw new Error('至少输入一条链接');
  if (urls.length > MAX_URLS) throw new Error(`一次最多解析 ${MAX_URLS} 条链接`);
  return urls;
}

function windowsUserExecutable(): string | null {
  if (process.platform !== 'win32' || !process.env.APPDATA) return null;
  const pythonRoot = path.join(process.env.APPDATA, 'Python');
  try {
    const versions = fs.readdirSync(pythonRoot).sort().reverse();
    for (const version of versions) {
      const executable = path.join(pythonRoot, version, 'Scripts', 'gallery-dl.exe');
      if (fs.existsSync(executable)) return executable;
    }
  } catch {}
  return null;
}

function commandCandidates(): CommandSpec[] {
  const result: CommandSpec[] = [];
  if (process.env.GALLERY_DL_PATH) result.push({ command: process.env.GALLERY_DL_PATH, args: [] });
  if (process.env.GALLERY_DL_PYTHON) result.push({ command: process.env.GALLERY_DL_PYTHON, args: ['-m', 'gallery_dl'] });
  const userExecutable = windowsUserExecutable();
  if (userExecutable) result.push({ command: userExecutable, args: [] });
  result.push({ command: 'gallery-dl', args: [] });
  if (process.platform === 'win32') result.push({ command: 'py', args: ['-m', 'gallery_dl'] });
  result.push({ command: 'python', args: ['-m', 'gallery_dl'] });
  return result;
}

function spawnCapture(spec: CommandSpec, args: string[], timeoutMs: number, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, [...spec.args, ...args], { windowsHide: true, shell: false });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;
    const finish = (error?: Error, output?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(output || '');
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('gallery-dl 执行超时'));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > maxBytes) {
        child.kill();
        finish(new Error('gallery-dl 输出超过限制'));
      } else {
        stdout.push(chunk);
      }
    });
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', (error) => finish(error));
    child.on('close', (code) => {
      if (code === 0) finish(undefined, Buffer.concat(stdout).toString('utf8'));
      else finish(new Error(Buffer.concat(stderr).toString('utf8').trim() || `gallery-dl 退出码 ${code}`));
    });
  });
}

let commandPromise: Promise<{ spec: CommandSpec; version: string }> | null = null;

async function resolveGalleryCommand(): Promise<{ spec: CommandSpec; version: string }> {
  if (!commandPromise) {
    commandPromise = (async () => {
      for (const spec of commandCandidates()) {
        try {
          const version = (await spawnCapture(spec, ['--version'], 10000, 1024 * 1024)).trim();
          if (version) return { spec, version };
        } catch {}
      }
      throw new Error('未找到 gallery-dl，请先安装 gallery-dl 或设置 GALLERY_DL_PATH');
    })().catch(error => {
      commandPromise = null;
      throw error;
    });
  }
  return commandPromise;
}

async function downloadImage(item: ImportItem, tempRoot: string): Promise<{ filePath: string; itemDir: string }> {
  const parsed = await assertPublicUrl(item.url);
  const extension = normalizeExtension(item.extension, parsed.toString());
  const itemDir = await fs.promises.mkdtemp(path.join(tempRoot, 'item-'));
  const filePath = path.join(itemDir, safeFileName(item.name, extension));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetchWithSafeRedirects(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 MiraGalleryImporter/1.0',
        ...(item.sourceUrl ? { Referer: item.sourceUrl } : {}),
      },
    });
    if (!response.ok || !response.body) throw new Error(`图片下载返回 HTTP ${response.status}`);
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_FILE_BYTES) throw new Error('图片超过 100MB 限制');
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
      throw new Error(`响应不是图片: ${contentType}`);
    }

    let received = 0;
    const source = Readable.fromWeb(response.body as any);
    source.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_FILE_BYTES) source.destroy(new Error('图片超过 100MB 限制'));
    });
    await pipeline(source, fs.createWriteStream(filePath, { flags: 'wx' }));
    if (!received) throw new Error('图片内容为空');
    return { filePath, itemDir };
  } catch (error) {
    await fs.promises.rm(itemDir, { recursive: true, force: true });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

class MiraGalleryDlPlugin {
  private readonly pluginName = 'mira_gallery_dl';
  private readonly routes: any[] = [];
  private readonly dbService: any;
  private readonly backend: any;
  private readonly libraryId: string;
  private readonly tempRoot: string;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager;
    this.dbService = inst.dbService;
    this.backend = pluginManager.server.backend;
    this.libraryId = this.dbService.getLibraryId();
    this.tempRoot = path.join(this.backend.dataPath || os.tmpdir(), 'temp', this.pluginName, this.libraryId);
    fs.mkdirSync(this.tempRoot, { recursive: true });
    this.registerApiRoutes();
    this.routes.push({
      name: 'GalleryDlImporter',
      group: '工具',
      path: '/tools/gallery-dl-importer',
      component: 'components/GalleryDlImporter.js',
      pluginName: this.pluginName,
      meta: { title: '图库批量导入', roles: ['super', 'admin', 'user'] },
    });
  }

  getRoutes() {
    return [...this.routes];
  }

  private registerApiRoutes() {
    const router = this.backend.getHttpServer().httpRouter;
    router.registerRounter(this.libraryId, '/gallery-dl/status', 'get', async (_req: any, res: any) => {
      try {
        const command = await resolveGalleryCommand();
        res.json({ success: true, available: true, version: command.version });
      } catch (error) {
        res.status(503).json({ success: false, available: false, error: this.errorMessage(error) });
      }
    });

    router.registerRounter(this.libraryId, '/gallery-dl/parse', 'post', async (req: any, res: any) => {
      try {
        const urls = normalizeInputUrls(req.body?.urls);
        const command = await resolveGalleryCommand();
        const items: ParsedGalleryItem[] = [];
        const errors: Array<{ url: string; error: string }> = [];
        const seen = new Set<string>();

        for (const url of urls) {
          try {
            await assertPublicUrl(url);
            const stdout = await spawnCapture(
              command.spec,
              ['--no-input', '--no-colors', '--range', '1-200', '--dump-json', url],
              120000,
              20 * 1024 * 1024,
            );
            for (const item of parseGalleryOutput(stdout, url)) {
              if (!seen.has(item.url) && items.length < MAX_PARSED_ITEMS) {
                seen.add(item.url);
                items.push(item);
              }
            }
          } catch (error) {
            errors.push({ url, error: this.errorMessage(error) });
          }
        }
        res.json({ success: true, items, errors, version: command.version });
      } catch (error) {
        res.status(400).json({ success: false, error: this.errorMessage(error) });
      }
    });

    router.registerRounter(this.libraryId, '/gallery-dl/import', 'post', async (req: any, res: any) => {
      try {
        const rawItems = req.body?.items;
        if (!Array.isArray(rawItems) || !rawItems.length) throw new Error('至少选择一张图片');
        if (rawItems.length > MAX_IMPORT_ITEMS) throw new Error(`一次最多导入 ${MAX_IMPORT_ITEMS} 张图片`);

        const folderId = req.body?.folderId == null ? null : Number(req.body.folderId);
        const tagIds: string[] = Array.isArray(req.body?.tagIds)
          ? Array.from(new Set(req.body.tagIds.map((id: unknown) => String(id))))
          : [];
        await this.validateTargets(folderId, tagIds);

        const imported: Array<{ url: string; fileId: number; duplicate: boolean }> = [];
        const errors: Array<{ url: string; error: string }> = [];
        for (const raw of rawItems) {
          const item: ImportItem = {
            url: String(raw?.url || ''),
            name: raw?.name == null ? undefined : String(raw.name),
            extension: raw?.extension == null ? undefined : String(raw.extension),
            sourceUrl: raw?.sourceUrl == null ? undefined : String(raw.sourceUrl),
            site: raw?.site == null ? undefined : String(raw.site),
          };
          let itemDir = '';
          try {
            const downloaded = await downloadImage(item, this.tempRoot);
            itemDir = downloaded.itemDir;
            const file = await this.dbService.createFileFromPath(downloaded.filePath, {
              folder_id: folderId,
              tags: tagIds.length ? JSON.stringify(tagIds) : null,
              custom_fields: {
                sourceUrl: item.sourceUrl || item.url,
                directUrl: item.url,
                galleryDlSite: item.site || '',
              },
            }, { importType: 'move' });
            imported.push({ url: item.url, fileId: Number(file.id), duplicate: !!file.duplicate });
            if (!file.duplicate) this.broadcastCreated(file);
          } catch (error) {
            errors.push({ url: item.url, error: this.errorMessage(error) });
          } finally {
            if (itemDir) await fs.promises.rm(itemDir, { recursive: true, force: true });
          }
        }
        res.json({ success: true, imported, errors });
      } catch (error) {
        res.status(400).json({ success: false, error: this.errorMessage(error) });
      }
    });
  }

  private async validateTargets(folderId: number | null, tagIds: string[]) {
    if (folderId != null) {
      if (!Number.isInteger(folderId)) throw new Error('目标文件夹无效');
      const folders = await this.dbService.getAllFolders();
      if (!folders.some((folder: any) => Number(folder.id) === folderId)) throw new Error('目标文件夹不存在');
    }
    if (tagIds.length) {
      const tags = await this.dbService.getAllTags();
      const existing = new Set(tags.map((tag: any) => String(tag.id)));
      if (tagIds.some(id => !existing.has(id))) throw new Error('目标标签不存在');
    }
  }

  private broadcastCreated(file: Record<string, any>) {
    const socket = this.backend.getWebSocketServer?.();
    const eventData = { ...file, libraryId: this.libraryId };
    socket?.broadcastLibraryEvent?.(this.libraryId, 'file::created', eventData);
    socket?.broadcastPluginEvent?.('file::created', {
      message: { type: 'file', action: 'create' },
      result: eventData,
      libraryId: this.libraryId,
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export function init(inst: any) {
  return new MiraGalleryDlPlugin(inst);
}
