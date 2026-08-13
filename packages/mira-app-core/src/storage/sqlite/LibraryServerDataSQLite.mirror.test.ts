import fs from 'fs';
import os from 'os';
import path from 'path';
import { Database } from 'sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';

function queryFileCount(dbPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = new Database(dbPath);
    db.get('SELECT COUNT(*) AS total FROM files', (error, row: any) => {
      db.close();
      if (error) reject(error);
      else resolve(row.total);
    });
  });
}

async function waitForFileCount(dbPath: string, expected: number): Promise<void> {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    try {
      if (await queryFileCount(dbPath) === expected) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${expected} files in mirrored database`);
}

describe('LibraryServerDataSQLite DB mirror', () => {
  let root: string | undefined;
  let db: LibraryServerDataSQLite | undefined;

  afterEach(async () => {
    await db?.close();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it('writes through a local copy and syncs a consistent snapshot back', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-db-mirror-'));
    const libraryPath = path.join(root, 'library');
    const mirrorRoot = path.join(root, 'data', 'db-mirrors');
    fs.mkdirSync(libraryPath, { recursive: true });

    const seed = new LibraryServerDataSQLite({ id: 'mirror-test', customFields: { path: libraryPath } });
    await seed.initialize();
    await seed.close();

    db = new LibraryServerDataSQLite({
      id: 'mirror-test',
      customFields: { path: libraryPath, enableDbMirror: true },
    }, { dbMirrorRoot: mirrorRoot, dbMirrorThrottleMs: 10 });
    await db.initialize();
    await db.createFile({
      name: 'sample.jpg', path: path.join(libraryPath, 'sample.jpg'),
      created_at: Date.now(), imported_at: Date.now(), size: 1, hash: '',
    });
    await waitForFileCount(path.join(libraryPath, 'library_data.db'), 1);
    await db.close();
    db = undefined;

    expect(await queryFileCount(path.join(libraryPath, 'library_data.db'))).toBe(1);
    expect(fs.readdirSync(path.join(mirrorRoot, 'mirror-test')).some(name => name.endsWith('.db'))).toBe(true);
    expect(fs.existsSync(path.join(libraryPath, 'library_data.previous.db'))).toBe(true);
  });
});
