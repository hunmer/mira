import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        // 真实服务测试命名为 *.integration.test.ts, 默认不运行 (pnpm test:integration 显式运行)
        exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
        // 集成测试连接真实服务器，给足超时时间
        testTimeout: 15000,
        hookTimeout: 15000,
    },
});
