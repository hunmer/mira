import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import yauzl, { Entry } from 'yauzl';

const PLUGIN_NAME = 'mira_zipper_format';
const INDEX_FILE = '__index.json';

const MAX_ENTRIES = 5000;
const MAX_ENTRY_SIZE = 64 * 1024 * 1024;
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024;
const THUMB_MAX = 512;

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico']);
const TEXT_EXTS = new Set([
  'txt', 'md', 'markdown', 'json', 'log', 'csv', 'tsv', 'xml', 'html', 'htm',
  'css', 'js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs', 'vue', 'yaml', 'yml', 'ini',
  'conf', 'cfg', 'toml', 'sh', 'bash', 'bat', 'cmd', 'ps1', 'py', 'rb', 'php',
  'java', 'c', 'cc', 'cpp', 'h', 'hpp', 'rs', 'go', 'kt', 'swift', 'sql', 'srt',
]);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'ogv', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus']);

type PreviewType = 'image' | 'text' | 'video' | 'audio' | 'other';

interface ArchiveEntry {
  name: string;
  size: number;
  compressedSize: number;
  isDir: boolean;
  previewType: PreviewType;
}

interface ArchiveIndex {
  fingerprint: string;
  format: 'zip';
  entries: ArchiveEntry[];
}

interface PreparedArchive {
  root: string;
  indexPath: string;
  index: ArchiveIndex;
  entrySet: Set<string>;
}

type Handler = {
  id: string;
  extensions: string[];
  mimeTypes: string[];
  thumbnailExtensions: string[];
  process: (filePath: string, context?: Record<string, any>) => Promise<any>;
  thumbnail: (srcPath: string, destPath: string) => Promise<void>;
  getExtraFileList: (filePath: string) => Promise<string[]>;
  getExtraFile: (filePath: string, fileName: string) => Promise<string>;
  viewers: Array<Record<string, any>>;
};

function safeEntryName(value: string): string {
  if (!value || value.includes('\0')) throw new Error('ZIP entry has an invalid name');
  const name = value.replace(/\\/g, '/');
  const normalized = path.posix.normalize(name);
  if (path.posix.isAbsolute(name) || /^[a-z]:/i.test(name) || normalized === '..' || normalized.startsWith('../')) {
    throw new Error('ZIP entry escapes the archive root');
  }
  return normalized.replace(/^\.\//, '');
}

function previewTypeOf(name: string): PreviewType {
  const ext = path.extname(name).slice(1).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (TEXT_EXTS.has(ext)) return 'text';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  return 'other';
}

function extractZip(sourcePath: string, outputDir: string): Promise<ArchiveEntry[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(sourcePath, { lazyEntries: true, autoClose: true }, (openError, zipFile) => {
      if (openError || !zipFile) return reject(openError || new Error('Unable to open ZIP archive'));
      const entries: ArchiveEntry[] = [];
      let count = 0;
      let totalSize = 0;
      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        zipFile.close();
        reject(error);
      };

      zipFile.on('error', fail);
      zipFile.on('end', () => {
        if (settled) return;
        settled = true;
        resolve(entries);
      });
      zipFile.on('entry', (entry: Entry) => {
        try {
          count += 1;
          if (count > MAX_ENTRIES) throw new Error(`ZIP archive exceeds ${MAX_ENTRIES} entries`);
          const safe = safeEntryName(entry.fileName);
          if (/\/$/.test(entry.fileName)) {
            entries.push({ name: safe, size: 0, compressedSize: 0, isDir: true, previewType: 'other' });
            fs.mkdirSync(path.join(outputDir, safe), { recursive: true });
            zipFile.readEntry();
            return;
          }
          if (entry.uncompressedSize > MAX_ENTRY_SIZE) throw new Error(`ZIP entry is too large: ${entry.fileName}`);
          totalSize += entry.uncompressedSize;
          if (totalSize > MAX_TOTAL_SIZE) throw new Error('ZIP archive total uncompressed size is too large');

          const target = path.resolve(outputDir, safe);
          const relative = path.relative(outputDir, target);
          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error('ZIP entry escapes the extraction root');
          }
          fs.mkdirSync(path.dirname(target), { recursive: true });

          zipFile.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) return fail(streamError || new Error(`Unable to read ${entry.fileName}`));
            const output = fs.createWriteStream(target, { flags: 'wx' });
            stream.on('error', fail);
            output.on('error', fail);
            output.on('finish', () => {
              entries.push({
                name: safe,
                size: entry.uncompressedSize,
                compressedSize: entry.compressedSize,
                isDir: false,
                previewType: previewTypeOf(safe),
              });
              zipFile.readEntry();
            });
            stream.pipe(output);
          });
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      });
      zipFile.readEntry();
    });
  });
}

function fallbackThumbnailSvg(): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#f4f4f5"/><path d="M88 40h64l40 40v128a8 8 0 0 1-8 8H88a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8z" fill="#fff" stroke="#a1a1aa" stroke-width="3"/><path d="M152 40v40h40" fill="none" stroke="#a1a1aa" stroke-width="3"/><text x="128" y="200" font-family="sans-serif" font-size="34" font-weight="600" fill="#71717a" text-anchor="middle">ZIP</text></svg>`;
  return Buffer.from(svg);
}

class ArchiveCache {
  private readonly pending = new Map<string, Promise<PreparedArchive>>();

  constructor(private readonly cacheRoot: string) {}

