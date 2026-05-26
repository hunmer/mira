import { Database } from 'sqlite3';
import { ILibraryServerData } from './ILibraryServerData';
import * as path from 'path';
import * as fs from 'fs';

export class LibraryServerDataSQLite implements ILibraryServerData {
  private db: Database | null = null;
  private inTransaction = false;
  readonly enableHash: boolean;
  readonly customFields: Record<string, any>;
  readonly config: Record<string, any>;

  constructor(config: Record<string, any>, opts: any) {
    this.config = config;
    this.customFields = config.customFields || {};
    this.enableHash = config.customFields?.enableHash ?? false;
  }


  async initialize(): Promise<void> {
    const basePath = await this.getLibraryPath();
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
    // 初始化数据库连接和表结构
    const dbPath = path.join(basePath, 'library_data.db');
    this.db = new Database(dbPath);
    // 创建文件表
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
        FOREIGN KEY(folder_id) REFERENCES folders(id)
      )
    `);

    // 创建文件夹表
    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS folders(
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        parent_id INTEGER,
        color INTEGER,
        icon TEXT,
        FOREIGN KEY(parent_id) REFERENCES folders(id)
      )
    `);

    // 创建标签表
    await this.executeSql(`
      CREATE TABLE IF NOT EXISTS tags(
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        parent_id INTEGER,
        color INTEGER,
        icon INTEGER,
        FOREIGN KEY(parent_id) REFERENCES tags(id)
      )
    `);

    // 迁移：为已有 files 表添加 uploader 列
    try {
      await this.executeSql('ALTER TABLE files ADD COLUMN uploader INTEGER');
    } catch {}

    // 迁移：为已有 files 表添加 website 列
    try {
      await this.executeSql('ALTER TABLE files ADD COLUMN website TEXT');
    } catch {}
  }

  // 文件操作方法实现
  async createFile(fileData: Record<string, any>): Promise<Record<string, any>> {
    const result = await this.runSql(
      `INSERT INTO files(
        name, created_at, imported_at, size, hash,
        custom_fields, notes, stars, folder_id,
        reference, path, thumb, recycled, tags, uploader
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileData.name,
        fileData.created_at,
        fileData.imported_at,
        fileData.size,
        fileData.hash,
        fileData.custom_fields,
        fileData.notes,
        fileData.stars ?? 0,
        fileData.folder_id,
        fileData.reference,
        fileData.path,
        fileData.thumb ?? 0,
        fileData.recycled ?? 0,
        fileData.tags,
        fileData.uploader ?? null,
      ]
    );
    return { id: result.lastID, ...fileData };
  }

  async updateFile(id: number, fileData: Record<string, any>): Promise<boolean> {
    const fields: string[] = [];
    const params: any[] = [];

    const addField = (key: string, value: any) => {
      if (fileData[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    };

    addField('name', fileData.name);
    addField('created_at', fileData.created_at);
    addField('imported_at', fileData.imported_at);
    addField('size', fileData.size);
    addField('hash', fileData.hash);
    addField('custom_fields', fileData.custom_fields);
    addField('notes', fileData.notes);
    addField('stars', fileData.stars ?? 0);
    addField('tags', fileData.tags);
    addField('folder_id', fileData.folder_id);
    addField('reference', fileData.reference);
    addField('path', fileData.path);
    addField('thumb', fileData.thumb ?? 0);
    addField('recycled', fileData.recycled ?? 0);
    addField('uploader', fileData.uploader);

    if (fields.length === 0) return false;

    const query = `UPDATE files SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    const result = await this.runSql(query, params);
    return result.changes > 0;
  }

  async deleteFile(id: number, options?: { moveToRecycleBin: boolean }): Promise<boolean> {
    const query = options?.moveToRecycleBin
      ? 'UPDATE files SET recycled = 1 WHERE id = ?'
      : 'DELETE FROM files WHERE id = ?';
    const result = await this.runSql(query, [id]);
    return result.changes > 0;
  }

  async recoverFile(id: number): Promise<boolean> {
    const result = await this.runSql('UPDATE files SET recycled = 0 WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async emptyTrash(): Promise<{ deletedCount: number; errors: string[] }> {
    const rows = await this.getSql('SELECT id, name, folder_id, hash FROM files WHERE recycled = 1');
    if (rows.length === 0) return { deletedCount: 0, errors: [] };

    const errors: string[] = [];
    let deletedCount = 0;

    for (const row of rows) {
      const item = this.rowToMap(row);
      try {
        const filePath = await this.getItemFilePath(item);
        if (filePath) {
          try { fs.unlinkSync(filePath); } catch {}
        }
        const thumbPath = await this.getItemThumbPath(item);
        if (thumbPath) {
          try { fs.unlinkSync(thumbPath); } catch {}
        }
      } catch (e) {
        errors.push(`file ${item.id}: ${e instanceof Error ? e.message : String(e)}`);
      }

      const result = await this.runSql('DELETE FROM files WHERE id = ?', [item.id]);
      if (result.changes > 0) deletedCount++;
    }

    return { deletedCount, errors };
  }

  async getFile(id: number): Promise<Record<string, any> | null> {
    const rows = await this.getSql('SELECT * FROM files WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  }

  async getFiles(options?: {
    select?: string;
    filters?: Record<string, any>;
    isUrlFile?: boolean;
    countFile?: boolean;
  }): Promise<{
    result: Record<string, any>[];
    limit: number;
    offset: number;
    total: number;
  }> {
    const select = options?.select || '*';
    const filters = options?.filters || {};
    const whereClauses: string[] = [];
    const params: any[] = [];
    const folderId = parseInt(filters.folder?.toString() || '0') || 0;
    const tagIds = Array.isArray(filters.tags) ? filters.tags.map(id => id.toString()) : [];
    const limit = parseInt(filters.limit?.toString() || '100') || 100;
    const offset = parseInt(filters.offset?.toString() || '0') || 0;
    console.log({filters})
    // 构建查询条件
    if (filters.recycled !== undefined) {
      whereClauses.push('recycled = ?');
      params.push(filters.recycled ? 1 : 0);
    }

    if (filters.thumb !== undefined) {
      whereClauses.push('thumb = ?');
      params.push(filters.thumb ? 1 : 0);
    }

    if (filters.star !== undefined) {
      whereClauses.push('stars >= ?');
      params.push(filters.star);
    }

    // title: 名称模糊搜索
    if (filters.title) {
      whereClauses.push('name LIKE ?');
      params.push(`%${filters.title}%`);
    }

    // name: 名称模糊搜索（兼容旧接口）
    if (filters.name) {
      whereClauses.push('name LIKE ?');
      params.push(`%${filters.name}%`);
    }

    // url: 网址筛选，搜索 website 字段
    if (filters.url) {
      whereClauses.push('website LIKE ?');
      params.push(`%${filters.url}%`);
    }

    // category: 通过扩展名过滤媒体类型 (image/video/audio)
    if (filters.category) {
      const extMap: Record<string, string[]> = {
        image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'],
        video: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp'],
        audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.ape', '.opus'],
      };
      const exts = extMap[filters.category];
      if (exts) {
        const placeholders = exts.map(() => 'LOWER(name) LIKE ?').join(' OR ');
        whereClauses.push(`(${placeholders})`);
        params.push(...exts.map(ext => `%${ext}`));
      }
    }

    if (filters.dateRange) {
      // 如果 dateRange.end 是今天，则扩展到当天 23:59:59
      let startTime = filters.dateRange.start.getTime();
      let endTime = filters.dateRange.end.getTime();
      const today = new Date();
      const isToday =
        filters.dateRange.end.getFullYear() === today.getFullYear() &&
        filters.dateRange.end.getMonth() === today.getMonth() &&
        filters.dateRange.end.getDate() === today.getDate();
      if (isToday) {
        // 设置到今天 23:59:59.999
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        endTime = endOfToday.getTime();
      }
      whereClauses.push('created_at BETWEEN ? AND ?');
      params.push(startTime, endTime);
    }

    // size_min/minSize 和 size_max/maxSize 都支持（客户端传 size_min/size_max）
    const sizeMin = filters.size_min ?? filters.minSize;
    if (sizeMin !== undefined) {
      whereClauses.push('size >= ?');
      params.push(sizeMin * 1024);
    }

    const sizeMax = filters.size_max ?? filters.maxSize;
    if (sizeMax !== undefined) {
      whereClauses.push('size <= ?');
      params.push(sizeMax * 1024);
    }

    if (filters.minRating !== undefined) {
      whereClauses.push('stars >= ?');
      params.push(filters.minRating);
    }

    // 处理 folder 筛选
    if (filters.folder === '=null' || filters.folder === null) {
      // folder 为 null：筛选未分类的文件（folder_id 为 NULL 或 0）
      whereClauses.push('(folder_id IS NULL OR folder_id = 0)');
    } else if (folderId !== 0) {
      // folder 为具体ID：筛选指定文件夹的文件
      whereClauses.push('folder_id = ?');
      params.push(folderId);
    }

    // 处理 tags 筛选
    if (filters.tags === '=null' || filters.tags === null) {
      // tags 为 null：筛选未标签的文件（tags 为 NULL 或空数组 '[]'）
      whereClauses.push("(tags IS NULL OR tags = '[]' OR json_array_length(tags) = 0)");
    } else if (tagIds.length > 0) {
      // tags 为具体ID数组：检查tags字段中的JSON数组是否包含所有指定的tagIds
      const tagPlaceholders = tagIds.map(() => '?').join(',');
      whereClauses.push(`(
        SELECT COUNT(DISTINCT value)
        FROM json_each(tags)
        WHERE value IN (${tagPlaceholders})
      ) = ${tagIds.length}`);
      params.push(...tagIds);
    }

    if (filters.custom_fields) {
      const customFields = filters.custom_fields;
      const convertValue = (value: any) => {
        if (value == 'null') {
          value = null;
        }
        return value;
      }
      for (const [key, value] of Object.entries(customFields)) {
        if (typeof value === 'string' && value.startsWith('!=')) {
          let actualValue: string | null = value.substring(2).trim();
          whereClauses.push(`(json_extract(custom_fields, '$.${key}') IS NOT NULL OR json_extract(custom_fields, '$.${key}') != ?)`);
          params.push(convertValue(actualValue));
        } else if (typeof value === 'string' && value.startsWith('>')) {
          whereClauses.push(`json_extract(custom_fields, '$.${key}') > ?`);
          params.push(convertValue(value.substring(1).trim()));
        } else if (typeof value === 'string' && value.startsWith('<')) {
          whereClauses.push(`json_extract(custom_fields, '$.${key}') < ?`);
          params.push(convertValue(value.substring(1).trim()));
        } else {
          whereClauses.push(`json_extract(custom_fields, '$.${key}') = ?`);
          params.push(convertValue(value));
        }
      }
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    // 处理排序
    let orderBy = '';
    // sort?: 'imported_at' | 'id' | 'size' | 'stars' | 'folder_id' | 'tags' | 'name' | 'custom_fields';
    // order?: 'asc' | 'desc';
    if (filters?.sort) {
      const order = filters?.order || 'asc';
      if (filters.sort === 'custom_fields') {
        // 自定义字段排序需要特殊处理
        orderBy = ` ORDER BY json_extract(custom_fields, '$') ${order}`;
      } else {
        orderBy = ` ORDER BY ${filters.sort} ${order}`;
      }
    }

    const query = `SELECT ${select} FROM files ${where}${orderBy} LIMIT ? OFFSET ?`;
    const countQuery = `SELECT COUNT(*) as total FROM files ${where}`;

    const [rows, countRows] = await Promise.all([
      this.getSql(query, [...params, limit, offset]),
      this.getSql(countQuery, params),
    ]);

    let result = rows.map(row => this.rowToMap(row));
    if (!options?.countFile) {
      result = await this.processingFiles(result, options?.isUrlFile);
    }

    return {
      result,
      limit,
      offset,
      total: countRows[0].total,
    };
  }

  // 文件夹操作方法
  async createFolder(folderData: Record<string, any>): Promise<number> {
    const result = await this.runSql(
      'INSERT INTO folders(id, title, parent_id, color, icon) VALUES (?, ?, ?, ?, ?)',
      [
        folderData.id,
        folderData.title,
        folderData.parent_id,
        folderData.color,
        folderData.icon,
      ]
    );
    return result.lastID;
  }

  async updateFolder(id: number, folderData: Record<string, any>): Promise<boolean> {
    const fields: string[] = [];
    const params: any[] = [];

    const addField = (key: string, value: any) => {
      if (folderData[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    };

    addField('title', folderData.title);
    addField('parent_id', folderData.parent_id);
    addField('color', folderData.color);
    addField('icon', folderData.icon);

    if (fields.length === 0) return false;

    const query = `UPDATE folders SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    const result = await this.runSql(query, params);
    return result.changes > 0;
  }

  async deleteFolder(id: number, deleteFiles?: boolean): Promise<boolean> {
    await this.beginTransaction();
    try {
      // 递归删除子文件夹
      const children = await this.getFolders({ parentId: id });
      for (const child of children) {
        await this.deleteFolder(child.id, deleteFiles);
      }

      // 获取文件夹名（删除前必须先拿到，删除后 folders 表就没记录了）
      const folderName = await this.getFolderName(id);
      const libraryPath = await this.getLibraryPath();

      // 处理文件夹内的文件（必须先查再处理，因为递归子文件夹会 commit 事务）
      const files = await this.getSql('SELECT * FROM files WHERE folder_id = ?', [id]);
      if (deleteFiles) {
        for (const row of files) {
          const file = this.rowToMap(row);
          // 删除物理文件
          const filePath = path.join(libraryPath, folderName, file.name);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          // 删除缩略图
          if (file.hash) {
            const thumbPath = path.join(libraryPath, 'thumbs', `${file.hash}.png`);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
          }
          // 删除 DB 记录
          await this.runSql('DELETE FROM files WHERE id = ?', [file.id]);
        }
      } else {
        for (const row of files) {
          await this._moveFileToFolder(this.rowToMap(row).id, null);
        }
      }

      // 删除文件夹记录
      const result = await this.runSql('DELETE FROM folders WHERE id = ?', [id]);

      // 清理空目录
      const folderDir = path.join(libraryPath, folderName);
      try {
        if (fs.existsSync(folderDir) && fs.readdirSync(folderDir).length === 0) {
          fs.rmdirSync(folderDir);
        }
      } catch {}

      await this.commitTransaction();
      return result.changes > 0;
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async getFolder(id: number): Promise<Record<string, any> | null> {
    const rows = await this.getSql('SELECT * FROM folders WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  }

  async findFolderByName(name: string, parentId?: number | null): Promise<Record<string, any> | null> {
    const query = parentId !== undefined && parentId !== null
      ? 'SELECT * FROM folders WHERE title = ? AND parent_id = ? LIMIT 1'
      : 'SELECT * FROM folders WHERE title = ? AND parent_id IS NULL LIMIT 1';

    const params = parentId !== undefined && parentId !== null
      ? [name, parentId]
      : [name];

    const rows = await this.getSql(query, params);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  }

  async getFolders(options?: {
    parentId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, any>[]> {
    const parentId = options?.parentId;
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const where = parentId !== undefined ? 'WHERE parent_id = ?' : 'WHERE parent_id IS NULL';
    const params = parentId !== undefined ? [parentId, limit, offset] : [limit, offset];
    const query = `SELECT * FROM folders ${where} LIMIT ? OFFSET ?`;

    const rows = await this.getSql(query, params);
    return rows.map(row => this.rowToMap(row));
  }

  // 标签操作方法
  async createTag(tagData: Record<string, any>): Promise<number> {
    const result = await this.runSql(
      'INSERT INTO tags(id, title, parent_id, color, icon) VALUES (?, ?, ?, ?, ?)',
      [
        tagData.id,
        tagData.title,
        tagData.parent_id,
        tagData.color,
        tagData.icon,
      ]
    );
    return result.lastID;
  }

  async updateTag(id: number, tagData: Record<string, any>): Promise<boolean> {
    const fields: string[] = [];
    const params: any[] = [];

    const addField = (key: string, value: any) => {
      if (tagData[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    };

    addField('title', tagData.title);
    addField('parent_id', tagData.parent_id);
    addField('color', tagData.color);
    addField('icon', tagData.icon);

    if (fields.length === 0) return false;

    const query = `UPDATE tags SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    const result = await this.runSql(query, params);
    return result.changes > 0;
  }

  async deleteTag(id: number): Promise<boolean> {
    await this.beginTransaction();
    try {
      // 递归删除子标签
      const children = await this.getTags({ parentId: id });
      for (const child of children) {
        await this.deleteTag(child.id);
      }

      // 删除标签
      const result = await this.runSql('DELETE FROM tags WHERE id = ?', [id]);
      await this.commitTransaction();
      return result.changes > 0;
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async getTag(id: number): Promise<Record<string, any> | null> {
    const rows = await this.getSql('SELECT * FROM tags WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  }

  async getTags(options?: {
    parentId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, any>[]> {
    const parentId = options?.parentId;
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const where = parentId !== undefined ? 'WHERE parent_id = ?' : 'WHERE parent_id IS NULL';
    const params = parentId !== undefined ? [parentId, limit, offset] : [limit, offset];
    const query = `SELECT * FROM tags ${where} LIMIT ? OFFSET ?`;

    const rows = await this.getSql(query, params);
    return rows.map(row => this.rowToMap(row));
  }

  // 事务管理
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

  async createFileFromPath(
    filePath: string,
    fileMeta: Record<string, any>,
    options?: { importType: string }
  ): Promise<Record<string, any>> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const hash = this.enableHash ? this.calculateFileHashSync(filePath) : '';

    const fileData = {
      path: filePath,
      name: path.basename(filePath),
      created_at: stat.mtime.getTime(),
      imported_at: Date.now(),
      size: stat.size,
      hash,
      ...fileMeta,
    };

    await this.handleFile(filePath, fileData, options?.importType || 'copy');
    return this.createFile(fileData);
  }

  async getFileFolder(fileId: number): Promise<Record<string, any>[]> {
    const rows = await this.getSql(
      'SELECT f.* FROM folders f JOIN files fi ON fi.folder_id = f.id WHERE fi.id = ?',
      [fileId]
    );
    return rows.map(row => this.rowToMap(row));
  }

  async getFileTags(fileId: number): Promise<Record<string, any>[]> {
    const rows = await this.getSql('SELECT tags FROM files WHERE id = ?', [fileId]);
    if (rows.length === 0) return [];

    try {
      const tagsStr = rows[0].tags;
      if (!tagsStr) return [];

      const tagIds = JSON.parse(tagsStr).filter((id: any) => id);
      if (tagIds.length === 0) return [];

      const tagRows = await this.getSql(
        `SELECT * FROM tags WHERE id IN (${tagIds.map(() => '?').join(',')})`,
        tagIds
      );
      return tagRows.map(row => this.rowToMap(row));
    } catch (err) {
      return [];
    }
  }

  private async _moveFileToFolder(fileId: number, folderId: number | null): Promise<boolean> {
    const rows = await this.getSql('SELECT * FROM files WHERE id = ?', [fileId]);
    if (rows.length === 0) return false;
    const file = this.rowToMap(rows[0]);
    const libraryPath = await this.getLibraryPath();

    const srcFolderName = await this.getFolderName(file.folder_id);
    const destFolderName = await this.getFolderName(folderId ?? undefined);

    if (srcFolderName !== destFolderName) {
      const srcPath = path.join(libraryPath, srcFolderName, file.name);
      const destDir = path.join(libraryPath, destFolderName);
      const destPath = path.join(destDir, file.name);
      if (fs.existsSync(srcPath)) {
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.renameSync(srcPath, destPath);
      }
    }

    const result = await this.runSql('UPDATE files SET folder_id = ? WHERE id = ?', [folderId, fileId]);
    return result.changes > 0;
  }

  async setFileFolder(fileId: number, folderId: number | null): Promise<boolean> {
    await this.beginTransaction();
    try {
      const ok = await this._moveFileToFolder(fileId, folderId);
      await this.commitTransaction();
      return ok;
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async setFileTags(fileId: number, tagIds: string[]): Promise<boolean> {
    await this.beginTransaction();
    try {
      const result = await this.runSql('UPDATE files SET tags = ? WHERE id = ?', [
        JSON.stringify(tagIds),
        fileId,
      ]);
      await this.commitTransaction();
      return result.changes > 0;
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  async getAllTags(): Promise<Record<string, any>[]> {
    const rows = await this.getSql('SELECT * FROM tags', []);
    return rows.map(row => this.rowToMap(row));
  }

  async getAllFolders(): Promise<Record<string, any>[]> {
    const rows = await this.getSql('SELECT * FROM folders', []);
    return rows.map(row => this.rowToMap(row));
  }

  getLibraryId(): string {
    return this.config.id;
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
    const libraryPath = await this.getLibraryPath();
    const folderName = await this.getFolderName(item.folder_id);
    const filePath = path.join(libraryPath, folderName, item.name);
    return filePath;
  }

  async getItemThumbPath(
    item: Record<string, any>,
    options?: { isUrlFile: boolean }
  ): Promise<string> {
    const libraryPath = await this.getLibraryPath();
    const fileName = item.hash ? `${item.hash}.png` : `${item.id}.png`;
    const thumbFile = path.join(libraryPath, 'thumbs', fileName);
    return options?.isUrlFile ? this.getPublicURL(`api/files/thumb/${this.getLibraryId()}/${item.id}`) : thumbFile
  }

  private rowToMap(row: any): Record<string, any> {
    const map: Record<string, any> = {};
    for (const key in row) {
      map[key] = row[key];
    }
    return map;
  }

  private calculateFileHashSync(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    // 这里应该使用实际的哈希算法实现
    return buffer.toString('hex').substring(0, 32); // 简化示例
  }

  private getUniquePath(destPath: string): string {
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

  private async handleFile(
    filePath: string,
    fileData: Record<string, any>,
    importType: string
  ): Promise<void> {
    let destPath = this.getUniquePath(path.join(await this.getItemPath(fileData), fileData.name));
    const destDir = path.dirname(destPath);
    // 如果文件名变了，同步更新 fileData
    const actualName = path.basename(destPath);
    if (actualName !== fileData.name) {
      fileData.name = actualName;
    }
    switch (importType) {
      case 'link':
        // 保持原文件位置不变
        break;
      case 'copy':
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(filePath, destPath);
        fileData.path = destPath;
        fileData.name = path.basename(destPath);
        break;
      case 'move':
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        if (path.parse(filePath).root !== path.parse(destPath).root) {
          fs.copyFileSync(filePath, destPath);
          fs.unlinkSync(filePath);
        } else {
          fs.renameSync(filePath, destPath);
        }
        fileData.path = destPath;
        fileData.name = path.basename(destPath);
        break;
      default:
        throw new Error(`Unknown import type: ${importType}`);
    }
  }

  private async getFolderName(folderId?: number): Promise<string> {
    if (folderId) {
      const folder = await this.getFolder(folderId);
      if (folder) return folder.title;
    }
    return '未分类';
  }

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

  private runSql(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
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

  async getLibraryPath(): Promise<string> {
    return this.config.customFields?.path || '';
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    return this.getSql(sql, params);
  }

  async getLibraryInfo(): Promise<Record<string, any>> {
    const tags = await this.getAllTags();
    const folders = await this.getAllFolders();
    return {
      libraryId: this.getLibraryId(),
      status: 'connected',
      tags, folders,
    };
  }

  // 查询方法
  async queryFile(query: Record<string, any>, isUrlFile: boolean = true): Promise<Record<string, any>[]> {
    const { result } = await this.getFiles({ filters: query });
    return this.processingFiles(result, isUrlFile);
  }

  async processingFiles(files: Record<string, any>[], isUrlFile: boolean = true) {
    return Promise.all(files.map(async (file) => {
      let customFields = file.custom_fields;
      if (typeof customFields === 'string') {
        try {
          customFields = JSON.parse(customFields);
        } catch {
          // 保持原样
        }
      }
      return {
        ...file,
        folder_name: await this.getFolderName(file.folder_id),
        custom_fields: customFields,
        thumb: await this.getItemThumbPath(file, { isUrlFile }),
        path: await this.getItemFilePath(file, { isUrlFile }),
        file_path: await this.getItemFilePath(file, { isUrlFile: false }),
        thumb_path: await this.getItemThumbPath(file, { isUrlFile: false }),
      };
    }));
  }

  async queryFolder(query: Record<string, any>): Promise<Record<string, any>[]> {
    const folders = await this.getFolders();
    return folders.filter(folder => {
      return Object.entries(query).every(([key, value]) => {
        return folder[key] === value;
      });
    });
  }

  async queryLibrary(query: Record<string, any>): Promise<Record<string, any>> {
    return this.getLibraryInfo();
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

  async queryTag(query: Record<string, any>): Promise<Record<string, any>[]> {
    const tags = await this.getTags();
    return tags.filter(tag => {
      return Object.entries(query).every(([key, value]) => {
        return tag[key] === value;
      });
    });
  }

  async getStats(): Promise<{ totalFiles: number; totalSize: number }> {
    try {
      const result = await this.getSql('SELECT COUNT(*) as total_files, COALESCE(SUM(size), 0) as total_size FROM files WHERE recycled = 0');
      return {
        totalFiles: result[0]?.total_files || 0,
        totalSize: result[0]?.total_size || 0
      };
    } catch (error) {
      console.error('Error getting library stats:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }

  async getUploadStatistics(): Promise<Record<string, any>[]> {
    try {
      const result = await this.getSql(
        `SELECT uploader, COUNT(*) as file_count, COALESCE(SUM(size), 0) as total_size
         FROM files WHERE recycled = 0 GROUP BY uploader`
      );
      return result.map(row => this.rowToMap(row));
    } catch (error) {
      console.error('Error getting upload statistics:', error);
      return [];
    }
  }

  async getDailyUploadStats(): Promise<Record<string, any>[]> {
    try {
      const result = await this.getSql(
        `SELECT date(imported_at / 1000, 'unixepoch') as date,
                COUNT(*) as file_count,
                COALESCE(SUM(size), 0) as total_size
         FROM files
         WHERE recycled = 0
         GROUP BY date(imported_at / 1000, 'unixepoch')
         ORDER BY date ASC`
      );
      return result.map(row => this.rowToMap(row));
    } catch (error) {
      console.error('Error getting daily upload stats:', error);
      return [];
    }
  }

  async getFileTypeStatistics(): Promise<Record<string, any>[]> {
    try {
      const result = await this.getSql(
        `SELECT
          CASE
            WHEN name LIKE '%.jpg' OR name LIKE '%.jpeg' THEN 'image'
            WHEN name LIKE '%.png' OR name LIKE '%.gif' OR name LIKE '%.webp' OR name LIKE '%.bmp' THEN 'image'
            WHEN name LIKE '%.mp4' OR name LIKE '%.avi' OR name LIKE '%.mkv' OR name LIKE '%.mov' OR name LIKE '%.wmv' OR name LIKE '%.flv' THEN 'video'
            WHEN name LIKE '%.mp3' OR name LIKE '%.wav' OR name LIKE '%.flac' OR name LIKE '%.aac' OR name LIKE '%.ogg' OR name LIKE '%.wma' THEN 'audio'
            WHEN name LIKE '%.pdf' THEN 'pdf'
            WHEN name LIKE '%.doc' OR name LIKE '%.docx' THEN 'doc'
            WHEN name LIKE '%.xls' OR name LIKE '%.xlsx' THEN 'xls'
            WHEN name LIKE '%.ppt' OR name LIKE '%.pptx' THEN 'ppt'
            WHEN name LIKE '%.zip' OR name LIKE '%.rar' OR name LIKE '%.7z' OR name LIKE '%.tar' OR name LIKE '%.gz' THEN 'archive'
            WHEN name LIKE '%.txt' OR name LIKE '%.md' OR name LIKE '%.log' THEN 'text'
            ELSE 'other'
          END as type,
          COUNT(*) as file_count,
          COALESCE(SUM(size), 0) as total_size
         FROM files
         WHERE recycled = 0
         GROUP BY type
         ORDER BY file_count DESC`
      );
      return result.map(row => this.rowToMap(row));
    } catch (error) {
      console.error('Error getting file type statistics:', error);
      return [];
    }
  }

  async getRecentUploads(days: number = 7): Promise<Record<string, any>[]> {
    try {
      const since = Date.now() - days * 24 * 60 * 60 * 1000;
      // 按天、上传者、文件夹维度聚合
      const folderRows = await this.getSql(
        `SELECT date(imported_at / 1000, 'unixepoch') as date,
                uploader,
                folder_id,
                COUNT(*) as file_count
         FROM files
         WHERE recycled = 0 AND imported_at >= ?
         GROUP BY date, uploader, folder_id
         ORDER BY date DESC, file_count DESC`,
        [since]
      );

      // 按天、上传者、标签维度聚合（files.tags 是 JSON 数组）
      const tagRows = await this.getSql(
        `SELECT date(f.imported_at / 1000, 'unixepoch') as date,
                f.uploader,
                j.value as tag_id,
                COUNT(*) as file_count
         FROM files f, json_each(f.tags) j
         WHERE f.recycled = 0 AND f.imported_at >= ? AND f.tags IS NOT NULL
         GROUP BY date, f.uploader, j.value
         ORDER BY date DESC, file_count DESC`,
        [since]
      );

      // 查询无标签的文件（按天、上传者）
      const noTagRows = await this.getSql(
        `SELECT date(imported_at / 1000, 'unixepoch') as date,
                uploader,
                COUNT(*) as file_count
         FROM files
         WHERE recycled = 0 AND imported_at >= ? AND (tags IS NULL OR tags = '[]' OR tags = '')
         GROUP BY date, uploader
         ORDER BY date DESC, file_count DESC`,
        [since]
      );

      return {
        byFolder: folderRows.map(row => this.rowToMap(row)),
        byTag: tagRows.map(row => this.rowToMap(row)),
        noTag: noTagRows.map(row => this.rowToMap(row)),
      } as any;
    } catch (error) {
      console.error('Error getting recent uploads:', error);
      return [];
    }
  }
}