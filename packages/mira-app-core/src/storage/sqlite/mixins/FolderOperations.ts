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
      const children = await this.getFolders({ parentId: id });
      for (const child of children) {
        await this.deleteFolder(child.id, deleteFiles);
      }

      const folderName = await this.getFolderName(id);
      const libraryPath = await this.getLibraryPath();

      const files = await this.getSql('SELECT * FROM files WHERE folder_id = ?', [id]);
      if (deleteFiles) {
        for (const row of files) {
          const file = this.rowToMap(row);
          const filePath = path.join(libraryPath, folderName, file.name);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          if (file.hash) {
            const thumbPath = path.join(libraryPath, 'thumbs', `${file.hash}.png`);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
          }
          await this.runSql('DELETE FROM files WHERE id = ?', [file.id]);
        }
      } else {
        for (const row of files) {
          await (this as any)._moveFileToFolder(this.rowToMap(row).id, null);
        }
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
