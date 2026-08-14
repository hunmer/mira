import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { StatisticsModule } from './StatisticsModule';

function makeModule() {
    const http = { get: vi.fn() };
    return { http, module: new StatisticsModule(http as unknown as HttpClient) };
}

describe('StatisticsModule contract', () => {
    it('upload queries /api/statistics/:id/upload with optional days', async () => {
        const { http, module } = makeModule();
        const data = { total: 10 };
        http.get.mockResolvedValue(data);

        await expect(module.upload('lib-1', 30)).resolves.toEqual(data);
        expect(http.get).toHaveBeenCalledWith('/api/statistics/lib-1/upload', { params: { days: 30 } });

        await module.upload('lib-1');
        expect(http.get).toHaveBeenLastCalledWith('/api/statistics/lib-1/upload', { params: undefined });
    });

    it('uploadDaily queries the daily endpoint', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue([]);

        await module.uploadDaily('lib-1', 7);
        expect(http.get).toHaveBeenCalledWith('/api/statistics/lib-1/upload/daily', { params: { days: 7 } });
    });

    it('fileTypes queries the file-types endpoint', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue([]);

        await module.fileTypes('lib-1');
        expect(http.get).toHaveBeenCalledWith('/api/statistics/lib-1/file-types', { params: undefined });
    });

    it('recentUploads always passes days', async () => {
        const { http, module } = makeModule();
        http.get.mockResolvedValue([]);

        await module.recentUploads('lib-1', 14);
        expect(http.get).toHaveBeenCalledWith('/api/statistics/lib-1/recent-uploads', { params: { days: 14 } });

        await module.recentUploads('lib-1');
        expect(http.get).toHaveBeenLastCalledWith('/api/statistics/lib-1/recent-uploads', { params: { days: 7 } });
    });
});
