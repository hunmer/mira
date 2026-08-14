import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { FileSystemModule } from './FileSystemModule';

function makeModule() {
    const http = {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    };
    return { http, module: new FileSystemModule(http as unknown as HttpClient) };
}

describe('FileSystemModule contract', () => {
    it('mkdir posts parent path and name', async () => {
        const { http, module } = makeModule();
        const node = { label: 'a', value: '/x/a', isLeaf: false };
        http.post.mockResolvedValue(node);

        await expect(module.mkdir('/x', 'a')).resolves.toEqual(node);
        expect(http.post).toHaveBeenCalledWith('/api/fs/mkdir', { path: '/x', name: 'a' });
    });

    it('getDirs passes optional path query', async () => {
        const { http, module } = makeModule();
        const dirs = [{ label: 'd', value: '/d', isLeaf: false }];
        http.get.mockResolvedValue(dirs);

        await expect(module.getDirs('/x')).resolves.toEqual(dirs);
        expect(http.get).toHaveBeenCalledWith('/api/fs/dirs', { params: { path: '/x' } });

        await module.getDirs();
        expect(http.get).toHaveBeenLastCalledWith('/api/fs/dirs', { params: undefined });
    });

    it('list passes list params as query', async () => {
        const { http, module } = makeModule();
        const files = [{ name: 'a.jpg' }];
        http.get.mockResolvedValue(files);
        const params = { libraryId: 'lib-1', path: '/', offset: 0, limit: 100 };

        await expect(module.list(params)).resolves.toEqual(files);
        expect(http.get).toHaveBeenCalledWith('/api/fs/list', { params });
    });

    it('move posts move payload', async () => {
        const { http, module } = makeModule();
        const res = { success: true };
        http.post.mockResolvedValue(res);

        await expect(module.move({ libraryId: 'lib-1', source: '/a', destination: '/b' })).resolves.toEqual(res);
        expect(http.post).toHaveBeenCalledWith('/api/fs/move', { libraryId: 'lib-1', source: '/a', destination: '/b' });
    });

    it('remove posts paths payload', async () => {
        const { http, module } = makeModule();
        const res = { success: true, data: { removed: 1 } };
        http.post.mockResolvedValue(res);

        await expect(module.remove({ libraryId: 'lib-1', paths: ['/a'] })).resolves.toEqual(res);
        expect(http.post).toHaveBeenCalledWith('/api/fs/remove', { libraryId: 'lib-1', paths: ['/a'] });
    });

    it('sync posts libraryId', async () => {
        const { http, module } = makeModule();
        http.post.mockResolvedValue({ success: true, data: { files: 5 } });

        await module.sync('lib-1');
        expect(http.post).toHaveBeenCalledWith('/api/fs/sync', { libraryId: 'lib-1' });
    });

    it('scanMissing queries libraryId and clearMissing deletes with body', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue([{ id: 1 }]);
        http.delete.mockResolvedValue({ success: true, data: { removed: 1 } });

        await module.scanMissing('lib-1');
        expect(http.get).toHaveBeenCalledWith('/api/fs/database/missing', { params: { libraryId: 'lib-1' } });

        await module.clearMissing('lib-1');
        expect(http.delete).toHaveBeenCalledWith('/api/fs/database/missing', { data: { libraryId: 'lib-1' } });
    });

    it('findNewFiles / importNewFiles / deleteNewFiles use the right verbs', async () => {
        const { http, module } = makeModule();
        http.post.mockResolvedValue({ success: true, data: { files: [] } });
        http.delete.mockResolvedValue({ success: true });

        await module.findNewFiles('lib-1');
        expect(http.post).toHaveBeenCalledWith('/api/fs/database/new', { libraryId: 'lib-1' });

        await module.importNewFiles('lib-1', ['/a', '/b']);
        expect(http.post).toHaveBeenCalledWith('/api/fs/database/new/import', { libraryId: 'lib-1', paths: ['/a', '/b'] });

        await module.deleteNewFiles('lib-1', ['/a']);
        expect(http.delete).toHaveBeenCalledWith('/api/fs/database/new', { data: { libraryId: 'lib-1', paths: ['/a'] } });
    });

    it('scanDuplicates posts and removeDuplicateRecords deletes with body', async () => {
        const { http, module } = makeModule();
        http.post.mockResolvedValue({ success: true, data: [] });
        http.delete.mockResolvedValue({ success: true, data: { removed: 2 } });

        await module.scanDuplicates('lib-1');
        expect(http.post).toHaveBeenCalledWith('/api/fs/database/duplicates', { libraryId: 'lib-1' });

        await module.removeDuplicateRecords('lib-1', [1, 2]);
        expect(http.delete).toHaveBeenCalledWith('/api/fs/database/duplicates', { data: { libraryId: 'lib-1', fileIds: [1, 2] } });
    });

    it('download posts with blob responseType', async () => {
        const { http, module } = makeModule();
        const blob = new Blob(['zip']);
        http.post.mockResolvedValue(blob);

        await expect(module.download({ libraryId: 'lib-1', paths: ['/a'] })).resolves.toBe(blob);
        expect(http.post).toHaveBeenCalledWith('/api/fs/download', { libraryId: 'lib-1', paths: ['/a'] }, { responseType: 'blob' });
    });
});
