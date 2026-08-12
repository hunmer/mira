import { describe, expect, it } from 'vitest';
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
