import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../client/HttpClient';
import { PluginModule } from './PluginModule';

describe('PluginModule contract', () => {
    it('lists all plugins through GET /api/plugins', async () => {
        const plugins = [{ id: '1', pluginName: 'demo' }];
        const http = { get: vi.fn().mockResolvedValue(plugins) };
        const module = new PluginModule(http as unknown as HttpClient);

        await expect(module.getAll()).resolves.toEqual(plugins);
        expect(http.get).toHaveBeenCalledWith('/api/plugins');
    });

    it('gets a single plugin through GET /api/plugins/:id', async () => {
        const plugin = { id: '1', pluginName: 'demo' };
        const http = { get: vi.fn().mockResolvedValue(plugin) };
        const module = new PluginModule(http as unknown as HttpClient);

        await expect(module.getById('demo')).resolves.toEqual(plugin);
        expect(http.get).toHaveBeenCalledWith('/api/plugins/demo', { params: undefined });
    });

    it('passes libraryId as query when getting a single plugin', async () => {
        const plugin = { id: '1', pluginName: 'demo' };
        const http = { get: vi.fn().mockResolvedValue(plugin) };
        const module = new PluginModule(http as unknown as HttpClient);

        await module.getById('demo', 'library-1');
        expect(http.get).toHaveBeenCalledWith('/api/plugins/demo', { params: { libraryId: 'library-1' } });
    });

    it('uninstalls a plugin through DELETE /api/plugins/:id', async () => {
        const response = { code: 0, message: 'ok', data: true };
        const http = { delete: vi.fn().mockResolvedValue(response) };
        const module = new PluginModule(http as unknown as HttpClient);

        await expect(module.uninstall('demo')).resolves.toEqual(response);
        expect(http.delete).toHaveBeenCalledWith('/api/plugins/demo', { params: undefined });
    });

    it('passes libraryId as query when uninstalling a plugin', async () => {
        const http = { delete: vi.fn().mockResolvedValue({ code: 0, message: 'ok', data: true }) };
        const module = new PluginModule(http as unknown as HttpClient);

        await module.uninstall('demo', 'library-1');
        expect(http.delete).toHaveBeenCalledWith('/api/plugins/demo', { params: { libraryId: 'library-1' } });
    });
});
