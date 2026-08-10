import fs from 'fs/promises';
import path from 'path';
import { getLibraries } from 'mira-app-core';

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = 30 * DAY_MS;

export class DatabaseBackupService {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private readonly dataPath: string) {}

  async start(): Promise<void> {
    await this.runOnce();
    this.timer = setInterval(() => { void this.runOnce(); }, DAY_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const backupRoot = path.join(this.dataPath, 'db-backups');
      await fs.mkdir(backupRoot, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      const targetDir = path.join(backupRoot, timestamp);
      await fs.mkdir(targetDir, { recursive: true });
      const libraries = await getLibraries(this.dataPath);
      for (const library of libraries) {
        if (library.customFields?.enableAutoBackup ?? true) {
          const source = path.join(library.path, 'library_data.db');
          try {
            await fs.copyFile(source, path.join(targetDir, `${library.id}.db`));
          } catch (error: any) {
            if (error?.code !== 'ENOENT') console.error(`DB backup failed for ${library.id}:`, error);
          }
        }
      }
      const entries = await fs.readdir(backupRoot, { withFileTypes: true });
      const cutoff = Date.now() - RETENTION_MS;
      await Promise.all(entries.filter(entry => entry.isDirectory()).map(async entry => {
        const stat = await fs.stat(path.join(backupRoot, entry.name));
        if (stat.mtimeMs < cutoff) await fs.rm(path.join(backupRoot, entry.name), { recursive: true, force: true });
      }));
    } catch (error) {
      console.error('DB backup run failed:', error);
    } finally {
      this.running = false;
    }
  }
}
