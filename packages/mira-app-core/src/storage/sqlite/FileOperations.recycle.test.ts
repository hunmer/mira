import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';

describe('LibraryServerDataSQLite recycle bin', () => {
  let root: string | undefined;
  let db: LibraryServerDataSQLite | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await db?.close();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it('retries a transient lock when moving a file to trash', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-recycle-retry-'));
    const filePath = path.join(root, 'sample.jpg');
    fs.writeFileSync(filePath, 'sample');
    db = new LibraryServerDataSQLite({ id: 'recycle-retry', customFields: { path: root } });
    await db.initialize();
    const item = await db.createFile({
      name: 'sample.jpg', path: filePath, created_at: Date.now(), imported_at: Date.now(), size: 6, hash: '',
    });

    const originalRename = fs.promises.rename;
    let remainingFailures = 2;
    const renameSpy = vi.spyOn(fs.promises, 'rename').mockImplementation(async (oldPath, newPath) => {
      if (remainingFailures-- > 0) {
        const error = new Error('resource busy or locked') as NodeJS.ErrnoException;
        error.code = 'EBUSY';
        throw error;
      }
      return originalRename(oldPath, newPath);
    });

    expect(await db.deleteFile(item.id, { moveToRecycleBin: true })).toBe(true);
    expect(renameSpy).toHaveBeenCalledTimes(3);
    const recycled = await db.getFile(item.id);
    expect(recycled?.recycled).toBe(1);
    expect(fs.existsSync(recycled!.path)).toBe(true);
  });

  it('rolls back database state when a file remains locked', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-recycle-rollback-'));
    const filePath = path.join(root, 'sample.jpg');
    fs.writeFileSync(filePath, 'sample');
    db = new LibraryServerDataSQLite({ id: 'recycle-rollback', customFields: { path: root } });
    await db.initialize();
    const item = await db.createFile({
      name: 'sample.jpg', path: filePath, created_at: Date.now(), imported_at: Date.now(), size: 6, hash: '',
    });

    vi.spyOn(fs.promises, 'rename').mockRejectedValue(Object.assign(new Error('resource busy or locked'), { code: 'EBUSY' }));

    expect(await db.deleteFile(item.id, { moveToRecycleBin: true })).toBe(false);
    const unchanged = await db.getFile(item.id);
    expect(unchanged?.recycled).toBe(0);
    expect(unchanged?.path).toBe(filePath);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
