import fs from 'fs';
import path from 'path';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { createCanvas } from '@napi-rs/canvas';
import yauzl, { Entry } from 'yauzl';

const PLUGIN_NAME = 'mira_lottie_format';
const MAX_ENTRIES = 500;
const MAX_ENTRY_SIZE = 64 * 1024 * 1024;
const MAX_TOTAL_SIZE = 512 * 1024 * 1024;
const MAX_CAPTURED_SIZE = 128 * 1024 * 1024;
const THUMBNAIL_SIZE = 512;
const CAPTURED_EXTENSIONS = new Set(['.json', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
let wasmConfigured = false;

interface AnimationMetadata {
  id?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  duration?: number;
}

interface DotLottieMetadata {
  version?: string;
  author?: string;
  animationCount: number;
  animation: AnimationMetadata;
}

interface DotLottieBundle {
  metadata: DotLottieMetadata;
  animation: Record<string, any>;
  files: Map<string, Buffer>;
}

class MiraLottieFormatPlugin {
  private unregisterFormat?: () => void;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager;
    this.unregisterFormat = pluginManager.registerFileFormat(PLUGIN_NAME, {
      id: PLUGIN_NAME,
      extensions: ['lottie'],
      mimeTypes: ['application/zip+dotlottie', 'application/x-lottie'],
      thumbnailExtensions: ['lottie'],
      process: (filePath: string, context: Record<string, any> = {}) => this.processFile(filePath, context),
      thumbnail: (srcPath: string, destPath: string) => renderThumbnail(srcPath, destPath),
      viewers: [{
        viewerId: 'mira-lottie',
        title: 'dotLottie 预览',
        icon: 'animation',
        entry: 'viewer.html',
        priority: 20,
        getQuery: ({ file, fileId, fileUrl }: any) => ({
          fileUrl,
          fileName: file.name || 'dotLottie',
          fileId,
        }),
      }],
    });
    console.log(`[${PLUGIN_NAME}] registered .lottie metadata, thumbnail, and viewer support`);
  }

  private async processFile(filePath: string, context: Record<string, any>) {
    const [stat, metadata] = await Promise.all([
      fs.promises.stat(filePath),
      readDotLottieMetadata(filePath),
    ]);
    const { animation, ...container } = metadata;
    return {
      format: 'lottie',
      size: stat.size,
      ...container,
      ...animation,
      ...context,
    };
  }

  cleanup(): void {
    this.unregisterFormat?.();
    this.unregisterFormat = undefined;
    console.log(`[${PLUGIN_NAME}] cleaned up`);
  }
}

async function renderThumbnail(sourcePath: string, destinationPath: string): Promise<void> {
  configureWasm();
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
  const bundle = await readDotLottieBundle(sourcePath);
  const data = inlineImageAssets(bundle.animation, bundle.files);
  const canvas = createCanvas(THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  const player = new DotLottie({
    canvas: canvas as unknown as HTMLCanvasElement,
    data,
    autoplay: false,
    loop: false,
    layout: { fit: 'contain', align: [0.5, 0.5] },
    renderConfig: { autoResize: false, devicePixelRatio: 1 },
  });

  try {
    await waitForLoad(player);
    player.setFrame(Math.max(0, Math.floor((player.totalFrames - 1) * 0.5)));
    await fs.promises.writeFile(destinationPath, canvas.toBuffer('image/png'));
  } finally {
    player.destroy();
  }
}

function configureWasm(): void {
  if (wasmConfigured) return;
  const wasmPath = require.resolve('@lottiefiles/dotlottie-web/dotlottie-player.wasm');
  const wasm = fs.readFileSync(wasmPath).toString('base64');
  DotLottie.setWasmUrl(`data:application/wasm;base64,${wasm}`);
  wasmConfigured = true;
}

function waitForLoad(player: DotLottie): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('dotLottie renderer timed out')), 30000);
    const onLoad = () => finish();
    const onError = () => finish(new Error('dotLottie renderer failed to load the animation'));
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      player.removeEventListener('load', onLoad);
      player.removeEventListener('loadError', onError);
      if (error) reject(error);
      else resolve();
    };
    player.addEventListener('load', onLoad);
    player.addEventListener('loadError', onError);
  });
}

async function readDotLottieMetadata(sourcePath: string): Promise<DotLottieMetadata> {
  return (await readDotLottieBundle(sourcePath)).metadata;
}

function readDotLottieBundle(sourcePath: string): Promise<DotLottieBundle> {
  return new Promise((resolve, reject) => {
    yauzl.open(sourcePath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) return reject(openError || new Error('Unable to open dotLottie archive'));
      const jsonFiles = new Map<string, Buffer>();
      let entries = 0;
      let totalSize = 0;
      let capturedSize = 0;
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
        try {
          settled = true;
          resolve(parseBundle(jsonFiles));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
      zipFile.on('entry', (entry: Entry) => {
        void handleEntry(zipFile, entry, jsonFiles, {
          count: ++entries,
          totalSize: totalSize += entry.uncompressedSize,
          capturedSize,
        }).then((readSize) => {
          capturedSize += readSize;
          zipFile.readEntry();
        }).catch(fail);
      });
      zipFile.readEntry();
    });
  });
}

