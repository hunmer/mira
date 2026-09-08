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

  it('updates the item name when trash already contains the same file name', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-recycle-name-'));
    const filePath = path.join(root, 'sample.jpg');
    const trashDir = path.join(root, '.trash');
    fs.mkdirSync(trashDir);
    fs.writeFileSync(filePath, 'sample');
    fs.writeFileSync(path.join(trashDir, 'sample.jpg'), 'existing');
    db = new LibraryServerDataSQLite({ id: 'recycle-name', customFields: { path: root } });
    await db.initialize();
    const item = await db.createFile({
      name: 'sample.jpg', path: filePath, created_at: Date.now(), imported_at: Date.now(), size: 6, hash: '',
    });

    expect(await db.deleteFile(item.id, { moveToRecycleBin: true })).toBe(true);
    const recycled = await db.getFile(item.id);
    expect(recycled?.name).toBe('sample (1).jpg');
    expect(path.basename(recycled!.path)).toBe(recycled?.name);
  });

  it('updates the item name when restoring into a same-name file', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-recover-name-'));
    const filePath = path.join(root, 'sample.jpg');
    fs.writeFileSync(filePath, 'sample');
    db = new LibraryServerDataSQLite({ id: 'recover-name', customFields: { path: root } });
    await db.initialize();
    const item = await db.createFile({
      name: 'sample.jpg', path: filePath, created_at: Date.now(), imported_at: Date.now(), size: 6, hash: '',
    });
    await db.deleteFile(item.id, { moveToRecycleBin: true });
    fs.writeFileSync(filePath, 'existing');

    expect(await db.recoverFile(item.id)).toBe(true);
    const recovered = await db.getFile(item.id);
    expect(recovered?.name).toBe('sample (1).jpg');
    expect(path.basename(recovered!.path)).toBe(recovered?.name);
  });

  it('rolls back item name, path, and recycled state when restore fails', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-recover-rollback-'));
    const filePath = path.join(root, 'sample.jpg');
    fs.writeFileSync(filePath, 'sample');
    db = new LibraryServerDataSQLite({ id: 'recover-rollback', customFields: { path: root } });
    await db.initialize();
    const item = await db.createFile({
      name: 'sample.jpg', path: filePath, created_at: Date.now(), imported_at: Date.now(), size: 6, hash: '',
    });
    await db.deleteFile(item.id, { moveToRecycleBin: true });
    const recycled = await db.getFile(item.id);
    fs.writeFileSync(filePath, 'existing');
    vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('restore failed'); });

    expect(await db.recoverFile(item.id)).toBe(false);
    const unchanged = await db.getFile(item.id);
    expect(unchanged?.name).toBe(recycled?.name);
    expect(unchanged?.path).toBe(recycled?.path);
    expect(unchanged?.recycled).toBe(1);
  });
});
