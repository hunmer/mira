import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        // 集成测试连接真实服务器，给足超时时间
        testTimeout: 15000,
        hookTimeout: 15000,
    },
});
