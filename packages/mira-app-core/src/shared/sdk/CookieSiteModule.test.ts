import { describe, expect, it, vi } from 'vitest';
import { MiraClient } from './client/MiraClient';
import { CookieSiteModule, type CookieSite } from './modules/CookieSiteModule';
import type { HttpClient } from './client/HttpClient';

const site: CookieSite = {
    id: 7,
    userId: 1,
    name: 'example',
    url: 'https://example.com',
    cookies: [{ name: 'session', value: 'token' }],
    isDefault: true,
    createdAt: 1,
    updatedAt: 2,
};

function createModule() {
    const http = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    };
    return { http, module: new CookieSiteModule(http as unknown as HttpClient) };
}

describe('CookieSiteModule', () => {
    it('由 MiraClient 暴露模块', () => {
        const client = new MiraClient('http://localhost:8081');
        expect(client.cookieSites()).toBeInstanceOf(CookieSiteModule);
    });

    it('获取当前用户的 Cookie 站点', async () => {
        const { http, module } = createModule();
        http.get.mockResolvedValue([site]);

        await expect(module.getAll()).resolves.toEqual([site]);
        expect(http.get).toHaveBeenCalledWith('/api/cookie-sites');
    });

    it('创建 Cookie 站点', async () => {
        const { http, module } = createModule();
        const request = { name: site.name, url: site.url, cookies: site.cookies };
        http.post.mockResolvedValue(site);

        await expect(module.create(request)).resolves.toEqual(site);
        expect(http.post).toHaveBeenCalledWith('/api/cookie-sites', request);
    });

    it('更新 Cookie 站点', async () => {
        const { http, module } = createModule();
        const request = { remark: 'updated' };
        http.put.mockResolvedValue({ ...site, ...request });

        await module.update(site.id, request);
        expect(http.put).toHaveBeenCalledWith(`/api/cookie-sites/${site.id}`, request);
    });

    it('设置默认 Cookie 站点', async () => {
        const { http, module } = createModule();
        http.put.mockResolvedValue(site);

        await module.setDefault(site.id);
        expect(http.put).toHaveBeenCalledWith(`/api/cookie-sites/${site.id}/default`);
    });

    it('删除 Cookie 站点', async () => {
        const { http, module } = createModule();
        http.delete.mockResolvedValue({ id: site.id });

        await expect(module.delete(site.id)).resolves.toEqual({ id: site.id });
        expect(http.delete).toHaveBeenCalledWith(`/api/cookie-sites/${site.id}`);
    });
});
