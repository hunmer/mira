import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { LibraryServerDataSQLite } from './LibraryServerDataSQLite';

describe('LibraryServerDataSQLite.processingFiles', () => {
  it('returns relative file and thumbnail API paths', async () => {
    const library = new LibraryServerDataSQLite({ id: '1' });
    library.getFolderName = async () => '';
    library.getItemFilePath = async () => 'D:/library/image.png';
    library.getItemThumbPath = async () => 'D:/library/thumbs/2.png';

    const [file] = await library.processingFiles([{ id: 2, name: 'image.png' }], true);

    expect(file.path).toBe('/api/files/file/1/2');
    expect(file.thumb).toBe('/api/files/thumb/1/2');
  });
});

describe('LibraryServerDataSQLite file website metadata', () => {
  let root: string | undefined;
  let library: LibraryServerDataSQLite | undefined;

  afterEach(async () => {
    await library?.close();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it('persists website when a file is updated', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-file-update-'));
    library = new LibraryServerDataSQLite({ id: 'website-test', customFields: { path: root } });
    await library.initialize();

    const created = await library.createFile({
      name: 'sample.jpg', path: path.join(root, 'sample.jpg'),
      created_at: Date.now(), imported_at: Date.now(), size: 1, hash: '',
    });
    const update = await library.updateFile(created.id, { website: 'https://www.baidu.com' });

    expect(update.success).toBe(true);
    expect((await library.getFile(created.id))?.website).toBe('https://www.baidu.com');
  });
});
