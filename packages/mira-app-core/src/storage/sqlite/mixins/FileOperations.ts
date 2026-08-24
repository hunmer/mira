import * as fs from 'fs';
import * as path from 'path';
import { CoreAccessible } from './types';

export const FileOperations = {
  async createFile(this: CoreAccessible, fileData: Record<string, any>): Promise<Record<string, any>> {
    const result = await this.runSql(
      `INSERT INTO files(
        name, created_at, imported_at, size, hash,
        custom_fields, notes, stars, folder_id,
        reference, path, thumb, recycled, tags, uploader, website, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        fileData.website,
        fileData.metadata === undefined || typeof fileData.metadata === 'string'
          ? fileData.metadata
          : JSON.stringify(fileData.metadata),
      ]
    );
    return { id: result.lastID, ...fileData };
  },

  async updateFile(this: CoreAccessible, id: number, fileData: Record<string, any>): Promise<{ success: boolean; oldData: Record<string, any> | null }> {
    const oldData = await this.getFile(id);
    if (!oldData) return { success: false, oldData: null };

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
    addField('stars', fileData.stars);
    addField('tags', fileData.tags);
    addField('folder_id', fileData.folder_id);
    addField('reference', fileData.reference);
    addField('path', fileData.path);
    addField('thumb', fileData.thumb);
    addField('recycled', fileData.recycled);
    addField('uploader', fileData.uploader);
    addField('website', fileData.website);
    addField('metadata', fileData.metadata === undefined || typeof fileData.metadata === 'string'
      ? fileData.metadata
      : JSON.stringify(fileData.metadata));

    if (fields.length === 0) return { success: false, oldData };

    const query = `UPDATE files SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    const result = await this.runSql(query, params);
    return { success: result.changes > 0, oldData };
  },

  async deleteFile(this: CoreAccessible, id: number, options?: { moveToRecycleBin: boolean }): Promise<boolean> {
    if (options?.moveToRecycleBin) {
      const item = await this.getFile(id);
      if (!item) return false;
      // 已经在回收站，不重复移动
      if (item.recycled) return true;

      const src = await this.getItemFilePath(item); // 非 recycled 分支：原位置
      const libraryPath = await this.getLibraryPath();
      const trashDir = path.join(libraryPath, '.trash');
      if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
      const dest = this.getUniquePath(path.join(trashDir, item.name));

      // 先改 DB（path 指向 .trash + recycled=1），再移动磁盘文件。
      // 顺序很重要：watcher 的 handleUnlink 按 path 查行，旧路径 unlink 时找不到行就不会误删记录。
      await this.runSql('UPDATE files SET recycled = 1, path = ? WHERE id = ?', [dest, id]);

      if (src && fs.existsSync(src) && src !== dest) {
        try {
          if (path.parse(src).root === path.parse(dest).root) {
            fs.renameSync(src, dest);
          } else {
            fs.copyFileSync(src, dest);
            fs.unlinkSync(src);
          }
        } catch (e) {
          console.error(`[deleteFile] move to .trash failed (${src} -> ${dest}):`, e);
        }
      }
      return true;
    }
    // 硬删：只删 DB 行，物理文件删除仍由调用方（FileRoutes）负责，保持现状
    const item = await this.getFile(id);
    const result = await this.runSql('DELETE FROM files WHERE id = ?', [id]);
    if (result.changes > 0 && item) {
      // 通知删除回调（缩略图清理等）；回收站分支不触发，恢复后缩略图可继续使用
      this.notifyFileDeleted(item);
    }
    return result.changes > 0;
  },

  async recoverFile(this: CoreAccessible, id: number): Promise<boolean> {
    const item = await this.getFile(id);
    if (!item || !item.recycled) return false;

    const src = item.path; // 软删时写入的 .trash 绝对路径
    // 原文件夹位置（folder_id 对应的文件夹可能已被删除，getFolderName 会返回空串 → 落到库根目录）
    const destDir = await this.getItemPath(item);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const dest = this.getUniquePath(path.join(destDir, item.name));

    // 先改 DB（恢复 path 到原位置 + recycled=0），再移动磁盘文件
    await this.runSql('UPDATE files SET recycled = 0, path = ? WHERE id = ?', [dest, id]);

    if (src && fs.existsSync(src) && src !== dest) {
      try {
        fs.renameSync(src, dest);
      } catch (e) {
        console.error(`[recoverFile] move out of .trash failed (${src} -> ${dest}):`, e);
      }
    }
    return true;
  },

  async emptyTrash(this: CoreAccessible): Promise<{ deletedCount: number; errors: string[] }> {
    const rows = await this.getSql('SELECT id, name, folder_id, hash, path, recycled FROM files WHERE recycled = 1');
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
      if (result.changes > 0) {
        deletedCount++;
        this.notifyFileDeleted(item);
      }
    }

    return { deletedCount, errors };
  },

  async getFile(this: CoreAccessible, id: number): Promise<Record<string, any> | null> {
    const rows = await this.getSql('SELECT * FROM files WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return null;
    const file = this.rowToMap(rows[0]);
    if (typeof file.metadata === 'string') {
      try { file.metadata = JSON.parse(file.metadata); } catch {}
    }
    return file;
  },

  async getFiles(this: CoreAccessible, options?: {
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
    const tagIds = Array.isArray(filters.tags) ? filters.tags.map((id: any) => id.toString()) : [];
    const limit = parseInt(filters.limit?.toString() || '100') || 100;
    const offset = parseInt(filters.offset?.toString() || '0') || 0;

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

    if (filters.title) {
      whereClauses.push('name LIKE ?');
      params.push(`%${filters.title}%`);
    }

    if (filters.name) {
      whereClauses.push('name LIKE ?');
      params.push(`%${filters.name}%`);
    }

    if (filters.url) {
      whereClauses.push('website LIKE ?');
      params.push(`%${filters.url}%`);
    }

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
        params.push(...exts.map((ext: string) => `%${ext}`));
      }
    }

    if (filters.dateRange) {
      let startTime = filters.dateRange.start.getTime();
      let endTime = filters.dateRange.end.getTime();
      const today = new Date();
      const isToday =
        filters.dateRange.end.getFullYear() === today.getFullYear() &&
        filters.dateRange.end.getMonth() === today.getMonth() &&
        filters.dateRange.end.getDate() === today.getDate();
      if (isToday) {
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        endTime = endOfToday.getTime();
      }
      whereClauses.push('created_at BETWEEN ? AND ?');
      params.push(startTime, endTime);
    }

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

    if (filters.folder === '=null' || filters.folder === null) {
      whereClauses.push('(folder_id IS NULL OR folder_id = 0)');
    } else if (folderId !== 0) {
      whereClauses.push('folder_id = ?');
      params.push(folderId);
    }

    if (filters.tags === '=null' || filters.tags === null) {
      whereClauses.push("(tags IS NULL OR tags = '[]' OR json_array_length(tags) = 0)");
    } else if (tagIds.length > 0) {
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

    // metadata 过滤：按最长边 MAX(width, height) 过滤
    // SQLite 的 MAX(x,y) 是标量函数（非聚合），自动忽略 NULL 参数；
    // width/height 都为 NULL 时返回 NULL，比较结果为 falsy，自然排除无尺寸字段的文件（如音频）。
    // CAST AS REAL 确保 exiftool 返回的字符串数值（如 "1920"）正确数值比较。
    if (filters.metadata_dim_min !== undefined || filters.metadata_dim_max !== undefined) {
      const longest = `MAX(CAST(json_extract(metadata, '$.width') AS REAL), CAST(json_extract(metadata, '$.height') AS REAL))`;
      if (filters.metadata_dim_min !== undefined) {
        whereClauses.push(`${longest} >= ?`);
        params.push(filters.metadata_dim_min);
      }
      if (filters.metadata_dim_max !== undefined) {
        whereClauses.push(`${longest} <= ?`);
        params.push(filters.metadata_dim_max);
      }
    }

    // metadata 过滤：按时长 duration（秒）
    if (filters.metadata_duration_min !== undefined) {
      whereClauses.push(`CAST(json_extract(metadata, '$.duration') AS REAL) >= ?`);
      params.push(filters.metadata_duration_min);
    }
    if (filters.metadata_duration_max !== undefined) {
      whereClauses.push(`CAST(json_extract(metadata, '$.duration') AS REAL) <= ?`);
      params.push(filters.metadata_duration_max);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    let orderBy = '';
    if (filters?.sort) {
      const order = filters?.order || 'asc';
      if (filters.sort === 'custom_fields') {
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

    let result = rows.map((row: any) => this.rowToMap(row));
    if (!options?.countFile) {
      result = await this.processingFiles(result, options?.isUrlFile ?? true);
    }

    return {
      result,
      limit,
      offset,
      total: countRows[0].total,
    };
  },

  async queryFile(this: CoreAccessible, query: Record<string, any>, isUrlFile: boolean = true): Promise<Record<string, any>[]> {
    const { result } = await this.getFiles({ filters: query });
    return this.processingFiles(result, isUrlFile);
  },
};
