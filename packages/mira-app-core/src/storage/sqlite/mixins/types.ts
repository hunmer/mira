import { Database } from 'sqlite3';

export type LibraryServerDataSQLiteCore = InstanceType<typeof import('../LibraryServerDataSQLite').LibraryServerDataSQLite>;

export interface CoreAccessible {
  db: Database | null;
  readonly config: Record<string, any>;
  readonly enableHash: boolean;
  readonly customFields: Record<string, any>;
  inTransaction: boolean;
  executeSql(sql: string, params?: any[]): Promise<void>;
  runSql(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>;
  getSql(sql: string, params?: any[]): Promise<any[]>;
  rowToMap(row: any): Record<string, any>;
  getFolderName(folderId?: number): Promise<string>;
  getLibraryPath(): Promise<string>;
  getItemPath(item: Record<string, any>): Promise<string>;
  getItemFilePath(item: Record<string, any>, options?: { isUrlFile: boolean }): Promise<string>;
  getItemThumbPath(item: Record<string, any>, options?: { isUrlFile: boolean }): Promise<string>;
  getPublicURL(url: string): string;
  getLibraryId(): string;
  calculateFileHashSync(filePath: string): string;
  getUniquePath(destPath: string): string;
  notifyFileImported(file: Record<string, any>): void;
  processingFiles(files: Record<string, any>[], isUrlFile: boolean): Promise<Record<string, any>[]>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  getFolder(id: number): Promise<Record<string, any> | null>;
  getFolders(options?: { parentId?: number; limit?: number; offset?: number }): Promise<Record<string, any>[]>;
  getTags(options?: { parentId?: number; limit?: number; offset?: number }): Promise<Record<string, any>[]>;
  createFile(fileData: Record<string, any>): Promise<Record<string, any>>;
  getAllTags(): Promise<Record<string, any>[]>;
  getAllFolders(): Promise<Record<string, any>[]>;
  getFiles(options?: {
    select?: string;
    filters?: Record<string, any>;
    isUrlFile?: boolean;
    countFile?: boolean;
  }): Promise<{
    result: Record<string, any>[];
    limit: number;
    offset: number;
    total: number;
  }>;
  getFile(id: number): Promise<Record<string, any> | null>;
  deleteFolder(id: number, deleteFiles?: boolean): Promise<boolean>;
  deleteTag(id: number): Promise<boolean>;
}
