import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { CoreAccessible } from './types';

const execFileAsync = promisify(execFile);

async function moveToSystemTrash(filePath: string): Promise<void> {
  if (process.platform === 'win32') {
    const escaped = filePath.replace(/'/g, "''");
    await execFileAsync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${escaped}', 'OnlyErrorDialogs', 'SendToRecycleBin')`,
    ]);
    return;
  }

  if (process.platform === 'darwin') {
    const escaped = filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    await execFileAsync('osascript', ['-e', `tell application "Finder" to delete POSIX file "${escaped}"`]);
    return;
  }

  if (process.platform === 'linux') {
    await execFileAsync('gio', ['trash', filePath]);
    return;
  }

  throw new Error(`System trash is not supported on platform: ${process.platform}`);
}

export const FileImport = {
  async createFileFromPath(
    this: CoreAccessible,
    filePath: string,
    fileMeta: Record<string, any>,
    options?: { importType?: 'copy' | 'move' | 'link'; enableHash?: boolean; skipSameName?: boolean }
  ): Promise<Record<string, any>> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const hash = (options?.enableHash ?? this.enableHash) ? this.calculateFileHashSync(filePath) : '';

    if (options?.skipSameName ?? (this as any).skipSameName) {
      const existing = await this.getSql(
        'SELECT * FROM files WHERE name = ? AND folder_id IS ? AND recycled = 0 LIMIT 1',
        [path.basename(filePath), fileMeta.folder_id ?? null]
      );
      if (existing.length > 0) return { ...this.rowToMap(existing[0]), duplicate: true };
    }

    // hash 校验：若库中已存在相同 hash 的文件，则跳过导入（去重）
    if (hash) {
      const existing = await this.getSql(
        'SELECT * FROM files WHERE hash = ? AND recycled = 0 LIMIT 1',
        [hash]
      );
      if (existing.length > 0) {
        // move 方式导入时清理临时源文件，避免残留（上传走的就是 move）
        if ((options?.importType || 'copy') === 'move') {
          try { await fs.promises.unlink(filePath); } catch {}
        }
        return { ...this.rowToMap(existing[0]), duplicate: true };
      }
    }

    const importType = options?.importType || 'copy';
    if (!['copy', 'move', 'link'].includes(importType)) {
      throw new Error(`Unknown import type: ${importType}`);
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

    await (this as any).handleFile(filePath, fileData, importType);
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
    const requestedDest = path.join(await this.getItemPath(fileData), fileData.name);
    // 素材库内已有文件导入时，源和目标相同，不应生成重复文件名。
    let destPath = path.resolve(filePath) === path.resolve(requestedDest)
      ? requestedDest
      : this.getUniquePath(requestedDest);
    const destDir = path.dirname(destPath);
    const actualName = path.basename(destPath);
    if (actualName !== fileData.name) {
      fileData.name = actualName;
    }
    switch (importType) {
      case 'link':
        if (path.resolve(filePath) === path.resolve(destPath)) {
          fileData.path = filePath;
          break;
        }
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        // Windows 创建文件符号链接可能需要开发者模式或管理员权限；普通权限下回退到硬链接。
        try {
          await fs.promises.symlink(filePath, destPath, 'file');
        } catch (error: any) {
          if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error?.code)) throw error;
          try {
            await fs.promises.link(filePath, destPath);
          } catch (linkError: any) {
            if (linkError?.code === 'EXDEV') {
              throw new Error('Windows 当前权限无法创建符号链接，且源文件与素材库不在同一磁盘，无法使用硬链接。请开启开发者模式或以管理员身份运行。');
            }
            throw linkError;
          }
        }
        // link 模式唯一保留源文件绝对路径，便于检测源文件是否失效。
        fileData.path = filePath;
        fileData.name = path.basename(destPath);
        break;
      case 'copy':
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        // 异步复制：大文件（视频等）同步 copy 会长时间阻塞事件循环
        if (path.resolve(filePath) !== path.resolve(destPath)) {
          await fs.promises.copyFile(filePath, destPath);
        }
        fileData.path = null;
        fileData.name = path.basename(destPath);
        break;
      case 'move':
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        if (path.resolve(filePath) === path.resolve(destPath)) {
          fileData.path = null;
          break;
        }
        // move 的语义是先完整复制，再将源文件送入系统回收站；复制或回收站操作失败时保留源文件。
        await fs.promises.copyFile(filePath, destPath);
        await moveToSystemTrash(filePath);
        fileData.path = null;
        fileData.name = path.basename(destPath);
        break;
      default:
        throw new Error(`Unknown import type: ${importType}`);
    }
  },
};
