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

    it('syncMeta posts libraryId', async () => {
        const http = { post: vi.fn().mockResolvedValue({ code: 0, message: 'ok', data: true }) };
        const module = new PluginModule(http as unknown as HttpClient);

        await module.syncMeta('lib-1');
        expect(http.post).toHaveBeenCalledWith('/api/plugins/sync-meta', { libraryId: 'lib-1' });
    });

    it('toggleStatus posts libraryId, pluginName and status', async () => {
        const http = { post: vi.fn().mockResolvedValue({ code: 0, message: 'ok', data: true }) };
        const module = new PluginModule(http as unknown as HttpClient);

        await module.toggleStatus('lib-1', 'demo', 'inactive');
        expect(http.post).toHaveBeenCalledWith('/api/plugins/toggle-status', {
            libraryId: 'lib-1',
            pluginName: 'demo',
            status: 'inactive',
        });
    });

    it('disableAll posts pluginName', async () => {
        const http = { post: vi.fn().mockResolvedValue({ code: 0, message: 'ok', data: true }) };
        const module = new PluginModule(http as unknown as HttpClient);

        await module.disableAll('demo');
        expect(http.post).toHaveBeenCalledWith('/api/plugins/disable-all', { pluginName: 'demo' });
    });

    it('config read/write targets /api/plugins/:name/config with libraryId query', async () => {
        const http = {
            get: vi.fn().mockResolvedValue({ key: 'v' }),
            put: vi.fn().mockResolvedValue({ code: 0, message: 'ok', data: true }),
        };
        const module = new PluginModule(http as unknown as HttpClient);

        await expect(module.getConfig('demo', 'lib-1')).resolves.toEqual({ key: 'v' });
        expect(http.get).toHaveBeenCalledWith('/api/plugins/demo/config', { params: { libraryId: 'lib-1' } });

        await module.updateConfig('demo', { key: 'v2' }, 'lib-1');
        expect(http.put).toHaveBeenCalledWith('/api/plugins/demo/config', { key: 'v2' }, { params: { libraryId: 'lib-1' } });
    });

    it('upload sends multipart form with file and libraryId', async () => {
        const res = { code: 0, message: 'ok', data: true };
        const http = { upload: vi.fn().mockResolvedValue(res) };
        const module = new PluginModule(http as unknown as HttpClient);
        const file = new File(['x'], 'plugin.tgz');

        await expect(module.upload(file, 'lib-1')).resolves.toEqual(res);
        expect(http.upload).toHaveBeenCalledWith('/api/plugins/upload', expect.any(FormData));
    });

    it('getRoutes queries the plugin route discovery endpoint', async () => {
        const routes = [{ path: '/p', component: 'c' }];
        const http = { get: vi.fn().mockResolvedValue(routes) };
        const module = new PluginModule(http as unknown as HttpClient);

        await expect(module.getRoutes('lib-1')).resolves.toEqual(routes);
        expect(http.get).toHaveBeenCalledWith('/api/plugin-routes/lib-1');
    });
});
