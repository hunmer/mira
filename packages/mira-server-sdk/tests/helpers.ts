/**
 * 测试工具类和模拟对象
 */

export class MockServer {
    private handlers: Map<string, (url: string, options?: any) => any> = new Map();

    /**
     * 注册 API 处理器
     */
    on(pattern: string, handler: (url: string, options?: any) => any) {
        this.handlers.set(pattern, handler);
    }

    /**
     * 处理请求
     */
    handle(url: string, options?: any) {
        for (const [pattern, handler] of this.handlers.entries()) {
            if (url.includes(pattern)) {
                return handler(url, options);
            }
        }

        // 默认返回成功响应
        return {
            data: { success: true, message: 'Mock response' },
            status: 200,
        };
    }

    /**
     * 重置所有处理器
     */
    reset() {
        this.handlers.clear();
    }
}

export class TestDataFactory {
    /**
     * 创建模拟用户信息
     */
    static createUser(overrides?: any) {
        return {
            id: 1,
            username: 'testuser',
            realName: '测试用户',
            roles: ['user'],
            avatar: 'https://example.com/avatar.jpg',
            desc: '测试用户描述',
            homePath: '/dashboard',
            ...overrides,
        };
    }

    /**
     * 创建模拟素材库
     */
    static createLibrary(overrides?: any) {
        return {
            id: 'lib-001',
            name: '测试素材库',
            path: '/test/library',
            type: 'local' as const,
            status: 'active' as const,
            fileCount: 100,
            size: 1024000,
            description: '测试用的素材库',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            ...overrides,
        };
    }

    /**
     * 创建模拟插件
     */
    static createPlugin(overrides?: any) {
        return {
            id: 'plugin-001',
            pluginName: 'test-plugin',
            name: '测试插件',
            version: '1.0.0',
            description: '测试用的插件',
            author: 'Test Author',
            status: 'active' as const,
            configurable: true,
            dependencies: [],
            main: 'index.js',
            libraryId: 'lib-001',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            icon: 'icon.png',
            category: 'utility',
            tags: ['test', 'utility'],
            ...overrides,
        };
    }

    /**
     * 创建模拟设备
     */
    static createDevice(overrides?: any) {
        return {
            clientId: 'client-001',
            libraryId: 'lib-001',
            connectionTime: '2024-01-01T00:00:00Z',
            lastActivity: '2024-01-01T00:05:00Z',
            requestInfo: {
                url: 'http://localhost:8081',
                headers: { 'user-agent': 'test-client' },
                remoteAddress: '127.0.0.1',
            },
            status: 'connected' as const,
            userAgent: 'test-client',
            ipAddress: '127.0.0.1',
            ...overrides,
        };
    }

    /**
     * 创建模拟文件
     */
    static createFile(name: string = 'test.txt', content: string = 'test content') {
        return new File([content], name, { type: 'text/plain' });
    }

    /**
     * 创建模拟 FormData
     */
    static createFormData(data: Record<string, any>) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value);
        });
        return formData;
    }
}

export class TestHelpers {
    /**
     * 等待指定时间
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 创建 Promise 包装器，用于测试异步操作
     */
    static createPromiseWrapper<T>() {
        let resolve: (value: T) => void;
        let reject: (reason?: any) => void;

        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        return { promise, resolve: resolve!, reject: reject! };
    }

    /**
     * 验证对象是否符合指定的形状
     */
    static matchesShape(obj: any, shape: any): boolean {
        if (typeof shape !== 'object' || shape === null) {
            return typeof obj === typeof shape;
        }

        for (const key in shape) {
            if (!(key in obj)) {
                return false;
            }

            if (!this.matchesShape(obj[key], shape[key])) {
                return false;
            }
        }

        return true;
    }

    /**
     * 深度比较两个对象
     */
    static deepEqual(a: any, b: any): boolean {
        if (a === b) return true;

        if (a == null || b == null) return a === b;

        if (typeof a !== typeof b) return false;

        if (typeof a !== 'object') return a === b;

        if (Array.isArray(a) !== Array.isArray(b)) return false;

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!this.deepEqual(a[key], b[key])) return false;
        }

        return true;
    }

    /**
     * 生成随机字符串
     */
    static randomString(length: number = 8): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 生成随机数字
     */
    static randomNumber(min: number = 0, max: number = 1000): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
