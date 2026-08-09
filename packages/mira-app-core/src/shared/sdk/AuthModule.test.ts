import { describe, it, expect, beforeAll } from 'vitest';
import { MiraClient } from './client/MiraClient';
import { createLoggedInClient, BASE_URL, USERNAME, PASSWORD, isServerReachable } from './test-helpers';

const SERVER_OK = await isServerReachable();
const describeOrSkip = SERVER_OK ? describe : describe.skip;

describeOrSkip('AuthModule / MiraClient 工具方法', () => {
    let client: MiraClient;

    beforeAll(async () => {
        client = await createLoggedInClient();
    });

    describe('login / token', () => {
        it('login 返回 accessToken', async () => {
            const fresh = new MiraClient(BASE_URL);
            const res = await fresh.auth().login(USERNAME, PASSWORD);
            expect(res).toBeDefined();
            expect(typeof res.accessToken).toBe('string');
            expect(res.accessToken.length).toBeGreaterThan(0);
        });

        it('login 后 token 自动写入客户端', async () => {
            const fresh = new MiraClient(BASE_URL);
            expect(fresh.auth().isAuthenticated()).toBe(false);
            await fresh.auth().login(USERNAME, PASSWORD);
            expect(fresh.auth().isAuthenticated()).toBe(true);
        });

        it('错误密码应抛错', async () => {
            const fresh = new MiraClient(BASE_URL);
            await expect(fresh.auth().login(USERNAME, 'definitely-wrong-pwd'))
                .rejects.toBeDefined();
        });

        it('MiraClient.login 链式返回自身并完成鉴权', async () => {
            const fresh = new MiraClient(BASE_URL);
            const ret = await fresh.login(USERNAME, PASSWORD);
            expect(ret).toBe(fresh);
            // 已登录，verify 应能拿到当前用户
            const v = await fresh.auth().verify();
            expect(v.user.username).toBe(USERNAME);
        });
    });

    describe('verify / codes', () => {
        it('verify 返回当前登录用户', async () => {
            const v = await client.auth().verify();
            expect(v.user).toBeDefined();
            expect(v.user.username).toBe(USERNAME);
        });

        it('getCodes 返回字符串数组', async () => {
            const codes = await client.auth().getCodes();
            expect(Array.isArray(codes)).toBe(true);
            codes.forEach(c => expect(typeof c).toBe('string'));
        });
    });

    describe('MiraClient 工具方法', () => {
        it('batch 并发执行多个操作', async () => {
            const [info, codes] = await client.batch([
                () => client.user().getInfo(),
                () => client.auth().getCodes(),
            ]);
            expect(info.username).toBe(USERNAME);
            expect(Array.isArray(codes)).toBe(true);
        });

        it('safe 在操作成功时返回真实结果', async () => {
            const info = await client.safe(() => client.user().getInfo(), { username: 'fallback' } as any);
            expect(info.username).toBe(USERNAME);
        });

        it('safe 在操作失败时返回 fallback', async () => {
            const fallback = { hit: true };
            const res = await client.safe(async () => {
                throw new Error('boom');
            }, fallback);
            expect(res).toBe(fallback);
        });

        it('retry 在前几次失败后最终成功', async () => {
            let count = 0;
            const res = await client.retry(async () => {
                count++;
                if (count < 2) throw new Error('transient');
                return 'ok';
            }, 3, 10);
            expect(res).toBe('ok');
            expect(count).toBe(2);
        });

        it('retry 达到上限仍失败则抛最后一次错误', async () => {
            await expect(client.retry(async () => {
                throw new Error('always fails');
            }, 2, 10)).rejects.toThrow('always fails');
        });

        it('getConfig 暴露 baseURL/timeout/token', async () => {
            const cfg = client.getConfig();
            expect(cfg.baseURL).toBe(BASE_URL);
            expect(typeof cfg.timeout).toBe('number');
        });

        it('isConnected 反映服务器可达性', async () => {
            expect(await client.isConnected()).toBe(true);
        });

        it('MiraClient.create 静态工厂创建独立实例', () => {
            const c = MiraClient.create(BASE_URL);
            expect(c).toBeInstanceOf(MiraClient);
            expect(c.getConfig().baseURL).toBe(BASE_URL);
        });
    });
});
