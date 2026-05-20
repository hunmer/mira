import * as chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { LibraryServerDataSQLite } from 'mira-storage-sqlite';
import { MiraWebsocketServer } from './WebSocketServer';

export class LibraryWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private libraryService: LibraryServerDataSQLite;
  private libraryPath: string;
  private libraryId: string;
  private webSocketServer: MiraWebsocketServer;

  constructor(libraryService: LibraryServerDataSQLite, webSocketServer: MiraWebsocketServer) {
    this.libraryService = libraryService;
    this.webSocketServer = webSocketServer;
    this.libraryPath = libraryService.config.customFields?.path || libraryService.config.path || '';
    this.libraryId = libraryService.getLibraryId();
  }

  async start(): Promise<void> {
    if (!this.libraryPath || !fs.existsSync(this.libraryPath)) {
      console.warn(`[Watcher] Library path does not exist: ${this.libraryPath}`);
      return;
    }

    this.watcher = chokidar.watch(this.libraryPath, {
      ignoreInitial: true,
      ignored: (filePath: string) => {
        const rel = path.relative(this.libraryPath, filePath).replace(/\\/g, '/');
        if (rel === '') return false;
        return rel.startsWith('thumbs') ||
          rel.startsWith('thumbs/') ||
          rel.includes('/thumbs/') ||
          rel.includes('/.') ||
          rel.endsWith('.db') ||
          rel.endsWith('.db-journal') ||
          rel.endsWith('.db-wal') ||
          rel.endsWith('.db-shm') ||
          rel.endsWith('.tmp') ||
          rel.endsWith('.temp');
      },
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 200,
      },
      persistent: false,
      depth: 10,
    });

    this.watcher.on('add', (filePath: string) => this.handleNewFile(filePath));
    this.watcher.on('error', (error: unknown) => {
      console.error(`[Watcher] Error for library ${this.libraryId}:`, error);
    });

    console.log(`[Watcher] Started watching: ${this.libraryPath}`);
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log(`[Watcher] Stopped for library ${this.libraryId}`);
    }
  }

  private async handleNewFile(filePath: string): Promise<void> {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size === 0) return;

      const rows = await this.libraryService.getSql(
        'SELECT id FROM files WHERE path = ? LIMIT 1',
        [filePath]
      );
      if (rows.length > 0) return;

      // 根据子目录结构查找或创建 folder
      const folderId = await this.resolveFolder(filePath);

      const fileData: Record<string, any> = {};
      if (folderId) fileData.folder_id = folderId;

      const result = await this.libraryService.createFileFromPath(filePath, fileData, { importType: 'link' });
      console.log(`[Watcher] Imported: ${path.basename(filePath)}`);

      this.webSocketServer.broadcastPluginEvent('file::created', {
        message: {
          type: 'file',
          action: 'create',
        },
        result,
        libraryId: this.libraryId,
      });

      this.webSocketServer.broadcastLibraryEvent(this.libraryId, 'file::created', {
        ...result,
        libraryId: this.libraryId,
      });
    } catch (error) {
      console.error(`[Watcher] Failed to import ${filePath}:`, error);
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
