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

  it('skips an existing same-name file when enabled', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-same-name-'));
    const first = path.join(directory, 'same.txt');
    const secondDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-same-name-source-'));
    const second = path.join(secondDir, 'same.txt');
    fs.writeFileSync(first, 'first');
    fs.writeFileSync(second, 'second');
    db = new LibraryServerDataSQLite({ id: 'test', customFields: { path: directory, skipSameName: true } });
    await db.initialize();
    await db.createFileFromPath(first, {}, { importType: 'link' });
    const duplicate = await db.createFileFromPath(second, {}, { importType: 'link' });
    expect(duplicate.duplicate).toBe(true);
    fs.rmSync(secondDir, { recursive: true, force: true });
  });

  it('skips matching hashes when hash verification is enabled', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-hash-duplicate-'));
    const first = path.join(directory, 'first.bin');
    const second = path.join(directory, 'second.bin');
    fs.writeFileSync(first, 'identical');
    fs.writeFileSync(second, 'identical');
    db = new LibraryServerDataSQLite({ id: 'test', customFields: { path: directory, enableHash: true } });
    await db.initialize();
    await db.createFileFromPath(first, {}, { importType: 'link' });
    const duplicate = await db.createFileFromPath(second, {}, { importType: 'link' });
    expect(duplicate.duplicate).toBe(true);
  });
});
