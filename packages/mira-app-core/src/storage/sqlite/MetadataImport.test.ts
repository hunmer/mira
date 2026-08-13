import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';

describe('file metadata import', () => {
  let db: LibraryServerDataSQLite | undefined;
  let directory: string | undefined;

  afterEach(async () => {
    await db?.close();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('notifies after import and persists metadata as JSON', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-metadata-'));
    const filePath = path.join(directory, 'sample.jpg');
    fs.writeFileSync(filePath, 'sample');

    let imported: Record<string, any> | undefined;
    db = new LibraryServerDataSQLite({ id: 'test', customFields: { path: directory } }, {
      onFileImported: file => { imported = file; },
    });
    await db.initialize();

    const file = await db.createFileFromPath(filePath, {}, { importType: 'link' });
    expect(imported?.id).toBe(file.id);
    expect(file.name).toBe('sample.jpg');
    expect(file.path).toBe(filePath);
    expect(fs.existsSync(filePath)).toBe(true);

    await db.updateFile(file.id, { metadata: { width: 1920, gps: { latitude: 35.6 } } });
    const stored = await db.getFile(file.id);
    expect(stored?.metadata).toEqual({ width: 1920, gps: { latitude: 35.6 } });
  });
});
