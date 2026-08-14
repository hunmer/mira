import { describe, it, expect, beforeAll } from 'vitest';
import { MiraClient } from './client/MiraClient';
import { createLoggedInClient, isServerReachable } from './test-helpers';

const SERVER_OK = await isServerReachable();
const describeOrSkip = SERVER_OK ? describe : describe.skip;

describeOrSkip('SystemModule', () => {
    let client: MiraClient;

    beforeAll(async () => {
        client = await createLoggedInClient();
    });

    it('getHealth 返回完整健康信息', async () => {
        const health = await client.system().getHealth();
        expect(health.status).toBe('ok');
        expect(typeof health.uptime).toBe('number');
        expect(health.uptime).toBeGreaterThan(0);
        expect(typeof health.version).toBe('string');
        expect(health.version.length).toBeGreaterThan(0);
    });

    it('getSimpleHealth 返回精简健康对象', async () => {
        const health = await client.system().getSimpleHealth();
        expect(health.status).toBe('ok');
        // 精简版至少有 status/version
        expect(typeof health.version).toBe('string');
    });

    it('isServerAvailable 在服务器在线时返回 true', async () => {
        expect(await client.system().isServerAvailable()).toBe(true);
    });

    it('isConnected（MiraClient 顶层）返回 true', async () => {
        expect(await client.isConnected()).toBe(true);
    });

    it('waitForServer 在已就绪时快速返回 true', async () => {
        const ok = await client.waitForServer(5000, 500);
        expect(ok).toBe(true);
    });

    it('getVersion / getUptime / getSystemInfo 一致', async () => {
        const version = await client.system().getVersion();
        const uptime = await client.system().getUptime();
        const info = await client.system().getSystemInfo();

        expect(typeof version).toBe('string');
        expect(version.length).toBeGreaterThan(0);
        expect(uptime).toBeGreaterThan(0);
        // version 跨调用稳定；uptime 单调递增，只校验同量级（整数秒一致即可）
        expect(info.version).toBe(version);
        expect(Math.floor(info.uptime)).toBeGreaterThanOrEqual(Math.floor(uptime));
    });

    it('checkHealthWithRetry 在健康时返回 true', async () => {
        const ok = await client.system().checkHealthWithRetry(2, 100);
        expect(ok).toBe(true);
    });
});
