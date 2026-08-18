import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';

describe('nested folder creation and file import', () => {
  let root: string | undefined;
  let source: string | undefined;
  let library: LibraryServerDataSQLite | undefined;

  afterEach(async () => {
    await library?.close();
    if (source) fs.rmSync(source, { force: true });
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it('creates the physical parent/child directories and imports into the child', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-folder-import-'));
    source = path.join(root, 'source.bin');
    fs.writeFileSync(source, 'nested folder import');

    library = new LibraryServerDataSQLite({
      id: 'folder-import-test',
      customFields: { path: root },
    });
    await library.initialize();

    const parentId = await library.createFolder({ title: 'Parent', color: 0, icon: '' });
    const childId = await library.createFolder({
      title: 'Child', parent_id: parentId, color: 0, icon: '',
    });

    const nestedDir = path.join(root, 'Parent', 'Child');
    expect(fs.existsSync(nestedDir)).toBe(true);

    const imported = await library.createFileFromPath(
      source,
      { folder_id: childId },
      { importType: 'copy' },
    );

    expect(imported.folder_id).toBe(childId);
    expect(imported.path).toBe(path.join(nestedDir, 'source.bin'));
    expect(fs.existsSync(imported.path)).toBe(true);
    expect(await library.getItemFilePath(imported)).toBe(imported.path);
  });

  it('moves a root file into the nested folder on disk and in the database', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-folder-move-'));
    source = path.join(os.tmpdir(), `mira-folder-source-${Date.now()}-${Math.random()}.bin`);
    fs.writeFileSync(source, 'move into nested folder');

    library = new LibraryServerDataSQLite({
      id: 'folder-move-test',
      customFields: { path: root },
    });
    await library.initialize();

    const parentId = await library.createFolder({ title: 'Parent', color: 0, icon: '' });
    const childId = await library.createFolder({
      title: 'Child', parent_id: parentId, color: 0, icon: '',
    });
    const imported = await library.createFileFromPath(source, {}, { importType: 'copy' });
    const fileName = path.basename(source);
    const rootPath = path.join(root, fileName);

    expect(imported.path).toBe(rootPath);
    expect(fs.existsSync(rootPath)).toBe(true);

    const result = await library.setFileFolder(imported.id, childId);
    const moved = await library.getFile(imported.id);
    const nestedPath = path.join(root, 'Parent', 'Child', fileName);

    expect(result.success).toBe(true);
    expect(moved?.folder_id).toBe(childId);
    expect(fs.existsSync(rootPath)).toBe(false);
    expect(fs.existsSync(nestedPath)).toBe(true);
    expect(await library.getItemFilePath(moved!)).toBe(nestedPath);
  });

  it('removes an empty nested folder from the database and disk', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-folder-delete-'));
    library = new LibraryServerDataSQLite({
      id: 'folder-delete-test',
      customFields: { path: root },
    });
    await library.initialize();

    const parentId = await library.createFolder({ title: 'Parent', color: 0, icon: '' });
    const childId = await library.createFolder({
      title: 'Child', parent_id: parentId, color: 0, icon: '',
    });
    const nestedDir = path.join(root, 'Parent', 'Child');
    expect(fs.existsSync(nestedDir)).toBe(true);

    expect(await library.deleteFolder(childId, false)).toBe(true);
    expect(await library.getFolder(childId)).toBeNull();
    expect(fs.existsSync(nestedDir)).toBe(false);
    expect(fs.existsSync(path.join(root, 'Parent'))).toBe(true);
  });
});
