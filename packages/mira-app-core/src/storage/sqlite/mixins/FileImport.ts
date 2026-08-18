import * as path from 'path';
import * as fs from 'fs';
import { CoreAccessible } from './types';

export const FileImport = {
  async createFileFromPath(
    this: CoreAccessible,
    filePath: string,
    fileMeta: Record<string, any>,
    options?: { importType: string }
  ): Promise<Record<string, any>> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const hash = this.enableHash ? this.calculateFileHashSync(filePath) : '';

    // hash 校验：若库中已存在相同 hash 的文件，则跳过导入（去重）
    if (hash) {
      const existing = await this.getSql(
        'SELECT * FROM files WHERE hash = ? AND recycled = 0 LIMIT 1',
        [hash]
      );
      if (existing.length > 0) {
        // move 方式导入时清理临时源文件，避免残留（上传走的就是 move）
        if ((options?.importType || 'copy') === 'move') {
          try { fs.unlinkSync(filePath); } catch {}
        }
        return { ...this.rowToMap(existing[0]), duplicate: true };
      }
    }

    const fileData = {
      path: filePath,
      name: path.basename(filePath),
      created_at: stat.mtime.getTime(),
      imported_at: Date.now(),
      size: stat.size,
      hash,
      ...fileMeta,
    };

    await (this as any).handleFile(filePath, fileData, options?.importType || 'copy');
    const result = await this.createFile(fileData);
    this.notifyFileImported(result);
    return result;
  },

  async getFileFolder(this: CoreAccessible, fileId: number): Promise<Record<string, any>[]> {
    const rows = await this.getSql(
      'SELECT f.* FROM folders f JOIN files fi ON fi.folder_id = f.id WHERE fi.id = ?',
      [fileId]
    );
    return rows.map(row => this.rowToMap(row));
  },

  async getFileTags(this: CoreAccessible, fileId: number): Promise<Record<string, any>[]> {
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
  },

  async _moveFileToFolder(this: CoreAccessible, fileId: number, folderId: number | null): Promise<boolean> {
    const rows = await this.getSql('SELECT * FROM files WHERE id = ?', [fileId]);
    if (rows.length === 0) return false;
    const file = this.rowToMap(rows[0]);
    const libraryPath = await this.getLibraryPath();

    const srcFolderName = await (this as any).getFolderPath(file.folder_id);
    const destFolderName = await (this as any).getFolderPath(folderId ?? undefined);

    if (srcFolderName !== destFolderName) {
      const srcPath = path.join(libraryPath, srcFolderName, file.name);
      const destDir = path.join(libraryPath, destFolderName);
      let destPath = path.join(destDir, file.name);
      if (fs.existsSync(srcPath)) {
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        destPath = this.getUniquePath(destPath);
        fs.renameSync(srcPath, destPath);
      }
      const newName = path.basename(destPath);
      if (newName !== file.name) {
        await this.runSql('UPDATE files SET name = ?, path = ? WHERE id = ?', [newName, destPath, fileId]);
      }
    }

    const result = await this.runSql('UPDATE files SET folder_id = ? WHERE id = ?', [folderId, fileId]);
    return result.changes > 0;
  },

  async setFileFolder(this: CoreAccessible, fileId: number, folderId: number | null): Promise<{ success: boolean; oldData: Record<string, any> | null }> {
    const oldData = await this.getFile(fileId);
    await this.beginTransaction();
    try {
      const ok = await (this as any)._moveFileToFolder(fileId, folderId);
      await this.commitTransaction();
      return { success: ok, oldData };
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  },

  async setFileTags(this: CoreAccessible, fileId: number, tagIds: string[]): Promise<{ success: boolean; oldData: Record<string, any> | null }> {
    const oldData = await this.getFile(fileId);
    await this.beginTransaction();
    try {
      const result = await this.runSql('UPDATE files SET tags = ? WHERE id = ?', [
        JSON.stringify(tagIds),
        fileId,
      ]);
      await this.commitTransaction();
      return { success: result.changes > 0, oldData };
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  },

  async handleFile(
    this: CoreAccessible,
    filePath: string,
    fileData: Record<string, any>,
    importType: string
  ): Promise<void> {
    // link 只记录现有文件，不能用目标路径的自身存在性触发重命名。
    if (importType === 'link') return;

    let destPath = this.getUniquePath(path.join(await this.getItemPath(fileData), fileData.name));
    const destDir = path.dirname(destPath);
    const actualName = path.basename(destPath);
    if (actualName !== fileData.name) {
      fileData.name = actualName;
    }
    switch (importType) {
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
  },
};