async function handleEntry(
  zipFile: yauzl.ZipFile,
  entry: Entry,
  jsonFiles: Map<string, Buffer>,
  limits: { count: number; totalSize: number; capturedSize: number },
): Promise<number> {
  const fileName = validateEntryName(entry.fileName);
  if (limits.count > MAX_ENTRIES) throw new Error(`dotLottie archive exceeds ${MAX_ENTRIES} entries`);
  if (entry.uncompressedSize > MAX_ENTRY_SIZE) throw new Error(`dotLottie entry is too large: ${fileName}`);
  if (limits.totalSize > MAX_TOTAL_SIZE) throw new Error('dotLottie extracted size is too large');
  const extension = path.posix.extname(fileName).toLowerCase();
  if (/\/$/.test(fileName) || !CAPTURED_EXTENSIONS.has(extension)) return 0;
  if (limits.capturedSize + entry.uncompressedSize > MAX_CAPTURED_SIZE) {
    throw new Error('dotLottie captured resources are too large');
  }
  jsonFiles.set(fileName, await readEntry(zipFile, entry));
  return entry.uncompressedSize;
}

function validateEntryName(value: string): string {
  if (value.includes('\0')) throw new Error('dotLottie entry contains a NUL character');
  const normalized = value.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error(`dotLottie entry uses an absolute path: ${value}`);
  }
  if (normalized.split('/').includes('..')) throw new Error(`dotLottie entry escapes its archive: ${value}`);
  return normalized;
}

function readEntry(zipFile: yauzl.ZipFile, entry: Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (streamError, stream) => {
      if (streamError || !stream) return reject(streamError || new Error(`Unable to read ${entry.fileName}`));
      const chunks: Buffer[] = [];
      let size = 0;
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_ENTRY_SIZE) stream.destroy(new Error(`dotLottie entry is too large: ${entry.fileName}`));
        else chunks.push(chunk);
      });
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  });
}

function parseBundle(files: Map<string, Buffer>): DotLottieBundle {
  const manifestBuffer = files.get('manifest.json');
  if (!manifestBuffer) throw new Error('dotLottie archive is missing manifest.json');
  const manifest = JSON.parse(manifestBuffer.toString('utf8')) as Record<string, any>;
  const animations = Array.isArray(manifest.animations) ? manifest.animations : [];
  const firstId = String(animations[0]?.id || '');
  const preferredNames = [`animations/${firstId}.json`, `a/${firstId}.json`];
  const animationEntry = preferredNames
    .map((name) => files.get(name))
    .find(Boolean) || Array.from(files.entries()).find(([name]) => name !== 'manifest.json')?.[1];
  if (!animationEntry) throw new Error('dotLottie archive has no animation JSON');
  const animation = JSON.parse(animationEntry.toString('utf8')) as Record<string, any>;
  const frameRate = finiteNumber(animation.fr);
  const firstFrame = finiteNumber(animation.ip) || 0;
  const lastFrame = finiteNumber(animation.op);
  return {
    files,
    animation,
    metadata: {
      version: typeof manifest.version === 'string' ? manifest.version : undefined,
      author: typeof manifest.author === 'string' ? manifest.author : undefined,
      animationCount: animations.length || 1,
      animation: {
        id: firstId || undefined,
        width: finiteNumber(animation.w),
        height: finiteNumber(animation.h),
        frameRate,
        duration: frameRate && lastFrame !== undefined ? Math.max(0, (lastFrame - firstFrame) / frameRate) : undefined,
      },
    },
  };
}

function inlineImageAssets(animation: Record<string, any>, files: Map<string, Buffer>): Record<string, any> {
  const copy = JSON.parse(JSON.stringify(animation)) as Record<string, any>;
  const entries = Array.from(files.entries());
  for (const asset of Array.isArray(copy.assets) ? copy.assets : []) {
    if (!asset || typeof asset.p !== 'string' || /^data:/i.test(asset.p)) continue;
    const reference = `${typeof asset.u === 'string' ? asset.u : ''}${asset.p}`.replace(/^\.\//, '').replace(/\\/g, '/');
    const match = entries.find(([name]) => name.toLowerCase() === reference.toLowerCase())
      || entries.find(([name]) => path.posix.basename(name).toLowerCase() === path.posix.basename(reference).toLowerCase());
    if (!match) continue;
    asset.p = `data:${mimeType(match[0])};base64,${match[1].toString('base64')}`;
    asset.u = '';
    asset.e = 1;
  }
  return copy;
}

function mimeType(fileName: string): string {
  switch (path.posix.extname(fileName).toLowerCase()) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

function finiteNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function init(inst: any) {
  return new MiraLottieFormatPlugin(inst);
}

export const testables = { readDotLottieMetadata, renderThumbnail };
