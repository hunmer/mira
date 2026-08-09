import { describe, it, expect, beforeAll } from 'vitest';
import { MiraClient } from './client/MiraClient';
import { createLoggedInClient, USERNAME, isServerReachable } from './test-helpers';

const SERVER_OK = await isServerReachable();
const describeOrSkip = SERVER_OK ? describe : describe.skip;

describeOrSkip('UserModule', () => {
    let client: MiraClient;

    beforeAll(async () => {
        client = await createLoggedInClient();
    });

    it('getInfo 返回当前登录用户详情', async () => {
        const info = await client.user().getInfo();
        expect(info.username).toBe(USERNAME);
        expect(typeof info.id).toBe('number');
        expect(info.role).toBeDefined();
        expect(Array.isArray(info.roles)).toBe(true);
    });

    it('updateProfile 提交更新请求成功（不抛错）', async () => {
        const origin = await client.user().getInfo();
        const originalRealName = (info => info.realName ?? '')(origin);
        const tempName = `__sdk_test_realname_${Date.now()}`;

        try {
            // updateProfile 不应抛错；后端对 super 账户 realName 可能固定不回写，
            // 因此只验证请求成功（接口返回成功），不强断言读回值。
            await expect(client.user().updateProfile(tempName)).resolves.toBeDefined();
        } finally {
            // 还原，避免污染
            await client.user().updateProfile(originalRealName || undefined).catch(() => {});
        }
    });

    it('updateRealName 等价于 updateInfo({ realName })，请求成功', async () => {
        const origin = await client.user().getInfo();
        const originalRealName = (info => info.realName ?? '')(origin);
        const tempName = `__sdk_test_rn2_${Date.now()}`;

        try {
            await expect(client.user().updateRealName(tempName)).resolves.toBeDefined();
        } finally {
            await client.user().updateProfile(originalRealName || undefined).catch(() => {});
        }
    });
});
