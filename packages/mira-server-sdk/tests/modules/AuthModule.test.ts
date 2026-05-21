/**
 * AuthModule 测试
 */

import { AuthModule } from '../../src/modules/AuthModule';
import { HttpClient } from '../../src/client/HttpClient';
import { TestDataFactory } from '../helpers';

// 模拟 HttpClient
jest.mock('../../src/client/HttpClient');

describe('AuthModule', () => {
    let authModule: AuthModule;
    let mockHttpClient: jest.Mocked<HttpClient>;

    beforeEach(() => {
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            setToken: jest.fn(),
            clearToken: jest.fn(),
        } as any;

        authModule = new AuthModule(mockHttpClient);
    });

    describe('login', () => {
        it('应该成功登录并设置令牌', async () => {
            const loginResponse = { accessToken: 'test-token-123' };
            mockHttpClient.post.mockResolvedValue(loginResponse);

            const result = await authModule.login('testuser', 'password123');

            expect(mockHttpClient.post).toHaveBeenCalledWith('/api/auth/login', {
                username: 'testuser',
                password: 'password123',
            });
            expect(mockHttpClient.setToken).toHaveBeenCalledWith('test-token-123');
            expect(result).toEqual(loginResponse);
        });

        it('应该处理登录失败', async () => {
            const error = new Error('Invalid credentials');
            mockHttpClient.post.mockRejectedValue(error);

            await expect(authModule.login('testuser', 'wrongpassword')).rejects.toThrow('Invalid credentials');
            expect(mockHttpClient.setToken).not.toHaveBeenCalled();
        });

        it('当没有返回令牌时不应该设置令牌', async () => {
            const loginResponse = { message: 'Login successful' };
            mockHttpClient.post.mockResolvedValue(loginResponse);

            await authModule.login('testuser', 'password123');

            expect(mockHttpClient.setToken).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('应该成功登出并清除令牌', async () => {
            const logoutResponse = { success: true, message: '退出成功' };
            mockHttpClient.post.mockResolvedValue(logoutResponse);

            const result = await authModule.logout();

            expect(mockHttpClient.post).toHaveBeenCalledWith('/api/auth/logout');
            expect(mockHttpClient.clearToken).toHaveBeenCalled();
            expect(result).toEqual(logoutResponse);
        });

        it('即使请求失败也应该清除本地令牌', async () => {
            const error = new Error('Network error');
            mockHttpClient.post.mockRejectedValue(error);

            await expect(authModule.logout()).rejects.toThrow('Network error');
            expect(mockHttpClient.clearToken).toHaveBeenCalled();
        });
    });

    describe('verify', () => {
        it('应该验证令牌并返回用户信息', async () => {
            const user = TestDataFactory.createUser();
            const verifyResponse = { user };
            mockHttpClient.get.mockResolvedValue(verifyResponse);

            const result = await authModule.verify();

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/auth/verify');
            expect(result).toEqual(verifyResponse);
        });

        it('应该处理无效令牌', async () => {
            const error = new Error('Invalid token');
            mockHttpClient.get.mockRejectedValue(error);

            await expect(authModule.verify()).rejects.toThrow('Invalid token');
        });
    });

    describe('getCodes', () => {
        it('应该获取权限码列表', async () => {
            const codes = ['AC_100100', 'AC_100010', 'AC_200100'];
            mockHttpClient.get.mockResolvedValue(codes);

            const result = await authModule.getCodes();

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/auth/codes');
            expect(result).toEqual(codes);
        });

        it('应该处理空权限码列表', async () => {
            const codes: string[] = [];
            mockHttpClient.get.mockResolvedValue(codes);

            const result = await authModule.getCodes();

            expect(result).toEqual([]);
        });
    });

    describe('setToken', () => {
        it('应该设置令牌并返回自身', () => {
            const token = 'new-token';

            const result = authModule.setToken(token);

            expect(mockHttpClient.setToken).toHaveBeenCalledWith(token);
            expect(result).toBe(authModule);
        });
    });

    describe('clearToken', () => {
        it('应该清除令牌并返回自身', () => {
            const result = authModule.clearToken();

            expect(mockHttpClient.clearToken).toHaveBeenCalled();
            expect(result).toBe(authModule);
        });
    });

    describe('isAuthenticated', () => {
        it('当有令牌时应该返回 true', () => {
            (mockHttpClient as any).config = { token: 'test-token' };

            const result = authModule.isAuthenticated();

            expect(result).toBe(true);
        });

        it('当没有令牌时应该返回 false', () => {
            (mockHttpClient as any).config = {};

            const result = authModule.isAuthenticated();

            expect(result).toBe(false);
        });

        it('当令牌为 undefined 时应该返回 false', () => {
            (mockHttpClient as any).config = { token: undefined };

            const result = authModule.isAuthenticated();

            expect(result).toBe(false);
        });
    });

    describe('链式调用', () => {
        it('应该支持设置令牌的链式调用', () => {
            const result = authModule.setToken('token1').clearToken().setToken('token2');

            expect(result).toBe(authModule);
            expect(mockHttpClient.setToken).toHaveBeenCalledWith('token1');
            expect(mockHttpClient.clearToken).toHaveBeenCalled();
            expect(mockHttpClient.setToken).toHaveBeenCalledWith('token2');
        });
    });

    describe('错误处理', () => {
        it('应该传播 HTTP 客户端错误', async () => {
            const httpError = {
                error: 'NETWORK_ERROR',
                message: 'Connection failed',
                timestamp: '2024-01-01T00:00:00Z',
            };
            mockHttpClient.post.mockRejectedValue(httpError);

            await expect(authModule.login('user', 'pass')).rejects.toEqual(httpError);
        });

        it('应该传播验证错误', async () => {
            const authError = {
                error: 'UNAUTHORIZED',
                message: 'Token expired',
                timestamp: '2024-01-01T00:00:00Z',
            };
            mockHttpClient.get.mockRejectedValue(authError);

            await expect(authModule.verify()).rejects.toEqual(authError);
        });
    });
});
