import { Database } from 'sqlite3';
import { ILibraryServerData } from './ILibraryServerData';
import * as path from 'path';
import * as fs from 'fs';
import { FileOperations } from './mixins/FileOperations';
import { FolderOperations } from './mixins/FolderOperations';
import { TagOperations } from './mixins/TagOperations';
import { FileImport } from './mixins/FileImport';
import { Statistics } from './mixins/Statistics';

export class LibraryServerDataSQLite {
  private db: Database | null = null;
  private inTransaction = false;
  private readonly fileImported?: (file: Record<string, any>) => void | Promise<void>;
  readonly config: Record<string, any>;

  constructor(config: Record<string, any>, opts: { onFileImported?: (file: Record<string, any>) => void | Promise<void> } = {}) {
    this.config = config;
    this.fileImported = opts.onFileImported;
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
    const dbPath = path.join(basePath, 'library_data.db');
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
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (this.inTransaction) {
      await this.executeSql('ROLLBACK');
      this.inTransaction = false;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
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
    const folderName = await this.getFolderName(item.folder_id);
    return path.join(libraryPath, folderName);
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
    const folderName = await this.getFolderName(item.folder_id);
    return path.join(libraryPath, folderName, item.name);
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
        thumb: await this.getItemThumbPath(file, { isUrlFile }),
        path: await this.getItemFilePath(file, { isUrlFile }),
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
    return buffer.toString('hex').substring(0, 32);
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

  async getFolderName(folderId?: number): Promise<string> {
    if (folderId) {
      const folder = await this.getFolder(folderId);
      if (folder) return folder.title;
    }
    // 未分类文件（folder_id 为空）存放在素材库根目录，返回空串让 path.join 自然落到根目录。
    // 不再返回字面量 '未分类'，避免每次上传未分类文件都在素材库下创建物理「未分类」子文件夹。
    return '';
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
        else resolve();
      });
    });
  }

  runSql(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
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
        else resolve({ lastID: this.lastID, changes: this.changes });
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
