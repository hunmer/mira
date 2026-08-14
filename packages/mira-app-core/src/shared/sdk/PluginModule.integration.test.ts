import { describe, it, expect, beforeAll } from 'vitest';
import { MiraClient } from './client/MiraClient';
import { createLoggedInClient, LIBRARY_ID, isServerReachable } from './test-helpers';

const SERVER_OK = await isServerReachable();
const describeOrSkip = SERVER_OK ? describe : describe.skip;

describeOrSkip('PluginModule', () => {
    let client: MiraClient;

    beforeAll(async () => {
        client = await createLoggedInClient();
    });

    it('getAll 返回插件数组', async () => {
        const plugins = await client.plugins().getAll();
        expect(Array.isArray(plugins)).toBe(true);
        expect(plugins.length).toBeGreaterThan(0);
        const validStatus = new Set(['active', 'inactive']);
        plugins.forEach(p => {
            expect(typeof p.id).toBe('string');
            expect(typeof p.name).toBe('string');
            expect(validStatus.has(p.status)).toBe(true);
        });
    });

    it('getActive 与 getInactive 互斥且并集等于全部', async () => {
        const [all, active, inactive] = await Promise.all([
            client.plugins().getAll(),
            client.plugins().getActive(),
            client.plugins().getInactive(),
        ]);
        expect(active.every(p => p.status === 'active')).toBe(true);
        expect(inactive.every(p => p.status === 'inactive')).toBe(true);
        expect(active.length + inactive.length).toBe(all.length);
    });

    it('getByLibrary 返回按库分组的结构', async () => {
        const groups = await client.plugins().getByLibrary();
        expect(Array.isArray(groups)).toBe(true);
        groups.forEach(g => {
            expect(typeof g.id).toBe('string');
            expect(Array.isArray(g.plugins)).toBe(true);
        });
    });

    it('getByLibraryId 命中目标库', async () => {
        const plugins = await client.plugins().getByLibraryId(LIBRARY_ID);
        expect(plugins.length).toBeGreaterThan(0);
        plugins.forEach(p => expect(p.libraryId).toBe(LIBRARY_ID));
    });

    it('search 关键词可命中已知插件名', async () => {
        const all = await client.plugins().getAll();
        const sample = all[0].name;
        const results = await client.plugins().search(sample);
        expect(results.length).toBeGreaterThan(0);
        // 至少包含用于搜索的那个插件
        expect(results.some(p => p.name === sample)).toBe(true);
    });

    it('getById 能取到列表中的插件', async () => {
        const all = await client.plugins().getAll();
        const sample = all[0];
        const byId = await client.plugins().getById(sample.id);
        expect(byId.name).toBe(sample.name);
    });
});
