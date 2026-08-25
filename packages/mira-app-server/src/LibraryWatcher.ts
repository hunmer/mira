import * as chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { LibraryServerDataSQLite } from 'mira-app-core/storage/sqlite';
import { MiraWebsocketServer } from './WebSocketServer';
import { createSyncFilter, ShouldSyncFn } from './sync/SyncFilter';

interface PendingUnlink {
  id: number;
  size: number;
  data: Record<string, any>;
  timer: ReturnType<typeof setTimeout>;
}

export class LibraryWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private libraryService: LibraryServerDataSQLite;
  private libraryPath: string;
  private libraryId: string;
  private webSocketServer: MiraWebsocketServer;
  private pendingUnlinks = new Map<string, PendingUnlink>();
  private ignoredPaths = new Set<string>();
  private usePolling = false;
  /** 基于 customFields 的同步过滤判定（黑名单/白名单，gitignore 语义） */
  private shouldSync: ShouldSyncFn;

  constructor(libraryService: LibraryServerDataSQLite, webSocketServer: MiraWebsocketServer) {
    this.libraryService = libraryService;
    this.webSocketServer = webSocketServer;
    this.libraryPath = libraryService.config.customFields?.path || libraryService.config.path || '';
    this.libraryId = libraryService.getLibraryId();
    // 读取库配置里的黑白名单（多行文本），构造统一的过滤函数
    this.shouldSync = createSyncFilter(libraryService.config.customFields);
  }

  async start(): Promise<void> {
    if (!this.libraryPath || !fs.existsSync(this.libraryPath)) {
      console.warn(`[Watcher] Library path does not exist: ${this.libraryPath}`);
      return;
    }

    this.startWatcher(false);

    // 启动时扫描已有文件，同步未入库的
    this.initialSync();

  }

  private startWatcher(polling: boolean): void {
    this.usePolling = polling;

    this.watcher = chokidar.watch(this.libraryPath, {
      ignoreInitial: true,
      ignored: (filePath: string) => {
        const rel = path.relative(this.libraryPath, filePath).replace(/\\/g, '/');
        if (rel === '') return false;
        // shouldSync 返回 true 表示要同步 → chokidar 的 ignored 语义相反
        return !this.shouldSync(rel);
      },
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 200,
      },
      persistent: false,
      depth: 10,
      usePolling: polling,
      interval: polling ? 3000 : undefined,
      binaryInterval: polling ? 3000 : undefined,
    });

    this.watcher.on('add', (filePath: string) => this.handleNewFile(filePath));
    this.watcher.on('unlink', (filePath: string) => this.handleUnlink(filePath));
    this.watcher.on('error', (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('ENOSPC') && !this.usePolling) {
        console.warn(`[Watcher] ENOSPC: inotify limit reached, falling back to polling for library ${this.libraryId}`);
        this.watcher!.close();
        this.startWatcher(true);
        this.initialSync();
        return;
      }
      console.error(`[Watcher] Error for library ${this.libraryId}:`, error);
    });

  }

  // 启动时扫描文件夹，把未入库的文件导入
  private async initialSync(): Promise<void> {
    try {
      const files = await this.scanDir(this.libraryPath);
      let imported = 0;
      for (const filePath of files) {
        try {
          const stat = fs.statSync(filePath);
          if (stat.size === 0) continue;

          const rows = await this.libraryService.getSql(
            'SELECT id FROM files WHERE path = ? LIMIT 1',
            [filePath]
          );
          if (rows.length > 0) continue;

          const folderId = await this.resolveFolder(filePath);
          const fileData: Record<string, any> = {};
          if (folderId) fileData.folder_id = folderId;

          const result = await this.libraryService.createFileFromPath(filePath, fileData, { importType: 'link' });
          imported++;

          this.webSocketServer.broadcastPluginEvent('file::created', {
            message: { type: 'file', action: 'create' },
            result,
            libraryId: this.libraryId,
          });
          this.webSocketServer.broadcastLibraryEvent(this.libraryId, 'file::created', {
            ...result,
            libraryId: this.libraryId,
          });
        } catch (e) {
          console.error(`[Watcher] Initial sync failed for ${filePath}:`, e);
        }
      }
      if (imported > 0) {
        this.webSocketServer.broadcastLibraryEvent(this.libraryId, 'file::synced', {
          libraryId: this.libraryId,
          imported,
        });
      }
    } catch (e) {
      console.error(`[Watcher] Initial sync error:`, e);
    }
  }

  private async scanDir(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const rel = path.relative(this.libraryPath, fullPath).replace(/\\/g, '/');
      if (this.shouldIgnore(rel)) continue;

      if (entry.isDirectory()) {
        results.push(...await this.scanDir(fullPath));
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
    return results;
  }

  /** 文件是否应被忽略（不参与扫描/同步）。规则来自 createSyncFilter()。 */
  private shouldIgnore(rel: string): boolean {
    if (rel === '') return false;
    return !this.shouldSync(rel);
  }

  ignorePath(filePath: string): void {
    this.ignoredPaths.add(filePath);
    setTimeout(() => this.ignoredPaths.delete(filePath), 10000);
  }

  private isIgnored(filePath: string): boolean {
    return this.ignoredPaths.has(filePath);
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    // 清理 pending timers
    for (const [, entry] of this.pendingUnlinks) {
      clearTimeout(entry.timer);
    }
    this.pendingUnlinks.clear();
  }

  // 文件删除/移走：暂存记录，若短时间内没有对应 add 则从 DB 删除
  private handleUnlink(filePath: string): void {
    if (this.isIgnored(filePath)) return;
    this.libraryService.getSql('SELECT * FROM files WHERE path = ? LIMIT 1', [filePath])
      .then((rows) => {
        if (rows.length === 0) return;
        const file = rows[0];
        const timer = setTimeout(() => {
          this.pendingUnlinks.delete(filePath);
          // 超时未匹配到 add → 确认是删除，从 DB 移除
          this.libraryService.deleteFile(file.id).catch((e: unknown) => {
            console.error(`[Watcher] Failed to delete record:`, e);
          });
          this.webSocketServer.broadcastLibraryEvent(this.libraryId, 'file::deleted', {
            libraryId: this.libraryId,
            fileId: file.id,
          });
        }, 3000);

        this.pendingUnlinks.set(filePath, { id: file.id, size: file.size, data: file, timer });
      })
      .catch((e: unknown) => console.error(`[Watcher] unlink lookup failed:`, e));
  }

  private async handleNewFile(filePath: string): Promise<void> {
    if (this.isIgnored(filePath)) return;
    try {
      const stat = fs.statSync(filePath);
      if (stat.size === 0) return;

      // 检查是否已在 DB 中
      const existing = await this.libraryService.getSql(
        'SELECT id FROM files WHERE path = ? LIMIT 1',
        [filePath]
      );
      if (existing.length > 0) return;

      // 上传接口刚创建的 copy/link 文件可能先触发 watcher，再完成数据库写入；
      // 同目录同名的活动记录视为已入库，避免再次创建重复条目。
      const folderId = await this.resolveFolder(filePath);
      const sameItem = await this.libraryService.getSql(
        'SELECT id FROM files WHERE name = ? AND recycled = 0 AND (folder_id = ? OR (folder_id IS NULL AND ? IS NULL)) LIMIT 1',
        [path.basename(filePath), folderId, folderId],
      );
      if (sameItem.length > 0) return;

      // 检查是否是移动/重命名：匹配最近 unlink 的文件（按大小匹配）
      let moved: PendingUnlink | undefined;
      for (const [oldPath, entry] of this.pendingUnlinks) {
        if (entry.size === stat.size) {
          moved = entry;
          clearTimeout(entry.timer);
          this.pendingUnlinks.delete(oldPath);
          break;
        }
      }

      if (moved) {
        // 移动/重命名 → 更新已有记录
        const { oldData } = await this.libraryService.updateFile(moved.id, {
          path: filePath,
          name: path.basename(filePath),
          folder_id: folderId,
        });
        this.webSocketServer.broadcastLibraryEvent(this.libraryId, 'file::updated', {
          libraryId: this.libraryId,
          fileId: moved.id,
          path: filePath,
          name: path.basename(filePath),
          folder_id: folderId,
          old_data: oldData,
        });
      } else {
        // 全新文件 → 导入
        const fileData: Record<string, any> = {};
        if (folderId) fileData.folder_id = folderId;

        const result = await this.libraryService.createFileFromPath(filePath, fileData, { importType: 'link' });
        this.webSocketServer.broadcastPluginEvent('file::created', {
          message: { type: 'file', action: 'create' },
          result,
          libraryId: this.libraryId,
        });
        this.webSocketServer.broadcastLibraryEvent(this.libraryId, 'file::created', {
          ...result,
          libraryId: this.libraryId,
        });
      }
    } catch (error) {
      console.error(`[Watcher] Failed to process ${filePath}:`, error);
    }
  }

  private async resolveFolder(filePath: string): Promise<number | null> {
    const rel = path.relative(this.libraryPath, path.dirname(filePath));
    if (!rel) return null;

    const parts = rel.replace(/\\/g, '/').split('/');
    let parentId: number | null = null;

    for (const part of parts) {
      if (!part) continue;
      let folder = await this.libraryService.findFolderByName(part, parentId);
      if (!folder) {
        const id = await this.libraryService.createFolder({
          title: part,
          parent_id: parentId,
          color: 0,
          icon: '',
        });
        folder = { id };
      }
      parentId = folder.id;
    }

    return parentId;
  }
}
