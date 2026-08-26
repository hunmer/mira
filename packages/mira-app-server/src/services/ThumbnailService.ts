import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';
import Queue from 'queue';
import which from 'which';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ILibraryServerData } from 'mira-app-core/storage/sqlite';
import { MiraWebsocketServer } from '../WebSocketServer';

export interface ThumbnailGenerator {
  name: string;
  supportedExtensions: string[];
  generate(srcPath: string, destPath: string): Promise<void>;
}

const execFileAsync = promisify(execFile);
const HLS_SEGMENT_DURATION = 4;
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'flv', 'webm', 'wmv', 'm4v', 'mpg', 'mpeg', 'mts', 'm2ts', 'ts', '3gp'];
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus', 'wma', 'ape', 'alac'];
const IMAGE_MAGICK_EXTENSIONS = [
  'tif', 'tiff', 'psd', 'psb', 'heic', 'heif', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf',
  'jp2', 'j2k', 'jpc', 'exr', 'hdr', 'tga', 'pcx', 'dds', 'dcm', 'dpx', 'fits', 'pdf', 'eps', 'ai',
  'ico', 'cur', 'xpm', 'xbm'
];
const GHOSTSCRIPT_EXTENSIONS = new Set(['pdf', 'eps', 'ai']);

class ImageMagickThumbnailGenerator implements ThumbnailGenerator {
  name = 'imagemagick-image';
  supportedExtensions: string[];

  constructor(private readonly binary: string, supportedExtensions: string[]) {
    this.supportedExtensions = supportedExtensions;
  }

  async generate(srcPath: string, destPath: string): Promise<void> {
    await runImageMagick(this.binary, srcPath, destPath, 200, 'png');
  }
}

async function runImageMagick(binary: string, srcPath: string, destPath: string, maxDimension: number, format: 'png' | 'webp'): Promise<void> {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const input = `${srcPath}[0]`;
  const args = [input, '-auto-orient', '-flatten', '-resize', `${maxDimension}x${maxDimension}>`, '-strip'];
  if (format === 'webp') args.push('-quality', '88');
  args.push(`${format}:${destPath}`);
  await execFileAsync(binary, args, { windowsHide: true, maxBuffer: 1024 * 1024 * 4 });
}

class ImageThumbnailGenerator implements ThumbnailGenerator {
  name = 'image';
  supportedExtensions = ['jpg', 'jpeg', 'jfif', 'png', 'gif', 'bmp', 'webp', 'avif'];

  async generate(srcPath: string, destPath: string): Promise<void> {
    const thumbDir = path.dirname(destPath);
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    return new Promise<void>((resolve) => {
      ffmpeg(srcPath)
        .outputOptions(['-vf', 'scale=200:-1:force_original_aspect_ratio=decrease', '-frames:v', '1'])
        .output(destPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          console.error('Image thumbnail error:', srcPath, err.message);
          resolve();
        })
        .run();
    });
  }
}

class VideoThumbnailGenerator implements ThumbnailGenerator {
  name = 'video';
  supportedExtensions = VIDEO_EXTENSIONS;

  async generate(srcPath: string, destPath: string): Promise<void> {
    return new Promise<void>((resolve) => {
      ffmpeg(srcPath)
        .screenshots({
          timestamps: ['00:00:01'] as [string],
          filename: path.basename(destPath),
          folder: path.dirname(destPath),
          size: '200x?',
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          console.error('Video thumbnail error:', srcPath, err.message);
          resolve();
        });
    });
  }
}

class AudioThumbnailGenerator implements ThumbnailGenerator {
  name = 'audio';
  supportedExtensions = AUDIO_EXTENSIONS;

  constructor(private readonly binary: string) {}

  async generate(srcPath: string, destPath: string): Promise<void> {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    await execFileAsync(this.binary, [
      '-nostdin', '-y', '-i', srcPath,
      '-filter_complex', 'aformat=channel_layouts=mono,showwavespic=s=200x200:colors=0x4f46e5',
      '-frames:v', '1', destPath,
    ], { windowsHide: true, maxBuffer: 1024 * 1024 * 4 });
  }
}

interface HlsPreviewMetadata {
  duration: number;
  totalSegments: number;
  hasVideo: boolean;
  cacheDir: string;
}

