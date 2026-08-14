import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { DownloadModule } from './DownloadModule';

describe('DownloadModule contract', () => {
    it('gets batch download progress through GET /api/download/progress/:batchId', async () => {
        const progress = { batchId: 'b-1', total: 3, completed: 1, failed: 0, skipped: 0, done: false };
        const http = { get: vi.fn().mockResolvedValue(progress) };
        const module = new DownloadModule(http as unknown as HttpClient);

        await expect(module.getProgress('b-1')).resolves.toEqual(progress);
        expect(http.get).toHaveBeenCalledWith('/api/download/progress/b-1');
    });
});
