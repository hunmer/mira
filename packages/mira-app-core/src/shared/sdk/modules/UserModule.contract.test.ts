import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { UserModule } from './UserModule';

describe('UserModule contract', () => {
    it('changes password through PUT /api/user/change-password', async () => {
        const http = { put: vi.fn().mockResolvedValue(null) };
        const module = new UserModule(http as unknown as HttpClient);

        await expect(module.changePassword('old', 'new')).resolves.toBeUndefined();
        expect(http.put).toHaveBeenCalledWith('/api/user/change-password', { oldPassword: 'old', newPassword: 'new' });
    });

    it('uploads avatar as base64 data URL through POST /api/user/avatar', async () => {
        const http = { post: vi.fn().mockResolvedValue(null) };
        const module = new UserModule(http as unknown as HttpClient);
        const image = 'data:image/png;base64,xxx';

        await expect(module.uploadAvatar(image)).resolves.toBeUndefined();
        expect(http.post).toHaveBeenCalledWith('/api/user/avatar', { image });
    });

    it('lists my tokens through GET /api/user/tokens', async () => {
        const tokens = [{ id: 1, name: 't', token: 'tk', createdAt: 0, expiresAt: 0 }];
        const http = { get: vi.fn().mockResolvedValue(tokens) };
        const module = new UserModule(http as unknown as HttpClient);

        await expect(module.getTokens()).resolves.toEqual(tokens);
        expect(http.get).toHaveBeenCalledWith('/api/user/tokens');
    });

    it('builds an authenticated avatar resource URL', () => {
        const http = { getUrl: vi.fn().mockReturnValue('http://x/api/user/avatar/1?token=tk') };
        const module = new UserModule(http as unknown as HttpClient);

        expect(module.getAvatarUrl('1')).toBe('http://x/api/user/avatar/1?token=tk');
        expect(http.getUrl).toHaveBeenCalledWith('/api/user/avatar/1');
    });

    it('reads a user file through GET /api/user/files with path param', async () => {
        const http = { get: vi.fn().mockResolvedValue({ content: '{"a":1}' }) };
        const module = new UserModule(http as unknown as HttpClient);

        await expect(module.readFile('dashboard/layouts.json')).resolves.toBe('{"a":1}');
        expect(http.get).toHaveBeenCalledWith('/api/user/files', {
            params: { path: 'dashboard/layouts.json' },
        });
    });

    it('returns null when user file does not exist', async () => {
        const http = { get: vi.fn().mockResolvedValue(null) };
        const module = new UserModule(http as unknown as HttpClient);

        await expect(module.readFile('dashboard/layouts.json')).resolves.toBeNull();
    });

    it('writes a user file through PUT /api/user/files', async () => {
        const http = { put: vi.fn().mockResolvedValue({ path: 'dashboard/layouts.json' }) };
        const module = new UserModule(http as unknown as HttpClient);

        await expect(module.writeFile('dashboard/layouts.json', '{"a":1}')).resolves.toBeUndefined();
        expect(http.put).toHaveBeenCalledWith('/api/user/files', {
            path: 'dashboard/layouts.json',
            content: '{"a":1}',
        });
    });
});
