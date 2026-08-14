import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { ThumbnailModule } from './ThumbnailModule';

function makeModule() {
    const http = { get: vi.fn() };
    return { http, module: new ThumbnailModule(http as unknown as HttpClient) };
}

describe('ThumbnailModule contract', () => {
    it('scan starts with libraryId query', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue({ success: true, message: 'started' });

        await module.scan('lib-1');
        expect(http.get).toHaveBeenCalledWith('/api/thumb/scan', { params: { libraryId: 'lib-1' } });
    });

    it('progress queries generation progress', async () => {
        const { http, module } = makeModule();
        const progress = { total: 10, done: 5 };
        http.get.mockResolvedValue(progress);

        await expect(module.progress('lib-1')).resolves.toEqual(progress);
        expect(http.get).toHaveBeenCalledWith('/api/thumb/progress', { params: { libraryId: 'lib-1' } });
    });

    it('cancel posts no params', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue({ success: true, message: 'cancelled' });

        await module.cancel();
        expect(http.get).toHaveBeenCalledWith('/api/thumb/cancel');
    });

    it('stats queries library stats', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue({ total: 100 });

        await module.stats('lib-1');
        expect(http.get).toHaveBeenCalledWith('/api/thumb/stats', { params: { libraryId: 'lib-1' } });
    });

    it('generators lists without params', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue(['ffmpeg']);

        await module.generators();
        expect(http.get).toHaveBeenCalledWith('/api/thumb/generators');
    });

    it('sync passes libraryId', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue({ success: true, data: {} });

        await module.sync('lib-1');
        expect(http.get).toHaveBeenCalledWith('/api/thumb/sync', { params: { libraryId: 'lib-1' } });
    });

    it('metadataStats / metadataScan / metadataProgress hit the metadata endpoints', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue({});

        await module.metadataStats('lib-1');
        expect(http.get).toHaveBeenCalledWith('/api/thumb/metadata/stats', { params: { libraryId: 'lib-1' } });

        await module.metadataScan('lib-1');
        expect(http.get).toHaveBeenCalledWith('/api/thumb/metadata/scan', { params: { libraryId: 'lib-1' } });

        await module.metadataProgress('lib-1');
        expect(http.get).toHaveBeenCalledWith('/api/thumb/metadata/progress', { params: { libraryId: 'lib-1' } });
    });
});
