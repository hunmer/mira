import { describe, expect, it, vi } from 'vitest';
import { FileModule } from './FileModule';

describe('FileModule.batchImport', () => {
    it('posts the batch import request to the download executor', async () => {
        const response = { batchId: 'batch-1', total: 2 };
        const files = new FileModule({} as any);

        const first = { name: '1.jpg' } as File;
        const second = 'https://a.test/2.jpg';
        const upload = vi.spyOn(files, 'upload').mockResolvedValue(response as any);
        await expect(files.batchImport([first, second], 'library-1', {
            folderId: 3,
            clientId: 'client-1',
            tags: ['收藏'],
        })).resolves.toEqual(response);
        expect(upload).toHaveBeenCalledWith(expect.objectContaining({ files: [first], urlItems: [second], libraryId: 'library-1', batchImport: true }));
        expect(upload).toHaveBeenCalledWith(expect.objectContaining({
            payload: { data: { folder_id: '3', tags: ['收藏'] } },
        }));
    });
});

describe('FileModule.importFilePath', () => {
    it('posts an absolute path request without multipart file data', async () => {
        const http = { post: vi.fn().mockResolvedValue({ id: 1989, path: null, name: 'image.png' }) };
        const files = new FileModule(http as any);

        const result = await files.importFilePath('library-1', 'I:/素材库/image.png', {
            folderId: '12',
            tags: ['参考'],
        });

        expect(result).toEqual({ id: 1989, path: null, name: 'image.png' });
        expect(http.post).toHaveBeenCalledWith('/api/files/import-path', {
            libraryId: 'library-1',
            path: 'I:/素材库/image.png',
            folderId: '12',
            tags: ['参考'],
        });
    });
});
