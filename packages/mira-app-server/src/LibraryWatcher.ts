import chokidar from 'chokidar';
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
      ignored: [
        '**/thumbs/**',
        '**/*.db',
        '**/*.db-journal',
        '**/*.db-wal',
        '**/*.db-shm',
        '**/.*',
        '**/*.tmp',
        '**/*.temp',
      ],
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 200,
      },
      persistent: false,
      depth: 10,
    });

    this.watcher.on('add', (filePath) => this.handleNewFile(filePath));
    this.watcher.on('error', (error) => {
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

      // Check if file already exists in database
      const rows = await this.libraryService.getSql(
        'SELECT id FROM files WHERE path = ? LIMIT 1',
        [filePath]
      );
      if (rows.length > 0) return;

      const result = await this.libraryService.createFileFromPath(filePath, {}, { importType: 'link' });
      console.log(`[Watcher] Imported: ${path.basename(filePath)}`);

      this.webSocketServer.broadcastLibraryEvent(this.libraryId, 'file::created', {
        libraryId: this.libraryId,
        file: result,
      });
    } catch (error) {
      console.error(`[Watcher] Failed to import ${filePath}:`, error);
    }
  }
}
