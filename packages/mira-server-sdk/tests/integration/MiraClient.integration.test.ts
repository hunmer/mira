/**
 * MiraClient 集成测试
 * 测试完整的客户端功能和链式调用
 */

import { MiraClient } from '../../src/client/MiraClient';

// 模拟所有依赖
jest.mock('../../src/client/HttpClient');
jest.mock('../../src/modules/AuthModule');
jest.mock('../../src/modules/UserModule');
jest.mock('../../src/modules/LibraryModule');
jest.mock('../../src/modules/PluginModule');
jest.mock('../../src/modules/FileModule');
jest.mock('../../src/modules/DatabaseModule');
jest.mock('../../src/modules/DeviceModule');
jest.mock('../../src/modules/SystemModule');

describe('MiraClient 集成测试', () => {
    let client: MiraClient;

    beforeEach(() => {
        client = new MiraClient('http://localhost:8081');
    });

    describe('客户端初始化', () => {
        it('应该正确创建客户端实例', () => {
            expect(client).toBeInstanceOf(MiraClient);
        });

        it('应该设置正确的配置', () => {
            const config = client.getConfig();
            expect(config.baseURL).toBe('http://localhost:8081');
        });

        it('应该初始化所有模块', () => {
            expect(client.auth()).toBeDefined();
            expect(client.user()).toBeDefined();
            expect(client.libraries()).toBeDefined();
            expect(client.plugins()).toBeDefined();
            expect(client.files()).toBeDefined();
            expect(client.database()).toBeDefined();
            expect(client.devices()).toBeDefined();
            expect(client.system()).toBeDefined();
        });
    });

    describe('模块访问', () => {
        it('应该返回相同的模块实例', () => {
            const auth1 = client.auth();
            const auth2 = client.auth();
            expect(auth1).toBe(auth2);
        });

        it('所有模块都应该可访问', () => {
            const modules = [
                client.auth(),
                client.user(),
                client.libraries(),
                client.plugins(),
                client.files(),
                client.database(),
                client.devices(),
                client.system(),
            ];

            modules.forEach(module => {
                expect(module).toBeDefined();
                expect(module).not.toBeNull();
            });
        });
    });

    describe('令牌管理', () => {
        it('应该支持设置令牌的链式调用', () => {
            const result = client.setToken('test-token');
            expect(result).toBe(client);
        });

        it('应该支持清除令牌的链式调用', () => {
            const result = client.clearToken();
            expect(result).toBe(client);
        });

        it('应该支持链式调用组合', () => {
            const result = client
                .setToken('token1')
                .clearToken()
                .setToken('token2');

            expect(result).toBe(client);
        });
    });

    describe('快速方法', () => {
        it('login 方法应该支持 Promise 链式调用', async () => {
            // 模拟 auth 模块的 login 方法
            const mockAuth = client.auth() as any;
            mockAuth.login = jest.fn().mockResolvedValue({ accessToken: 'test-token' });

            const result = await client.login('testuser', 'password');

            expect(result).toBe(client);
            expect(mockAuth.login).toHaveBeenCalledWith('testuser', 'password');
        });

        it('logout 方法应该支持 Promise 链式调用', async () => {
            // 模拟 auth 模块的 logout 方法
            const mockAuth = client.auth() as any;
            mockAuth.logout = jest.fn().mockResolvedValue({ success: true });

            const result = await client.logout();

            expect(result).toBe(client);
            expect(mockAuth.logout).toHaveBeenCalled();
        });
    });

    describe('连接检查', () => {
        it('isConnected 应该调用系统模块', async () => {
            const mockSystem = client.system() as any;
            mockSystem.isServerAvailable = jest.fn().mockResolvedValue(true);

            const result = await client.isConnected();

            expect(result).toBe(true);
            expect(mockSystem.isServerAvailable).toHaveBeenCalled();
        });

        it('waitForServer 应该调用系统模块', async () => {
            const mockSystem = client.system() as any;
            mockSystem.waitForServer = jest.fn().mockResolvedValue(true);

            const result = await client.waitForServer(5000, 1000);

            expect(result).toBe(true);
            expect(mockSystem.waitForServer).toHaveBeenCalledWith(5000, 1000);
        });
    });

    describe('配置管理', () => {
        it('应该能够更新配置', () => {
            const newConfig = {
                baseURL: 'http://localhost:9090',
                timeout: 15000,
            };

            const result = client.updateConfig(newConfig);

            expect(result).toBe(client);
        });

        it('应该能够获取配置', () => {
            const config = client.getConfig();

            expect(config).toHaveProperty('baseURL');
            expect(config.baseURL).toBe('http://localhost:8081');
        });
    });

    describe('工具方法', () => {
        it('batch 方法应该并行执行操作', async () => {
            const operations = [
                jest.fn().mockResolvedValue('result1'),
                jest.fn().mockResolvedValue('result2'),
                jest.fn().mockResolvedValue('result3'),
            ];

            const results = await client.batch(operations);

            expect(results).toEqual(['result1', 'result2', 'result3']);
            operations.forEach(op => expect(op).toHaveBeenCalled());
        });

        it('safe 方法应该处理错误并返回回退值', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Test error'));
            const fallback = 'fallback-value';

            const result = await client.safe(operation, fallback);

            expect(result).toBe(fallback);
            expect(operation).toHaveBeenCalled();
        });

        it('safe 方法应该在成功时返回实际结果', async () => {
            const operation = jest.fn().mockResolvedValue('success-value');
            const fallback = 'fallback-value';

            const result = await client.safe(operation, fallback);

            expect(result).toBe('success-value');
            expect(operation).toHaveBeenCalled();
        });

        it('retry 方法应该重试失败的操作', async () => {
            let callCount = 0;
            const operation = jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount < 3) {
                    return Promise.reject(new Error('Temporary failure'));
                }
                return Promise.resolve('success');
            });

            const result = await client.retry(operation, 3, 100);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('retry 方法应该在超过最大重试次数后抛出错误', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

            await expect(client.retry(operation, 2, 100)).rejects.toThrow('Persistent failure');
            expect(operation).toHaveBeenCalledTimes(3); // 初始调用 + 2次重试
        });
    });

    describe('静态方法', () => {
        it('create 方法应该创建新的客户端实例', () => {
            const newClient = MiraClient.create('http://localhost:8082');

            expect(newClient).toBeInstanceOf(MiraClient);
            expect(newClient).not.toBe(client);
            expect(newClient.getConfig().baseURL).toBe('http://localhost:8082');
        });

        it('create 方法应该支持配置参数', () => {
            const config = {
                timeout: 15000,
                headers: { 'Custom-Header': 'value' },
            };

            const newClient = MiraClient.create('http://localhost:8082', config);

            expect(newClient.getConfig().timeout).toBe(15000);
        });
    });

    describe('HTTP 客户端访问', () => {
        it('应该能够获取原始 HTTP 客户端', () => {
            const httpClient = client.getHttpClient();

            expect(httpClient).toBeDefined();
        });
    });

    describe('错误处理', () => {
        it('应该传播登录错误', async () => {
            const mockAuth = client.auth() as any;
            mockAuth.login = jest.fn().mockRejectedValue(new Error('Login failed'));

            await expect(client.login('user', 'pass')).rejects.toThrow('Login failed');
        });

        it('应该传播登出错误', async () => {
            const mockAuth = client.auth() as any;
            mockAuth.logout = jest.fn().mockRejectedValue(new Error('Logout failed'));

            await expect(client.logout()).rejects.toThrow('Logout failed');
        });

        it('应该传播连接检查错误', async () => {
            const mockSystem = client.system() as any;
            mockSystem.isServerAvailable = jest.fn().mockRejectedValue(new Error('Connection failed'));

            await expect(client.isConnected()).rejects.toThrow('Connection failed');
        });
    });
});