export class ThumbnailService {
  private generators: ThumbnailGenerator[] = [];
  private extMap: Map<string, ThumbnailGenerator> = new Map();
  private taskQueue: Queue;
  private progress: Map<string, { total: number; completed: number }> = new Map();
  private wsServer: MiraWebsocketServer | null = null;
  private readonly imageMagickPath: string | null;
  private readonly ghostscriptPath: string | null;
  private readonly ffmpegPath: string | null;
  private readonly ffprobePath: string | null;
  private previewTasks = new Map<string, Promise<string>>();
  private hlsMetadataTasks = new Map<string, Promise<HlsPreviewMetadata>>();
  private hlsSegmentTasks = new Map<string, Promise<string>>();

  constructor() {
    this.taskQueue = new Queue({ concurrency: 5, autostart: true });

    try {
      this.ffmpegPath = process.env.FFMPEG_PATH || which.sync('ffmpeg');
      ffmpeg.setFfmpegPath(this.ffmpegPath);
    } catch {
      this.ffmpegPath = null;
      console.warn('ThumbnailService: ffmpeg not found. Set FFMPEG_PATH or install ffmpeg.');
    }

    try {
      this.ffprobePath = process.env.FFPROBE_PATH || which.sync('ffprobe');
      ffmpeg.setFfprobePath(this.ffprobePath);
    } catch {
      this.ffprobePath = null;
      console.warn('ThumbnailService: ffprobe not found. Set FFPROBE_PATH or install ffprobe.');
    }

    try {
      this.imageMagickPath = process.env.IMAGEMAGICK_PATH || which.sync('magick');
    } catch {
      this.imageMagickPath = null;
      console.warn('ThumbnailService: ImageMagick not found. Install ImageMagick to preview RAW/PSD/TIFF files.');
    }

    this.ghostscriptPath = ['gswin64c', 'gs'].map(name => {
      try { return which.sync(name); } catch { return null; }
    }).find(Boolean) || null;
    if (!this.ghostscriptPath) {
      console.warn('ThumbnailService: Ghostscript not found. PDF/EPS/AI thumbnails are disabled.');
    }

    this.registerGenerator(new ImageThumbnailGenerator());
    this.registerGenerator(new VideoThumbnailGenerator());
    if (this.ffmpegPath) this.registerGenerator(new AudioThumbnailGenerator(this.ffmpegPath));
    if (this.imageMagickPath) {
      const supportedExtensions = this.ghostscriptPath
        ? IMAGE_MAGICK_EXTENSIONS
        : IMAGE_MAGICK_EXTENSIONS.filter(ext => !GHOSTSCRIPT_EXTENSIONS.has(ext));
      this.registerGenerator(new ImageMagickThumbnailGenerator(this.imageMagickPath, supportedExtensions));
    }
  }

  setWebSocketServer(server: MiraWebsocketServer): void {
    this.wsServer = server;
  }

  registerGenerator(generator: ThumbnailGenerator): void {
    // Remove existing generator with same name
    this.generators = this.generators.filter(g => g.name !== generator.name);
    this.generators.push(generator);
    for (const ext of generator.supportedExtensions) {
      this.extMap.set(ext, generator);
    }
  }

  unregisterGenerator(name: string): void {
    const gen = this.generators.find(g => g.name === name);
    if (!gen) return;
    for (const ext of gen.supportedExtensions) {
      if (this.extMap.get(ext) === gen) {
        this.extMap.delete(ext);
      }
    }
    this.generators = this.generators.filter(g => g.name !== name);
  }

  getGenerators(): ThumbnailGenerator[] {
    return [...this.generators];
  }

  hasImageMagick(): boolean {
    return this.imageMagickPath !== null;
  }

  async getPreviewPath(srcPath: string, cacheDir: string, cacheKey: string): Promise<string> {
    if (!this.imageMagickPath) throw new Error('ImageMagick is not installed');
    const stat = await fs.promises.stat(srcPath);
    const extension = path.extname(srcPath).toLowerCase().slice(1);
    if (GHOSTSCRIPT_EXTENSIONS.has(extension) && !this.ghostscriptPath) {
      throw new Error('Ghostscript is required to preview PDF/EPS/AI files');
    }
    const key = crypto.createHash('sha256').update(`${cacheKey}:${stat.size}:${stat.mtimeMs}`).digest('hex');
    const destPath = path.join(cacheDir, `${key}.webp`);
    const existing = await fs.promises.stat(destPath).catch(() => null);
    if (existing) return destPath;

    const pending = this.previewTasks.get(destPath);
    if (pending) return pending;
    const task = runImageMagick(this.imageMagickPath, srcPath, destPath, 4096, 'webp')
      .then(() => destPath)
      .finally(() => this.previewTasks.delete(destPath));
    this.previewTasks.set(destPath, task);
    return task;
  }

