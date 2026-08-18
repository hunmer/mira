import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { FolderModule } from './FolderModule';

describe('FolderModule contract', () => {
    it('gets folder covers in one request and resolves resource URLs', async () => {
        const http = {
            post: vi.fn().mockResolvedValue([
                { folderId: 1, coverUrl: '/api/files/thumb/lib-1/10' },
                { folderId: 2, coverUrl: null },
            ]),
            getUrl: vi.fn((url: string) => `http://localhost:8081${url}?token=test`),
        };
        const module = new FolderModule(http as unknown as HttpClient);

        await expect(module.getCovers('lib-1', [1, 2])).resolves.toEqual([
            { folderId: 1, coverUrl: 'http://localhost:8081/api/files/thumb/lib-1/10?token=test' },
            { folderId: 2, coverUrl: null },
        ]);
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith('/api/folders/covers', {
            libraryId: 'lib-1',
            folderIds: [1, 2],
        });
        expect(http.getUrl).toHaveBeenCalledTimes(1);
    });
});
