import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { promises as dns } from 'dns';
import * as fs from 'fs';
import { isIP } from 'net';
import * as path from 'path';

const MAX_URLS = 20;
const MAX_PARSED_ITEMS = 500;
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

function normalizeInputUrls(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('urls 必须是数组');
  const urls = Array.from(new Set(value.map(item => parseHttpUrl(item).toString())));
  if (!urls.length) throw new Error('至少输入一条链接');
  if (urls.length > MAX_URLS) throw new Error(`一次最多解析 ${MAX_URLS} 条链接`);
  return urls;
}

function tokenizeCommandLine(value: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote = '';
  let escaping = false;
  for (const char of value) {
    if (escaping) {
      current += char;
      escaping = false;
    } else if (char === '\\') {
      escaping = true;
    } else if (quote) {
      if (char === quote) quote = '';
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (escaping) current += '\\';
  if (quote) throw new Error('命令行存在未闭合的引号');
  if (current) tokens.push(current);
  return tokens;
}

function validateProxyUrl(value: string): string {
  if (!value || value.length > 500) throw new Error('--proxy 需要有效的代理地址');
  let proxy: URL;
  try {
    proxy = new URL(value);
  } catch {
    throw new Error('--proxy 需要有效的代理地址');
  }
  if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(proxy.protocol) || !proxy.hostname) {
    throw new Error('--proxy 仅支持 HTTP、HTTPS 或 SOCKS5 地址');
  }
  return proxy.toString();
}

export function parseGalleryCommandLine(value: unknown): string[] {
  const commandLine = String(value || '').trim();
  if (!commandLine) return [];
  if (commandLine.length > 2000) throw new Error('命令行长度超过限制');
  const tokens = tokenizeCommandLine(commandLine);
  if (tokens.length && /^gallery-dl(?:\.exe)?$/i.test(path.basename(tokens[0]))) tokens.shift();

  const args: string[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token === '--proxy') {
      const proxy = validateProxyUrl(tokens[++index] || '');
      args.push('--proxy', proxy);
      continue;
    }
    if (token.startsWith('--proxy=')) {
      args.push('--proxy', validateProxyUrl(token.slice('--proxy='.length)));
      continue;
    }
    throw new Error('命令行仅允许配置 --proxy 参数');
  }
  return args;
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

class MiraGalleryDlPlugin {
  private readonly pluginName = 'mira_gallery_dl';
  private readonly routes: any[] = [];
  private readonly backend: any;
  private readonly libraryId: string;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager;
    this.backend = pluginManager.server.backend;
    this.libraryId = inst.dbService.getLibraryId();
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
        const commandArgs = parseGalleryCommandLine(req.body?.commandLine);
        const command = await resolveGalleryCommand();
        const items: ParsedGalleryItem[] = [];
        const errors: Array<{ url: string; error: string }> = [];
        const seen = new Set<string>();

        for (const url of urls) {
          try {
            await assertPublicUrl(url);
            const stdout = await spawnCapture(
              command.spec,
              [...commandArgs, '--no-input', '--no-colors', '--range', '1-200', '--dump-json', url],
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

  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export function init(inst: any) {
  return new MiraGalleryDlPlugin(inst);
}
