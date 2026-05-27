import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import Queue from 'queue';
import which from 'which';
import { EventArgs } from 'mira-app-core';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraWebsocketServer } from '../WebSocketServer';

export interface ThumbnailGenerator {
  name: string;
  supportedExtensions: string[];
  generate(srcPath: string, destPath: string): Promise<void>;
}

class ImageThumbnailGenerator implements ThumbnailGenerator {
  name = 'image';
  supportedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

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
  supportedExtensions = ['mp4', 'mov', 'avi', 'mkv', 'flv', 'webm'];

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

export class ThumbnailService {
  private generators: ThumbnailGenerator[] = [];
  private extMap: Map<string, ThumbnailGenerator> = new Map();
  private taskQueue: Queue;
  private progress: Map<string, { total: number; completed: number }> = new Map();
  private wsServer: MiraWebsocketServer | null = null;

  constructor() {
    this.taskQueue = new Queue({ concurrency: 5, autostart: true });

    try {
      let ffmpegPath = process.env.FFMPEG_PATH;
      if (!ffmpegPath) {
        ffmpegPath = which.sync('ffmpeg');
      }
      if (ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
        console.log('ThumbnailService: ffmpeg found at', ffmpegPath);
      }
    } catch {
      console.warn('ThumbnailService: ffmpeg not found. Set FFMPEG_PATH or install ffmpeg.');
    }

    this.registerGenerator(new ImageThumbnailGenerator());
    this.registerGenerator(new VideoThumbnailGenerator());
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
    console.log(`ThumbnailService: registered generator '${generator.name}' for [${generator.supportedExtensions.join(', ')}]`);
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

  private getGeneratorForFile(filePath: string): ThumbnailGenerator | null {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    return this.extMap.get(ext) || null;
  }

  onFileCreated(libraryId: string, event: EventArgs, dbService: ILibraryServerData): void {
    const { result } = event.args;
    const filePath = result.path;
    const generator = this.getGeneratorForFile(filePath);
    if (!generator) return;

    this.taskQueue.push(async () => {
      try {
        const thumbPath = await dbService.getItemThumbPath(result);
        await generator.generate(filePath, thumbPath);

        if (fs.existsSync(thumbPath)) {
          result.thumb = thumbPath;
          await dbService.updateFile(result.id, { thumb: 1 });
          console.log('Thumbnail generated:', thumbPath);
          this.wsServer?.broadcastLibraryEvent(libraryId, 'thumbnail::generated', result);
        } else {
          console.warn('Thumbnail generation failed:', thumbPath);
        }
      } catch (err) {
        console.error('Failed to generate thumbnail:', err);
      }
    });
  }

  onFileDeleted(libraryId: string, item: any, dbService: ILibraryServerData): void {
    (async () => {
      try {
        const thumbPath = path.join(
          await dbService.getItemPath(item),
          'preview.png'
        );
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
        await dbService.updateFile(item.id, { thumb: 0 });
      } catch (err) {
        console.error('Failed to delete thumbnail:', err);
      }
    })();
  }

  async scanPending(libraryId: string, dbService: ILibraryServerData, reason: string = 'unknown'): Promise<void> {
    const pendingFiles = await this.getPendingFiles(libraryId, dbService);
    const total = pendingFiles.length;
    this.progress.set(libraryId, { total, completed: 0 });
    console.log(`ThumbnailService: scanning ${total} pending files for library ${libraryId} (reason: ${reason})`);

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
            await dbService.updateFile(file.id, { thumb: 1 });
          }
        } catch (err) {
          console.error('Failed to process thumbnail:', err);
        }
        this.incrementProgress(libraryId);
      });
    }
  }

  private incrementProgress(libraryId: string): void {
    const p = this.progress.get(libraryId);
    if (p) {
      p.completed++;
    }
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
    const files = (await dbService.getFiles({
      select: 'id,hash,thumb',
      filters: { limit: 9999999 },
      isUrlFile: false,
      countFile: true,
    })).result;

    const total = files.length;
    this.progress.set(libraryId, { total, completed: 0 });
    console.log(`ThumbnailService: syncing ${total} files for library ${libraryId} (reason: ${reason})`);

    let synced = 0;
    for (const file of files) {
      try {
        const thumbPath = await dbService.getItemThumbPath(file, { isUrlFile: false });
        const exists = fs.existsSync(thumbPath);
        const expected = exists ? 1 : 0;
        if (file.thumb !== expected) {
          await dbService.updateFile(file.id, { thumb: expected });
          synced++;
        }
      } catch {
        // skip
      }
      this.incrementProgress(libraryId);
    }
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
