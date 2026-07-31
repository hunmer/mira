import * as path from 'path';
import * as fs from 'fs';
import { CoreAccessible } from './types';

export const FolderOperations = {
  async createFolder(this: CoreAccessible, folderData: Record<string, any>): Promise<number> {
    const result = await this.runSql(
      'INSERT INTO folders(id, title, parent_id, color, icon, sort_index) VALUES (?, ?, ?, ?, ?, ?)',
      [
        folderData.id,
        folderData.title,
        folderData.parent_id,
        folderData.color,
        folderData.icon,
        folderData.sort_index ?? 0,
      ]
    );
    return result.lastID;
  },

  async updateFolder(this: CoreAccessible, id: number, folderData: Record<string, any>): Promise<boolean> {
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
    addField('sort_index', folderData.sort_index);

    if (fields.length === 0) return false;

    const query = `UPDATE folders SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    const result = await this.runSql(query, params);
    return result.changes > 0;
  },

  async deleteFolder(this: CoreAccessible, id: number, deleteFiles?: boolean): Promise<boolean> {
    await this.beginTransaction();
    try {
      const libraryPath = await this.getLibraryPath();

      if (deleteFiles) {
        // 勾选「同时删除文件」：把整个文件夹目录（含子文件夹结构）一次性移动进 .trash/，
        // 子树所有文件标记 recycled=1（可从回收站还原或清空），文件夹行直接删除。
        const folderName = await this.getFolderName(id);
        const folderDir = path.join(libraryPath, folderName);

        // 收集整个子树的文件夹 id（含自身）
        const subtreeIds: number[] = [id];
        const collect = async (parentId: number) => {
          const children = await this.getSql('SELECT id FROM folders WHERE parent_id = ?', [parentId]);
          for (const c of children) {
            const cid = this.rowToMap(c).id;
            subtreeIds.push(cid);
            await collect(cid);
          }
        };
        await collect(id);

        const placeholders = subtreeIds.map(() => '?').join(',');
        // 子树内所有文件（含未回收的）；path 列保留的是磁盘绝对路径
        const fileRows = await this.getSql(
          `SELECT id, name, path FROM files WHERE folder_id IN (${placeholders})`,
          subtreeIds
        );

        const trashDir = path.join(libraryPath, '.trash');
        if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
        // .trash 下给整个文件夹一个独立目录（带去重后缀），保留子目录结构
        const trashFolderDir = this.getUniquePath(
          fs.existsSync(folderDir) ? path.join(trashDir, path.basename(folderDir)) : path.join(trashDir, `folder_${id}`)
        );
        const trashFolderName = path.basename(trashFolderDir);

        // 先改 DB：把每个文件的 path 重写到 .trash 下对应位置 + recycled=1。
        // 顺序很重要——若 watcher 在 rename 后对旧路径发出 unlink，因 path 已更新，查不到行不会误删记录。
        for (const row of fileRows) {
          const file = this.rowToMap(row);
          const rel = file.path && fs.existsSync(folderDir)
            ? path.relative(folderDir, path.dirname(file.path))
            : '';
          const subDir = rel && rel !== '.' && !rel.startsWith('..') ? rel : '';
          const newPath = path.join(trashFolderDir, subDir, file.name);
          await this.runSql('UPDATE files SET recycled = 1, path = ? WHERE id = ?', [newPath, file.id]);
        }

        // 移动整个文件夹目录（一次 rename 带走全部子目录与文件）
        if (fs.existsSync(folderDir)) {
          try {
            fs.renameSync(folderDir, trashFolderDir);
          } catch (e) {
            console.error(`[deleteFolder] move folder to .trash failed (${folderDir} -> ${trashFolderDir}):`, e);
          }
        } else if (fileRows.length > 0) {
          // 文件夹目录已不存在（如 SMB 等场景），单独建目录兜底
          fs.mkdirSync(trashFolderDir, { recursive: true });
        }

        // 删除子树所有文件夹行
        const delResult = await this.runSql(
          `DELETE FROM folders WHERE id IN (${placeholders})`,
          subtreeIds
        );

        await this.commitTransaction();
        return delResult.changes > 0;
      }

      // deleteFiles=false：原有递归行为，文件移到未分类（库根目录）
      const children = await this.getFolders({ parentId: id });
      for (const child of children) {
        await this.deleteFolder(child.id, deleteFiles);
      }

      const folderName = await this.getFolderName(id);
      const files = await this.getSql('SELECT * FROM files WHERE folder_id = ?', [id]);
      for (const row of files) {
        await (this as any)._moveFileToFolder(this.rowToMap(row).id, null);
      }

      const result = await this.runSql('DELETE FROM folders WHERE id = ?', [id]);

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
  },

  async getFolder(this: CoreAccessible, id: number): Promise<Record<string, any> | null> {
    const rows = await this.getSql('SELECT * FROM folders WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  },

  async findFolderByName(this: CoreAccessible, name: string, parentId?: number | null): Promise<Record<string, any> | null> {
    const query = parentId !== undefined && parentId !== null
      ? 'SELECT * FROM folders WHERE title = ? AND parent_id = ? LIMIT 1'
      : 'SELECT * FROM folders WHERE title = ? AND parent_id IS NULL LIMIT 1';

    const params = parentId !== undefined && parentId !== null
      ? [name, parentId]
      : [name];

    const rows = await this.getSql(query, params);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  },

  async getFolders(this: CoreAccessible, options?: {
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
  },

  async getAllFolders(this: CoreAccessible): Promise<Record<string, any>[]> {
    const rows = await this.getSql('SELECT * FROM folders ORDER BY sort_index ASC, id ASC', []);
    return rows.map(row => this.rowToMap(row));
  },

  async queryFolder(this: CoreAccessible, query: Record<string, any>): Promise<Record<string, any>[]> {
    const folders = await this.getFolders();
    return folders.filter(folder => {
      return Object.entries(query).every(([key, value]) => {
        return folder[key] === value;
      });
    });
  },
};
