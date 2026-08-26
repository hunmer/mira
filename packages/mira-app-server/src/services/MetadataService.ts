import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import PQueue from 'p-queue';
import which from 'which';
import type { ILibraryServerData } from 'mira-app-core/storage/sqlite';

const execFileAsync = promisify(execFile);

export interface MetadataRule {
  name: string;
  supportedExtensions: string[];
  parse(raw: Record<string, any>, filePath: string): Record<string, any> | Promise<Record<string, any>>;
  extractCover?: boolean;
}

const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tif', 'tiff', 'heic', 'heif',
  'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'jp2', 'exr',
];
const VIDEO_EXTENSIONS = [
  'mp4', 'mov', 'avi', 'mkv', 'flv', 'webm', 'wmv', 'm4v', 'mpg', 'mpeg',
  'mts', 'm2ts', 'ts', '3gp',
];
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus', 'wma', 'ape', 'alac'];

function first(raw: Record<string, any>, ...keys: string[]): any {
  return keys.map(key => raw[key]).find(value => value !== undefined && value !== null && value !== '');
}

function gps(raw: Record<string, any>): Record<string, any> | undefined {
  const latitude = first(raw, 'GPSLatitude', 'GPSPosition');
  const longitude = first(raw, 'GPSLongitude');
  return latitude !== undefined || longitude !== undefined ? compact({ latitude, longitude }) : undefined;
}

function compact<T extends Record<string, any>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')) as T;
}

function imageMetadata(raw: Record<string, any>): Record<string, any> {
  const make = first(raw, 'Make', 'CameraMake');
  const model = first(raw, 'Model', 'CameraModelName');
  return compact({
    width: first(raw, 'ImageWidth', 'ExifImageWidth'),
    height: first(raw, 'ImageHeight', 'ExifImageHeight'),
    dateTimeOriginal: first(raw, 'DateTimeOriginal', 'CreateDate'),
    cameraModel: [make, model].filter(Boolean).join(' ') || undefined,
    gps: gps(raw),
    aperture: first(raw, 'Aperture', 'FNumber'),
    shutterSpeed: first(raw, 'ShutterSpeed', 'ExposureTime'),
    iso: first(raw, 'ISO', 'ISOSetting'),
    lensModel: first(raw, 'LensModel', 'LensID', 'Lens'),
  });
}

function videoMetadata(raw: Record<string, any>): Record<string, any> {
  return compact({
    width: first(raw, 'ImageWidth', 'SourceImageWidth', 'VideoFrameWidth'),
    height: first(raw, 'ImageHeight', 'SourceImageHeight', 'VideoFrameHeight'),
    duration: first(raw, 'Duration', 'MediaDuration'),
    createdAt: first(raw, 'DateTimeOriginal', 'CreateDate', 'MediaCreateDate', 'TrackCreateDate'),
    frameRate: first(raw, 'VideoFrameRate', 'VideoAvgFrameRate', 'CaptureFrameRate'),
    deviceModel: first(raw, 'DeviceModelName', 'CameraModelName', 'Model'),
    gps: gps(raw),
    codec: first(raw, 'VideoCodec', 'CompressorID', 'CompressorName', 'CodecID'),
  });
}

function audioMetadata(raw: Record<string, any>): Record<string, any> {
  return compact({
    title: first(raw, 'Title'),
    artist: first(raw, 'Artist', 'AlbumArtist'),
    album: first(raw, 'Album'),
    duration: first(raw, 'Duration'),
    sampleRate: first(raw, 'SampleRate', 'AudioSampleRate'),
    bitDepth: first(raw, 'BitsPerSample', 'BitDepth'),
    channels: first(raw, 'NumChannels', 'AudioChannels', 'ChannelMode'),
    year: first(raw, 'Year', 'Date'),
    genre: first(raw, 'Genre'),
  });
}

export const BUILTIN_METADATA_RULES: MetadataRule[] = [
  { name: 'builtin:image', supportedExtensions: IMAGE_EXTENSIONS, parse: imageMetadata },
  { name: 'builtin:video', supportedExtensions: VIDEO_EXTENSIONS, parse: videoMetadata },
  { name: 'builtin:audio', supportedExtensions: AUDIO_EXTENSIONS, parse: audioMetadata, extractCover: true },
];

export class MetadataService {
  private readonly queue = new PQueue({ concurrency: 2 });
  private readonly rules: MetadataRule[] = [];
  private readonly extensionRules = new Map<string, MetadataRule>();
  private readonly progress = new Map<string, { total: number; completed: number }>();
  private readonly exiftoolPath: string | null;

  constructor(exiftoolPath?: string | null) {
    if (exiftoolPath !== undefined) {
      this.exiftoolPath = exiftoolPath;
    } else {
      try {
        this.exiftoolPath = process.env.EXIFTOOL_PATH || which.sync('exiftool');
      } catch {
        this.exiftoolPath = null;
      }
    }

    for (const rule of BUILTIN_METADATA_RULES) this.registerRule(rule);

    if (!this.exiftoolPath) console.warn('MetadataService: exiftool not found. Set EXIFTOOL_PATH or install ExifTool.');
  }

  registerRule(rule: MetadataRule): void {
    this.unregisterRule(rule.name);
    this.rules.push({
      ...rule,
      supportedExtensions: rule.supportedExtensions.map(ext => ext.replace(/^\./, '').toLowerCase()),
    });
    this.rebuildExtensionRules();
  }

