/**
 * 认证功能测试
 */

import { MiraClient } from 'mira-server-sdk';

describe('认证功能测试', () => {
    let client: MiraClient;

    beforeEach(() => {
        client = new MiraClient((global as any).testConfig.serverUrl);
    });

    afterEach(async () => {
        try {
            await client.auth().logout();
        } catch (error) {
            // 忽略登出错误
        }
    });

    describe('登录功能', () => {
        test('应该能够成功登录', async () => {
            const result = await client.auth().login(
                (global as any).testConfig.username,
                (global as any).testConfig.password
            );

            expect(result).toBeDefined();
            expect(result.accessToken).toBeDefined();
            expect(typeof result.accessToken).toBe('string');
            expect(result.accessToken.length).toBeGreaterThan(0);
        });

        test('应该在登录后设置认证状态', async () => {
            expect(client.auth().isAuthenticated()).toBe(false);

            await client.auth().login(
                (global as any).testConfig.username,
                (global as any).testConfig.password
            );

            expect(client.auth().isAuthenticated()).toBe(true);
        });

        test('应该拒绝错误的登录凭据', async () => {
            await expect(
                client.auth().login('wrong_user', 'wrong_password')
            ).rejects.toThrow();
        });

        test('应该拒绝空的用户名或密码', async () => {
            await expect(
                client.auth().login('', (global as any).testConfig.password)
            ).rejects.toThrow();

            await expect(
                client.auth().login((global as any).testConfig.username, '')
            ).rejects.toThrow();
        });
    });

    describe('令牌管理', () => {
        test('应该能够手动设置和清除令牌', async () => {
            const loginResult = await client.auth().login(
                (global as any).testConfig.username,
                (global as any).testConfig.password
            );

            const token = loginResult.accessToken;

            // 清除令牌
            client.auth().clearToken();
            expect(client.auth().isAuthenticated()).toBe(false);

            // 重新设置令牌
            client.auth().setToken(token);
            expect(client.auth().isAuthenticated()).toBe(true);

            // 验证令牌仍然有效
            const verifyResult = await client.auth().verify();
            expect(verifyResult.user).toBeDefined();
            expect(verifyResult.user.username).toBe((global as any).testConfig.username);
        });

        test('应该能够验证有效令牌', async () => {
            await client.auth().login(
                (global as any).testConfig.username,
                (global as any).testConfig.password
            );

            const verifyResult = await client.auth().verify();
            expect(verifyResult).toBeDefined();
            expect(verifyResult.user).toBeDefined();
            expect(verifyResult.user.username).toBe((global as any).testConfig.username);
            expect(verifyResult.user.id).toBeDefined();
            expect(verifyResult.user.roles).toBeDefined();
            expect(Array.isArray(verifyResult.user.roles)).toBe(true);
        });

        test('应该拒绝无效令牌', async () => {
            client.auth().setToken('invalid_token_12345');

            await expect(client.auth().verify()).rejects.toThrow();
        });
    });

    describe('权限管理', () => {
        test('应该能够获取用户权限码', async () => {
            await client.auth().login(
                (global as any).testConfig.username,
                (global as any).testConfig.password
            );

            const codes = await client.auth().getCodes();
            expect(Array.isArray(codes)).toBe(true);
            expect(codes.length).toBeGreaterThanOrEqual(0);

            // 所有权限码都应该是字符串
            codes.forEach(code => {
                expect(typeof code).toBe('string');
                expect(code.length).toBeGreaterThan(0);
            });
        });

        test('未认证用户不应该能够获取权限码', async () => {
            await expect(client.auth().getCodes()).rejects.toThrow();
        });
    });

    describe('登出功能', () => {
        test('应该能够成功登出', async () => {
            await client.auth().login(
                (global as any).testConfig.username,
                (global as any).testConfig.password
            );

            expect(client.auth().isAuthenticated()).toBe(true);

            const result = await client.auth().logout();
            expect(result).toBeDefined();
            expect(client.auth().isAuthenticated()).toBe(false);
        });

        test('应该能够多次登出而不出错', async () => {
            await client.auth().login(
                (global as any).testConfig.username,
                (global as any).testConfig.password
            );

            await client.auth().logout();
            await client.auth().logout(); // 第二次登出应该不出错
        });
    });

    describe('链式调用', () => {
        test('应该支持链式令牌操作', async () => {
            const result = await client.auth()
                .login((global as any).testConfig.username, (global as any).testConfig.password)
                .then(async (loginResult) => {
                    expect(loginResult.accessToken).toBeDefined();

                    // 链式清除和设置令牌
                    const token = loginResult.accessToken;
                    client.auth().clearToken().setToken(token);

                    // 验证链式操作后令牌仍然有效
                    const verifyResult = await client.auth().verify();
                    return verifyResult.user.username;
                });

            expect(result).toBe((global as any).testConfig.username);
        });
    });

    describe('错误处理', () => {
        test('应该正确处理网络错误', async () => {
            const badClient = new MiraClient('http://nonexistent-server:9999');

            await expect(
                badClient.auth().login('user', 'pass')
            ).rejects.toThrow();
        });

        test('应该正确处理服务器错误响应', async () => {
            // 这个测试需要服务器支持，如果服务器不返回特定错误格式，可能需要调整
            await expect(
                client.auth().login('', '')
            ).rejects.toThrow();
        });
    });
}, 30000); // 设置测试套件超时时间为30秒
