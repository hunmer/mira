import { Database } from 'sqlite3';
import { ILibraryServerData } from './ILibraryServerData';
import * as path from 'path';
import * as fs from 'fs';
import { createHash } from 'crypto';
import { FileOperations } from './mixins/FileOperations';
import { FolderOperations } from './mixins/FolderOperations';
import { TagOperations } from './mixins/TagOperations';
import { FileImport } from './mixins/FileImport';
import { Statistics } from './mixins/Statistics';

export class LibraryServerDataSQLite {
  private db: Database | null = null;
  private inTransaction = false;
  private readonly fileImported?: (file: Record<string, any>) => void | Promise<void>;
  private readonly fileDeleted?: (file: Record<string, any>) => void | Promise<void>;
  private readonly dbMirrorRoot?: string;
  private readonly dbMirrorThrottleMs: number;
  private remoteDbPath?: string;
  private localDbPath?: string;
  private mirrorSyncTimer?: ReturnType<typeof setTimeout>;
  private mirrorSyncRunning?: Promise<void>;
  private mirrorDirty = false;
  private closing = false;
  readonly config: Record<string, any>;

  constructor(config: Record<string, any>, opts: {
    onFileImported?: (file: Record<string, any>) => void | Promise<void>;
    /** 文件被真正删除（硬删/清空回收站）时触发；进回收站不触发 */
    onFileDeleted?: (file: Record<string, any>) => void | Promise<void>;
    dbMirrorRoot?: string;
    dbMirrorThrottleMs?: number;
  } = {}) {
    this.config = config;
    this.fileImported = opts.onFileImported;
    this.fileDeleted = opts.onFileDeleted;
    this.dbMirrorRoot = opts.dbMirrorRoot;
    this.dbMirrorThrottleMs = opts.dbMirrorThrottleMs ?? 3000;
  }

  // 实时从 config 读取，确保 PUT /:id 更新 customFields 后立即生效，
  // 不再依赖构造时的快照（否则切换 enableHash 需重启或禁/启库才能生效）
  get enableHash(): boolean {
    return this.config.customFields?.enableHash ?? false;
  }

  get customFields(): Record<string, any> {
    return this.config.customFields || {};
  }