  unregisterRule(name: string): void {
    const index = this.rules.findIndex(rule => rule.name === name);
    if (index === -1) return;
    this.rules.splice(index, 1);
    this.rebuildExtensionRules();
  }

  enqueue(file: Record<string, any>, dbService: ILibraryServerData, onSettled?: () => void): boolean {
    if (!this.exiftoolPath || !file?.id) return false;
    const rule = this.extensionRules.get(path.extname(file.name || file.path || '').slice(1).toLowerCase());
    if (!rule) return false;

    void this.queue.add(async () => {
      try {
        const filePath = await dbService.getItemFilePath(file, { isUrlFile: false });
        if (!filePath) return;
        const { stdout } = await execFileAsync(this.exiftoolPath!, ['-json', filePath], {
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024,
        });
        const raw = JSON.parse(stdout)[0] || {};
        const metadata = compact(await rule.parse(raw, filePath));

        if (rule.extractCover && await this.extractCover(file, filePath, dbService)) {
          metadata.cover = true;
          metadata.coverFile = `${file.hash || file.id}-cover.jpg`;
        }

        // 合并写入：保留已有 metadata 中 exiftool 未提供的字段（如导入时从源库带来的 colors/rotation）
        let existing: Record<string, any> | undefined;
        if (typeof file.metadata === 'string') {
          try { existing = JSON.parse(file.metadata); } catch { existing = undefined; }
        } else if (file.metadata && typeof file.metadata === 'object') {
          existing = file.metadata;
        }
        await dbService.updateFile(file.id, { metadata: { ...existing, ...metadata } });
      } catch (error) {
        console.error(`MetadataService: failed to parse ${file.name || file.path}:`, error);
      } finally {
        onSettled?.();
      }
    });
    return true;
  }

  async getStats(dbService: ILibraryServerData): Promise<Record<string, number | boolean>> {
    const files = await this.getSupportedFiles(dbService);
    const withMetadata = files.filter(file => file.metadata !== null && file.metadata !== undefined && file.metadata !== '').length;
    const totalFiles = files.length;
    return {
      available: this.exiftoolPath !== null,
      totalFiles,
      withMetadata,
      withoutMetadata: totalFiles - withMetadata,
      metadataRate: totalFiles > 0 ? Math.round(withMetadata / totalFiles * 100) : 0,
    };
  }

  /** 使用 exiftool 即时解析指定文件，供详情面板等按需读取完整 EXIF。 */
  async parseFile(file: Record<string, any>, filePath?: string): Promise<Record<string, any>> {
    if (!this.exiftoolPath) throw new Error('exiftool is not available');
    const sourcePath = filePath || file?.path;
    if (!sourcePath) throw new Error('File path is required');
    const { stdout } = await execFileAsync(this.exiftoolPath, ['-json', sourcePath], {
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
    });
    return JSON.parse(stdout)[0] || {};
  }

  async scanPending(libraryId: string, dbService: ILibraryServerData): Promise<{ available: boolean; queued: number }> {
    if (!this.exiftoolPath) return { available: false, queued: 0 };
    const pending = (await this.getSupportedFiles(dbService))
      .filter(file => file.metadata === null || file.metadata === undefined || file.metadata === '');
    const state = { total: pending.length, completed: 0 };
    this.progress.set(libraryId, state);

    for (const file of pending) {
      this.enqueue(file, dbService, () => { state.completed++; });
    }
    return { available: true, queued: pending.length };
  }

  getProgressData(libraryId: string): Record<string, number | boolean> {
    const state = this.progress.get(libraryId) || { total: 0, completed: 0 };
    const remaining = Math.max(0, state.total - state.completed);
    return {
      totalPending: state.total,
      completed: state.completed,
      queueLength: remaining,
      processing: remaining > 0,
      progress: state.total > 0 ? Math.round(state.completed / state.total * 100) : 0,
    };
  }

  clear(): void {
    this.queue.clear();
  }

  private rebuildExtensionRules(): void {
    this.extensionRules.clear();
    for (const rule of this.rules) {
      for (const extension of rule.supportedExtensions) this.extensionRules.set(extension, rule);
    }
  }

  private async getSupportedFiles(dbService: ILibraryServerData): Promise<Record<string, any>[]> {
    const { result } = await dbService.getFiles({ filters: { limit: 9999999 }, isUrlFile: false });
    return result.filter(file => this.extensionRules.has(path.extname(file.name || file.path || '').slice(1).toLowerCase()));
  }

  private async extractCover(file: Record<string, any>, filePath: string, dbService: ILibraryServerData): Promise<boolean> {
    const cover = await new Promise<Buffer>((resolve, reject) => {
      execFile(this.exiftoolPath!, ['-b', '-Picture', filePath], {
        encoding: 'buffer',
        windowsHide: true,
        maxBuffer: 25 * 1024 * 1024,
      }, (error, stdout) => error ? reject(error) : resolve(stdout as Buffer));
    });
    if (!cover.length) return false;

    const thumbnailPath = await dbService.getItemThumbPath(file, { isUrlFile: false });
    const coverPath = path.join(path.dirname(thumbnailPath), `${file.hash || file.id}-cover.jpg`);
    await fs.promises.mkdir(path.dirname(coverPath), { recursive: true });
    await fs.promises.writeFile(coverPath, cover);
    await dbService.updateFile(file.id, { thumb: 1 });
    return true;
  }
}
