import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { SystemModule } from './SystemModule';

describe('SystemModule contract', () => {
    it('getHealth gets /api/health', async () => {
        const res = { status: 'ok' };
        const http = { get: vi.fn().mockResolvedValue(res) };
        const module = new SystemModule(http as unknown as HttpClient);

        await expect(module.getHealth()).resolves.toEqual(res);
        expect(http.get).toHaveBeenCalledWith('/api/health');
    });

    it('getSimpleHealth gets /health', async () => {
        const res = { status: 'ok' };
        const http = { get: vi.fn().mockResolvedValue(res) };
        const module = new SystemModule(http as unknown as HttpClient);

        await expect(module.getSimpleHealth()).resolves.toEqual(res);
        expect(http.get).toHaveBeenCalledWith('/health');
    });

    it('stopServer posts to /api/system/stop', async () => {
        const res = { stopping: true };
        const http = { post: vi.fn().mockResolvedValue(res) };
        const module = new SystemModule(http as unknown as HttpClient);

        await expect(module.stopServer()).resolves.toEqual(res);
        expect(http.post).toHaveBeenCalledWith('/api/system/stop');
    });
});
