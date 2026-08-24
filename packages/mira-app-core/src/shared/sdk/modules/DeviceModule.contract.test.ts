import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { DeviceModule } from './DeviceModule';

describe('DeviceModule contract', () => {
    it('disconnectById posts to /api/devices/:clientId/disconnect', async () => {
        const res = { success: true };
        const http = { post: vi.fn().mockResolvedValue(res) };
        const module = new DeviceModule(http as unknown as HttpClient);

        await expect(module.disconnectById('client-1')).resolves.toEqual(res);
        expect(http.post).toHaveBeenCalledWith('/api/devices/client-1/disconnect');
    });

    it('broadcast posts message with optional title and clientIds', async () => {
        const res = { success: true };
        const http = { post: vi.fn().mockResolvedValue(res) };
        const module = new DeviceModule(http as unknown as HttpClient);

        await expect(module.broadcast('hello')).resolves.toEqual(res);
        expect(http.post).toHaveBeenCalledWith('/api/devices/broadcast', { message: 'hello' });

        await module.broadcast('hi', 'title', ['c1']);
        expect(http.post).toHaveBeenLastCalledWith('/api/devices/broadcast', {
            message: 'hi',
            title: 'title',
            clientIds: ['c1'],
        });
    });

    it('createShareTicket posts library files to /api/devices/share-tickets', async () => {
        const res = { ticketId: 't-1', downloadUrl: '/api/devices/share/t-1', fileCount: 2, expiresAt: 'x' };
        const http = { post: vi.fn().mockResolvedValue(res) };
        const module = new DeviceModule(http as unknown as HttpClient);
        const request = { libraryId: 'lib-1', files: [{ path: 'a.png', name: 'a.png' }, { path: 'b/c.mp4' }] };

        await expect(module.createShareTicket(request)).resolves.toEqual(res);
        expect(http.post).toHaveBeenCalledWith('/api/devices/share-tickets', request);
    });
});
