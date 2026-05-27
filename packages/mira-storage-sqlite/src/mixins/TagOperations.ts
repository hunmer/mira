import { CoreAccessible } from './types';

export const TagOperations = {
  async createTag(this: CoreAccessible, tagData: Record<string, any>): Promise<number> {
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
  },

  async updateTag(this: CoreAccessible, id: number, tagData: Record<string, any>): Promise<boolean> {
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
  },

  async deleteTag(this: CoreAccessible, id: number): Promise<boolean> {
    await this.beginTransaction();
    try {
      const children = await this.getTags({ parentId: id });
      for (const child of children) {
        await this.deleteTag(child.id);
      }

      const result = await this.runSql('DELETE FROM tags WHERE id = ?', [id]);
      await this.commitTransaction();
      return result.changes > 0;
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  },

  async getTag(this: CoreAccessible, id: number): Promise<Record<string, any> | null> {
    const rows = await this.getSql('SELECT * FROM tags WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.rowToMap(rows[0]) : null;
  },

  async getTags(this: CoreAccessible, options?: {
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
  },

  async getAllTags(this: CoreAccessible): Promise<Record<string, any>[]> {
    const rows = await this.getSql('SELECT * FROM tags', []);
    return rows.map(row => this.rowToMap(row));
  },

  async queryTag(this: CoreAccessible, query: Record<string, any>): Promise<Record<string, any>[]> {
    const tags = await this.getTags();
    return tags.filter(tag => {
      return Object.entries(query).every(([key, value]) => {
        return tag[key] === value;
      });
    });
  },
};
