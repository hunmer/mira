import { CoreAccessible } from './types';

export const Statistics = {
  async getStats(this: CoreAccessible): Promise<{ totalFiles: number; totalSize: number }> {
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
  },

  async getUploadStatistics(this: CoreAccessible, startTime?: number): Promise<Record<string, any>[]> {
    try {
      const sql = startTime
        ? `SELECT uploader, COUNT(*) as file_count, COALESCE(SUM(size), 0) as total_size FROM files WHERE recycled = 0 AND imported_at >= ? GROUP BY uploader`
        : `SELECT uploader, COUNT(*) as file_count, COALESCE(SUM(size), 0) as total_size FROM files WHERE recycled = 0 GROUP BY uploader`;
      const result = await this.getSql(sql, startTime ? [startTime] : []);
      return result.map(row => this.rowToMap(row));
    } catch (error) {
      console.error('Error getting upload statistics:', error);
      return [];
    }
  },

  async getDailyUploadStats(this: CoreAccessible, startTime?: number): Promise<Record<string, any>[]> {
    try {
      const sql = startTime
        ? `SELECT date(imported_at / 1000, 'unixepoch') as date, COUNT(*) as file_count, COALESCE(SUM(size), 0) as total_size FROM files WHERE recycled = 0 AND imported_at >= ? GROUP BY date(imported_at / 1000, 'unixepoch') ORDER BY date ASC`
        : `SELECT date(imported_at / 1000, 'unixepoch') as date, COUNT(*) as file_count, COALESCE(SUM(size), 0) as total_size FROM files WHERE recycled = 0 GROUP BY date(imported_at / 1000, 'unixepoch') ORDER BY date ASC`;
      const result = await this.getSql(sql, startTime ? [startTime] : []);
      return result.map(row => this.rowToMap(row));
    } catch (error) {
      console.error('Error getting daily upload stats:', error);
      return [];
    }
  },

  async getFileTypeStatistics(this: CoreAccessible, startTime?: number): Promise<Record<string, any>[]> {
    try {
      const where = startTime ? 'recycled = 0 AND imported_at >= ?' : 'recycled = 0';
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
         WHERE ${where}
         GROUP BY type
         ORDER BY file_count DESC`,
        startTime ? [startTime] : []
      );
      return result.map(row => this.rowToMap(row));
    } catch (error) {
      console.error('Error getting file type statistics:', error);
      return [];
    }
  },

  async getRecentUploads(this: CoreAccessible, days: number = 7): Promise<Record<string, any>[]> {
    try {
      const since = Date.now() - days * 24 * 60 * 60 * 1000;
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
  },
};
