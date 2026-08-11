import { describe, expect, it, vi } from 'vitest';
import { FileModule } from './FileModule';

describe('FileModule.batchImport', () => {
    it('posts the batch import request to the download executor', async () => {
        const response = { batchId: 'batch-1', total: 2 };
        const post = vi.fn().mockResolvedValue(response);
        const files = new FileModule({ post } as any);

        await expect(files.batchImport('library-1', ['https://a.test/1.jpg', 'https://a.test/2.jpg'], {
            folderId: 3,
            clientId: 'client-1',
        })).resolves.toEqual(response);

        expect(post).toHaveBeenCalledWith('/api/download/start', {
            libraryId: 'library-1',
            urls: ['https://a.test/1.jpg', 'https://a.test/2.jpg'],
            folderId: 3,
            clientId: 'client-1',
        });
    });
});