  async getHlsPlaylist(srcPath: string, cacheDir: string, cacheKey: string, segmentQuery = ''): Promise<string> {
    const meta = await this.getHlsMetadata(srcPath, cacheDir, cacheKey);
    let playlist = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:${HLS_SEGMENT_DURATION}\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXT-X-INDEPENDENT-SEGMENTS\n`;
    for (let index = 0; index < meta.totalSegments; index++) {
      const duration = Math.min(HLS_SEGMENT_DURATION, meta.duration - index * HLS_SEGMENT_DURATION);
      playlist += `#EXTINF:${duration.toFixed(3)},\nsegment/${index}.ts${segmentQuery}\n`;
    }
    return `${playlist}#EXT-X-ENDLIST\n`;
  }

  async getHlsSegmentPath(srcPath: string, cacheDir: string, cacheKey: string, segmentIndex: number): Promise<string> {
    if (!this.ffmpegPath) throw new Error('FFmpeg is not installed');
    const meta = await this.getHlsMetadata(srcPath, cacheDir, cacheKey);
    if (!Number.isInteger(segmentIndex) || segmentIndex < 0 || segmentIndex >= meta.totalSegments) {
      throw new RangeError('Invalid HLS segment');
    }

    const destPath = path.join(meta.cacheDir, `segment-${segmentIndex}.ts`);
    if (await fs.promises.stat(destPath).catch(() => null)) return destPath;
    const pending = this.hlsSegmentTasks.get(destPath);
    if (pending) return pending;

    const start = segmentIndex * HLS_SEGMENT_DURATION;
    const duration = Math.min(HLS_SEGMENT_DURATION, meta.duration - start);
    const tempPath = `${destPath}.${process.pid}.${Date.now()}.tmp`;
    const args = ['-nostdin', '-y', '-ss', String(start), '-i', srcPath, '-t', String(duration), '-map', '0:v:0?', '-map', '0:a:0?', '-sn', '-dn'];
    if (meta.hasVideo) {
      args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-pix_fmt', 'yuv420p', '-g', '48', '-force_key_frames', `expr:gte(t,n_forced*${HLS_SEGMENT_DURATION})`);
    }
    args.push('-c:a', 'aac', '-b:a', '160k', '-output_ts_offset', String(start), '-fflags', '+genpts', '-muxdelay', '0', '-f', 'mpegts', tempPath);

    const task = execFileAsync(this.ffmpegPath, args, { windowsHide: true, maxBuffer: 1024 * 1024 * 8 })
      .then(async () => {
        await fs.promises.rename(tempPath, destPath);
        return destPath;
      })
      .catch(async error => {
        await fs.promises.unlink(tempPath).catch(() => undefined);
        throw error;
      })
      .finally(() => this.hlsSegmentTasks.delete(destPath));
    this.hlsSegmentTasks.set(destPath, task);
    return task;
  }

  private async getHlsMetadata(srcPath: string, cacheDir: string, cacheKey: string): Promise<HlsPreviewMetadata> {
    if (!this.ffmpegPath || !this.ffprobePath) throw new Error('FFmpeg and ffprobe are required');
    const stat = await fs.promises.stat(srcPath);
    const key = crypto.createHash('sha256').update(`${cacheKey}:${stat.size}:${stat.mtimeMs}`).digest('hex');
    const existing = this.hlsMetadataTasks.get(key);
    if (existing) return existing;

    const task = execFileAsync(this.ffprobePath, [
      '-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', srcPath,
    ], { windowsHide: true, maxBuffer: 1024 * 1024 * 4 }).then(async result => {
      const data = JSON.parse(String(result.stdout));
      const duration = Number(data.format?.duration || 0);
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('Media duration is unavailable');
      const streams = Array.isArray(data.streams) ? data.streams : [];
      if (!streams.some((stream: any) => stream.codec_type === 'video' || stream.codec_type === 'audio')) {
        throw new Error('No audio or video stream found');
      }
      const mediaCacheDir = path.join(cacheDir, 'hls', key);
      await fs.promises.mkdir(mediaCacheDir, { recursive: true });
      return {
        duration,
        totalSegments: Math.ceil(duration / HLS_SEGMENT_DURATION),
        hasVideo: streams.some((stream: any) => stream.codec_type === 'video'),
        cacheDir: mediaCacheDir,
      };
    }).catch(error => {
      this.hlsMetadataTasks.delete(key);
      throw error;
    });
    this.hlsMetadataTasks.set(key, task);
    return task;
  }

  private getGeneratorForFile(filePath: string): ThumbnailGenerator | null {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    return this.extMap.get(ext) || null;
  }

  /**
   * 文件入库回调（onFileImported 钩子）：入队生成缩略图。
   * 触发点是数据层 createFileFromPath，上传/导入/CLI 等所有写入路径统一生效，
  * 不依赖调用方广播 EventManager 事件。
  */
  onFileImported(libraryId: string, file: Record<string, any>, dbService: ILibraryServerData): void {
    const generator = this.getGeneratorForFile(file.name || file.path || '');
    if (!generator) return;

    this.taskQueue.push(async () => {
      try {
        // 已有缩略图则跳过（如导入时从源库复制的缩略图），避免覆盖
        const current = await dbService.getFile(file.id);
        if (!current || current.thumb) return;

        const filePath = await dbService.getItemFilePath(current, { isUrlFile: false });
        const thumbPath = await dbService.getItemThumbPath(current);
        // 生成到同扩展名临时文件；写回前复查 thumb（copyThumb 可能在生成期间已放入源缩略图）
        const tmpPath = thumbPath.replace(/(\.[^.]+)?$/, (ext) => `.gen${ext || '.png'}`);
        await generator.generate(filePath, tmpPath);

        const latest = await dbService.getFile(file.id);
        if (latest?.thumb) {
          try { fs.unlinkSync(tmpPath); } catch {}
          return;
        }
        await fs.promises.rename(tmpPath, thumbPath);

        if (fs.existsSync(thumbPath)) {
          const record = latest ?? current;
          // WebSocket 事件与文件列表接口统一广播可直接加载的缩略图 URL。
          record.thumb = await dbService.getItemThumbPath(record, { isUrlFile: true });
          await dbService.updateFile(record.id, { thumb: 1 }); // return value unused
          this.wsServer?.broadcastLibraryEvent(libraryId, 'thumbnail::generated', record);
        } else {
          console.warn('Thumbnail generation failed:', thumbPath);
        }
      } catch (err) {
        console.error('Failed to generate thumbnail:', err);
      }
    });
  }

  /**
   * 文件删除回调（onFileDeleted 钩子，仅在硬删/清空回收站时触发）：
   * 清理 thumbs/<hash|id>.png 与 <hash|id>-cover.jpg。
   * 行已被删除，不再回写 thumb 字段；回收站/恢复不经过此回调，缩略图保留。
   */
  onFileDeleted(libraryId: string, item: any, dbService: ILibraryServerData): void {
    (async () => {
      try {
        const thumbPath = await dbService.getItemThumbPath(item);
        const key = item.hash || item.id;
        const candidates = [
          thumbPath,
          path.join(path.dirname(thumbPath), `${key}-cover.jpg`),
          // 老格式缩略图（曾存于文件同目录 preview.png）
          path.join(await dbService.getItemPath(item), 'preview.png'),
        ];
        for (const file of candidates) {
          try {
            if (file && fs.existsSync(file)) fs.unlinkSync(file);
          } catch {}
        }
      } catch (err) {
        console.error('Failed to delete thumbnail:', err);
      }
    })();
  }

  async scanPending(libraryId: string, dbService: ILibraryServerData, reason: string = 'unknown'): Promise<void> {
    const pendingFiles = await this.getPendingFiles(libraryId, dbService);
    const total = pendingFiles.length;
    this.progress.set(libraryId, { total, completed: 0 });
    for (const file of pendingFiles) {
      this.taskQueue.push(async () => {
        try {
          const filePath = await dbService.getItemFilePath(file, { isUrlFile: false });
          const generator = this.getGeneratorForFile(filePath);
          if (!generator) {
            this.incrementProgress(libraryId);
            return;
          }

          const thumbPath = await dbService.getItemThumbPath(file);
          await generator.generate(filePath, thumbPath);

          if (fs.existsSync(thumbPath)) {
            await dbService.updateFile(file.id, { thumb: 1 }); // return value unused
          }
        } catch (err) {
          console.error('Failed to process thumbnail:', err);
        }
        this.incrementProgress(libraryId);
      });
    }
  }

  private incrementProgress(libraryId: string): { total: number; completed: number } {
    const p = this.progress.get(libraryId);
    if (p) {
      p.completed++;
      return p;
    }
    return { total: 0, completed: 0 };
  }

  cancelScan(): void {
    this.taskQueue.stop();
    this.taskQueue.splice(0, this.taskQueue.length);
    this.taskQueue.start();
  }

  async getStats(libraryId: string, dbService: ILibraryServerData) {
    const allFiles = await dbService.getFiles({
      select: 'id,thumb',
      filters: { limit: 9999999 },
      isUrlFile: false,
      countFile: true,
    });

    const totalFiles = allFiles.result.length;
    const withThumbs = allFiles.result.filter((f: any) => f.thumb === 1).length;

    return {
      totalFiles,
      withThumbnails: withThumbs,
      withoutThumbnails: totalFiles - withThumbs,
      thumbnailRate: totalFiles > 0 ? Math.round((withThumbs / totalFiles) * 100) : 0,
    };
  }

  async getProgressData(libraryId: string, dbService: ILibraryServerData) {
    const p = this.progress.get(libraryId) || { total: 0, completed: 0 };
    const queueLength = this.taskQueue.length;
    const totalPending = p.total;
    const processing = queueLength > 0;

    return {
      totalPending,
      queueLength,
      processing,
      completed: p.completed,
      progress: totalPending > 0 ? Math.round((p.completed / totalPending) * 100) : 100,
    };
  }

  async syncThumbStatus(libraryId: string, dbService: ILibraryServerData, reason: string = 'manual-sync'): Promise<{ total: number; synced: number }> {
    const libraryPath: string = dbService.config?.customFields?.path || '';
    const files = (await dbService.getFiles({
      select: 'id,hash,thumb',
      filters: { limit: 9999999 },
      isUrlFile: false,
      countFile: true,
    })).result;

    const total = files.length;
    this.progress.set(libraryId, { total, completed: 0 });
    // fast-glob 一次扫描 thumbs 目录
    const thumbsDir = path.join(libraryPath, 'thumbs');
    const existingThumbs = new Set<string>();
    if (fs.existsSync(thumbsDir)) {
      const entries = await fg('*.png', { cwd: thumbsDir, absolute: false });
      for (const entry of entries) {
        existingThumbs.add(path.basename(entry, '.png'));
      }
    }
    // 对比收集需要更新的记录
    const toUpdate0to1: number[] = [];
    const toUpdate1to0: number[] = [];
    for (const file of files) {
      const thumbKey = file.hash || String(file.id);
      const diskHas = existingThumbs.has(thumbKey);
      if (diskHas && file.thumb !== 1) toUpdate0to1.push(file.id);
      else if (!diskHas && file.thumb !== 0) toUpdate1to0.push(file.id);
    }

    const mismatchCount = toUpdate0to1.length + toUpdate1to0.length;
    // 批量 SQL 更新
    let synced = 0;
    const query = (dbService as any).query.bind(dbService);
    const batchSize = 500;
    const updateBatch = async (ids: number[], thumbValue: number) => {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        await query(`UPDATE files SET thumb = ? WHERE id IN (${placeholders})`, [thumbValue, ...batch]);
        synced += batch.length;
        const p = this.progress.get(libraryId)!;
        p.completed = synced;
      }
    };

    if (toUpdate0to1.length > 0) await updateBatch(toUpdate0to1, 1);
    if (toUpdate1to0.length > 0) await updateBatch(toUpdate1to0, 0);

    const p = this.progress.get(libraryId)!;
    p.completed = total;
    return { total, synced };
  }

  private async getPendingFiles(libraryId: string, dbService: ILibraryServerData): Promise<any[]> {
    const files = (await dbService.getFiles({
      select: 'id,hash,folder_id,name',
      filters: { thumb: 0, limit: 9999999 },
      isUrlFile: false,
    })).result;

    const pending: any[] = [];
    for (const file of files) {
      try {
        const thumbPath = await dbService.getItemThumbPath(file, { isUrlFile: false });
        if (!fs.existsSync(thumbPath)) {
          pending.push(file);
        } else {
          await dbService.updateFile(file.id, { thumb: 1 });
        }
      } catch {
        continue;
      }
    }
    return pending;
  }
}