  async initialize(): Promise<void> {
    const basePath = await this.getLibraryPath();
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
    this.remoteDbPath = path.join(basePath, 'library_data.db');
    const dbPath = await this.prepareDatabasePath(this.remoteDbPath);
    this.db = new Database(dbPath);

    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS files(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        imported_at INTEGER NOT NULL,
        size INTEGER NOT NULL,
        hash TEXT NOT NULL,
        custom_fields TEXT,
        notes TEXT,
        stars INTEGER DEFAULT 0,
        folder_id INTEGER,
        reference TEXT,
        path TEXT,
        thumb INTEGER DEFAULT 0,
        recycled INTEGER DEFAULT 0,
        tags TEXT,
        uploader INTEGER,
        website TEXT,
        metadata TEXT,
        FOREIGN KEY(folder_id) REFERENCES folders(id)
      )
    `);

    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS folders(
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        parent_id INTEGER,
        color INTEGER,
        icon TEXT,
        sort_index INTEGER DEFAULT 0,
        FOREIGN KEY(parent_id) REFERENCES folders(id)
      )
    `);

    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS tags(
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        parent_id INTEGER,
        color INTEGER,
        icon TEXT,
        sort_index INTEGER DEFAULT 0,
        FOREIGN KEY(parent_id) REFERENCES tags(id)
      )
    `);

    try {
      await this.executeSql('ALTER TABLE folders ADD COLUMN sort_index INTEGER DEFAULT 0');
    } catch {}
    try {
      await this.executeSql('ALTER TABLE tags ADD COLUMN sort_index INTEGER DEFAULT 0');
    } catch {}

    try {
      await this.executeSql('ALTER TABLE files ADD COLUMN uploader INTEGER');
    } catch {}

    try {
      await this.executeSql('ALTER TABLE files ADD COLUMN website TEXT');
    } catch {}

    try {
      await this.executeSql('ALTER TABLE files ADD COLUMN metadata TEXT');
    } catch {}

    // 文件夹素材数 badge：getAllFolders 用相关子查询按 folder_id 统计文件数，
    // 该复合索引避免每个文件夹都全表扫描 files 表。
    await this.executeSql(
      'CREATE INDEX IF NOT EXISTS idx_files_folder_recycled ON files(folder_id, recycled)'
    );
    this.scheduleMirrorSync();
  }

  // --- 事务管理 ---
  async beginTransaction(): Promise<void> {
    if (!this.inTransaction) {
      await this.executeSql('BEGIN TRANSACTION');
      this.inTransaction = true;
    }
  }

  async commitTransaction(): Promise<void> {
    if (this.inTransaction) {
      await this.executeSql('COMMIT');
      this.inTransaction = false;
      this.scheduleMirrorSync();
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (this.inTransaction) {
      await this.executeSql('ROLLBACK');
      this.inTransaction = false;
    }
  }

  async close(): Promise<void> {
    this.closing = true;
    if (this.mirrorSyncTimer) clearTimeout(this.mirrorSyncTimer);
    this.mirrorSyncTimer = undefined;
    let syncError: unknown;
    try {
      if (this.localDbPath) {
        do {
          await this.flushMirrorSync();
        } while (this.mirrorSyncRunning || this.mirrorDirty);
      }
    } catch (error) {
      syncError = error;
    }
    if (this.db) {
      const db = this.db;
      await new Promise<void>((resolve, reject) => {
        db.close(error => error ? reject(error) : resolve());
      });
      this.db = null;
    }
    if (syncError) throw syncError;
  }

  private async prepareDatabasePath(remoteDbPath: string): Promise<string> {
    if (!this.config.customFields?.enableDbMirror) return remoteDbPath;
    if (!this.dbMirrorRoot) throw new Error('dbMirrorRoot is required when enableDbMirror is enabled');

    const mirrorDir = path.join(this.dbMirrorRoot, String(this.config.id));
    await fs.promises.mkdir(mirrorDir, { recursive: true });
    const timestamp = this.createTimestamp();
    const localDbPath = path.join(mirrorDir, `${timestamp}.db`);
    if (fs.existsSync(remoteDbPath)) {
      await fs.promises.copyFile(remoteDbPath, localDbPath);
    }
    this.localDbPath = localDbPath;
    console.log(`[DB mirror] Library ${this.config.id} using local database ${localDbPath}`);
    return localDbPath;
  }

  private createTimestamp(): string {
    return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 17);
  }

  private scheduleMirrorSync(): void {
    if (!this.localDbPath || this.inTransaction) return;
    this.mirrorDirty = true;
    if (this.mirrorSyncTimer) clearTimeout(this.mirrorSyncTimer);
    this.mirrorSyncTimer = setTimeout(() => {
      this.mirrorSyncTimer = undefined;
      void this.flushMirrorSync().catch(error => {
        console.error(`[DB mirror] Failed to sync library ${this.config.id}:`, error);
      });
    }, this.dbMirrorThrottleMs);
  }

  private async flushMirrorSync(): Promise<void> {
    if (this.mirrorSyncRunning) return this.mirrorSyncRunning;
    if (!this.localDbPath || !this.remoteDbPath || !this.db || !this.mirrorDirty) return;

    this.mirrorSyncRunning = this.syncMirrorToRemote();
    try {
      await this.mirrorSyncRunning;
    } finally {
      this.mirrorSyncRunning = undefined;
      if (!this.closing && this.mirrorDirty && !this.mirrorSyncTimer) this.scheduleMirrorSync();
    }
  }

  private async syncMirrorToRemote(): Promise<void> {
    if (!this.localDbPath || !this.remoteDbPath || !this.db) return;
    this.mirrorDirty = false;
    const snapshotPath = `${this.localDbPath}.syncing`;
    await fs.promises.rm(snapshotPath, { force: true });
    await new Promise<void>((resolve, reject) => {
      const backup = (this.db as any).backup(snapshotPath);
      backup.step(-1, (stepError: Error | null) => {
        backup.finish((finishError: Error | null) => {
          const error = stepError || finishError;
          if (error) reject(error);
          else resolve();
        });
      });
    });

    const remoteBackupPath = path.join(path.dirname(this.remoteDbPath), 'library_data.previous.db');
    let renamed = false;
    try {
      if (fs.existsSync(this.remoteDbPath)) {
        await fs.promises.rm(remoteBackupPath, { force: true });
        await fs.promises.rename(this.remoteDbPath, remoteBackupPath);
        renamed = true;
      }
      await fs.promises.copyFile(snapshotPath, this.remoteDbPath);
      console.log(`[DB mirror] Synced library ${this.config.id} database to ${this.remoteDbPath}`);
    } catch (error) {
      this.mirrorDirty = true;
      if (renamed && !fs.existsSync(this.remoteDbPath)) {
        try { await fs.promises.rename(remoteBackupPath, this.remoteDbPath); } catch {}
      }
      throw error;
    } finally {
      await fs.promises.rm(snapshotPath, { force: true });
    }
  }

  // --- 路径与 URL ---
  getLibraryId(): string {
    return this.config.id;
  }

  async getLibraryPath(): Promise<string> {
    return this.config.customFields?.path || '';
  }

  async getItemPath(item: Record<string, any>): Promise<string> {
    const libraryPath = await this.getLibraryPath();
    const folderPath = await this.getFolderPath(item.folder_id);
    return path.join(libraryPath, folderPath);
  }

  getPublicURL(url: string): string {
    const apiBaseUrl = process.env.API_BASE_URL;
    if (apiBaseUrl) {
      return `${apiBaseUrl}/${url}`;
    }
    const port = process.env.MIRA_SERVER_HTTP_PORT || process.env.HTTP_PORT || '8081';
    return `http://127.0.0.1:${port}/${url}`;
  }

  async getItemFilePath(item: Record<string, any>, options?: { isUrlFile: boolean }): Promise<string> {
    if (options?.isUrlFile) {
      return this.getPublicURL(`api/files/file/${this.getLibraryId()}/${item.id}`);
    }
    // 回收站文件：物理位置已被移到 .trash/，软删时 path 列已写入 .trash 绝对路径，直接读它
    if (item.recycled) return item.path || '';
    const libraryPath = await this.getLibraryPath();
    const folderPath = await this.getFolderPath(item.folder_id);
    return path.join(libraryPath, folderPath, item.name);
  }

  async getItemThumbPath(item: Record<string, any>, options?: { isUrlFile: boolean }): Promise<string> {
    const libraryPath = await this.getLibraryPath();
    let metadata = item.metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch {}
    }
    const key = item.hash || item.id;
    const coverFile = path.join(libraryPath, 'thumbs', `${key}-cover.jpg`);
    const thumbFile = metadata?.cover && fs.existsSync(coverFile)
      ? coverFile
      : path.join(libraryPath, 'thumbs', `${key}.png`);
    return options?.isUrlFile ? this.getPublicURL(`api/files/thumb/${this.getLibraryId()}/${item.id}`) : thumbFile;
  }

  // --- 库信息与查询 ---
  async getLibraryInfo(): Promise<Record<string, any>> {
    const tags = await this.getAllTags();
    const folders = await this.getAllFolders();
    return {
      libraryId: this.getLibraryId(),
      status: 'connected',
      tags, folders,
    };
  }

  async createLibrary(data: Record<string, any>): Promise<Record<string, any>> {
    this.config.id = data.id || this.config.id;
    this.config.customFields = { ...this.config.customFields, ...data };
    return this.getLibraryInfo();
  }

  async closeLibrary(): Promise<boolean> {
    await this.close();
    return true;
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    return this.getSql(sql, params);
  }

  async queryLibrary(query: Record<string, any>): Promise<Record<string, any>> {
    return this.getLibraryInfo();
  }

  async processingFiles(files: Record<string, any>[], isUrlFile: boolean = true) {
    return Promise.all(files.map(async (file) => {
      let customFields = file.custom_fields;
      if (typeof customFields === 'string') {
        try {
          customFields = JSON.parse(customFields);
        } catch {}
      }
      let metadata = file.metadata;
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch {}
      }
      return {
        ...file,
        folder_name: await this.getFolderName(file.folder_id),
        custom_fields: customFields,
        metadata,
        thumb: isUrlFile
          ? `/api/files/thumb/${this.getLibraryId()}/${file.id}`
          : await this.getItemThumbPath(file, { isUrlFile: false }),
        path: isUrlFile
          ? `/api/files/file/${this.getLibraryId()}/${file.id}`
          : await this.getItemFilePath(file, { isUrlFile: false }),
        file_path: await this.getItemFilePath(file, { isUrlFile: false }),
        thumb_path: await this.getItemThumbPath(file, { isUrlFile: false }),
      };
    }));
  }

  // --- 工具方法（mixin 共用）---
  rowToMap(row: any): Record<string, any> {
    const map: Record<string, any> = {};
    for (const key in row) {
      map[key] = row[key];
    }
    return map;
  }

  calculateFileHashSync(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    return createHash('md5').update(buffer).digest('hex');
  }

  getUniquePath(destPath: string): string {
    if (!fs.existsSync(destPath)) return destPath;
    const ext = path.extname(destPath);
    const base = path.basename(destPath, ext);
    const dir = path.dirname(destPath);
    let i = 1;
    let newPath: string;
    do {
      newPath = path.join(dir, `${base} (${i})${ext}`);
      i++;
    } while (fs.existsSync(newPath));
    return newPath;
  }

  notifyFileImported(file: Record<string, any>): void {
    if (!this.fileImported) return;
    Promise.resolve(this.fileImported(file)).catch(error => {
      console.error('File import callback failed:', error);
    });
  }

  notifyFileDeleted(file: Record<string, any>): void {
    if (!this.fileDeleted) return;
    Promise.resolve(this.fileDeleted(file)).catch(error => {
      console.error('File delete callback failed:', error);
    });
  }

  async getFolderName(folderId?: number): Promise<string> {
    if (folderId) {
      const folder = await this.getFolder(folderId);
      if (folder) return folder.title;
    }
    // 未分类文件（folder_id 为空）存放在素材库根目录，返回空串让 path.join 自然落到根目录。
    // 不再返回字面量 '未分类'，避免每次上传未分类文件都在素材库下创建物理「未分类」子文件夹。
    return '';
  }

  async getFolderPath(folderId?: number): Promise<string> {
    if (!folderId) return '';
    const parts: string[] = [];
    const visited = new Set<number>();
    let currentId: number | null = folderId;
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const folder = await this.getFolder(currentId);
      if (!folder) break;
      parts.unshift(folder.title);
      currentId = folder.parent_id ?? null;
    }
    return path.join(...parts);
  }

  // --- SQL 基础操作 ---
  private executeSql(sql: string, params?: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else {
          if (!this.inTransaction && !/^\s*(BEGIN|ROLLBACK)/i.test(sql)) this.scheduleMirrorSync();
          resolve();
        }
      });
    });
  }

  runSql(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
    const self = this;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.run(sql, params, function (err) {
        if (err) {
          console.error('Error executing SQL:', err);
          reject(err);
        }
        else {
          if (!self.inTransaction) self.scheduleMirrorSync();
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  getSql(sql: string, params?: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// 声明合并：让 TypeScript 知道 mixin 注入的方法（含接口未定义的方法）
export interface LibraryServerDataSQLite extends ILibraryServerData {
  findFolderByName(name: string, parentId?: number | null): Promise<Record<string, any> | null>;
}

// 运行时组合 mixin 方法到原型
Object.assign(
  LibraryServerDataSQLite.prototype,
  FileOperations,
  FolderOperations,
  TagOperations,
  FileImport,
  Statistics,
);
