import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { AdminModule } from './AdminModule';

function makeModule() {
    const http = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    };
    return { http, module: new AdminModule(http as unknown as HttpClient) };
}

describe('AdminModule contract', () => {
    it('lists admins through GET /api/admins', async () => {
        const { http, module } = makeModule();
        const admins = [{ id: '1', username: 'root' }];
        http.get.mockResolvedValue(admins);

        await expect(module.getAll()).resolves.toEqual(admins);
        expect(http.get).toHaveBeenCalledWith('/api/admins');
    });

    it('creates an admin through POST /api/admins', async () => {
        const { http, module } = makeModule();
        http.post.mockResolvedValue({ id: '2' });
        const data = { username: 'a', email: 'a@b.c', password: 'x' };

        await expect(module.create(data)).resolves.toEqual({ id: '2' });
        expect(http.post).toHaveBeenCalledWith('/api/admins', data);
    });

    it('updates an admin through PUT /api/admins/:id', async () => {
        const { http, module } = makeModule();
        const res = { success: true, message: 'ok' };
        http.put.mockResolvedValue(res);

        await expect(module.update('id 1', { email: 'n@b.c' })).resolves.toEqual(res);
        expect(http.put).toHaveBeenCalledWith('/api/admins/id%201', { email: 'n@b.c' });
    });

    it('deletes an admin through DELETE /api/admins/:id', async () => {
        const { http, module } = makeModule();
        const res = { success: true, message: 'deleted' };
        http.delete.mockResolvedValue(res);

        await expect(module.delete('1')).resolves.toEqual(res);
        expect(http.delete).toHaveBeenCalledWith('/api/admins/1');
    });

    it('lists admin tokens through GET /api/admins/:id/tokens', async () => {
        const { http, module } = makeModule();
        const tokens = [{ id: 1, name: 't' }];
        http.get.mockResolvedValue(tokens);

        await expect(module.getTokens('1')).resolves.toEqual(tokens);
        expect(http.get).toHaveBeenCalledWith('/api/admins/1/tokens');
    });

    it('creates a token through POST /api/admins/:id/tokens', async () => {
        const { http, module } = makeModule();
        const token = { id: 2, name: 'n', token: 'tk', createdAt: 0, expiresAt: 0 };
        http.post.mockResolvedValue(token);

        await expect(module.createToken('1', { name: 'n', expiresInDays: 30 })).resolves.toEqual(token);
        expect(http.post).toHaveBeenCalledWith('/api/admins/1/tokens', { name: 'n', expiresInDays: 30 });
    });

    it('updates a token through PUT /api/admins/:id/tokens/:tokenId', async () => {
        const { http, module } = makeModule();
        const token = { id: 2, name: 'n2' };
        http.put.mockResolvedValue(token);

        await expect(module.updateToken('1', 2, { name: 'n2' })).resolves.toEqual(token);
        expect(http.put).toHaveBeenCalledWith('/api/admins/1/tokens/2', { name: 'n2' });
    });

    it('deletes a token through DELETE /api/admins/:id/tokens/:tokenId', async () => {
        const { http, module } = makeModule();
        const res = { success: true, message: 'deleted' };
        http.delete.mockResolvedValue(res);

        await expect(module.deleteToken('1', 2)).resolves.toEqual(res);
        expect(http.delete).toHaveBeenCalledWith('/api/admins/1/tokens/2');
    });
});
