import { describe, it, expect, beforeAll } from 'vitest';
import { MiraClient } from './client/MiraClient';
import { createLoggedInClient, LIBRARY_ID, isServerReachable } from './test-helpers';

const SERVER_OK = await isServerReachable();
const describeOrSkip = SERVER_OK ? describe : describe.skip;

describeOrSkip('LibraryModule', () => {
    let client: MiraClient;

    beforeAll(async () => {
        client = await createLoggedInClient();
    });

    it('getAll 返回素材库数组', async () => {
        const libs = await client.libraries().getAll();
        expect(Array.isArray(libs)).toBe(true);
        expect(libs.length).toBeGreaterThan(0);
        libs.forEach(lib => {
            // library id 是字符串
            expect(typeof lib.id).toBe('string');
            expect(typeof lib.name).toBe('string');
        });
    });

    it('目标测试库存在于列表中', async () => {
        const libs = await client.libraries().getAll();
        const found = libs.find(l => l.id === LIBRARY_ID);
        expect(found).toBeDefined();
        expect(found!.status).toBe('active');
    });

    it('getById 按 id 精确获取', async () => {
        const lib = await client.libraries().getById(LIBRARY_ID);
        expect(lib.id).toBe(LIBRARY_ID);
    });

    it('getById 对不存在的 id 抛错', async () => {
        await expect(client.libraries().getById('definitely-not-exist'))
            .rejects.toThrow();
    });

    it('getActive 只返回 status=active 的库', async () => {
        const active = await client.libraries().getActive();
        expect(active.length).toBeGreaterThan(0);
        active.forEach(lib => expect(lib.status).toBe('active'));
    });

    it('getByStatus("active") 与 getActive 结果一致', async () => {
        const [byStatus, active] = await Promise.all([
            client.libraries().getByStatus('active'),
            client.libraries().getActive(),
        ]);
        expect(byStatus.map(l => l.id).sort()).toEqual(active.map(l => l.id).sort());
    });
});