  async prepare(sourcePath: string): Promise<PreparedArchive> {
    const stat = await fs.promises.stat(sourcePath);
    const fingerprint = `${stat.size}:${stat.mtimeMs}`;
    const key = crypto.createHash('sha256').update(path.resolve(sourcePath)).digest('hex').slice(0, 32);
    const cacheDir = path.join(this.cacheRoot, key);
    const pendingKey = `${key}:${fingerprint}`;
    const active = this.pending.get(pendingKey);
    if (active) return active;

    const task = this.prepareCache(sourcePath, cacheDir, fingerprint).finally(() => {
      this.pending.delete(pendingKey);
    });
    this.pending.set(pendingKey, task);
    return task;
  }

  private async prepareCache(sourcePath: string, cacheDir: string, fingerprint: string): Promise<PreparedArchive> {
    const indexPath = path.join(cacheDir, INDEX_FILE);
    try {
      const existing = JSON.parse(await fs.promises.readFile(indexPath, 'utf8')) as ArchiveIndex;
      if (existing && existing.fingerprint === fingerprint && Array.isArray(existing.entries)) {
        const entrySet = new Set(existing.entries.filter((entry) => !entry.isDir).map((entry) => entry.name));
        return { root: cacheDir, indexPath, index: existing, entrySet };
      }
    } catch {
      // Cache miss or stale manifest.
    }

    await fs.promises.rm(cacheDir, { recursive: true, force: true });
    await fs.promises.mkdir(cacheDir, { recursive: true });

    try {
      const entries = await extractZip(sourcePath, cacheDir);
      const index: ArchiveIndex = { fingerprint, format: 'zip', entries };
      await fs.promises.writeFile(indexPath, JSON.stringify(index), 'utf8');
      const entrySet = new Set(entries.filter((entry) => !entry.isDir).map((entry) => entry.name));
      return { root: cacheDir, indexPath, index, entrySet };
    } catch (error) {
      await fs.promises.rm(cacheDir, { recursive: true, force: true });
      throw error;
    }
  }
}

class MiraZipperFormatPlugin {
  private readonly cache: ArchiveCache;
  private unregister?: () => void;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager;
    this.cache = new ArchiveCache(path.join(inst.server.backend.dataPath, 'temp', 'zipper'));
    this.unregister = pluginManager.registerFileFormat(PLUGIN_NAME, {
      id: PLUGIN_NAME,
      extensions: ['zip'],
      mimeTypes: ['application/zip', 'application/x-zip-compressed'],
      thumbnailExtensions: ['zip'],
      process: (filePath: string, context: Record<string, any> = {}) => this.processFile(filePath, context),
      thumbnail: (srcPath: string, destPath: string) => this.generateThumbnail(srcPath, destPath),
      getExtraFileList: (filePath: string) => this.getExtraFileList(filePath),
      getExtraFile: (filePath: string, fileName: string) => this.getExtraFile(filePath, fileName),
      viewers: [{
        viewerId: 'mira-zipper',
        title: '归档浏览',
        icon: 'folder_zip',
        entry: 'viewer.html',
        priority: 10,
        getQuery: (context: any) => ({
          indexUrl: context.getExtraFileUrl(INDEX_FILE),
          fileName: context.file?.name || 'Archive',
          fileId: context.fileId,
        }),
      }],
    } satisfies Handler);
    console.log(`[${PLUGIN_NAME}] registered ZIP archive browse/preview`);
  }

  private async processFile(filePath: string, context: Record<string, any>) {
    const [stat, prepared] = await Promise.all([fs.promises.stat(filePath), this.cache.prepare(filePath)]);
    const files = prepared.index.entries.filter((entry) => !entry.isDir);
    const topDirs = new Set<string>();
    for (const entry of files) {
      const slash = entry.name.indexOf('/');
      if (slash > 0) topDirs.add(entry.name.slice(0, slash));
    }
    return {
      format: 'zip',
      size: stat.size,
      entryCount: files.length,
      topDirs: [...topDirs].slice(0, 50),
      ...context,
    };
  }

  private async generateThumbnail(srcPath: string, destPath: string): Promise<void> {
    const prepared = await this.cache.prepare(srcPath);
    const image = prepared.index.entries.find((entry) => !entry.isDir && entry.previewType === 'image');
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    const input = image ? path.join(prepared.root, image.name) : fallbackThumbnailSvg();
    await sharp(input, { limitInputPixels: 268402689 })
      .rotate()
      .resize(THUMB_MAX, THUMB_MAX, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toFile(destPath);
  }

  private async getExtraFileList(filePath: string): Promise<string[]> {
    const prepared = await this.cache.prepare(filePath);
    const names = prepared.index.entries.filter((entry) => !entry.isDir).map((entry) => entry.name);
    return [INDEX_FILE, ...names];
  }

  private async getExtraFile(filePath: string, fileName: string): Promise<string> {
    const prepared = await this.cache.prepare(filePath);
    if (fileName === INDEX_FILE) return prepared.indexPath;
    const safe = safeEntryName(fileName);
    if (!prepared.entrySet.has(safe)) throw new Error(`Unknown ZIP entry: ${fileName}`);
    const target = path.resolve(prepared.root, safe);
    const relative = path.relative(prepared.root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Invalid ZIP entry path');
    return target;
  }

  cleanup(): void {
    this.unregister?.();
    this.unregister = undefined;
    console.log(`[${PLUGIN_NAME}] cleaned up`);
  }
}

export function init(inst: any) {
  return new MiraZipperFormatPlugin(inst);
}
