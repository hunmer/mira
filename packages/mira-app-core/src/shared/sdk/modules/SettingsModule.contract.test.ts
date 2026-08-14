import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { SettingsModule } from './SettingsModule';

describe('SettingsModule contract', () => {
    it('gets server settings through GET /api/settings', async () => {
        const settings = { authRequired: true, allowRegistration: false };
        const http = { get: vi.fn().mockResolvedValue(settings) };
        const module = new SettingsModule(http as unknown as HttpClient);

        await expect(module.get()).resolves.toEqual(settings);
        expect(http.get).toHaveBeenCalledWith('/api/settings');
    });

    it('updates server settings through PUT /api/settings with partial body', async () => {
        const updated = { authRequired: true, allowRegistration: true };
        const http = { put: vi.fn().mockResolvedValue(updated) };
        const module = new SettingsModule(http as unknown as HttpClient);

        await expect(module.update({ allowRegistration: true })).resolves.toEqual(updated);
        expect(http.put).toHaveBeenCalledWith('/api/settings', { allowRegistration: true });
    });
});
