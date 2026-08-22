import { describe, expect, it, vi } from 'vitest';
import { FileModule } from './FileModule';

describe('FileModule.moveFile', () => {
    it('posts source and target library IDs with the file ID', async () => {
        const response = {
            sourceLibraryId: 'library-1',
            targetLibraryId: 'library-2',
            sourceFileId: 7,
            targetFile: { id: 12, name: 'image.png' },
        };
        const http = { post: vi.fn().mockResolvedValue(response) };
        const files = new FileModule(http as any);

        await expect(files.moveFile('library-1', 'library-2', 7)).resolves.toEqual(response);
        expect(http.post).toHaveBeenCalledWith('/api/files/move', {
            libraryId: 'library-1',
            sourceLibraryId: 'library-1',
            targetLibraryId: 'library-2',
            fileId: '7',
        });
    });
});
